export const studios = [
  'Alle Studios',
  'Sögel',
  'Bersenbrück',
  'Dörpen',
  'Lathen',
  'Haselünne',
  'Löningen',
  'Werlte',
];

// Keep the existing Dörpen assignment and replace the six numbered demo sites.
const legacyNames = {
  'Studio 02': 'Sögel',
  'Studio 03': 'Bersenbrück',
  'Studio 04': 'Lathen',
  'Studio 05': 'Haselünne',
  'Studio 06': 'Löningen',
  'Studio 07': 'Werlte',
};
const studioCollections = new Set([
  'tasks', 'docs', 'leads', 'inventory', 'orders', 'equipment',
  'campaigns', 'people', 'contacts', 'feedback', 'notices',
]);

export function migrateStoredStudios(key, value) {
  if (key === 'studio') return legacyNames[value] || value;
  if (!studioCollections.has(key) || !Array.isArray(value)) return value;
  return value.map(item => {
    if (!item || typeof item !== 'object') return item;
    const migrated = { ...item, ...(legacyNames[item.studio] ? { studio: legacyNames[item.studio] } : {}) };
    // Refresh only our exact seeded notice, never user-authored document content.
    if (key === 'notices' && item.id === 'notice-3' && item.body === 'Beispielhinweis für Studio 05: Bestände vor Ort zählen und mit der Lagerübersicht abgleichen.') {
      migrated.body = 'Beispielhinweis für Haselünne: Bestände vor Ort zählen und mit der Lagerübersicht abgleichen.';
    }
    return migrated;
  });
}
