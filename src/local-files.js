export function localFiles(mode, action) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('fg-hub-files', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('files');
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result; const tx = db.transaction('files', mode); const op = action(tx.objectStore('files')); let result;
      op.onsuccess = () => { result = op.result; };
      tx.oncomplete = () => { db.close(); resolve(result); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    };
  });
}
export async function downloadLocalFile(file) {
  const blob = await localFiles('readonly', store => store.get(file.id));
  if (!blob) throw new Error('Die Originaldatei ist in diesem Browser nicht mehr vorhanden.');
  const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = file.name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
