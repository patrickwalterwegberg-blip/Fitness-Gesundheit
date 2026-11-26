# Paket 1S – Benachrichtigungen an aktuelle Quellrechte binden

Stand: 24.11.2026. Ausgangsstand auf GitHub `main` und lokal: `977b2216cda36ba9c65f228975613bfe4c1fce2f`. Dessen [Workflow 45267706705](https://github.com/patrickwalterwegberg-blip/Fitness-Gesundheit/actions/runs/45267706705) bestätigte Bereitstellung und 408 Browsertests. Die manuelle Windows-Programmprüfung wird auf Nutzerwunsch übersprungen; echte Backups und Restore bleiben offen. Dieses Paket bearbeitet eine davon unabhängig prüfbare Zugriffsgrenze. Generative KI bleibt zurückgestellt.

## Bestätigter Befund

Priorität P1: In der aktuellen `app_private.notification_visible` aus SQL 012 genügte bei Feedback die eigene Autor-/Empfängerzuordnung, ohne den vollständigen Quellzugriff zu prüfen. Bei Lernen wurde die eigene Lernenden-ID geprüft, aber nicht die aktuelle Studiofreigabe. Dadurch blieben Feedback- beziehungsweise Kurstitel über frische Serverabfragen lesbar, nachdem der eigentliche Quellzugriff bereits entzogen war.

Der Fehler wurde im unveränderten Code für beide Kategorien mit tatsächlichen lokalen PostgreSQL-/PGlite-RLS-Abfragen reproduziert: Nutzer gehört A+B an, erhält einen Eintrag für A, verliert A und behält B sowie seine Bereichsfreigabe. Die Quelltabelle liefert dann keinen Datensatz, die persönliche Benachrichtigung hingegen weiterhin einen Titel. Beide Baselinefälle scheiterten mit `1 !== 0`. Dies ist ein nachgewiesener Quellcode-/Modellfehler, keine unabhängig beobachtete Abfrage eures gehosteten Projekts.

## Kleine Änderung

[018_notification_source_access.sql](../../backend/supabase/018_notification_source_access.sql) ersetzt ausschließlich den vorhandenen Sichtbarkeitshelper und ergänzt zwei `AND`-Prüfungen:

- Feedback muss zusätzlich `app_private.feedback_visible(f.id)` erfüllen. Der bisherige persönliche Empfängerkreis – Autor, aktuelle zuständige Person oder Admin – bleibt als Voraussetzung erhalten. Ein neu erteiltes allgemeines Feedback-Verwaltungsrecht allein erweitert alte persönliche Meldungen nicht.
- Lernen muss neben der eigenen Lernenden-ID zusätzlich `app_private.learning_read(a.id)` erfüllen. Ein Prüfrecht für fremde Lernaufträge macht deren persönliche Meldungen nicht sichtbar.

Eigentümer-/Aktivitätsprüfung sowie Aufgaben-, Termin-, Chat- und Onboarding-Zweige bleiben gegenüber SQL 012 wortgleich. Security-Definer, `STABLE`, leerer Suchpfad und die vorgesehenen Ausführungsrechte bleiben erhalten. Migrationen 015/017, Rollen, Mitgliedschaften, Meldungen und Lesemarkierungen werden nicht geändert. Es gibt keine Datenbereinigung, keine neue öffentliche RPC und keine Designänderung.

Tabellen-RLS, Inbox/Zähler und Lesemarkierungs-RPC verwenden bereits denselben Helper und erhalten dadurch dieselbe Korrektur. Sichtbarkeit gilt für neue Serverabfragen. Bereits empfangene oder gespeicherte Inhalte können nicht zurückgeholt werden; offene Browseransichten folgen ihren vorhandenen Aktualisierungsintervallen.

## Prüfung

**36 gezielte PostgreSQL-/PGlite-Fälle bestanden.** Die neue Migration wird im Testaufbau zweimal angewandt.

- 28 Fälle: Feedback/Lernen × Mitarbeiter/Studioleitung × Bersenbrück, Dörpen, Haselünne, Lathen, Löningen, Sögel, Werlte. Feedback enthält anonyme und namentliche Fremdmeldungen. Vor Entzug: Quelle, persönliche Meldung und Inbox sichtbar. Nach Entzug nur von A: Quelle und direktes Meldungs-RLS leer; Inbox `items=[]`, `total=0`, `unread=0`.
- Ein verbotenes Markieren des vorher ungelesenen Eintrags verändert `read_at=null` und dessen gesamte historische Zeile nicht. Nach erneuter Zuordnung erscheinen dieselbe ID und derselbe Titel wieder; anschließendes erlaubtes Markieren funktioniert. Andere Personen einschließlich Admin sehen nicht fremde persönliche Inbox-Zeilen.
- Eigene Autor-Meldung bleibt entsprechend dem bestehenden Quellrecht nach Studioentzug sichtbar. Admin-Eigenmeldungen bleiben in beiden Kategorien sichtbar. Ein ehemaliger Empfänger mit neu delegiertem Verwaltungsrecht erhält keine zusätzliche persönliche Sichtbarkeit.
- Entzogene Bereichsfreigaben sperren beide Kategorien weiterhin.
- Rückmigration und erneute Anwendung erhalten die vollständige Meldungshistorie. Der Rückweg lässt die alte schwächere Sichtbarkeit tatsächlich wieder auftreten; erneute Anwendung sperrt sie wieder.
- Funktionsattribute und Ausführungsrechte werden tatsächlich aus PostgreSQL geprüft.

Der vollständige Lauf bestand mit **227 Datenbank-/Modelltests**. Im ersten Gesamtlauf war die pauschale Annahme „Admins haben insgesamt nur eine ungelesene Meldung“ zu eng: Die vorhandenen Terminfixtures erzeugen zusätzlich eine erlaubte Erinnerung. Die beiden Admin-Positivfälle prüfen danach gezielt den betreffenden Eintrag und seinen Lesestand. Diese Testkorrektur änderte keine Serverregel; anschließend bestand die vollständige Reihe ohne Fehler oder Skips.

Die unabhängige Abnahme auf einer eingefrorenen Kopie bestand mit **227 Datenbank-/Modelltests, 13 Zugriffsdiensttests, 9 Mock-Assistenttests und erfolgreichem Build**. Alle 193 Kerndateien waren vor und nach der Prüfung in Arbeitskopie und Testkopie hashgleich; 36 lokale Dokumentationslinks waren erreichbar. Die tatsächliche gehostete Aktivierung wurde dabei nicht geprüft. Der neue GitHub-Veröffentlichungslauf wird erst nach seinem tatsächlichen Abschluss bestätigt. Frontend- und Dienstquellen bleiben unverändert; Browser-/Diensttests simulieren Backendantworten und bestätigen diese SQL-Regel nicht im gehosteten Projekt. Die bestehende CI prüft vor Bereitstellung erneut alle 408 Browserfälle.

## Aktivierung im echten Projekt

1. Das vorhandene **Teamhub-Projekt** in Supabase auswählen und **SQL Editor → New query** öffnen. Die bestehenden Erweiterungen 001–012 und bisherigen Korrekturen müssen berücksichtigt sein. Erweiterung 013 und ein Modellzugang sind hierfür nicht erforderlich.
2. Den vollständigen Inhalt von [018_notification_source_access.sql](../../backend/supabase/018_notification_source_access.sql) kopieren und mit der berechtigten Betreiberrolle ausführen. Die Datei ist wiederholbar und erhält alle Datensätze. Bei einem Fehler keine alten Komplettmigrationen, Rollenänderungen oder RLS-Deaktivierung als Ersatz ausführen.
3. Den Hub neu laden beziehungsweise die Glocke aktualisieren. Ohne private Supabase-Verwaltungsverbindung kann diese Arbeitsumgebung die Migration nicht für euch anwenden. Ein erfolgreicher Frontend-Workflow und vorhandene Funktionssignaturen bestätigen die Aktivierung nicht.

Die echte Installations-/Rollenabnahme bleibt offen, bis sie gemeldet oder über einen geeigneten berechtigten Zugriff geprüft wurde. Reale Mitarbeitendenzuordnungen nicht ohne abgestimmte Prüfplanung nur zum Nachstellen des Fehlers entziehen. Dafür geeignete Prüfkonten und Testdaten im getrennten Ziel verwenden. Die frühere Erweiterung 017 ist weiterhin nicht als gehostet angewandt bestätigt; 018 ersetzt sie nicht.

## Rückweg

[rollback/018_notification_source_access.sql](../../backend/supabase/rollback/018_notification_source_access.sql) stellt den vorherigen Funktionskörper aus SQL 012 exakt wieder her und erhält Daten/Lesestände. **Dabei wird die beschriebene schwächere Sichtbarkeit erneut geöffnet.** Vorwärts korrigieren; einen erforderlichen Rückweg erst nach Einschränkung der betroffenen Bereiche und mit dem Betreiber abstimmen. Kein automatischer Rollback und keine Löschung.

## Nachtrag 26.11.2026

Commit `7e17cddcae6100b62423298997d00d98f9f4b901` wurde mit [Workflow 45478244416](https://github.com/patrickwalterwegberg-blip/Fitness-Gesundheit/actions/runs/45478244416) erfolgreich bereitgestellt; 408 Browserfälle und der Produktionstest bestanden. Der Nutzer meldete danach SQL 018 als ausgeführt, den Hub als neu geladen und das Öffnen der Glocke ohne Fehlermeldung. Das sind Betreiber-Rückmeldungen und eine bestätigte Bedienprüfung. Die tatsächlichen Funktionskörper und Rolle-/Studioentzüge wurden hier weiterhin nicht unabhängig im gehosteten Projekt geprüft. Erweiterung 017, Backup und Restore bleiben separat unbestätigt beziehungsweise offen.
