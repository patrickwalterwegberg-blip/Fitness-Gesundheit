// Local QA entry only; not imported by the production application.
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import ControllingCenter from '../src/ControllingCenter';
import { PermissionContext } from '../src/team-permissions';
import '@fontsource-variable/dm-sans';
import '@fontsource-variable/manrope';
import '../src/styles.css';
import '../src/black-gold-theme.css';

const params = new URLSearchParams(location.search);
window.practiceCalls = [];
function Harness() {
  const [state, setState] = useState({ role: params.get('role') || 'employee', own: params.has('own'), reviewerId: 'reviewer', allowed: !params.has('denied'), view: true, read: !params.has('unread'), quiz: !params.has('unpassed'), confirmed: false, required: true, exists: true });
  window.updatePracticeFixture = patch => setState(current => ({ ...current, ...patch }));
  const learner = { id: 'learner', name: 'Lernende Test', studio: 'Dörpen', studioNames: ['Dörpen'], active: true, role: 'employee' };
  const actor = { id: state.own ? learner.id : state.reviewerId, name: 'Prüfperson Test', role: state.role, active: true };
  return <PermissionContext.Provider value={{ ready: true, version: 15, can: key => key === 'controlling.view' ? state.view : key === 'learning.practice' && state.allowed }}>
    <ControllingCenter actor={actor} people={[learner]} studios={['Alle Studios', 'Dörpen']} tasks={[]}
      courses={[{ id: 'course', title: 'Einweisung Empfang', lessons: ['Start'] }]}
      progress={{ learner: { course: state.read ? [0] : [] } }}
      attempts={state.quiz ? [{ personId: 'learner', courseId: 'course', passed: true }] : []}
      assignments={state.exists ? [{ id: 'assignment', personId: 'learner', courseId: 'course', studio: 'Dörpen', practiceRequired: state.required }] : []}
      confirmations={state.confirmed ? [{ assignmentId: 'assignment', by: 'another', byName: 'Andere Prüfperson', at: '2026-11-23T09:00:00Z' }] : []}
      today="2026-11-23" onTaskOpen={() => {}} onAssign={() => {}} online
      onConfirm={async (assignmentId, notes) => {
        window.practiceCalls.push({ assignmentId, notes });
        if (params.has('reject')) throw new Error('Die Bestätigung wurde nicht gespeichert. Bitte erneut prüfen.');
        if (!params.has('defer')) setState(current => ({ ...current, confirmed: true }));
        if (params.has('hold')) await new Promise(resolve => { window.releasePracticeResult = resolve; });
        if (params.has('defer')) setState(current => ({ ...current, confirmed: true }));
      }}/>
  </PermissionContext.Provider>;
}
createRoot(document.getElementById('root')).render(<Harness/>);
