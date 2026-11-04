export const courseChecks = {
  c1: [{ question: 'Wobei unterstützt dich der Teamhub?', options: ['Nur beim Verkauf von Mitgliedschaften', 'Beim Finden von Wissen, Aufgaben und Ansprechpartnern', 'Er ersetzt die persönliche Einweisung im Studio'], correct: 1 }],
  c2: [{ question: 'Was gehört nach einer telefonischen Terminvereinbarung dazu?', options: ['Termin, Standort und Ansprechpartner bestätigen und im CRM dokumentieren', 'Nur den Namen notieren', 'Auf eine weitere Nachfrage warten'], correct: 0 }],
  c3: [{ question: 'Was tust du bei Verdacht auf einen Gerätedefekt?', options: ['Selbst reparieren', 'Bis zur Wartung weitertrainieren lassen', 'Nutzung unterbinden, kennzeichnen und Studioleitung informieren'], correct: 2 }],
};
export function readLessons(personId, course, progress) {
  const source = progress[personId]?.[course.id] ?? (personId === 'p1' ? course.completed || [] : []);
  return Array.isArray(source) ? [...new Set(source.filter(i => Number.isInteger(i) && i >= 0 && i < course.lessons.length))] : [];
}
export function hasPassed(personId, courseId, attempts) { return attempts.some(a => a.personId === personId && a.courseId === courseId && a.passed); }
export function scoreCheck(person, course, progress, answers) {
  const questions = courseChecks[course.id] || [];
  if (readLessons(person.id, course, progress).length !== course.lessons.length) throw new Error('Lies zuerst alle Lektionen dieses Kurses.');
  if (!questions.length || questions.some((q, i) => !Number.isInteger(answers[i]) || answers[i] < 0 || answers[i] >= q.options.length)) throw new Error('Beantworte alle Fragen des Wissenstests.');
  const correct = questions.filter((q, i) => answers[i] === q.correct).length;
  return { id: crypto.randomUUID(), personId: person.id, courseId: course.id, correct, total: questions.length, passed: correct === questions.length, at: new Date().toISOString() };
}
export function assignmentComplete(assignment, course, progress, attempts, confirmations) {
  return readLessons(assignment.personId, course, progress).length === course.lessons.length && hasPassed(assignment.personId, course.id, attempts) && (!assignment.practiceRequired || confirmations.some(c => c.assignmentId === assignment.id));
}
