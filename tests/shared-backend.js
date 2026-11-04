const id = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
export const sharedIds = { user: id(1), colleague: id(2), studio: id(3), otherStudio: id(4) };
export async function sharedBackend(page, { role = 'admin', failUpload = false, failRemove = false, missingKnowledge = false, existingProfile = true, pages = null } = {}) {
  const calls = [], documents = [], versions = [];
  const profile = { id: id(1), full_name: 'Patrick Test', role, active: true };
  const user = { id: id(1), email: 'patrick@example.org', role: 'authenticated', aud: 'authenticated', user_metadata: {}, app_metadata: {} };
  const studios = [{ id: id(3), name: 'Dörpen' }, { id: id(4), name: 'Sögel' }];
  const people = [profile, { id: id(2), full_name: 'Mitarbeiter Beispiel', role: 'employee', active: true }];
  const members = people.map((p, i) => ({ ...p, email: i ? 'mitarbeiter@example.org' : 'patrick@example.org', studio_ids: [id(3)], access_updated_at: '2026-11-04T10:00:00Z', last_sign_in_at: null }));
  const rights = { create: false, edit: false, publish: false };
  const payload = Buffer.from(JSON.stringify({ sub: id(1), aud: 'authenticated', role: 'authenticated', exp: 2200000000 })).toString('base64url');
  await page.addInitScript(({ user, token }) => localStorage.setItem('sb-teamhub-test-auth-token', JSON.stringify({ access_token: token, refresh_token: 'test-refresh', token_type: 'bearer', expires_in: 3600, expires_at: 2200000000, user })), { user, token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' + payload + '.test-signature' });
  let next = 100;
  const originals = new Map();
  await page.route('https://teamhub-test.supabase.co/**', async route => {
    const request = route.request(), url = new URL(request.url()), method = request.method();
    const body = request.headers()['content-type']?.includes('application/json') ? request.postDataJSON() : null;
    calls.push({ path: url.pathname, method, body, query: Object.fromEntries(url.searchParams) });
    const headers = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,PATCH,DELETE,OPTIONS', 'content-type': 'application/json' };
    const send = (data, status = 200, extra = {}) => route.fulfill({ status, headers: { ...headers, ...extra }, body: status === 204 ? undefined : JSON.stringify(data) });
    if (method === 'OPTIONS') return send(null, 204);
    if (url.pathname === '/auth/v1/user') return send(user);
    if (url.pathname === '/auth/v1/logout') return send(null, 204);
    if (url.pathname === '/rest/v1/profiles') return send(url.searchParams.has('id') ? [profile] : people);
    if (url.pathname === '/rest/v1/studios') return send(role === 'admin' ? studios : studios.slice(0, 1));
    if (url.pathname === '/rest/v1/studio_memberships') return send(people.map(p => ({ user_id: p.id, studio_id: id(3) })));
    if (url.pathname === '/rest/v1/tasks') return send([], 200, { 'content-range': '*/0' });
    if (url.pathname === '/rest/v1/knowledge_documents') return send(documents.filter(d => d.id === url.searchParams.get('id')?.slice(3)));
    if (url.pathname === '/rest/v1/knowledge_versions') return send(versions.filter(v => url.searchParams.has('id') ? v.id === url.searchParams.get('id').slice(3) : v.document_id === url.searchParams.get('document_id')?.slice(3)).sort((a, b) => b.version - a.version));
    if (url.pathname === '/rest/v1/rpc/search_knowledge') {
      if (missingKnowledge) return send({ code: 'PGRST202', message: 'missing migration' }, 404);
      const items = documents.filter(d => (!body.p_studio || !d.studio_id || d.studio_id === body.p_studio) && (!body.p_category || d.category === body.p_category) && (body.p_state !== 'all' || !d.archived) && (body.p_state !== 'published' || d.published_version_id && !d.archived) && (body.p_state !== 'draft' || !d.published_version_id) && (body.p_state !== 'archived' || d.archived) && (!body.p_query || [d.title, d.summary, d.excerpt].join(' ').toLowerCase().includes(body.p_query.toLowerCase()))).map(d => ({ ...d, review_count: versions.filter(v => v.document_id === d.id && !v.published_at && v.state === 'ready').length }));
      return send({ items, total: items.length });
    }
    if (url.pathname === '/rest/v1/rpc/prepare_knowledge_version') {
      let doc = documents.find(d => d.id === body.p_document);
      if (!doc) { doc = { id: id(next++), title: body.p_title, summary: body.p_summary, category: body.p_category, tags: body.p_tags, studio_id: body.p_studio, reader_roles: body.p_roles, created_by: id(1), published_version_id: null, archived: false, revision: 1, updated_at: '2026-11-04T10:00:00Z', excerpt: '' }; documents.push(doc); }
      else doc.revision++;
      const vid = id(next++), path = body.p_kind === 'file' ? `${doc.id}/${vid}/original.${body.p_file_name.split('.').pop()}` : null;
      versions.push({ id: vid, document_id: doc.id, version: versions.filter(v => v.document_id === doc.id).length + 1, title: body.p_title, summary: body.p_summary, category: body.p_category, tags: body.p_tags, kind: body.p_kind, state: body.p_kind === 'file' ? 'uploading' : 'ready', text_content: body.p_text, object_path: path, file_name: body.p_file_name, file_size: body.p_file_size, mime_type: body.p_mime_type, created_by: id(1), created_at: '2026-11-04T10:00:00Z', published_at: null });
      return send({ document_id: doc.id, version_id: vid, object_path: path, revision: doc.revision });
    }
    if (url.pathname === '/rest/v1/rpc/finish_knowledge_upload') { const v = versions.find(v => v.id === body.p_version); v.state = 'ready'; documents.find(d => d.id === v.document_id).revision++; return send(null); }
    if (url.pathname === '/rest/v1/rpc/cancel_knowledge_upload') { const i = versions.findIndex(v => v.id === body.p_version); versions.splice(i, 1); return send(null); }
    if (url.pathname === '/rest/v1/rpc/publish_knowledge_version') { const v = versions.find(v => v.id === body.p_version), d = documents.find(d => d.id === body.p_document); v.published_at = '2026-11-04T10:30:00Z'; Object.assign(d, { title: v.title, summary: v.summary, category: v.category, tags: v.tags, published_version_id: v.id, excerpt: v.text_content.slice(0, 220), revision: d.revision + 1 }); return send(null); }
    if (url.pathname === '/rest/v1/rpc/set_knowledge_access') { const d = documents.find(d => d.id === body.p_document); Object.assign(d, { studio_id: body.p_studio, reader_roles: body.p_roles, archived: body.p_archived, revision: d.revision + 1 }); return send(null); }
    if (url.pathname.startsWith('/storage/v1/object/')) {
      if (method === 'POST') {
        if (failUpload) return send({ statusCode: '500', error: 'error', message: 'Upload konnte nicht bestätigt werden.' }, 500);
        const raw = request.postDataBuffer(), boundary = request.headers()['content-type'].match(/boundary=(.*)$/)[1];
        const pieces = raw.toString('latin1').split('--' + boundary); const filePart = pieces.find(s => s.includes('filename='));
        const data = filePart.slice(filePart.indexOf('\r\n\r\n') + 4, -2);
        const objectPath = url.pathname.split('team-knowledge/')[1]; originals.set(objectPath, Buffer.from(data, 'latin1'));
        return send({ Key: objectPath });
      }
      if (method === 'DELETE') { if (failRemove) return send({ statusCode: '500', error: 'error', message: 'Entfernen nicht bestätigt.' }, 500); for (const path of body.prefixes) originals.delete(path); return send([]); }
      if (method === 'GET') { const path = url.pathname.split('team-knowledge/')[1]; return route.fulfill({ status: 200, headers: { ...headers, 'content-type': versions.find(v => v.object_path === path)?.mime_type || 'application/octet-stream' }, body: originals.get(path) || Buffer.from('original') }); }
    }
    if (url.pathname === '/rest/v1/rpc/team_access_context') return send({version:7,pages:pages || (role==='admin'?['dashboard','tasks','calendar','learning','knowledge','files','modules','builder','chat','feedback','access','controlling']:['dashboard','tasks','calendar','learning','knowledge','chat','feedback']),can_design:role==='admin'});
    if (url.pathname === '/rest/v1/rpc/team_chat_inbox') return send({channels:[],unread:0});
    if (url.pathname === '/rest/v1/rpc/admin_page_access') return send({pages:['dashboard','tasks','calendar','learning','knowledge','chat','feedback'],revision:null,defaulted:true,role:'employee'});
    if (url.pathname === '/rest/v1/rpc/admin_team_directory') {
      const query = (body.p_query || '').toLowerCase(); const filtered = members.filter(m => (m.full_name + ' ' + m.email).toLowerCase().includes(query) && (!body.p_role || m.role === body.p_role) && (body.p_status === 'all' || !body.p_status || m.active === (body.p_status === 'active')));
      return send({ members: filtered, total: filtered.length, studios });
    }
    if (url.pathname === '/rest/v1/rpc/admin_team_member_detail') return existingProfile ? send({ member: members.find(m => m.id === body.p_user), tasks: { total: 5, done: 3, open: 2, overdue: 1 }, courses: [{ id: id(77), title: 'Einarbeitung Empfang', lessons_read: 2, lesson_count: 4, quiz_passed: false, practice_required: true, practice_confirmed: false, due_date: '2026-11-20' }], design_rights: rights }) : send({ code: 'PGRST202' }, 404);
    if (url.pathname === '/rest/v1/module_permissions' && method === 'POST') { Object.assign(rights, { create: body.can_create, edit: body.can_edit, publish: body.can_publish }); return send({ user_id: body.user_id }); }
    if (url.pathname === '/functions/v1/team-access') { const created = { id: id(next++), full_name: body.fullName, email: body.email, role: body.role, active: true, studio_ids: body.studioIds, access_updated_at: '2026-11-04T10:00:00Z', last_sign_in_at: null }; members.push(created); return send({ code: 'invitation_requested', userId: created.id }); }
    return send({ code: 'test_request_not_mocked', message: 'Unbekannte Testanfrage' }, 404);
  });
  return { calls, documents, versions, members, rights, originals };
}
