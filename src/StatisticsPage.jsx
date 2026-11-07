import CardAction from './CardAction';
import ScheduleDialog from './ScheduleDialog';
import React, { useState } from 'react';
import {csvText} from './csv';
import { ArrowRight, ArrowUpRight, Building2, CheckCircle2, Download, ExternalLink, GraduationCap, ListTodo, Package, TrendingUp, Users } from 'lucide-react';

const existingUrl = 'https://fg-gmbh-statistiken-2026.pwalter98.chatgpt.site/';

export default function StatisticsPage({ tasks, leads, inventory, studio, studios, go, person, personalTasks, courses }) {
  const [view, setView] = useState('local'),[chartOpen,setChartOpen]=useState(false);
  const atStudio = item => studio === 'Alle Studios' || item.studio === studio || item.studio === 'Alle Studios';
  const localTasks = tasks.filter(atStudio);
  const localLeads = leads.filter(atStudio);
  const localInventory = inventory.filter(atStudio);
  const won = localLeads.filter(l => l.stage === 'Gewonnen').length;
  const done = localTasks.filter(t => t.done).length;
  const personalDone = personalTasks.filter(t => t.done).length;
  const lessons = courses.reduce((n, c) => n + c.lessons.length, 0);
  const learned = courses.reduce((n, c) => n + c.completed.length, 0);
  const rows = studios.slice(1).filter(s => studio === 'Alle Studios' || s === studio).map(s => ({ studio: s, open: tasks.filter(t => t.studio === s && !t.done).length, done: tasks.filter(t => t.studio === s && t.done).length, leads: leads.filter(l => l.studio === s).length, low: inventory.filter(i => i.studio === s && i.stock < i.min).length }));
  const maxTasks = Math.max(1, ...rows.map(r => r.open + r.done));
  function exportCsv() {
    const content = csvText([['Studio', 'Offene Aufgaben', 'Erledigte Aufgaben', 'Interessenten', 'Artikel unter Mindestbestand'], ...rows.map(r => [r.studio, r.open, r.done, r.leads, r.low])]);
    const url = URL.createObjectURL(new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = 'fg-studiostatistiken-demo.csv'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const metrics = [
    [Users, 'orange', localLeads.length, 'Interessenten', 'Lokale CRM-Pipeline', 'crm'],
    [CheckCircle2, 'green', `${localTasks.length ? Math.round(done / localTasks.length * 100) : 0}%`, 'Aufgaben erledigt', `${done} von ${localTasks.length} Aufgaben`, 'tasks'],
    [TrendingUp, 'blue', `${localLeads.length ? Math.round(won / localLeads.length * 100) : 0}%`, 'Abschlussanteil', `${won} von ${localLeads.length} Kontakten gewonnen`, 'crm'],
    [Package, 'purple', localInventory.filter(i => i.stock < i.min).length, 'Artikel nachbestellen', 'Unter dem Mindestbestand', 'inventory'],
  ];
  return <>
    <div className="page-heading"><div><div className="eyebrow">STATISTIKEN & ENTWICKLUNG</div><h1>Zahlen, die uns weiterbringen.</h1><p>Dein Fortschritt, eure Studios und die bestehende Statistikseite.</p></div><button className="button button-secondary" onClick={exportCsv}><Download size={16}/>CSV exportieren</button></div>
    <div className="content-toolbar"><div className="pill-tabs stats-view-tabs"><button className={view === 'local' ? 'active' : ''} onClick={() => setView('local')}>Team- & Mitarbeiterübersicht</button><button className={view === 'existing' ? 'active' : ''} onClick={() => setView('existing')}>Bestehende Statistikseite<ExternalLink size={12}/></button></div><span className="badge green"><Building2 size={12}/>{studio}</span></div>
    {view === 'local' ? <>
      <div className="stats-grid">{metrics.map(([Icon, color, value, label, foot, target]) => <button className="stat-card" onClick={() => go(target)} key={label}><div className="stat-top"><span className={'stat-icon ' + color}><Icon size={20}/></span><ArrowUpRight size={15}/></div><div className="stat-value">{value}<span>{label}</span></div><div className="stat-foot">{foot}</div></button>)}</div>
      <section className="panel personal-statistics action-card"><CardAction label="Persönlichen Fortschritt öffnen" onOpen={()=>go('employee')}/><div className="section-heading"><h2>Dein persönlicher Fortschritt</h2><span className="badge green">{person.name}</span></div><div className="personal-stat-grid"><div><span className="stat-icon orange"><ListTodo size={20}/></span><div><strong>{personalDone}<small> / {personalTasks.length}</small></strong><p>Eigene Aufgaben erledigt</p><div className="progress"><i style={{ width: `${personalTasks.length ? personalDone / personalTasks.length * 100 : 0}%` }}/></div></div></div><div><span className="stat-icon green"><GraduationCap size={20}/></span><div><strong>{learned}<small> / {lessons}</small></strong><p>Persönliche Lektionen abgeschlossen</p><div className="progress"><i style={{ width: `${lessons ? learned / lessons * 100 : 0}%` }}/></div></div></div></div><button className="text-link personal-stats-link" onClick={() => go('employee')}>Zu meinem Dashboard<ArrowRight size={14}/></button></section>
      <div className="dashboard-columns stats-columns"><section className="panel chart-panel action-card"><CardAction label="Aufgaben je Studio als Auswertung öffnen" onOpen={()=>setChartOpen(true)}/><div className="section-heading"><h2>Aufgaben je Studio</h2><span className="small-muted">Offen & erledigt</span></div><div className="chart-legend"><span><i/>Offen</span><span><i/>Erledigt</span></div><div className="bar-chart">{rows.map(r => <div className="bar-row" key={r.studio}><span>{r.studio}</span><div className="stacked-bar" aria-label={`${r.studio}: ${r.open} offen, ${r.done} erledigt`}><i style={{ width: `${r.open / maxTasks * 100}%` }}/><i className="bar-completed" style={{ width: `${r.done / maxTasks * 100}%` }}/></div><strong>{r.open + r.done}</strong></div>)}</div></section><section className="panel existing-statistics action-card"><CardAction label="Vorhandene Statistiken öffnen" onOpen={()=>setView('existing')}/><span className="stat-icon green"><TrendingUp size={25}/></span><h2>Eure vorhandenen Statistiken</h2><p>Die bestehende Statistikseite ist als zusätzliche Ansicht eingebunden. Ihre Daten werden noch nicht automatisch in diese Kennzahlen übernommen.</p><button className="button button-secondary" onClick={() => setView('existing')}>Statistikseite anzeigen<ArrowRight size={15}/></button><a className="text-link external-stats-link" href={existingUrl} target="_blank" rel="noreferrer">In eigenem Tab öffnen<ExternalLink size={13}/></a></section></div>
      <section className="panel table-wrap"><table><thead><tr><th>Studio</th><th>Offene Aufgaben</th><th>Erledigt</th><th>Interessenten</th><th>Nachbestellen</th></tr></thead><tbody>{rows.map(r => <tr key={r.studio}><td><strong>{r.studio}</strong></td><td>{r.open}</td><td>{r.done}</td><td>{r.leads}</td><td>{r.low}</td></tr>)}</tbody></table></section>
      <div className="info-note"><TrendingUp size={17}/><span>Diese Kennzahlen werden aus lokalen Demo-Daten berechnet. Die persönliche Lernstatistik wird je ausgewähltem Profil gespeichert. Umsatz-, Vertrags- und Kampagnendaten aus externen Systemen sind noch nicht verbunden.</span></div>
    </> : <section className="panel embedded-statistics"><div className="section-heading"><h2>FG GmbH · Statistiken 2026</h2><a className="button button-secondary" href={existingUrl} target="_blank" rel="noreferrer">Separat öffnen<ExternalLink size={14}/></a></div><div className="info-note"><ExternalLink size={16}/><span>Externe Ansicht deiner bestehenden Seite. Falls der Anbieter die Einbettung oder Anmeldung im Rahmen blockiert, öffne die Seite separat. Eine Datenübernahme findet hier noch nicht statt; die externe Ansicht konnte in dieser Umgebung nicht verifiziert werden.</span></div><iframe src={existingUrl} title="Bestehende Statistikseite der FG GmbH 2026" loading="lazy" referrerPolicy="strict-origin-when-cross-origin" sandbox="allow-scripts allow-forms allow-same-origin allow-downloads allow-popups"/></section>}
  {chartOpen&&<ScheduleDialog title="Aufgaben je Studio" wide onClose={()=>setChartOpen(false)}><p>Offene und erledigte Aufgaben in der aktuellen Studioauswahl.</p><div className="table-wrap"><table><thead><tr><th>Studio</th><th>Offen</th><th>Erledigt</th><th>Gesamt</th></tr></thead><tbody>{rows.map(r=><tr key={r.studio}><td>{r.studio}</td><td>{r.open}</td><td>{r.done}</td><td>{r.open+r.done}</td></tr>)}</tbody></table></div></ScheduleDialog>}</>;
}
