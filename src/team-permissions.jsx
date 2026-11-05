import React,{createContext,useContext} from 'react';
import catalog from './function-catalog.json';
export {catalog as functionCatalog};
export const functionGroups=[...new Set(catalog.map(c=>c.group))];
export const functionMigrationUrl='https://github.com/patrickwalterwegberg-blip/Fitness-Gesundheit/blob/main/backend/supabase/009_function_permissions.sql';
export const PermissionContext=createContext({ready:false,can:(_key,legacy=false)=>legacy});
export const usePermissions=()=>useContext(PermissionContext);
export function permissionDefaults(role){return catalog.filter(c=>role==='admin'||c.roles.includes(role)).map(c=>c.key);}
export function expandPermissions(values){const next=new Set(values);for(let i=0;i<catalog.length;i++){const before=next.size;for(const item of catalog)if(next.has(item.key))for(const required of item.requires)next.add(required);if(next.size===before)break;}return [...next];}
export function permissionError(error){if(['PGRST202','42P01'].includes(error?.code))return 'Die Erweiterung 009 für einzelne Funktionsrechte ist noch nicht eingerichtet.';if(error?.code==='40001')return 'Die Freigaben wurden inzwischen geändert. Bitte neu laden und erneut prüfen.';if(error?.code==='42501')return 'Nur Admin und Geschäftsleitung dürfen diese Freigaben ändern.';return 'Die Freigaben konnten nicht bestätigt werden. Bitte erneut versuchen.';}
