import CardAction from './CardAction';
import React from 'react';
import { ArrowRight, ArrowUpRight, Bell, BookOpen, Building2, CalendarDays, Check, CheckCircle2, ChevronRight, Clock3, GraduationCap, ListTodo, MessageCircle, Phone, Plus, Sparkles } from 'lucide-react';
import './employee-dashboard.css';

const formatDate = value => new Date(value + 'T12:00:00').toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });

export default function EmployeeDashboard({ person, people, onPersonChange, tasks, courses, notices, readIds, today, onToggleTask, onTaskOpen, onCourseOpen, onNoticeRead, onNoticeCreate, onNoticeOpen, onNoticeDetail, onTasks, onNavigate }) {
  const open = tasks.filter(t => !t.done).sort((a, b) => a.due.localeCompare(b.due));
  const overdue = open.filter(t => t.due < today);
  const todayTasks = tasks.filter(t => t.due <= today).sort((a, b) => Number(a.done) - Number(b.done) || a.due.localeCompare(b.due));
  const unread = notices.filter(n => !readIds.includes(n.id));
  const nextCourse = courses.find(c => c.completed.length < c.lessons.length);
  const completedLessons = courses.reduce((n, c) => n + c.completed.length, 0);
  const lessonCount = courses.reduce((n, c) => n + c.lessons.length, 0);
  const progress = lessonCount ? Math.round(completedLessons / lessonCount * 100) : 0;
  const upcoming = open.filter(t => t.due >= today).slice(0, 4);

  return <>
    <div className="page-heading employee-heading">
      <div><div className="eyebrow">DEIN PERSÖNLICHER ARBEITSPLATZ</div><h1>Hallo, {person.name.split(' ')[0]} <span className="sun">☀</span></h1><p>Was heute zählt – deine Aufgaben, dein Studio und dein nächster Schritt.</p></div>
      <label className="employee-picker"><span>Demo-Profil auswählen</span><select aria-label="Mitarbeiteransicht auswählen" value={person.id} onChange={e => onPersonChange(e.target.value)}>{people.map(p => <option value={p.id} key={p.id}>{p.name} · {p.studio}</option>)}</select></label>
    </div>

    <section className="employee-welcome">
      <div className="employee-welcome-icon"><Building2 size={25}/></div>
      <div><span>{person.role} · {person.studio}</span><h2>Dein Tag. Dein Beitrag. Unser Team.</h2><p>{open.length ? `${open.length} offene Aufgabe${open.length === 1 ? '' : 'n'} und ${unread.length} ungelesene Hinweise warten auf dich.` : 'Deine Aufgaben sind erledigt. Entdecke Neues im Lernhub oder teile eine Idee mit dem Team.'}</p></div>
      <button className="button button-secondary" onClick={() => onNavigate('assistant')}><Sparkles size={16}/>Eine Frage stellen<ArrowUpRight size={14}/></button>
    </section>

    <div className="employee-stats">
      <button onClick={onTasks}><span className="stat-icon orange"><ListTodo size={20}/></span><span><strong>{open.length}</strong><small>Meine offenen Aufgaben</small></span><ArrowUpRight size={15}/></button>
      <button onClick={onTasks}><span className="stat-icon red"><Clock3 size={20}/></span><span><strong>{overdue.length}</strong><small>Davon überfällig</small></span><ArrowUpRight size={15}/></button>
      <a href="#wichtige-hinweise" onClick={e => { e.preventDefault(); document.getElementById('wichtige-hinweise')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }}><span className="stat-icon blue"><Bell size={20}/></span><span><strong>{unread.length}</strong><small>Ungelesene Hinweise</small></span><ArrowUpRight size={15}/></a>
      <button onClick={() => onNavigate('learning')}><span className="stat-icon green"><GraduationCap size={20}/></span><span><strong>{progress}%</strong><small>Mein Lernfortschritt</small></span><ArrowUpRight size={15}/></button>
    </div>

    <div className="employee-columns">
      <section className="panel employee-tasks"><div className="section-heading"><h2>Meine Aufgaben für heute</h2><button className="text-link" onClick={onTasks}>Alle meine Aufgaben<ArrowRight size={14}/></button></div><div className="employee-panel-subtitle">Heute und überfällig · nur dir zugewiesene Aufgaben</div>
        {todayTasks.length ? todayTasks.map(task => <div key={task.id} className={'employee-task action-card ' + (task.done ? 'is-complete' : '')}><CardAction label={`${task.title} als persönliche Aufgabe öffnen`} onOpen={()=>onTaskOpen(task)}/><button className={'task-checkbox ' + (task.done ? 'checked' : '')} aria-label={`${task.title} ${task.done ? 'wieder öffnen' : 'erledigen'}`} onClick={() => onToggleTask(task.id)}>{task.done && <Check size={13}/>}</button><div><button onClick={() => onTaskOpen(task)}>{task.title}</button><span>{task.studio} · {task.category}{task.repeat !== 'Einmalig' ? ` · ${task.repeat}` : ''}</span></div><small className={!task.done && task.due < today ? 'overdue' : ''}>{task.due === today ? 'Heute' : formatDate(task.due)}</small></div>) : <div className="employee-empty"><CheckCircle2 size={30}/><h3>Heute ist alles im grünen Bereich.</h3><p>Hier erscheinen deine heute fälligen und überfälligen Aufgaben.</p></div>}
        <div className="employee-task-summary"><CheckCircle2 size={14}/>{todayTasks.filter(t => t.done).length} von {todayTasks.length} Aufgaben erledigt</div>
      </section>

      <section className="panel employee-notices" id="wichtige-hinweise"><div className="section-heading"><h2>Wichtige Hinweise</h2><button className="text-link" onClick={onNoticeCreate}><Plus size={13}/>Hinweis erstellen</button></div><div className="employee-panel-subtitle">Aus deinem Studio und dem gesamten Unternehmen</div>
        {notices.length ? notices.map(notice => <article className={'employee-notice action-card ' + (readIds.includes(notice.id) ? 'notice-read' : '')} key={notice.id}><CardAction label={`${notice.title} als Hinweis öffnen`} onOpen={()=>onNoticeDetail(notice)}/><div className="notice-heading"><span className={'badge ' + (notice.priority === 'Wichtig' ? 'orange' : 'green')}>{notice.priority}</span><span>{notice.studio}</span></div><h3>{notice.title}</h3><p>{notice.body}</p><div className="notice-actions"><button aria-pressed={readIds.includes(notice.id)} aria-label={`${notice.title} ${readIds.includes(notice.id) ? 'als ungelesen markieren' : 'als gelesen markieren'}`} onClick={() => onNoticeRead(notice.id)}>{readIds.includes(notice.id) ? <CheckCheckIcon/> : <Check size={12}/>} {readIds.includes(notice.id) ? 'Gelesen' : 'Als gelesen markieren'}</button>{notice.target && <button onClick={() => onNoticeOpen(notice)}>Mehr dazu<ChevronRight size={13}/></button>}</div></article>) : <div className="employee-empty"><Bell size={27}/><h3>Keine aktuellen Hinweise.</h3><p>Neue Mitteilungen für deinen Standort erscheinen hier.</p></div>}
      </section>
    </div>

    <div className="employee-columns employee-secondary">
      <section className="panel employee-upcoming"><div className="section-heading"><h2>Als Nächstes</h2><button className="text-link" onClick={() => onNavigate('calendar')}>Zum Kalender<ArrowRight size={14}/></button></div>{upcoming.length ? upcoming.map(t => <button className="employee-upcoming-item" key={t.id} onClick={() => onTaskOpen(t)}><span><CalendarDays size={17}/><small>{formatDate(t.due)}</small></span><div><h3>{t.title}</h3><p>{t.studio} · {t.repeat}</p></div><ChevronRight size={16}/></button>) : <div className="employee-empty"><CalendarDays size={27}/><p>Keine weiteren persönlichen Termine hinterlegt.</p></div>}</section>
      <section className="panel employee-learning action-card"><CardAction label="Persönliche Einarbeitung öffnen" onOpen={()=>nextCourse?onCourseOpen(nextCourse):onNavigate('learning')}/><div className="section-heading"><h2>Dein Lernen geht weiter</h2><button className="text-link" onClick={() => onNavigate('learning')}>Zum Lernhub<ArrowRight size={14}/></button></div><div className="employee-learning-body"><span className="employee-learning-icon"><GraduationCap size={40} strokeWidth={1.4}/></span><div><span className="badge green">DEINE EINARBEITUNG</span><h3>{nextCourse?.title || 'Alles geschafft. Stark gemacht!'}</h3><p>{nextCourse ? `${nextCourse.completed.length} von ${nextCourse.lessons.length} Lektionen abgeschlossen.` : 'Alle hinterlegten Beispiellektionen sind abgeschlossen.'}</p><div className="course-progress"><div className="progress"><i style={{ width: `${progress}%` }}/></div><span>{progress}% insgesamt</span></div></div></div><button className="button button-secondary employee-learning-button" onClick={() => nextCourse ? onCourseOpen(nextCourse) : onNavigate('learning')}>{nextCourse ? 'Weiterlernen' : 'Lernhub öffnen'}<ArrowRight size={15}/></button></section>
    </div>

    <section className="employee-quicklinks"><button onClick={() => onNavigate('knowledge')}><BookOpen size={21}/><span>Wissen finden<small>Anleitungen & Abläufe</small></span><ArrowUpRight size={16}/></button><button onClick={() => onNavigate('contacts')}><Phone size={21}/><span>Die richtige Person<small>Kontakte & Zuständigkeiten</small></span><ArrowUpRight size={16}/></button><button onClick={() => onNavigate('feedback')}><MessageCircle size={21}/><span>Deine Meinung zählt<small>Feedback teilen – auch anonym</small></span><ArrowUpRight size={16}/></button></section>
    <div className="info-note"><ShieldDemoIcon/><span>Persönliche Demoansicht, kein echter Login: Profilwahl, Hinweise und Lernfortschritte werden nur in diesem Browser gespeichert. Für Aufgaben zählt die Zuweisung und der Standort des ausgewählten Profils; echte Zugriffsrechte folgen serverseitig.</span></div>
  </>;
}

function CheckCheckIcon() { return <CheckCircle2 size={12}/>; }
function ShieldDemoIcon() { return <Building2 size={17}/>; }
