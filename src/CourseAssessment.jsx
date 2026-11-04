import React, { useState } from 'react';
import { CheckCircle2, GraduationCap } from 'lucide-react';
import { courseChecks } from './academy-model';

export default function CourseAssessment({ course, onSubmit }) {
  const [answers, setAnswers] = useState({}); const [result, setResult] = useState(null); const [error, setError] = useState('');
  return <div className="course-assessment"><span className="badge"><GraduationCap size={13}/>Beispiel-Wissenstest · lokale Demo</span><p>Prüfe dein Verständnis der gelesenen Beispielinhalte. Eine Praxiseinweisung wird separat bestätigt.</p><form onSubmit={e => { e.preventDefault(); try { setResult(onSubmit(answers)); setError(''); } catch (e) { setError(e.message); } }}>{(courseChecks[course.id] || []).map((q, index) => <fieldset className="assessment-question" key={index}><legend>{q.question}</legend>{q.options.map((option, choice) => <label key={choice}><input type="radio" name={`question-${index}`} required checked={answers[index] === choice} onChange={() => { setAnswers(a => ({ ...a, [index]: choice })); setResult(null); }}/>{option}</label>)}</fieldset>)}<button className="button" type="submit">Wissenstest auswerten</button></form>{error && <div className="admin-error" role="alert">{error}</div>}{result && <div className={result.passed ? 'admin-success' : 'admin-error'} role="status">{result.passed && <CheckCircle2 size={16}/>} {result.passed ? 'Wissenstest bestanden' : 'Noch nicht bestanden'} · {result.correct}/{result.total} richtig.{!result.passed ? ' Lies die Lektion noch einmal und versuche es erneut.' : ''}</div>}</div>;
}
