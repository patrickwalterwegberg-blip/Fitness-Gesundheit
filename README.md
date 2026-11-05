# Fitness & Gesundheit · Teamhub

Eigenständige, responsive Plattform in Schwarz und Gold für sieben Studios. Die bestehenden Demo-Module verwenden Browserdaten. Der separate Teamzugang nutzt Supabase für E-Mail-Anmeldung, Aufgaben, Wissen/Dateien, Nutzerverwaltung, eigene Formulare und Controlling. Die Einrichtung der Migrationen 001–005 sowie Login und Mailzustellung an das eigene Konto wurden vom Nutzer bestätigt; ein separates Mitarbeiterkonto ist noch zu testen. Mit Migration 006 kommen persönliche Übersicht, Aufgabenkalender und die gemeinsame Kurs-/Quizoberfläche hinzu. Migration 007 ergänzt gemeinsame Chats, Feedback und individuelle Bereichsfreigaben. [Einrichten und vollständig testen](docs/PILOT_TESTBETRIEB.md). Keine Abhängigkeit von der Unternehmenswebseite; Schriften und Icons werden lokal ausgeliefert.

Die [eigene Loginseite](https://patrickwalterwegberg-blip.github.io/Fitness-Gesundheit/login.html) unterstützt E-Mail und persönliches Passwort, erstmaliges Festlegen per bestätigtem E-Mail-Link, Passwortwiederherstellung und Abmelden. [Anleitung](docs/PASSWORT_ANMELDUNG.md). Das benötigt keine zusätzliche SQL-Migration.

Der angemeldete Teamzugang verwendet die Gestaltung der Demo: feste Seitenleiste, Schwarz-Gold-Farben, Willkommensbereich und persönliche Übersichtskarten mit Serverdaten. Auf dem Handy öffnet sich die Navigation über das Menü; Abmelden und Chat-Hinweise bleiben im festen Kopfbereich erreichbar. Die Navigation zeigt ausschließlich freigegebene Bereiche. Diese Layoutänderung benötigt keine neue SQL-Migration.

Startseite und Mitarbeiterverwaltung sind als Intranet organisiert: persönliche Schnellzugriffe, gemeinsame Links, Neuigkeiten und Ansprechpartner; Nutzerfilter, Rollen-Karten und Profile mit Informationen, Aufgaben, Lernfortschritt und Rechten. Der eigene Profilzugriff ist für jeden angemeldeten Mitarbeiter verfügbar. Für gemeinsame Startseiteninhalte, berufliche Profilangaben und delegierte Startseitenpflege einmalig Migration 008 installieren. [Anleitung und tatsächliche Rechte](docs/STARTSEITE_UND_PROFILE.md).

Einzelne Zusatzfunktionen können unabhängig von der Grundrolle pro Person freigeschaltet werden: 45 Aktionen mit Suche, Rollenstandard, expliziten Abhängigkeiten und serverseitigen Prüfungen. Einmalig Migration 009 aktivieren; 008 ist darin enthalten. [Funktionsrechte einrichten und bedienen](docs/FUNKTIONSRECHTE.md).

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
npm run test:access
```

Playwright verwendet standardmäßig `/usr/bin/chromium`. Bei Bedarf mit `CHROMIUM_PATH` einen anderen Chromium-Pfad angeben. Die Tests starten Vite oder verwenden einen bereits laufenden Server auf Port 5173.

Browserprüfungen decken Modulnavigation, lokale Speicherung, Aufgaben mit Folgeterminen, Bearbeitung, Status und Rückmeldungen, Text-Upload mit Freigabe und Assistentenquellen, anonymes Feedback, Lager/Bestellungen, CRM, Lernfortschritt und mobile Bedienung ab. Zusätzliche Prüfungen behandeln Baukastenrechte, unveränderte Alteinträge nach Feldänderungen, Wiederherstellung von Modulversionen, Zusatzfelder, Originaldateien und getrennte Lernnachweise. Der Teamzugang einschließlich Online-Baukasten und Controlling wird mit simulierten Supabase-HTTP-Antworten geprüft; es werden dabei keine echten E-Mails versendet. PostgreSQL/PGlite-Prüfungen führen alle neun Migrationen und deren echte SQL-Zugriffsregeln mit verschiedenen Benutzerrollen aus. Das beweist noch keine Bereitschaft eines gehosteten Supabase-Projekts.

Datum, Begrüßung und Kalender verwenden Europe/Berlin und aktualisieren sich beim Tageswechsel. Die Browserprüfungen fixieren ihre eigene Uhr, um wiederholbare Ergebnisse zu erhalten. Einzelne ursprüngliche Demoereignisse enthalten weiterhin feste Beispieldaten.

## Funktionsumfang

- Gesamtübersicht und Studiofilter für Sögel, Bersenbrück, Dörpen, Lathen, Haselünne, Löningen und Werlte
- Persönliches Mitarbeiterdashboard mit Profilwahl, eigenen Aufgaben und Terminen, wichtigen Studiohinweisen mit Lesebestätigung, getrenntem Lernfortschritt und Schnellzugriffen
- Aufgaben mit standortbezogenen Verantwortlichen, Prioritäten, Wiederholungen, Beschreibung, Bearbeitung, Status, Rückmeldungen und lokalem Verlauf; Kalender mit aktuellem Datum
- Separater Teamzugang für echte E-Mail-Anmeldung, serverseitige Rollen und gemeinsame einmalige Aufgaben mit Rückmeldungen (Projektkonfiguration erforderlich)
- Admin-Verwaltung für Mitarbeiterzugänge: Einladungen über eine geschützte Edge Function, erneute Anmeldelinks, Rollen, Studiozuordnungen und Sperren; [Einrichtung](docs/MITARBEITERZUGAENGE.md). Einladungsdienst ist bereitgestellt; Mailzustellung an das eigene Konto ist bestätigt.
- Wissen und Dateiverwaltung mit lokalem Upload, Download, Zuordnung und Freigabe
- Gemeinsame Dateien und Wissensartikel nach Migration 004: privater Dateispeicher, Standort-/Rollenfreigaben, Prüfung, unveränderte Originale, Versionen und Textsuche; PDF-, Bild- und Videovorschau, maximal 50 MB pro Datei. [Einrichtung](docs/DATEIEN_WISSEN_NUTZER.md)
- Erweitertes Nutzermanagement nach Migration 005: Suche/Filter, Profilübersicht mit Aufgaben und Lernzielen, Modul-Bearbeiterrechte sowie CSV-/XLSX-/Kontaktimport mit Vorschau und ausdrücklich angeforderten Einladungen
- Lokaler Demo-Lernhub sowie gemeinsame Akademie nach Migration 006: Textkurse, Einzelzuweisungen, Lesebestätigungen und serverseitig ausgewertete Quizfragen. Lesen, Wissen und Praxis werden getrennt dokumentiert.
- Persönliche gemeinsame Startseite und Aufgabenkalender mit serverseitigen Monatszahlen; [Testbetrieb und offene Anbindungen](docs/PILOT_TESTBETRIEB.md)
- Modulbaukasten für ausgewählte Bearbeiter: neue Formulare, Zusatzfelder, Entwürfe, getrennte Veröffentlichungsrechte, unveränderliche Versionen und Wiederherstellung; [Bedienung und Backend-Umfang](docs/MODULE_UND_CONTROLLING.md)
- Admin-Controlling mit Mitarbeiter-/Studiofiltern, Zeitraum für Aufgabenabschlüsse, dokumentierter ausführender Person, Lernfortschritt, Praxisbestätigung und CSV-Export
- Mitarbeiterprofile in der lokalen Demo; echte Konten werden separat im Teamzugang verwaltet
- Gemeinsamer Chat, Feedback und Bereichsfreigaben nach Migration 007: Studio-/Teamkanäle, Zähler für ungelesene Nachrichten, Zuständigkeiten, Antworten und Rückmeldecode; [Einrichtung und Rechte](docs/CHAT_FEEDBACK_RECHTE.md)
- Lokale Feedbackvorschau bleibt getrennt
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

Der **Teamzugang** verwendet ausschließlich Supabase-Anmeldung und Datenbanktabellen, sobald das Projekt konfiguriert ist. Ohne Konfiguration zeigt er nur die Einrichtungshilfe. Er lädt keine lokalen Demoaufgaben. Die Anbindung umfasst einmalige Aufgaben und Rückmeldungen sowie nach Migration 002 eigene Module, Aufgaben-Zusatzfelder und das Admin-Controlling. Die gemeinsame Lernoberfläche und der gemeinsame Dateispeicher fehlen noch; Kursmetadaten und getrennte Fortschritts-Schnittstellen sind vorbereitet. Weitere Kernmodule und Automatisierungen müssen separat migriert werden. Authentifizierung, E-Mail-Zustellung und Regeln im echten Projekt sind vor Nutzung zu prüfen. Siehe [Einrichtung Schritt für Schritt](docs/BACKEND.md).

Migration 003 ergänzt die serverseitige Mitarbeiterverwaltung und stellt Profile/Studiozuordnungen auf geprüfte RPC-Änderungen um. Die Edge Function für Einladungen wird ausschließlich im Supabase-Backend bereitgestellt; ihre privaten Schlüssel sind kein Bestandteil des Webseiten-Builds. Der separate Workflow `team-access.yml` läuft nur bei manuellem Start mit dem im GitHub-Secret gespeicherten Bereitstellungstoken. Die lokalen Funktionstests prüfen unerlaubte Aufrufe, feste Rücksprungadressen und Versandfehler ohne E-Mails zu senden. Die Benutzeranleitung steht unter [Mitarbeiterzugänge](docs/MITARBEITERZUGAENGE.md).

Migrationen 004 und 005 aktivieren den gemeinsamen Datei-/Wissenshub und die erweiterten Nutzeransichten. Dateien liegen im privaten Supabase-Storage-Bucket `team-knowledge`. Vorschauen laden Originale mit Anmeldung; neue Versionen und Entwürfe bleiben bis zur Freigabe geschützt. Die Datenbanktests bilden die Storage-Kerntabellen nach und prüfen dieselben Policies, ersetzen jedoch keinen echten Storage-API-Test. Vor Live-Nutzung die [Aktivierung und Funktionsgrenzen](docs/DATEIEN_WISSEN_NUTZER.md) beachten. Der Produktionsstart öffnet nun direkt den Teamzugang; die lokale Demo ist ausdrücklich über „Zur Demo“ erreichbar.

Der Assistent durchsucht freigegebene TXT-, Markdown- und CSV-Texte (maximal 60.000 Zeichen je Datei) und vorbereitete Beispieldokumente. PDF, Office, Bild und Video werden gespeichert, aber nicht ausgelesen. Upload-Limit: 20 MB pro Datei. Hochgeladener Inhalt wird als Text angezeigt und nie als HTML ausgeführt. Dateien sind noch nicht serverseitig auf Schadsoftware geprüft.

Anonymes Feedback enthält kein Autor- oder Mitarbeiterfeld. Inhalt, Thema und Standort können trotzdem Rückschlüsse ermöglichen. Jeder mit Zugriff auf diesen Browser kann die lokalen Meldungen sehen. Vertrauliche Zustellung und Rollenrechte sind in dieser Version nicht wirksam. Der operative JSON-Export enthält keine Feedback-, Mitarbeiter-, Chat- oder Dateiinhalte.

1&1, Dropbox, GoHighLevel und WhatsApp sind **nicht verbunden**. Einladungen, Erinnerungen, Kampagnen, Feedback und Bestellungen werden nicht versendet. Postfachpasswörter werden nicht abgefragt oder gespeichert. Das Mitarbeiterprofil ist ein Demo-Profil. Der globale Studiofilter ist eine Ansichtsauswahl und kein Zugriffsschutz.

Für den Produktivbetrieb fehlen insbesondere die Prüfung der echten Anmeldung und Zustellung, die Bereitstellung des Einladungsdienstes, sichere Dateiverarbeitung, verbindliche Feedback-Meldewege, geplante Erinnerungen, überwachte Integrationen, Backups sowie freigegebene echte Inhalte. Das Datenbankschema und das erste Adminprofil wurden laut Einrichtungsrückmeldungen angelegt. Lokale Prüfungen bestätigen die Anwendung und Zugriffsregeln; das Zusammenspiel mit dem echten Projekt und SMTP muss zusätzlich geprüft werden.

## Bestehende Browserdaten nach der Standortbenennung

Gespeicherte nummerierte Demo-Standorte werden beim Laden automatisch und wiederholbar umbenannt: Studio 02 → Sögel, Studio 03 → Bersenbrück, Studio 04 → Lathen, Studio 05 → Haselünne, Studio 06 → Löningen, Studio 07 → Werlte. Dörpen bleibt unverändert. Die Auswahl sowie Aufgaben, Dateien, Kontakte, Mitarbeiter, Hinweise, Geräte, Lager und Bestellungen behalten ihre übrigen Daten. Freitexte und hochgeladene Originaldateien werden nicht verändert; nur der ursprüngliche mitgelieferte Inventurhinweis wird angepasst. Es ist kein Löschen des Browser-Speichers notwendig.
