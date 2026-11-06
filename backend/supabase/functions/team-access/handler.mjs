import {mailFailureReason} from './mail-errors.mjs';
// No privileged key or Auth action link is ever returned to the browser.
export function createTeamAccessHandler({ createClient, env, log = event => console.info(JSON.stringify(event)) }) {
  return async function handler(request) {
    const requestId=crypto.randomUUID();let action='unknown';
    const record=(code,status,reason)=>{try{log({event:'teamhub_mail_request',requestId,action,code,status,...(reason?{reason}:{})});}catch{/* Logging must not alter the result of a mail request. */}};
    let configured;
    try {
      const site = new URL(env.get('TEAMHUB_SITE_URL'));
      if (site.protocol !== 'https:' || site.username || site.password || site.search || site.hash) throw Error('Invalid site');
      const url = env.get('SUPABASE_URL'), key = env.get('SUPABASE_ANON_KEY'), secret = env.get('SUPABASE_SERVICE_ROLE_KEY');
      if (!url || !key || !secret) throw Error('Missing configuration');
      configured = { site, url, key, secret };
    } catch { record('setup_missing',503);return Response.json({ code: 'setup_missing',requestId }, { status: 503 }); }
    const origin = request.headers.get('origin');
    const headers = { 'access-control-allow-origin': configured.site.origin, 'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type', 'access-control-allow-methods': 'POST, OPTIONS', 'vary': 'Origin', 'cache-control': 'no-store' };
    const reply = (code, status, extra = {}) => {record(code,status,extra.reason);return Response.json({ code, ...extra,requestId }, { status, headers });};
    if (origin !== configured.site.origin) return reply('origin_denied', 403);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (request.method !== 'POST') return reply('method_not_allowed', 405);
    const authorization = request.headers.get('authorization') || '';
    if (!/^Bearer \S+$/i.test(authorization)) return reply('not_authenticated', 401);
    try {
      const caller = createClient(configured.url, configured.key, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false, autoRefreshToken: false } });
      const { data: auth, error: authError } = await caller.auth.getUser();
      if (authError || !auth?.user) return reply('not_authenticated', 401);
      const { data: profile, error: profileError } = await caller.from('profiles').select('id,role,active').eq('id', auth.user.id).maybeSingle();
      if (profileError || !profile?.active) return reply('administrator_required', 403);
      if (!request.headers.get('content-type')?.startsWith('application/json')) return reply('invalid_input', 400);
      const raw = await request.text();
      if (raw.length > 4096) return reply('invalid_input', 400);
      let input; try { input = JSON.parse(raw); } catch { return reply('invalid_input', 400); }
      if(!['invite','send_login'].includes(input?.action))return reply('invalid_input',400);
      action=input.action;
      if (profile.role !== 'admin') {
        const required = input?.action === 'invite' ? 'users.invite' : input?.action === 'send_login' ? 'users.login' : null;
        if (!required) return reply('invalid_input', 400);
        const { data: scope, error: scopeError } = await caller.rpc('team_access_context');
        if (scopeError || scope?.version < 9 || !scope?.pages?.includes('access') || !scope?.capabilities?.includes(required)) return reply('administrator_required', 403);
        if (input.action === 'invite' && input.role !== 'employee') return reply('administrator_required', 403);
      }
      const redirect = new URL(configured.site.href); redirect.searchParams.set('team', '1');
      // Only construct the privileged client after verifying the active account and the exact requested function.
      const privileged = () => createClient(configured.url, configured.secret, { auth: { persistSession: false, autoRefreshToken: false } });
      if (input?.action === 'invite') {
        const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
        const fullName = typeof input.fullName === 'string' ? input.fullName.trim() : '';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || !fullName || fullName.length > 100 || !['admin', 'studio_manager', 'employee'].includes(input.role) || !Array.isArray(input.studioIds) || input.studioIds.length > 7 || input.studioIds.some(s => typeof s !== 'string' || !/^[a-f\d-]{36}$/i.test(s))) return reply('invalid_input', 400);
        const { data: invitation, error: prepareError } = await caller.rpc('admin_prepare_team_invitation', { p_email: email, p_full_name: fullName, p_role: input.role, p_studio_ids: input.studioIds });
        if (prepareError) return reply(prepareError.code === '23505' ? 'account_exists' : prepareError.code === '42501' ? 'administrator_required' : 'invalid_input', prepareError.code === '42501' ? 403 : 409);
        const server=privileged();
        const result = await server.auth.admin.inviteUserByEmail(email, { data: { team_invitation_id: invitation }, redirectTo: redirect.href });
        if (result.error || !result.data?.user?.id) return reply('invitation_not_confirmed', 502,{reason:mailFailureReason(result.error)});
        const { data: provisioned, error: provisioningError } = await caller.from('profiles').select('id,active').eq('id', result.data.user.id).maybeSingle();
        if (provisioningError || !provisioned?.active) return reply('provisioning_not_confirmed', 409);
        return reply('invitation_requested', 200, { userId: provisioned.id });
      }
      if (input?.action === 'send_login') {
        if (typeof input.userId !== 'string' || !/^[a-f\d-]{36}$/i.test(input.userId)) return reply('invalid_input', 400);
        const { data: email, error: targetError } = await caller.rpc('admin_team_login_target', { p_user: input.userId });
        if (targetError) return reply(targetError.code === '42501' ? 'administrator_required' : 'login_target_unavailable', targetError.code === '42501' ? 403 : 409);
        if(typeof email!=='string'||email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return reply('login_target_unavailable',409);
        const server=privileged();
        const { error: mailError } = await server.auth.signInWithOtp({ email, options: { shouldCreateUser: false, emailRedirectTo: redirect.href } });
        if (mailError) return reply('email_not_confirmed', 502,{reason:mailFailureReason(mailError)});
        return reply('login_link_requested', 200);
      }
      return reply('invalid_input', 400);
    } catch { return reply('request_not_confirmed', 502); }
  };
}
