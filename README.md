# Fitness & Gesundheit · Teamhub

Responsive Plattform im Schwarz-Gold-Design für Sögel, Bersenbrück, Dörpen, Lathen, Haselünne, Löningen und Werlte. Der angemeldete Teamzugang verwendet Supabase für gemeinsame Daten und serverseitige Rechte. Die separat gekennzeichnete Demo verwendet ausschließlich lokale Browserdaten.

[Teamhub öffnen](https://patrickwalterwegberg-blip.github.io/Fitness-Gesundheit/) · [Passwort-Anmeldung](https://patrickwalterwegberg-blip.github.io/Fitness-Gesundheit/login.html) · [Funktionsaudit und offene Punkte](docs/FUNKTIONS_AUDIT.md) · [Abnahme mit echten Konten](docs/ABNAHME_CHECKLISTE.md) · [Sicherheits- und Datenschutzprüfung](docs/SICHERHEIT_UND_DATENSCHUTZ_PRUEFUNG.md) · [Betriebsprüfung im Hub](docs/BETRIEBSPRUEFUNG.md)

## Gemeinsame Funktionen im Teamzugang

| Bereich | Vorhandener Umfang | Anleitung |
|---|---|---|
| Startseite | Persönliche Schnellzugriffe, freigegebene Links, Neuigkeiten, Ansprechpartner; Inhalte nach Studio und Rolle | [Startseite und Profile](docs/STARTSEITE_UND_PROFILE.md) |
| Mitarbeiter | Profile, drei Grundrollen, Studios, einzelne Zusatzrechte, Einladung, Import, Passwort, Wiederherstellung und geschützte E-Mail-Zugangsprüfung | [Zugänge](docs/MITARBEITERZUGAENGE.md), [Einzelrechte](docs/FUNKTIONSRECHTE.md), [E-Mail-Prüfung](docs/EMAIL_VERSAND.md) |
| Betriebsprüfung | Lesende Admin-Bestandsaufnahme zu privaten Dateibereichen, zehn zentralen Tabellen, Kontozuordnung, Dateikonsistenz und Hintergrundjob; benötigt 014 | [Betriebsprüfung](docs/BETRIEBSPRUEFUNG.md) |
| Aufgaben und Kalender | Eigene private Aufgaben und Termine, Teamzuweisung, Wiederholungen, Gerätewartung mit verknüpften Kalenderaufgaben | [Kalender und Benachrichtigungen](docs/KALENDER_AUFGABEN_BENACHRICHTIGUNGEN.md) |
| Benachrichtigungen | Chronologischer Verlauf, Lesestand, Fälligkeiten, Aufgaben, Termine, Chat, Feedback, Lernaufträge und Onboarding | [Kalender und Benachrichtigungen](docs/KALENDER_AUFGABEN_BENACHRICHTIGUNGEN.md) |
| Wissen und Dateien | Private Originale, Versionen, Entwurf/Freigabe, Standort-/Rollenrechte und Textsuche; bis 50 MB je Datei | [Dateien und Wissen](docs/DATEIEN_WISSEN_NUTZER.md) |
| Lernhub | Text- und Videolektionen, persönliche Zuweisungen, Lesebestätigungen, Fragen mit einer/mehreren Antworten und kurzen Texteingaben, Bestehensgrenze, getrennte Praxisnachweise | [Videostudio und Prüfungen](docs/VIDEOSTUDIO_UND_PRUEFUNGEN.md) |
| Videostudio | Kamera/Mikrofon, Handykamera, Upload und Wiederaufnahme, private Kursvideos; 50 MB je Datei, direkte Aufnahme bis fünf Minuten | [Videostudio](docs/VIDEOSTUDIO_UND_PRUEFUNGEN.md) |
| Onboarding | Veröffentlichte Vorlagen, Mentor, Startdatum, Kurse/Aufgaben/Einweisungen, persönliche Fortschritte und separate Leitungsbestätigung | [Onboarding](docs/MITARBEITER_ONBOARDING.md) |
| Einladung mit Onboarding | Optionale Auswahl und Vorschau im Einladungsformular; getrennte Rückmeldungen; gezielte Wiederholung der Zuweisung ohne erneute Mailanforderung | [Einladung und Onboarding](docs/EINLADUNG_MIT_ONBOARDING.md) |
| Chat und Feedback | Team-/Studiochats, ungelesene Nachrichten, Feedback mit Zuständigkeiten, Antwort und Rückmeldecode | [Chat und Feedback](docs/CHAT_FEEDBACK_RECHTE.md) |
| Eigene Module und Controlling | Versionierte Formulare, Aufgaben-Zusatzfelder, Freigaben, Aufgaben-/Lernnachweise und CSV-Auswertung | [Module und Controlling](docs/MODULE_UND_CONTROLLING.md) |
| Persönliche Anordnung | Drag & Drop, Touch und Pfeile für Menü und Startseite; pro Konto und Browser gespeichert | [Anordnung](docs/ANORDNUNG.md) |
| Assistent | Eigenständiger KI-Dienst mit Quellen, individueller Freischaltung und Anfragelimits vorbereitet; Originalquellensuche und eigene Aufgaben sofort nutzbar | [Assistent](docs/KI_ASSISTENT.md) |

## Voraussetzungen und Grenzen

Für den bisherigen gemeinsamen Umfang sind die vorhandenen Supabase-Erweiterungen **001–012**, privater Storage und der eingerichtete Einladungsdienst erforderlich. Migrationen liegen unter `backend/supabase/`; die jeweiligen Anleitungen erklären die Aktivierung. Die neueren Oberflächen weisen auf fehlende Erweiterungen hin. Der Veröffentlichungsworkflow installiert keine Datenbankmigrationen und richtet keinen Mailversand ein.

Die lokale Prüfung bestätigt keine aktuelle Installation im gehosteten Projekt. Frühere Rückmeldungen bestätigen Anmeldung und Mailzustellung an das eigene Konto. Eine vollständige aktuelle Abnahme mit einem weiteren Mitarbeiterkonto, echtem Postfach und echten Mobilgeräten muss separat dokumentiert werden.

- **KI:** Echte Modellantworten benötigen zusätzlich Erweiterung 013 und einen aktivierten privaten Modellzugang; die Bereitstellung allein verbindet kein Modell. KI-Wizard, OCR und Videotranskript sind weiterhin offen. Die Wissenssuche zeigt veröffentlichte Originalauszüge und Quellen. PDF-/Office-/Bild-/Videoinhalte werden nicht automatisch ausgelesen.
- **Video und Lernen:** Kein Videoschnitt, keine Bildschirmaufnahme und keine Video-/Audio-/Dateiabgaben von Lernenden. Der Kurseditor bietet Text und Video. Wissenschecks sind serverseitig ausgewertete Fragen; es gibt keine zeitlich begrenzte Prüfung oder KI-Korrektur freier Langtexte. Die Lesebestätigung ist eine Selbstauskunft.
- **Benachrichtigungen:** Hinweise im Hub mit serverseitigem Lesestand. Kein Betriebssystem-Push oder Erinnerungsversand per E-Mail. Bei geschlossenem Hub setzt die regelmäßige Erzeugung einen aktivierten `pg_cron`-Job voraus; sonst werden Fälligkeiten beim Öffnen nachgetragen.
- **Mobile Nutzung:** Responsive Webseite; keine eigene native iOS-/Android-App. Persönliche Drag-and-Drop-Anordnungen synchronisieren sich nicht zwischen Geräten.
- **Weitere Screenshot-Ideen:** Kunden-/Coaching-Dashboards, soziale Community, Lektionen mit Sternebewertung und Gruppen-/Bundle-Zuweisungen sind noch nicht umgesetzt. Details und Prioritäten stehen im [Funktionsaudit](docs/FUNKTIONS_AUDIT.md).
- **Demo:** CRM, Marketingplanung, Lager/Bestellungen, externe Statistik-Vorschauen und weitere lokale Beispieldaten sind keine gemeinsam angebundenen Teamprozesse. 1&1-Postfächer, Dropbox, GoHighLevel und WhatsApp sind nicht verbunden. Einladungsmails des Teamzugangs werden über dessen gesonderten Maildienst angefordert.

## Entwickeln und bauen

Voraussetzung: Node.js 24 und npm; die CI verwendet Node.js 24.

```sh
npm ci
npm run dev -- --port 5173
npm run build
```

Für den Produktionsbuild die öffentlichen Variablen `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` und optional `VITE_APP_VERSION` konfigurieren; siehe [Backend-Einrichtung](docs/BACKEND.md). Private Bereitstellungs- und Maildienstschlüssel gehören nicht in den Webseiten-Build.

`dist/Teamhub.html`, `dist/index.html` und `dist/login.html` enthalten JavaScript, CSS, Icons und Schriften. Die gemeinsamen Teamfunktionen benötigen weiterhin Netzwerkzugriff und die gehostete HTTPS-Anwendung. Die lokale Demo bleibt eine getrennte Vorschau.

## Prüfen

```sh
npm test
npm run test:db
npm run test:access
npm run test:production
```

Die Browserprüfungen verwenden Chromium, standardmäßig `/usr/bin/chromium`; `CHROMIUM_PATH` erlaubt einen anderen Pfad. Playwright startet Vite auf Port 5173. Backend-Antworten und Versand werden simuliert; echte E-Mails werden nicht angefordert. Die PostgreSQL/PGlite-Prüfung installiert die Migrationen 001–012 wiederholt und testet die tatsächlichen SQL-Regeln mit unterschiedlichen Rollen. Die Funktionstests prüfen den Einladungsdienst ohne Mailversand. Der Produktions-Smoke-Test benötigt einen zuvor mit Produktionskonfiguration gebauten Stand und fängt alle Netzwerkanfragen ab.

Die Prüfuhr ist in zeitabhängigen Browserfällen fixiert. Produktive Fälligkeiten und Termine verwenden Europe/Berlin. [Aktuelle Ergebnisse und Abdeckungsgrenzen](docs/FUNKTIONS_AUDIT.md).

## Veröffentlichung

`.github/workflows/pages.yml` baut und veröffentlicht Änderungen auf `main` über GitHub Pages. In **Settings → Pages → Build and deployment → Source** wird **GitHub Actions** benötigt. Ein erfolgreicher Pages-Lauf bestätigt die Bereitstellung des Webseiten-Builds; er ersetzt keine Abnahme von Authentifizierung, SMTP, Storage oder Hintergrundjobs im gehosteten Backend.

Die Edge Function für Einladungen wird separat über `team-access.yml` bereitgestellt. Der Workflow läuft nur bei manuellem Start mit dem konfigurierten Bereitstellungstoken. Normale Frontend-Änderungen starten diesen Workflow nicht.

## Bestehende Demo-Daten

Die Demo speichert Datensätze in `localStorage`, Dateien in IndexedDB. Diese Daten werden nicht zwischen Geräten synchronisiert oder automatisch in den Teamzugang übertragen. Der globale Studiofilter der Demo ist eine Ansichtsauswahl; echte Zugriffsrechte prüft ausschließlich der Teamzugang auf dem Server.

Frühere nummerierte Demo-Standorte werden wiederholbar umbenannt: Studio 02 → Sögel, 03 → Bersenbrück, 04 → Lathen, 05 → Haselünne, 06 → Löningen, 07 → Werlte. Dörpen bleibt erhalten. Zuordnungen bleiben bestehen; hochgeladene Originale werden nicht verändert und Browserdaten müssen nicht gelöscht werden.
