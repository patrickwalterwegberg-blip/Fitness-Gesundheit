export { studios } from './studios';
export const today = '2026-11-03';
export const initialTasks = [
  { id: 't1', title: 'Wartung der Trainingsgeräte koordinieren', category: 'Technik', studio: 'Dörpen', person: 'Patrick Walter', due: today, priority: 'Hoch', done: false, repeat: 'Monatlich' },
  { id: 't2', title: 'Material für die Winteraktion vorbereiten', category: 'Marketing', studio: 'Sögel', person: 'Marketing-Team', due: today, priority: 'Normal', done: false, repeat: 'Einmalig' },
  { id: 't3', title: 'Bestand an Proteinshakes prüfen', category: 'Lager', studio: 'Dörpen', person: 'Studioleitung', due: today, priority: 'Normal', done: false, repeat: 'Wöchentlich' },
  { id: 't4', title: 'Neue Mitarbeiterin im Empfang einarbeiten', category: 'Team', studio: 'Bersenbrück', person: 'Studioleitung', due: '2026-11-04', priority: 'Normal', done: false, repeat: 'Einmalig' },
  { id: 't5', title: 'Erste-Hilfe-Material kontrollieren', category: 'Sicherheit', studio: 'Dörpen', person: 'Studioleitung', due: '2026-11-02', priority: 'Hoch', done: false, repeat: 'Monatlich' },
  { id: 't6', title: 'Telefonleitfaden im Team besprechen', category: 'Team', studio: 'Lathen', person: 'Studioleitung', due: today, priority: 'Normal', done: true, repeat: 'Einmalig' },
  { id: 't7', title: 'Monatliche Inventur durchführen', category: 'Lager', studio: 'Haselünne', person: 'Studioleitung', due: '2026-11-06', priority: 'Normal', done: false, repeat: 'Monatlich' },
];
export const initialDocs = [
  { id: 'd1', title: 'Unser Telefonleitfaden', category: 'Empfang & Service', type: 'Leitfaden', studio: 'Alle Studios', date: today, size: 'Beispielinhalt', tags: ['Telefon', 'Empfang', 'Anruf', 'Probetraining'], content: 'Beispielleitfaden: Begrüße Anrufer freundlich mit Studionamen und deinem Namen. Frage nach ihrem Trainingsziel. Biete ein persönliches Beratungsgespräch an. Bestätige Termin, Standort und Ansprechpartner. Dokumentiere das Gespräch und die vereinbarten nächsten Schritte im CRM. Dieser Musterinhalt muss vor dem Einsatz durch eure freigegebene Anleitung ersetzt werden.' },
  { id: 'd2', title: 'Checkliste: Studio öffnen', category: 'Studioalltag', type: 'Checkliste', studio: 'Alle Studios', date: '2026-11-02', size: 'Beispielinhalt', tags: ['Öffnen', 'Checkliste', 'Morgen'], content: 'Beispielcheckliste: Beleuchtung und Zugänge prüfen. Empfang vorbereiten. Trainingsfläche auf sichtbare Schäden und Stolperstellen kontrollieren. Defekte Geräte nicht freigeben, sondern kennzeichnen und der Studioleitung melden. Auffälligkeiten dokumentieren. Euer verbindlicher Öffnungsablauf ist noch zu hinterlegen.' },
  { id: 'd3', title: 'Gerätestörung richtig melden', category: 'Geräte & Sicherheit', type: 'Anleitung', studio: 'Alle Studios', date: '2026-10-30', size: 'Beispielinhalt', tags: ['Gerät', 'Defekt', 'Laufband', 'Wartung', 'Fehlermeldung'], content: 'Musterablauf bei einer Gerätestörung: Gerät bei möglicher Gefährdung nicht weiter benutzen und als außer Betrieb kennzeichnen. Gerät, Standort, Seriennummer und Fehlermeldung dokumentieren. Studioleitung informieren; sie koordiniert den zuständigen Service. Keine eigenständige Reparatur durchführen. Herstellerspezifische Anleitung und echte Servicekontakte sind noch nicht hinterlegt.' },
  { id: 'd4', title: 'Marketing: Vorlagen & Wordings', category: 'Marketing', type: 'Vorlage', studio: 'Alle Studios', date: '2026-10-28', size: 'Beispielinhalt', tags: ['Marketing', 'Vorlage', 'Kampagne'], content: 'Beispielprozess: Zielgruppe, Angebot, Studio und Aktionszeitraum festlegen. Texte und Motive im Marketinghub sammeln. Verantwortliche Person prüft und gibt die Inhalte frei. Werbenachrichten nur für die passenden Kanäle mit erforderlicher Einwilligung einplanen. Bestehende Dropbox-Vorlagen sind noch zu verbinden.' },
];
export const initialCourses = [
  { id: 'c1', title: 'Willkommen im Team', desc: 'Unsere Werte, deine Ansprechpartner und dein Start bei uns.', category: 'Grundlagen', duration: '15 Min.', color: 'orange', completed: [0], lessons: ['Sieben Studios. Ein gemeinsames Wir.', 'Deine Rolle im Team', 'Ansprechpartner & erste Schritte'], text: ['Willkommen bei Fitness & Gesundheit! Unser gemeinsamer Arbeitsbereich verbindet die sieben Studios. Hier findest du Wissen, Aufgaben und die Menschen, die dir bei deinem Start helfen. Beispielmodul: Die verbindlichen Unternehmenswerte werden noch ergänzt.', 'Kläre mit deiner Studioleitung deinen Aufgabenbereich, deine Arbeitszeiten und welche Freigaben du brauchst. Deine Aufgaben findest du im Teamhub.', 'Lass dich persönlich im Studio einweisen. Prüfe deine Kontaktdaten und Zugriffsrechte gemeinsam mit deiner Studioleitung.'] },
  { id: 'c2', title: 'Ein guter erster Eindruck', desc: 'Mitglieder begrüßen und am Empfang sicher durchstarten.', category: 'Empfang', duration: '20 Min.', color: 'green', completed: [], lessons: ['Mitglieder willkommen heißen', 'Telefon & Terminbuchung', 'Praxiseinweisung'], text: ['Eine freundliche Begrüßung schafft Orientierung. Frage neue Besucher, wie du ihnen helfen kannst. Dieses Beispiel ersetzt keine individuelle Einweisung.', 'Nutze den freigegebenen Telefonleitfaden. Vereinbare Termine in eurem vorgesehenen Kalender und dokumentiere den nächsten Schritt.', 'Besprich typische Empfangssituationen mit deiner Studioleitung. Eine praktische Einweisung muss separat durch eine verantwortliche Person bestätigt werden.'] },
  { id: 'c3', title: 'Sicher durch den Studioalltag', desc: 'Geräte, Notfallabläufe und wichtige Sicherheitsgrundlagen.', category: 'Sicherheit', duration: '25 Min.', color: 'blue', completed: [], lessons: ['Sichtkontrolle der Geräte', 'Interne Meldewege', 'Einweisung vor Ort'], text: ['Achte bei der Sichtkontrolle auf erkennbare Schäden. Bei Verdacht auf einen Defekt: Nutzung unterbinden und Studioleitung informieren.', 'Die echten Notfallkontakte und Standortpläne müssen vor dem Einsatz von der Studioleitung hinterlegt und geprüft werden. Bei akuten medizinischen Notfällen in Deutschland: 112.', 'Lass dir Fluchtwege, Erste-Hilfe-Material und den verbindlichen Notfallplan persönlich zeigen. Dieses Beispielmodul ist keine Sicherheitsunterweisung.'] },
];
export const initialLeads = [
  { id: 'l1', name: 'Interessent A', source: 'Website', studio: 'Dörpen', stage: 'Neue Leads', channel: 'E-Mail', consent: false },
  { id: 'l2', name: 'Interessent B', source: 'Rückenfit-Aktion', studio: 'Sögel', stage: 'Nicht erreicht', channel: 'WhatsApp', consent: true },
  { id: 'l3', name: 'Interessent C', source: 'Probetraining', studio: 'Dörpen', stage: 'Wiedervorlage', channel: 'E-Mail', consent: true },
  { id: 'l4', name: 'Interessent D', source: 'Website', studio: 'Bersenbrück', stage: 'Terminiert', channel: 'WhatsApp', consent: true },
  { id: 'l5', name: 'Interessent E', source: 'Testmitgliedschaft', studio: 'Lathen', stage: 'Testaktion', channel: 'E-Mail', consent: true },
];
export const stages = ['Neue Leads', 'Nicht erreicht', 'Wiedervorlage', 'Terminiert', 'Nicht erschienen', 'Follow-up nach Beratung', 'Testaktion', 'Gewonnen', 'Verloren', 'Abgebrochen'];
export const initialInventory = [
  { id: 'i1', name: 'Whey Protein · Vanille', unit: 'Dose · 1 kg', category: 'Protein', studio: 'Dörpen', stock: 2, min: 5, target: 10, supplier: 'Noch festzulegen' },
  { id: 'i2', name: 'Whey Protein · Schokolade', unit: 'Dose · 1 kg', category: 'Protein', studio: 'Dörpen', stock: 8, min: 5, target: 10, supplier: 'Noch festzulegen' },
  { id: 'i3', name: 'Mineralwasser', unit: 'Flasche · 0,5 l', category: 'Getränke', studio: 'Sögel', stock: 12, min: 24, target: 48, supplier: 'Noch festzulegen' },
  { id: 'i4', name: 'Desinfektionsmittel', unit: 'Kanister · 5 l', category: 'Verbrauch', studio: 'Dörpen', stock: 6, min: 3, target: 6, supplier: 'Noch festzulegen' },
];
export const initialEquipment = [
  { id: 'e1', name: 'Laufband 01', model: 'Cardio · Beispielgerät', serial: 'DEMO-LB-001', studio: 'Dörpen', status: 'Wartung fällig', due: today, service: 'Noch nicht hinterlegt' },
  { id: 'e2', name: 'Beinpresse', model: 'Kraft · Beispielgerät', serial: 'DEMO-BP-002', studio: 'Dörpen', status: 'Betriebsbereit', due: '2026-12-10', service: 'Noch nicht hinterlegt' },
  { id: 'e3', name: 'Crosstrainer 02', model: 'Cardio · Beispielgerät', serial: 'DEMO-CT-003', studio: 'Sögel', status: 'Außer Betrieb', due: '2026-11-05', service: 'Noch nicht hinterlegt' },
];
export const initialCampaigns = [
  { id: 'm1', name: 'Gemeinsam fit durch den Winter', desc: 'Die Winteraktion für alle sieben Studios.', channel: 'E-Mail & WhatsApp', studio: 'Alle Studios', status: 'In Planung', start: '2026-11-16', budget: 1500, color: 'orange' },
  { id: 'm2', name: 'Dein Rücken. Deine Stärke.', desc: 'Beratung und Probetraining rund um Rückengesundheit.', channel: 'E-Mail', studio: 'Dörpen', status: 'Entwurf', start: '2026-11-23', budget: 500, color: 'green' },
];
export const initialPeople = [
  { id: 'p1', name: 'Patrick Walter', email: '', role: 'Geschäftsführung', studio: 'Alle Studios', status: 'Demo-Profil' },
  { id: 'p2', name: 'Studioleitung', email: '', role: 'Studioleitung', studio: 'Dörpen', status: 'Beispiel' },
  { id: 'p3', name: 'Marketing-Team', email: '', role: 'Marketing', studio: 'Alle Studios', status: 'Beispiel' },
];
export const initialContacts = [
  { id: 'n1', name: 'Studioleitung', category: 'Studio & Personal', studio: 'Dörpen', phone: '', deputy: 'Noch festzulegen' },
  { id: 'n2', name: 'Geräteservice', category: 'Technik & Geräte', studio: 'Alle Studios', phone: '', deputy: 'Noch festzulegen' },
  { id: 'n3', name: 'Zentrale Anlaufstelle', category: 'Allgemeine Anliegen', studio: 'Alle Studios', phone: '', deputy: 'Noch festzulegen' },
];
export const initialNotices = [
  { id: 'notice-1', title: 'Gerätestörungen direkt melden', body: 'Beispielhinweis: Bei einer Störung Gerät kennzeichnen und die Studioleitung informieren. Den Musterablauf findest du im Wissenshub.', studio: 'Alle Studios', priority: 'Wichtig', target: 'knowledge', expires: '2026-12-31' },
  { id: 'notice-2', title: 'Dein nächster Lernschritt wartet', body: 'Beispielhinweis: Nimm dir Zeit für deine Einarbeitung. Deinen persönlichen Fortschritt findest du direkt im Lernhub.', studio: 'Alle Studios', priority: 'Info', target: 'learning', expires: '2026-12-31' },
  { id: 'notice-3', title: 'Inventur am Freitag vorbereiten', body: 'Beispielhinweis für Haselünne: Bestände vor Ort zählen und mit der Lagerübersicht abgleichen.', studio: 'Haselünne', priority: 'Wichtig', target: 'inventory', expires: '2026-11-06' },
];
