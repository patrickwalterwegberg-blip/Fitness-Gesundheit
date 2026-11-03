# Fitness & Gesundheit · Teamhub

Eigenständiger, responsiver Frontend-Prototyp für sieben Studios. Keine Abhängigkeit von der Unternehmenswebseite, keine extern geladenen Schriftdateien oder Bilder. Die vom Nutzer vorgegebene Fitness- und Gesundheitsgestaltung verwendet Schwarz und Gold mit hellen Inhaltsflächen für gute Lesbarkeit. Die exakte Gestaltung der Unternehmenswebseite konnte beim Aufbau nicht abgerufen werden.

## Entwickeln

Voraussetzung: Node.js 22.12+ (validiert mit Node.js 24.22.1) und npm.

```sh
cd /workspace/Fitness-Gesundheit
npm ci
npm run dev -- --port 5173
```

## Erstellen und öffnen

```sh
npm run build
```

`dist/Teamhub.html` ist eine eigenständig öffnungsfähige HTML-Datei inklusive JavaScript, CSS, Icons und Schriften. Sie kann heruntergeladen und direkt im Browser geöffnet werden. Alternativ `npm run preview` für den gebauten Stand starten. Die `dist`-Dateien lassen sich auf einem statischen Webhost veröffentlichen; eine Veröffentlichung ist noch nicht erfolgt.

## GitHub Pages

Der Workflow `.github/workflows/pages.yml` baut den Stand bei Änderungen auf `main` oder bei manuellem Start. Im Repository muss unter **Settings → Pages → Build and deployment → Source** zunächst **GitHub Actions** eingestellt sein. Die Verfügbarkeit von Pages hängt von Sichtbarkeit und GitHub-Tarif ab; das Repository wird nicht automatisch öffentlich gemacht.

Anschließend den Workflow **Teamhub veröffentlichen** unter **Actions** ausführen. Erst ein erfolgreiches Deployment und eine Prüfung der zurückgegebenen öffentlichen URL bestätigen die Veröffentlichung. Der Workflow allein ist noch keine veröffentlichte Webseite. Eine eigene Domain ist für die GitHub-Pages-Adresse nicht erforderlich.

## Prüfen

```sh
npm test
```

Playwright verwendet standardmäßig `/usr/bin/chromium`. Bei Bedarf mit `CHROMIUM_PATH` einen anderen Chromium-Pfad angeben. Die Tests starten Vite oder verwenden einen bereits laufenden Server auf Port 5173.

Zwölf Browserprüfungen decken Modulnavigation, lokale Speicherung, Aufgaben mit Folgeterminen, Text-Upload mit Freigabe und Assistentenquellen, anonymes Feedback, Bestellung und Wareneingang, CRM-Stufen, persönlichen Lernfortschritt sowie mobile Bedienung ab. Das Mitarbeiterdashboard wird auf aufgabengenaue Zuweisung, standortbezogene Hinweise und getrennte Lesebestätigungen getestet. Die externe Statistikansicht wird mit einer simulierten Antwort geprüft; der tatsächliche externe Dienst konnte nicht verifiziert werden. Die Vorschau verwendet feste Beispieldaten zum 3. November 2026.

## Funktionsumfang

- Gesamtübersicht und Studiofilter (Dörpen; weitere sechs Studionamen sind Platzhalter)
- Persönliches Mitarbeiterdashboard mit Profilwahl, eigenen Aufgaben und Terminen, wichtigen Studiohinweisen mit Lesebestätigung, getrenntem Lernfortschritt und Schnellzugriffen
- Aufgaben mit Verantwortlichen, Prioritäten und Wiederholungen; Kalender
- Wissen und Dateiverwaltung mit lokalem Upload, Download, Zuordnung und Freigabe
- Lernhub mit Beispiellektionen und gespeichertem Fortschritt
- Mitarbeiterprofile; keine echten Benutzerkonten
- Namentliches oder anonymes Feedback mit thematischer Zuständigkeit, Status und Rückmeldecode
- Lokale CRM-Pipeline nach der bestehenden Saleslift-/GoHighLevel-Struktur
- Marketingkampagnen als interne Planung
- Geräte mit Seriennummern und Status, Serviceaufgaben
- Bestände, lokale Bestellvorgänge und Wareneingang je Studio
- Persönliche und standortbezogene Statistik aus lokalen Datensätzen, CSV-Export sowie zusätzliche eingebettete Ansicht der vorhandenen Statistikseite mit Link als Alternative. Echte externe Zahlen werden nicht importiert; der externe Anbieter kann die Einbettung blockieren.
- Interne Kontakte, separates Notrufangebot 112
- Dokumentenassistent: lokale Stichwortsuche mit Quellen, keine angebundene generative KI
- Einstellungsübersicht der noch einzurichtenden Integrationen

## Daten und Grenzen

Dies ist eine interaktive Demonstration, kein produktives Mitarbeitersystem. Datensätze liegen in `localStorage`, hochgeladene Dateien in IndexedDB des verwendeten Browsers. Die Daten sind nicht zwischen Geräten oder Mitarbeitern synchronisiert. Ein Wechsel von Datei-Öffnung zu einem Webhost verwendet einen anderen Browser-Speicher. Keine sensiblen, personenbezogenen oder echten betrieblichen Daten eingeben. Der Browser-Speicher kann vom Nutzer gelöscht oder vom Browser verworfen werden.

Der Assistent durchsucht freigegebene TXT-, Markdown- und CSV-Texte (maximal 60.000 Zeichen je Datei) und vorbereitete Beispieldokumente. PDF, Office, Bild und Video werden gespeichert, aber nicht ausgelesen. Upload-Limit: 20 MB pro Datei. Hochgeladener Inhalt wird als Text angezeigt und nie als HTML ausgeführt. Dateien sind noch nicht serverseitig auf Schadsoftware geprüft.

Anonymes Feedback enthält kein Autor- oder Mitarbeiterfeld. Inhalt, Thema und Standort können trotzdem Rückschlüsse ermöglichen. Jeder mit Zugriff auf diesen Browser kann die lokalen Meldungen sehen. Vertrauliche Zustellung und Rollenrechte sind in dieser Version nicht wirksam. Der operative JSON-Export enthält keine Feedback-, Mitarbeiter-, Chat- oder Dateiinhalte.

1&1, Dropbox, GoHighLevel und WhatsApp sind **nicht verbunden**. Einladungen, Erinnerungen, Kampagnen, Feedback und Bestellungen werden nicht versendet. Postfachpasswörter werden nicht abgefragt oder gespeichert. Das Mitarbeiterprofil ist ein Demo-Profil. Der globale Studiofilter ist eine Ansichtsauswahl und kein Zugriffsschutz.

Für den Produktivbetrieb fehlen insbesondere Backend und Datenbank, authentifizierte Accounts und serverseitige Rollenrechte, sichere Dateiverarbeitung, verbindliche Feedback-Meldewege, geplanter E-Mail-Versand, überwachte Integrationen, Backups sowie die freigegebenen echten Inhalte und Standortdaten.
