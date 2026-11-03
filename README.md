# Fitness & Gesundheit · Teamhub

Eigenständige, responsive Plattform in Schwarz und Gold für sieben Studios. Die bestehenden Module sind weiterhin eine lokale Demo. Ein separater Teamzugang mit E-Mail-Anmeldung und gemeinsam gespeicherten Aufgaben ist über Supabase vorbereitet, aber ohne Projekt noch nicht aktiv. Keine Abhängigkeit von der Unternehmenswebseite; Schriften und Icons werden lokal ausgeliefert.

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

`dist/Teamhub.html` ist eine eigenständig öffnungsfähige HTML-Datei inklusive JavaScript, CSS, Icons und Schriften. Sie kann heruntergeladen und direkt im Browser geöffnet werden. Alternativ `npm run preview` für den gebauten Stand starten. Die `dist`-Dateien lassen sich auf einem statischen Webhost veröffentlichen. GitHub Pages wurde laut Deploymentanzeige und Bestätigung des Nutzers aktiviert; jeder neue Stand muss über den Build-Workflow bereitgestellt werden.

## GitHub Pages

Der Workflow `.github/workflows/pages.yml` baut den Stand bei Änderungen auf `main` oder bei manuellem Start. Im Repository muss unter **Settings → Pages → Build and deployment → Source** zunächst **GitHub Actions** eingestellt sein. Die Verfügbarkeit von Pages hängt von Sichtbarkeit und GitHub-Tarif ab; das Repository wird nicht automatisch öffentlich gemacht.

Anschließend den Workflow **Teamhub veröffentlichen** unter **Actions** ausführen. Erst ein erfolgreiches Deployment und eine Prüfung der zurückgegebenen öffentlichen URL bestätigen die Veröffentlichung. Der Workflow allein ist noch keine veröffentlichte Webseite. Eine eigene Domain ist für die GitHub-Pages-Adresse nicht erforderlich.

## Prüfen

```sh
npm test
npm run test:db
```

Playwright verwendet standardmäßig `/usr/bin/chromium`. Bei Bedarf mit `CHROMIUM_PATH` einen anderen Chromium-Pfad angeben. Die Tests starten Vite oder verwenden einen bereits laufenden Server auf Port 5173.

Browserprüfungen decken Modulnavigation, lokale Speicherung, Aufgaben mit Folgeterminen, Bearbeitung, Status und Rückmeldungen, Text-Upload mit Freigabe und Assistentenquellen, anonymes Feedback, Lager/Bestellungen, CRM, Lernfortschritt und mobile Bedienung ab. Der Teamzugang wird mit simulierten Supabase-HTTP-Antworten geprüft; es werden dabei keine echten E-Mails versendet. Zwölf zusätzliche PostgreSQL/PGlite-Prüfungen führen die echten SQL-Zugriffsregeln mit verschiedenen Benutzerrollen aus. Das beweist noch keine Bereitschaft eines gehosteten Supabase-Projekts.

Datum, Begrüßung und Kalender verwenden Europe/Berlin und aktualisieren sich beim Tageswechsel. Die Browserprüfungen fixieren ihre eigene Uhr, um wiederholbare Ergebnisse zu erhalten. Einzelne ursprüngliche Demoereignisse enthalten weiterhin feste Beispieldaten.

## Funktionsumfang

- Gesamtübersicht und Studiofilter für Sögel, Bersenbrück, Dörpen, Lathen, Haselünne, Löningen und Werlte
- Persönliches Mitarbeiterdashboard mit Profilwahl, eigenen Aufgaben und Terminen, wichtigen Studiohinweisen mit Lesebestätigung, getrenntem Lernfortschritt und Schnellzugriffen
- Aufgaben mit standortbezogenen Verantwortlichen, Prioritäten, Wiederholungen, Beschreibung, Bearbeitung, Status, Rückmeldungen und lokalem Verlauf; Kalender mit aktuellem Datum
- Separater Teamzugang für echte E-Mail-Anmeldung, serverseitige Rollen und gemeinsame einmalige Aufgaben mit Rückmeldungen (Projektkonfiguration erforderlich)
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

In der **Demo** liegen Datensätze in `localStorage`, Dateien in IndexedDB. Diese Daten werden nicht zwischen Geräten synchronisiert und nicht automatisch an ein Backend übertragen. Ein Wechsel von Datei-Öffnung zu einem Webhost verwendet einen anderen Browser-Speicher. Keine sensiblen oder echten betrieblichen Daten in der Demo eingeben; Browser-Speicher kann gelöscht oder verworfen werden.

Der **Teamzugang** verwendet ausschließlich Supabase-Anmeldung und Datenbanktabellen, sobald das Projekt konfiguriert ist. Ohne Konfiguration zeigt er nur die Einrichtungshilfe. Er lädt keine lokalen Demoaufgaben. Die Anbindung umfasst zunächst einmalige Aufgaben und Rückmeldungen; weitere Module und Automatisierungen müssen separat migriert werden. Authentifizierung, E-Mail-Zustellung und Regeln im echten Projekt sind vor Nutzung zu prüfen. Siehe [Einrichtung Schritt für Schritt](docs/BACKEND.md).

Der Assistent durchsucht freigegebene TXT-, Markdown- und CSV-Texte (maximal 60.000 Zeichen je Datei) und vorbereitete Beispieldokumente. PDF, Office, Bild und Video werden gespeichert, aber nicht ausgelesen. Upload-Limit: 20 MB pro Datei. Hochgeladener Inhalt wird als Text angezeigt und nie als HTML ausgeführt. Dateien sind noch nicht serverseitig auf Schadsoftware geprüft.

Anonymes Feedback enthält kein Autor- oder Mitarbeiterfeld. Inhalt, Thema und Standort können trotzdem Rückschlüsse ermöglichen. Jeder mit Zugriff auf diesen Browser kann die lokalen Meldungen sehen. Vertrauliche Zustellung und Rollenrechte sind in dieser Version nicht wirksam. Der operative JSON-Export enthält keine Feedback-, Mitarbeiter-, Chat- oder Dateiinhalte.

1&1, Dropbox, GoHighLevel und WhatsApp sind **nicht verbunden**. Einladungen, Erinnerungen, Kampagnen, Feedback und Bestellungen werden nicht versendet. Postfachpasswörter werden nicht abgefragt oder gespeichert. Das Mitarbeiterprofil ist ein Demo-Profil. Der globale Studiofilter ist eine Ansichtsauswahl und kein Zugriffsschutz.

Für den Produktivbetrieb fehlen insbesondere die Bereitstellung und Konfiguration des Backend-Projekts, echte Accounts und geprüfte Zustellung, sichere Dateiverarbeitung, verbindliche Feedback-Meldewege, geplante Erinnerungen, überwachte Integrationen, Backups sowie freigegebene echte Inhalte. SQL-Schema, Zugriffsschutz und erste Anmelde-/Aufgabenoberfläche sind vorbereitet und lokal getestet; sie sind noch nicht in einem echten Projekt validiert.

## Bestehende Browserdaten nach der Standortbenennung

Gespeicherte nummerierte Demo-Standorte werden beim Laden automatisch und wiederholbar umbenannt: Studio 02 → Sögel, Studio 03 → Bersenbrück, Studio 04 → Lathen, Studio 05 → Haselünne, Studio 06 → Löningen, Studio 07 → Werlte. Dörpen bleibt unverändert. Die Auswahl sowie Aufgaben, Dateien, Kontakte, Mitarbeiter, Hinweise, Geräte, Lager und Bestellungen behalten ihre übrigen Daten. Freitexte und hochgeladene Originaldateien werden nicht verändert; nur der ursprüngliche mitgelieferte Inventurhinweis wird angepasst. Es ist kein Löschen des Browser-Speichers notwendig.
