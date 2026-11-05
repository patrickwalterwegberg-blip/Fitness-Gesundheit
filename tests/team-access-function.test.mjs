import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTeamAccessHandler } from '../backend/supabase/functions/team-access/handler.mjs';

const adminId = '00000000-0000-4000-8000-000000000001';
const memberId = '00000000-0000-4000-8000-000000000002';
const studioId = '00000000-0000-4000-8000-000000000003';
const origin = 'https://example.org';
function setup(options = {}) {
  const calls = [];
  const env = new Map(Object.entries({ TEAMHUB_SITE_URL: origin + '/Fitness-Gesundheit/', SUPABASE_URL: 'https://test.supabase.co', SUPABASE_ANON_KEY: 'public-test-key', SUPABASE_SERVICE_ROLE_KEY: 'private-test-key', ...(options.env || {}) }));
  const caller = {
    auth: { getUser: async () => options.noSession ? { error: true } : { data: { user: { id: adminId } } } },
    from: () => ({ select: () => ({ eq: (_column, id) => ({ maybeSingle: async () => ({ data: id === adminId ? { id, role: options.role || 'admin', active: !options.inactive } : options.provisioningFailure ? null : { id, active: true } }) }) }) }),
    rpc: async (name, args) => { calls.push({ name, args }); if(name==='team_access_context')return {data:{version:9,pages:['access'],capabilities:options.capabilities||[]}}; return options.rpcFailure ? { error: options.rpcFailure } : { data: name === 'admin_prepare_team_invitation' ? memberId : 'colleague@example.org' }; },
  };
  const server = { auth: {
    admin: { inviteUserByEmail: async (...args) => { calls.push({ name: 'invite', args }); return options.mailFailure ? { error: true } : { data: { user: { id: memberId, private: 'must-not-be-returned' } } }; } },
    signInWithOtp: async input => { calls.push({ name: 'otp', input }); return { error: options.mailFailure || null }; },
  } };
  const handler = createTeamAccessHandler({ env, createClient: (_url, key, configuration) => { calls.push({ name: 'client', key, configuration }); return key === 'public-test-key' ? caller : server; } });
  const request = (body, headers = {}, method = 'POST') => handler(new Request(origin + '/functions/v1/team-access', { method, headers: { origin, authorization: 'Bearer test-session', 'content-type': 'application/json', ...headers }, body: method === 'POST' ? JSON.stringify(body) : undefined }));
  return { calls, request };
}
const invitation = { action: 'invite', email: ' COLLEAGUE@example.org ', fullName: ' Colleague ', role: 'employee', studioIds: [studioId] };

test('invitation function rejects unknown origins and missing sessions', async () => {
  const { calls, request } = setup();
  assert.equal((await request(invitation, { origin: 'https://untrusted.example' })).status, 403);
  assert.equal((await request(invitation, { authorization: '' })).status, 401);
  assert.equal(calls.length, 0);
  const invalid = setup({ noSession: true });
  assert.equal((await invalid.request(invitation)).status, 401);
  assert.equal(invalid.calls.filter(c => c.key === 'private-test-key').length, 0);
});
test('employee, manager and disabled administrator cannot use the privileged client', async () => {
  for (const options of [{ role: 'employee' }, { role: 'studio_manager' }, { inactive: true }]) {
    const { calls, request } = setup(options);
    assert.equal((await request(invitation)).status, 403);
    assert.equal(calls.filter(c => c.key === 'private-test-key').length, 0);
    assert.equal(calls.filter(c => c.name === 'invite').length, 0);
  }
});
test('invite stages authorized access, fixes the redirect and returns no privileged data', async () => {
  const { calls, request } = setup();
  const response = await request({ ...invitation, redirectTo: 'https://untrusted.example' });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { code: 'invitation_requested', userId: memberId });
  assert.deepEqual(calls.find(c => c.name === 'admin_prepare_team_invitation').args, { p_email: 'colleague@example.org', p_full_name: 'Colleague', p_role: 'employee', p_studio_ids: [studioId] });
  assert.equal(calls.find(c => c.name === 'invite').args[1].redirectTo, origin + '/Fitness-Gesundheit/?team=1');
  assert.equal(calls.find(c => c.name === 'invite').args[1].data.team_invitation_id, memberId);
  assert.equal(response.headers.get('cache-control'), 'no-store');
});
test('invalid input and an existing account do not send invitations', async () => {
  const invalid = setup();
  assert.equal((await invalid.request({ ...invitation, role: 'owner' })).status, 400);
  assert.equal(invalid.calls.some(c => c.name === 'invite'), false);
  const existing = setup({ rpcFailure: { code: '23505' } });
  assert.equal((await (await existing.request(invitation)).json()).code, 'account_exists');
  assert.equal(existing.calls.some(c => c.name === 'invite'), false);
});
test('mail and provisioning failures never report successful invitations', async () => {
  const mail = setup({ mailFailure: true });
  const mailResponse = await mail.request(invitation);
  assert.equal(mailResponse.status, 502);
  assert.equal((await mailResponse.json()).code, 'invitation_not_confirmed');
  const provisioning = setup({ provisioningFailure: true });
  assert.equal((await provisioning.request(invitation)).status, 409);
});
test('login resend uses the checked target and never enables registration', async () => {
  const { calls, request } = setup();
  assert.equal((await request({ action: 'send_login', userId: memberId, email: 'untrusted@example.org' })).status, 200);
  const otp = calls.find(c => c.name === 'otp').input;
  assert.equal(otp.email, 'colleague@example.org');
  assert.equal(otp.options.shouldCreateUser, false);
  assert.equal(otp.options.emailRedirectTo, origin + '/Fitness-Gesundheit/?team=1');
  const unavailable = setup({ rpcFailure: { code: '23514' } });
  assert.equal((await unavailable.request({ action: 'send_login', userId: memberId })).status, 409);
  assert.equal(unavailable.calls.some(c => c.name === 'otp'), false);
});
test('function requires explicit hosting configuration and handles preflight', async () => {
  const missing = setup({ env: { TEAMHUB_SITE_URL: '' } });
  assert.equal((await missing.request(invitation)).status, 503);
  const { calls, request } = setup();
  const response = await request(null, {}, 'OPTIONS');
  assert.equal(response.status, 204);
  assert.equal(response.headers.get('access-control-allow-origin'), origin);
  assert.equal(calls.length, 0);
});


test('delegated invitation permission authorizes only employee invitations without granting login resend', async()=>{
 const allowed=setup({role:'employee',capabilities:['users.invite']});
 assert.equal((await allowed.request(invitation)).status,200);
 assert.equal((await allowed.request({...invitation,role:'admin'})).status,403);
 assert.equal((await allowed.request({...invitation,role:'studio_manager'})).status,403);
 assert.equal((await allowed.request({action:'send_login',userId:memberId})).status,403);
});
test('delegated login resend uses server-scoped targets and does not grant invitations',async()=>{
 const allowed=setup({role:'employee',capabilities:['users.login']});
 assert.equal((await allowed.request({action:'send_login',userId:memberId})).status,200);
 assert.equal((await allowed.request(invitation)).status,403);
 const denied=setup({role:'employee',capabilities:['users.login'],rpcFailure:{code:'42501'}});
 assert.equal((await denied.request({action:'send_login',userId:memberId})).status,403);
 assert.equal(denied.calls.some(c=>c.name==='otp'),false);
});
