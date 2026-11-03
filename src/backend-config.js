export function backendConfig() {
  return {
    url: import.meta.env.VITE_SUPABASE_URL || '',
    publishableKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '',
  };
}
