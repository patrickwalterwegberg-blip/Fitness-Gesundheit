import { loadEnv } from 'vite';
const env = { ...loadEnv('production', process.cwd(), 'VITE_'), ...process.env };
const url = env.VITE_SUPABASE_URL || '';
const key = env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
if (Boolean(url) !== Boolean(key)) throw new Error('Set both VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY, or leave both empty for demo mode.');
if (url) {
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.search || parsed.hash || parsed.pathname !== '/') throw new Error('Supabase URL must be an HTTPS project origin, without credentials, query or path.');
  let role;
  try { role = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString()).role; } catch { /* New publishable keys are not JWTs. */ }
  if (key.startsWith('sb_secret_') || role === 'service_role') throw new Error('Never place a Supabase secret or service_role key in frontend variables. Use a publishable key.');
  if (!key.startsWith('sb_publishable_') && role !== 'anon') throw new Error('Expected a publishable key or legacy anon key.');
}
console.log(url ? 'Public backend configuration validated.' : 'Backend not configured; demo and setup view remain available.');
