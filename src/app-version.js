export const appVersion=import.meta.env.VITE_APP_VERSION||'';
export const appVersionLabel=appVersion?`Version ${appVersion.slice(0,7)}`:'Entwicklung';
