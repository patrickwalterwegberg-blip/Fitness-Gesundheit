export const taskStatuses = ['Offen', 'In Bearbeitung', 'Erledigt'];
export const taskStatus = task => task.done ? 'Erledigt' : task.status === 'In Bearbeitung' ? 'In Bearbeitung' : 'Offen';

function nextDue(due, repeat) {
  const value = new Date(due + 'T12:00:00Z');
  if (Number.isNaN(value.getTime())) return null;
  const day = value.getUTCDate();
  if (repeat === 'Täglich' || repeat === 'Wöchentlich') value.setUTCDate(day + (repeat === 'Täglich' ? 1 : 7));
  else if (repeat === 'Monatlich' || repeat === 'Jährlich') {
    value.setUTCDate(1);
    if (repeat === 'Monatlich') value.setUTCMonth(value.getUTCMonth() + 1);
    else value.setUTCFullYear(value.getUTCFullYear() + 1);
    value.setUTCDate(Math.min(day, new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + 1, 0)).getUTCDate()));
  } else return null;
  return value.toISOString().slice(0, 10);
}
export function taskEvent(message, actor) {
  return { id: crypto.randomUUID(), message, actor: actor.name, actorId: actor.id, at: new Date().toISOString() };
}
export function setTaskStatus(tasks, id, status, actor) {
  if (!taskStatuses.includes(status)) return tasks;
  const old = tasks.find(t => t.id === id);
  if (!old || taskStatus(old) === status) return tasks;
  const due = status === 'Erledigt' && !old.advanced ? nextDue(old.due, old.repeat) : null;
  const nextId = due && !tasks.some(t => t.parentId === old.id) ? crypto.randomUUID() : null;
  const updated = tasks.map(t => t.id === id ? {
    ...t, status, done: status === 'Erledigt',
    advanced: t.advanced || !!nextId,
    updatedAt: new Date().toISOString(),
    history: [...(t.history || []), taskEvent(`Status: ${status}`, actor)],
  } : t);
  if (nextId) updated.push({
    ...old, id: nextId, parentId: old.id, due,
    done: false, status: 'Offen', advanced: false,
    comments: [], history: [taskEvent('Folgetermin automatisch erstellt', actor)],
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  });
  return updated;
}
