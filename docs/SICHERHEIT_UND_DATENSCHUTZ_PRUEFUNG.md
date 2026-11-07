# Sicherheits-, Datenschutz- und Funktionsprüfung

Geprüfter Ausgangsstand: `ec8fc60`. Die anschließenden Korrekturen betreffen Browser-Schutzregeln und CSV-Exporte. Die Prüfung umfasst Quellcode, Datenbankregeln in PGlite, simulierte Browser-/Diensttests, einen kompilierten Produktionsbuild sowie die npm-Abhängigkeitsprüfung. Echte Mitarbeiterkonten, Nachrichten, Dateien und produktive Konfigurationen wurden nicht verändert.

## Ergebnis und Aussagegrenzen

Die geprüften Regeln begrenzen Zugriffe serverseitig nach aktiver Person, Rolle, einzelner Funktion, Studio und gegebenenfalls Eigentümer. Für den untersuchten Code und die lokalen Tests ist kein kritischer Sicherheitsfehler nachgewiesen. Zwei Härtungen und eine funktionale Korrektur wurden umgesetzt. Das ist keine Zertifizierung der produktiven Installation oder der DSGVO-Konformität.

**Offen bleibt die produktive Abnahme.** Anfragen an die veröffentlichte GitHub-Pages-Domain und das Supabase-Projekt wurden vom Netzwerkproxy dieser Entwicklungsumgebung mit `Tunnel connection failed: 403 Forbidden` blockiert. Das ist kein nachgewiesener Fehler eurer Seite. Es stehen hier keine privaten Supabase-/SMTP-/Modellzugänge zur Verfügung. Deshalb sind produktive RLS-Konfiguration, Speicherregion, Backups, Auth-Einstellungen, Mailzustellung und echte KI-Antworten nicht bestätigt.

Die Installation von **Codex Security** wurde angefragt und vom Nutzer freigegeben. Ein aufrufbares Scan-Werkzeug wurde in dieser Sitzung danach noch nicht bereitgestellt. Dieser Bericht beschreibt deshalb die manuelle Codeprüfung und die tatsächlich ausgeführten Tests; er ist kein Codex-Security-Scanbericht.

## Korrigierte Punkte

| Punkt | Befund | Änderung / Nachweis |
|---|---|---|
| CSV-Schutz | Der Controlling-Export behandelte Formeln mit führenden Zeilenumbrüchen beziehungsweise vorgeschalteten Leer-/Steuerzeichen nicht einheitlich. | Gemeinsamer CSV-Encoder kennzeichnet solche Werte als Text, erhält Trennzeichen, Anführungszeichen und normale Zeilenumbrüche korrekt. Modelltest mit Kontrollzeichen und Formeln, Browsertest mit tatsächlichem Download. Auch der lokale Statistikexport nutzt den Encoder. Keine ausgeführte Spreadsheet-Attacke oder Datenabfluss nachgewiesen. |
| Exportkennzeichnung | Auch echte Teamdaten wurden als `fg-controlling-demo.csv` heruntergeladen. | Echte Exporte heißen `fg-controlling.csv`; die Demo behält ihre Kennzeichnung. |
| Browser-Härtung | Der Produktionsbuild enthielt keine eigene Content Security Policy und keine ausdrückliche Referrer-Regel. | CSP begrenzt Skripte auf eigene Quellen und den Hash des tatsächlich eingebetteten Skripts. Netzwerkverbindungen sind auf eigene Origin und die konfigurierte Supabase-Anbindung einschließlich Storage/Realtime begrenzt. Fremde Inline-Skripte und Verbindungen werden im Produktionstest blockiert. `no-referrer` verhindert die Weitergabe der Seitenadresse an Backend und verlinkte Seiten. |

Die CSP erlaubt für die vorhandene PDF-Vorschau Blob-Objekte, für Medien Blob-/freigegebene Storage-Adressen und für die ausdrücklich gewählte externe Demo-Statistik deren feste Frame-Adresse. Inline-Stile bleiben wegen bestehender React-Stile erlaubt. Private KI-Anbieteradressen werden im Browser nicht freigegeben; Modellaufrufe erfolgen ausschließlich im Backend.

`frame-ancestors`, HSTS und weitere reine HTTP-Header können nicht über eine Meta-CSP gesetzt werden. Ihre tatsächlichen Werte am Hosting wurden wegen des blockierten Live-Zugriffs nicht verifiziert. Eine geeignete Hosting-Konfiguration ist separat zu prüfen. Die hier ergänzte Meta-CSP ersetzt diese Header nicht.

## Geprüfte Bereiche

| Bereich | Im Code / lokalen Tests geprüft | Produktiv noch zu bestätigen |
|---|---|---|
| Anmeldung / Passwort | Keine öffentliche Kontenerstellung durch Link-Anforderung; persönliche Sitzung, neutrale Fehlermeldungen, Passwortwechsel und Entfernen privater Ansichten beim Abmelden/Kontowechsel. | Öffentliche Selbstregistrierung im Anbieter deaktiviert; Auth-Limits, Rücksprungadressen und tatsächlicher Mitarbeiter-Login. MFA beziehungsweise eine zusätzliche Absicherung administrativer Zugänge ist im aktuellen Anwendungsfluss nicht umgesetzt. |
| Rollen / einzelne Funktionen | Grundrollen, Abhängigkeiten einzelner Zusatzrechte, Schutz vor eigener Rollenaufwertung, Rechteentzug und Studioabgrenzung. | Migrationen und serverseitige Regeln im tatsächlichen Projekt; Prüfung mit mindestens zwei unterschiedlichen Rollen/Studios. |
| Aufgaben / Termine / Wartung | Eigene private Inhalte bleiben auch für Leitung verborgen. Teamzuweisung, Wiederholungen und verknüpfte Wartungsaufgaben haben serverseitige Regeln und Regressionstests. | Reale Fälligkeiten, Benachrichtigungsverlauf und aktivierter `pg_cron`-Job bei geschlossenem Hub. |
| Dateien / Videos | Private Buckets und Zugriffspolicies im SQL; erlaubte Dateitypen und Größen, Upload-Abschluss, Upload-Eigentümer, Kurszuordnung und Freigaben. | Tatsächliche Bucket-Einstellungen, Storage-Uploads, Wiedergabe und Kamera auf echten Endgeräten. Keine automatische Malwareprüfung hochgeladener Office-/PDF-Dateien implementiert. |
| Daten nach Rechteentzug | Erneute Serverzugriffe werden nach aktuellen Rechten geprüft; offene Ansichten und Botverlauf werden bei Rechteaktualisierung verworfen. | Bereits heruntergeladene/gepufferte Inhalte bleiben beim Empfänger. Bereits ausgestellte Video-URLs sind bis zu zehn Minuten gültig; eine Sperre kann empfangene Bytes nicht zurückholen. |
| Wissen / KI-Bot | Nur freigegebene veröffentlichte Originaltexte, Quellenverweise, erneute Prüfung nach Modellaufruf, eigene KI-Zusatzfunktion, Anfragelimits und Klartextausgabe. Keine Aktionswerkzeuge für das Modell. | Erweiterung 013, privater Modellzugang, ausgewählter Anbieter, Aufbewahrung/AVV und tatsächlicher Modellbetrieb. Quellenverweise beweisen nicht die sachliche Richtigkeit jeder Modellformulierung. |
| Chat / Feedback | Bereichs-/Studiofreigaben, serverseitiger Lesestand und Feedback-Zuständigkeit. Anonymes Feedback speichert in der Fachzeile keinen Autor. | Auth-/Infrastrukturprotokolle und Zeitpunkte können weiterhin Rückschlüsse zulassen. Die Funktion bietet keine zugesicherte vollständige Anonymität oder ein geprüftes Hinweisgebersystem. |
| Datenexport | Eigenes Exportrecht in der Oberfläche, korrekt gekennzeichneter Download, CSV-Behandlung von Formeln und Sonderzeichen. | Empfänger, Ablage, Zugriffsrechte und Löschung heruntergeladener Mitarbeiterdaten festlegen. Bereits lesbare Daten können unabhängig vom Exportbutton kopiert werden. |
| Schlüssel / Abhängigkeiten | Frontend-Build lehnt Service-Role-/Secret-Schlüssel ab. Signaturprüfung der versionierten Arbeitsdateien fand keine privaten Modell-, GitHub-, Supabase-Schlüssel oder Service-Role-JWTs. npm-Audit meldet keine bekannten Schwachstellen. | Schlüsselrotation, GitHub-/Supabase-Administratoren und tatsächliche Secret-Konfiguration. Der Signaturcheck ist keine vollständige Forensik der gesamten Git-Historie. |

## Datenschutz und Datenpflege: notwendige Betriebsnachweise

Diese Punkte benötigen Unternehmensangaben oder Zugriff auf die produktive Verwaltung; sie dürfen nicht allein aufgrund grüner Tests abgehakt werden.

- **Datenschutzinformation für Mitarbeiter:** In der Anwendung ist keine vollständige unternehmensbezogene Datenschutzinformation hinterlegt. Verantwortlicher, Kontakt, Zwecke/Rechtsgrundlagen, Datenarten, Empfänger, Speicherdauer und Betroffenenrechte müssen passend zu eurem tatsächlichen Betrieb festgelegt und zugänglich gemacht werden. Keine erfundenen Unternehmens- oder Datenschutzbeauftragtenangaben einsetzen.
- **Anbieter / Speicherorte:** Supabase-Region, Hosting, Mailanbieter und gegebenenfalls KI-Anbieter samt Auftragsverarbeitung, Unterauftragnehmern und erforderlichen Vereinbarungen prüfen. Die konfigurierte Projekt-URL belegt keine EU-Speicherregion.
- **Aufbewahrung und Austritt:** Es gibt keinen vollständigen automatischen Löschablauf für ausgeschiedene Mitarbeiter, Chat, Feedback, Dateien und Lernnachweise. Sperren erhält historische Daten. Lösch-/Aufbewahrungsregeln und Zuständigkeiten festlegen. KI-Zähler älter als sieben Tage werden bei einer späteren Modellreservierung bereinigt; das ist kein garantierter täglicher Löschjob.
- **Sicherung / Wiederherstellung:** Backupumfang, Aufbewahrung und Wiederherstellung in einer getrennten Testumgebung nachweisen, einschließlich Storage-Dateien. Hier wurde keine produktive Wiederherstellung ausgelöst.
- **Gemeinsam genutzte Geräte:** Supabase-Sitzungen werden im Browser gespeichert. Das Abmelden ist geprüft; es gibt derzeit keinen eigenen Leerlauf-Logout. Gerätesperre und Sitzungsregeln festlegen. Die Browser-Origin ist die Isolationsgrenze; andere Projekte unter derselben GitHub-Pages-Origin teilen technisch diesen Ursprung. Eine eigene Produktionsdomain sollte entsprechend eingeordnet werden.
- **Datenqualität:** Aktive Mitarbeiter ohne Studio, Auth-Konten ohne Fachprofil, doppelte normalisierte E-Mails und fehlerhafte Wissensverknüpfungen lesend prüfen. Das neue Zugangskontrollfeld prüft einzelne Konten; eine vollständige produktive Datenbereinigung wurde hier nicht durchgeführt.

### Lesende Prüfungen für den Betreiber

Nur im eigenen Supabase SQL Editor ausführen. Diese Abfragen verändern keine Daten. Hier liegen **keine Ergebnisse dieser produktiven Abfragen** vor.

```sql
-- Privatsphäre der beiden tatsächlich verwendeten Storage-Buckets.
select id, public, file_size_limit, allowed_mime_types
from storage.buckets where id in ('team-knowledge','course-videos');

-- RLS und anonyme Tabellenrechte für die zentralen Fachbereiche.
select c.relname, c.relrowsecurity as rls,
       has_table_privilege('anon',c.oid,'SELECT') as anonymous_select
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relkind in ('r','p')
  and c.relname in ('profiles','tasks','calendar_events','knowledge_documents',
      'knowledge_versions','learning_videos','team_chat_messages',
      'team_feedback','onboarding_enrollments')
order by c.relname;

-- Aggregierte Auffälligkeiten, ohne E-Mail-Adressen auszugeben.
select 'Aktive Mitarbeiter ohne Studio' as pruefung,count(*) as anzahl
from public.profiles p where p.active and p.role<>'admin'
  and not exists(select 1 from public.studio_memberships m where m.user_id=p.id)
union all
select 'Auth-Konten ohne Mitarbeiterprofil',count(*)
from auth.users u where not exists(select 1 from public.profiles p where p.id=u.id)
union all
select 'Doppelte normalisierte E-Mail-Gruppen',count(*)
from (select lower(trim(email)) from auth.users where coalesce(trim(email),'')<>''
      group by lower(trim(email)) having count(*)>1) d
union all
select 'Unstimmige veröffentlichte Wissensversionen',count(*)
from public.knowledge_documents d left join public.knowledge_versions v on v.id=d.published_version_id
where d.published_version_id is not null
  and (v.id is null or v.document_id<>d.id or v.state<>'ready' or v.published_at is null);
```

Eine Auffälligkeit ist zunächst zu klären, nicht automatisch zu löschen. Z. B. können ältere oder erst teilweise eingerichtete Zugänge einen nachvollziehbaren Grund haben. Für Backups, AVV, Speicherregion, Auth-Einstellungen und Versandprotokolle ist zusätzlich die jeweilige Anbieter-Verwaltung nötig.

## Funktionsvollständigkeit

Die ursprünglichen Wünsche und Grenzen bleiben im [Funktionsaudit](FUNKTIONS_AUDIT.md) dokumentiert. Automatische Erinnerungsmails/OS-Push, Videoschnitt/Bildschirmaufnahme, Medienabgaben mit Trainerbewertung, soziale Community und Kundenportale sind weiterhin offen. Die technische Bot-Anbindung ersetzt keine aktivierte Modellkonfiguration. Echte Mailzustellung ist weiterhin separat abzunehmen.

Die [Abnahme mit echten Konten](ABNAHME_CHECKLISTE.md) ist die nächste verbindliche Prüfung des realen Betriebs. Nur tatsächlich beobachtete Ergebnisse dort abhaken.

## Ausgeführte Prüfungen nach der Korrektur

| Prüfung | Ergebnis |
|---|---|
| Vollständige Browserprüfung (`npm test`) | 208 bestanden, 0 Fehler |
| SQL-/Modelltests (`npm run test:db`) | 136 bestanden, 0 Fehler |
| Einladungsdienst (`npm run test:access`) | 13 bestanden, 0 Fehler |
| Bot-Dienst (`npm run test:assistant`) | 9 bestanden, 0 Fehler |
| Produktionsbuild mit öffentlicher Backend-Konfiguration | Erfolgreich |
| Produktionstest (`npm run test:production`) | Bestanden; Skripthash geprüft, fremdes Inline-Skript blockiert, fremde Verbindung vor dem Netzwerk blockiert, keine Seitenadresse als Referrer an das Backend; bestehende Teamfunktionen weiter nutzbar |
| npm-Audit | 123 erfasste Abhängigkeiten; 0 bekannte Schwachstellen laut Registry zum Prüfzeitpunkt |
| Signaturprüfung privater Schlüssel | Kein Treffer in den geprüften versionierten Arbeitsdateien; keine Aussage über alle denkbaren Geheimnisformate oder die vollständige Historie |

Browser-/Diensttests und Produktionstest verwenden simulierte Backend-/Mail-/Modellantworten. SQL-Regeln werden lokal in PGlite ausgeführt. Die produktiven Betriebsnachweise in diesem Bericht bleiben davon unabhängig offen.
