# Funktionsaudit – ursprüngliche Ideen und aktueller Hub

Prüfdatum: 06.11.2026 (Europe/Berlin). Ausgangsstand: `70c5076`. Dieses Audit gleicht die Anforderungen im Chat und die Funktionsideen der LearningSuite-Screenshots mit dem vorhandenen Teamhub ab.

**Umgesetzt und automatisiert geprüft** bedeutet: Die Anwendung und ihre Datenbankregeln wurden lokal geprüft. Browser- und Produktions-Smoke-Tests simulieren das Backend, PGlite führt die SQL-Regeln aus. Das ist keine Bestätigung der aktuellen produktiven Supabase-Installation, Mailzustellung oder Funktion auf einem tatsächlichen iPhone. Eine neue vollständige Rückmeldung zum Test mit einem weiteren Mitarbeiterkonto liegt bei Erstellung dieses Audits nicht vor.

## Abgleich der ursprünglichen Ideen

| Idee / Anforderung | Tatsächlicher Stand | Nachweis / Grenze |
|---|---|---|
| Eigenes Schwarz-Gold-Design und mobile Navigation | Umgesetzt und automatisiert geprüft | `home-roles`, `studios`, `hub`; kein Wechsel zur Marke der Referenzscreenshots |
| Startseite mit Schnellzugriffen, Links, Neuigkeiten, Ansprechpartnern | Umgesetzt und automatisiert geprüft | `home-roles`; Freigaben nach Studio/Rolle; gemeinsame Inhalte benötigen 008 |
| Mitarbeiterprofile mit wichtigen Informationen und Lernfortschritt | Umgesetzt und automatisiert geprüft | `user-management`, `home-roles`; keine erfundenen Stammdaten |
| Grundrollen plus einzelne zusätzliche Funktionsrechte | Umgesetzt und automatisiert geprüft | `function-permissions`, `database`; Studio-/Bereichsrechte gelten zusätzlich |
| Einladung, Passwort und Wiederherstellung | Umgesetzt und automatisiert geprüft | `invitation-ui`, `password-login`, `team-access-function`; tatsächlicher Empfang beim Mitarbeiter noch abzunehmen |
| E-Mail-Zugang ohne Versand prüfen | Umgesetzt und automatisiert geprüft | `team-mail`; aktueller Kontodatensatz, Profilfreigabe und Studiozuordnung; Mailanbieter und tatsächliche Zustellung bleiben separat zu prüfen. [Anleitung](EMAIL_VERSAND.md) |
| Einladung mit Onboarding verbinden | Umgesetzt und automatisiert geprüft | `invitation-onboarding`; Vorlage/Studio/Mentor/Fristen prüfen; Mail und Plan getrennt bestätigen |
| Eigene private Aufgaben und Termine | Umgesetzt und automatisiert geprüft | `schedule`, `database`; fremde private Aufgaben bleiben auch für Leitung verborgen |
| Leitung weist Aufgaben einzelnen Mitarbeitern zu | Umgesetzt und automatisiert geprüft | `schedule`, `function-permissions`, `database` |
| Wiederkehrende Aufgaben, z. B. alle sechs Monate | Umgesetzt und automatisiert geprüft | `schedule-model`, `database`; Folge entsteht beim Abschluss, Rhythmus bleibt an der bisherigen Fälligkeit verankert |
| Gerätewartungen im Kalender | Umgesetzt und automatisiert geprüft | `schedule`, `database`; gemeinsamer Wartungsplan erzeugt verknüpfte Aufgabe; lokale Demo-Geräte werden nicht automatisch übernommen |
| Glocke als chronologisches Benachrichtigungsfeld | Umgesetzt und automatisiert geprüft | `schedule`, `notification-targets`, `database`; Lesestand bleibt erhalten; kein OS-Push und kein Erinnerungsversand per E-Mail |
| Hintergrunderinnerung bei geschlossenem Hub | Teilweise, Einrichtung im echten Projekt ungeprüft | `pg_cron`-Job aus 010 muss aktiv sein; andernfalls Nachtrag beim nächsten Öffnen |
| Kurse mit Lektionen und Text-/Videoinhalten | Umgesetzt und automatisiert geprüft | `pilot`, `course-videos`, `onboarding`; kein vollständiger Blockeditor mit Audio, Bildgalerien und eingebetteten Fremdinhalten |
| Video direkt auf Handy/Laptop aufnehmen und hochladen | Umgesetzt und automatisiert geprüft | `course-videos`; 50 MB, direkte Aufnahme bis fünf Minuten; reale Kamera, Mobilbrowser und Storage-Übertragung noch abzunehmen |
| Bildschirm / Kamera plus Bildschirm / Videoschnitt | Offen | Bisher Kameraaufnahme und Datei-Upload; kein Schnitt- oder Bildschirmrecorder |
| Fragen und Prüfungen nach den Lektionen | Umgesetzt, erweiterte Prüfungsformen offen | `course-videos`, `pilot`, `database`; Single-/Multiple-Choice und kurze Textantworten, Bestehensgrenze und Versuche; kein Zeitlimit, keine individuelle Punktegewichtung, keine freie KI-Korrektur |
| Abgaben durch Mitarbeiter: Video, Text, Audio oder Datei; Trainerbewertung | Offen | Die vorhandene Praxisbestätigung ist kein Abgabe- und Bewertungsworkflow |
| Persönliche Einarbeitungspläne mit Mentor und Fortschritt | Umgesetzt und automatisiert geprüft | `onboarding`, `database`; Lesen, Quiz, Aufgaben und erforderliche Leitungsbestätigung zählen getrennt |
| Nutzergruppen, Bundles und Sammelzuweisung | Offen | Rollen, Studios, Einzelzuweisungen und Onboardingvorlagen vorhanden; keine frei verwalteten Lerngruppen/Bundles |
| Feedback und Sterne direkt an einer Lektion | Offen | Allgemeines Teamfeedback mit Zuständigkeit und Rückmeldecode ist umgesetzt; keine Lektionenbewertung |
| Soziale Community mit Beiträgen und Reaktionen | Offen | Gemeinsamer Chat ist umgesetzt; er ersetzt keinen Social-Feed |
| Individuelle Kunden- und Coaching-Dashboards | Offen | Die vorhandene gemeinsame Startseite ist ein Mitarbeiter-Intranet |
| KI-Assistent / LearningSuite Intelligence | Bot-Anbindung vorbereitet; Aktivierung offen | Eigenständiger Dienst, Quellen, individuelle Freischaltung und Anfragelimits vorhanden. Modellbetrieb benötigt 013 und private Modell-Secrets. Originalquellensuche und eigene Aufgaben bleiben nutzbar. |
| KI-Wizard zur automatischen Inhaltserstellung | Offen | Keine Modellanbindung, keine Video-Transkription, kein automatisches Erstellen von Zusammenfassungen oder Fragen |
| Wissens- und Dateiverwaltung | Umgesetzt und automatisiert geprüft | `shared-knowledge`, `user-management`, `database`; private Originale, Versionen, Freigabe, Textsuche; keine OCR oder automatische PDF-/Office-/Videoauswertung |
| Schutz vor unerlaubtem Zugriff / Guardian-Referenz | Teilweise | Private Speicher, Rollen-/Studiofreigaben und kurzlebige Video-Adressen vorhanden; kein DRM- oder Wasserzeichenschutz |
| App für iPhone, iPad und Android | Teilweise | Responsive Webseite; kein eigenes App-Store-/Play-Store-Produkt |
| Buttons / Bereiche anders anordnen | Umgesetzt für persönliche Anordnung | `layout-order`; Menü und Startseiten-Kacheln per Maus/Touch/Pfeilen, pro Konto und Browser; keine geräteübergreifende Layout-Synchronisierung |
| Modulbaukasten und Controlling | Umgesetzt im beschriebenen Umfang | `administration`, `database`; eigene Formulare und Aufgaben-Zusatzfelder, getrennte Bearbeiterrechte; keine Dateiuploadfelder im Online-Baukasten |

Zusätzlich vorhandene lokale CRM-, Marketing-, Lager-/Bestell- und externe Statistik-Vorschauen sind keine gemeinsam angebundenen Produktivprozesse. Dropbox, GoHighLevel, WhatsApp und 1&1-Postfachzugriff sind nicht verbunden. Der vorhandene Einladungsdienst ist davon unabhängig.

## In diesem Prüflauf korrigiert

1. **Lernbenachrichtigungen öffneten nur den Bereich.** Nach einer vorherigen Onboarding-Ansicht konnte die Benachrichtigung dort hängen bleiben. Der Hub löst nun den eigenen Lernauftrag auf und öffnet dessen Kurs. Neu zugewiesene Kurse werden nachgeladen, statt die bereits geöffnete Kursliste weiterzuverwenden. Eine wiederholte Benachrichtigung kann einen geschlossenen Kurs erneut öffnen.
2. **Vorzeitiger Lesestand bei einem nicht verfügbaren Ziel.** Der Ziel-Lernauftrag wird vor der Lesebestätigung geprüft. Ein fehlender Lernauftrag bleibt ungelesen. Scheitert die Lesebestätigung, bleibt der aktuelle Bereich bestehen und der Fehler im Benachrichtigungsfeld sichtbar.
3. **Unpassende Aufgabenlisten im Assistenten.** Eine Frage nach offenen Aufgaben lieferte vorher nur bis heute fällige Aufgaben; eine Frage nach morgen konnte ebenfalls den heutigen Stand liefern. Offene Aufgaben umfassen nun auch zukünftige Fälligkeiten, überfällige Aufgaben verwenden eine strikte Grenze vor heute. Für fremde Zuständigkeiten, erledigte Aufgaben und andere Zeiträume nennt der Assistent seinen begrenzten Umfang.
4. **Veraltete Dokumentation.** Die README enthielt noch Aussagen, gemeinsame Dateien und Lernen fehlten und Einladungen würden überhaupt nicht versendet. Sie beschreibt jetzt die Erweiterungen 001–012 und trennt Teamzugang, Demo, bestehende Funktionen und offene Anbindungen.

Für diese Korrekturen ist keine neue SQL-Erweiterung erforderlich.

## Prüfungen und Grenzen

Ergebnisse des vollständigen Prüflaufs:

| Prüfung | Ergebnis |
|---|---|
| `npm test` | 184 Browserfälle bestanden, keine Fehler (3,9 Minuten) |
| `npm run test:db` | 131 Datenbank-/Modellprüfungen bestanden |
| `npm run test:access` | 9 Prüfungen des Einladungsdienstes bestanden |
| Produktionsbuild mit öffentlicher Backendkonfiguration | Erfolgreich erstellt |
| `npm run test:production` | Bestanden, einschließlich exakter Kursbenachrichtigung nach geöffneter Onboarding-Ansicht |

Neue Regressionen liegen in `tests/notification-targets.spec.js`, `tests/assistant.spec.js` und `tests/assistant-model.test.mjs`. Bestehende Tests behandeln insbesondere Rechteentzug, Studioabgrenzung, private Aufgaben, Wiederholungen, Wartungskalender, Versandfehler, Onboarding-Wiederholungen, private Uploads, gemischte Prüfungen und mobile Ansichten.

Die lokale SQL-Prüfung bildet Storage-Tabellen nach. Sie prüft Berechtigungen und Metadaten, aber nicht den gehosteten Storage-Dienst, SMTP-Zustellung, die reale Gerätekamera oder die Einrichtung des produktiven Cron-Jobs. Ein erfolgreicher GitHub-Pages-Lauf bestätigt ausschließlich die Bereitstellung des Frontends.

## Reihenfolge der weiteren Arbeit

1. **Grundfunktionen im echten Betrieb abnehmen:** [Checkliste mit echten Konten](ABNAHME_CHECKLISTE.md), insbesondere Mailzustellung, Mitarbeiterrechte, Kamera-/Storage-Upload und Fälligkeitsmeldungen. Ergebnisse mit Datum festhalten; nur bestätigte Ergebnisse als bestanden markieren.
2. **KI-Modell später:** Die weitere Modellanbindung ist auf Nutzerwunsch zurückgestellt. Die vorhandene Originalquellensuche bleibt verfügbar. Eine tatsächliche Modellkonfiguration ist weiterhin nicht bestätigt.
3. **Lerninhalte und Rückmeldungen ausbauen:** Abgaben und Trainerbewertung, anschließend Lektionenfeedback und zusätzliche Editorbausteine. Vorhandene Lernnachweise und Rechte müssen erhalten bleiben.
4. **Video erweitern:** Bildschirmaufnahme und Schnitt mit passenden Speicher-/Verarbeitungsgrenzen planen; tatsächliche Gerätekompatibilität prüfen.
5. **Weitere Produktbereiche entscheiden:** Kundendashboards, Community, Gruppen/Bundles und native App sind eigenständige Erweiterungen. Sie gehören derzeit nicht zum abgenommenen Funktionsumfang.

## Nachtrag: Rückmeldung bei der Anmeldelink-Anforderung

Ein anschließender Codecheck bestätigte, dass ausdrücklich abgewiesene Auth-Anfragen (`signup_disabled` / `user_not_found`) zuvor wie angenommene Anfragen dargestellt wurden. Die Oberfläche meldet eine solche Ablehnung jetzt neutral als nicht bestätigten Linkversand. Für tatsächlich angenommene Anfragen wird ausdrücklich zwischen Annahme, Versand und Zustellung unterschieden; der Countdown bestätigt keine Zustellung. Empfängerbeschränkung, deaktivierter E-Mail-Anbieter, Dienst-/SMTP-Fehler und Rate-Limit erhalten passende Fehlermeldungen. Es bleibt bei bestehenden Zugängen; öffentliche Selbstregistrierung wird nicht aktiviert.

Die gezielte Prüfung umfasst 42 bestandene Browserfälle für Anmeldung, Wiederherstellung, Zugänge und Einladungsformulare. Eine direkte öffentliche Auth-Konfigurationsabfrage wurde in der Entwicklungsumgebung vom Netzwerkproxy mit HTTP 403 blockiert. Es liegen keine administrativen Supabase-Zugangsdaten für eine private Versandprotokollprüfung vor. Die konkrete Ursache einer ausbleibenden echten Mail und die tatsächliche Zustellung sind damit weiterhin nicht bestätigt. [Prüfschritte für den Betreiber](PASSWORT_ANMELDUNG.md#wenn-kein-link-ankommt).


## Ergänzung: geschützte E-Mail-Zugangsprüfung

Unter **Mitarbeiterzugänge → E-Mail-Zugang prüfen** werden Konto, Profilfreigabe und Studiozuordnung erneut aus der eingeschränkten Serverliste geladen. Das Lesen versendet keine Mail; ein Anmeldelink wird erst ausdrücklich angefordert. Der Einladungsdienst liefert bei Versandablehnungen sichere Kategorien und eine Vorgangsnummer, ohne rohe Providerdetails zurückzugeben. Die bisherige öffentliche Anmeldung bleibt unabhängig davon neutral. Keine neue SQL-Migration erforderlich. [Betrieb und Grenzen](EMAIL_VERSAND.md).

Prüfstand dieser Erweiterung: **197 Browserfälle, 131 Datenbank-/Modelltests und 13 Diensttests bestanden**, zusätzlich ein bestandener Produktionstest mit vollständig simuliertem Backend. Die konkrete private SMTP-Konfiguration und tatsächliche Mailzustellung sind damit nicht bestätigt. Die neue Oberfläche und der Einladungsdienst werden über getrennte bestehende Workflows veröffentlicht.


## Ergänzung: eigenständiger KI-Bot vorbereitet

Der neue Dienst `team-assistant` verbindet Fragen direkt mit einem konfigurierbaren OpenAI-kompatiblen Modell, ohne Make. Rechte, aktuelle veröffentlichte Originaltexte, begrenzter Fragenkontext, Quellenverweise, individuelle Freischaltung `assistant.ask` und Datenbank-Anfragelimits sind implementiert. Die bisherige Originalquellensuche und eigene Aufgaben bleiben unabhängig davon nutzbar. Für den echten Modellbetrieb müssen **013_team_assistant.sql** und private Modell-Secrets aktiviert werden; der Code-Deploy erledigt diese Aktivierung nicht. Ein produktiver Modellaufruf ist noch nicht bestätigt. [Einrichtung, Betrieb und Grenzen](KI_ASSISTENT.md). KI-Wizard, Transkription und automatische Schreibaktionen bleiben offen.


Prüfstand der Bot-Erweiterung: **207 Browserfälle, 135 Datenbank-/Modelltests, 9 Bot-Diensttests und 13 Einladungsdiensttests bestanden**, zusätzlich ein bestandener Test des kompilierten Produktionsbuilds mit beiden Antwortmodi. Backend und Modell sind bei Browser-/Produktionstests vollständig simuliert. Die Bereitstellung ersetzt nicht die ausstehende Installation von 013 und die Abnahme mit einem echten Modellzugang.

## Ergänzung: Sicherheits- und Datenschutzprüfung

Die anschließende [Sicherheits- und Datenschutzprüfung](SICHERHEIT_UND_DATENSCHUTZ_PRUEFUNG.md) ergänzt CSP/Referrer-Schutz im Produktionsbuild, einen gemeinsamen CSV-Encoder gegen Formeleingaben und die korrekte Kennzeichnung echter Controlling-Exporte. Nach der Korrektur bestehen 208 Browserfälle, 136 SQL-/Modelltests, 13 Einladungsdiensttests und 9 Bot-Diensttests sowie der Produktionstest. npm-Audit meldet 0 bekannte Schwachstellen. Private Live-Konfiguration, Datenschutzinformation, Aufbewahrung und Backup-/Wiederherstellungsnachweise bleiben separat zu prüfen. Der Bericht ist kein ausgeführter Codex-Security-Scan und keine Datenschutz-Zertifizierung.


## Ergänzung: unvollständige Video-Uploads zuordnen und abschließen

Das Videostudio zeigt Originaldateinamen und Anlegezeit in Europe/Berlin. **Upload-Abschluss prüfen** verwendet die bestehende Serverbestätigung: Ein vollständig vorhandenes Original kann ohne erneute Dateiauswahl oder Übertragung als bereit bestätigt werden. Fehlende Daten bleiben als unvollständig sichtbar. Fortsetzen verwendet denselben Eintrag und die ursprüngliche Datei. Entfernen erfordert jetzt die Prüfung des konkreten Eintrags und eine ausdrückliche Einzelbestätigung; auch das Wiederaufnahmeformular nutzt diese Bestätigung. Ein Abbruch startet keine Löschung. Aktuelle Kurszuordnungen werden weiterhin serverseitig geschützt; lokale Entwürfe anderer Einträge bleiben bei einer Abschlussprüfung erhalten.

Keine neue SQL-Erweiterung erforderlich. **227 Browserfälle, 141 Datenbank-/Modelltests, 13 Einladungsdiensttests und 9 Bot-Diensttests bestehen**, zusätzlich ein bestandener Produktionstest mit simulierter Abschlussprüfung und abgebrochener Entfernung. Der echte unvollständige Upload muss weiterhin im eigenen Hub zugeordnet und geprüft werden. Eine tatsächliche Datei wurde bei den Entwicklungstests nicht verändert. Die KI-Modellanbindung bleibt auf Nutzerwunsch zurückgestellt; die Datenschutzinformation bleibt bis zur Vervollständigung ihrer Angaben ein Entwurf.
