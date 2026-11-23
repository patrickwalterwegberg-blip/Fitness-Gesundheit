# Teamhub sichern und getrennt wiederherstellen

Stand: 23.11.2026. **Vorbereitung, kein Nachweis einer vorhandenen Sicherung.** Es wurde hier weder eine echte Datenbank exportiert noch ein Projekt wiederhergestellt. Die lokale SQL-Prüfung bestätigt nur die sichere Vorprüfung.

## Dein erster Schritt im Dashboard

1. [Supabase-Projekte öffnen](https://supabase.com/dashboard/projects) und das bestehende Teamhub-Projekt auswählen.
2. **Database → Backups → Scheduled** öffnen. Je nach Oberfläche heißt der letzte Reiter sinngemäß „Geplante Sicherungen“.
3. Nur nachsehen: Sind Sicherungen mit Datum vorhanden oder erscheint ein Hinweis auf den Tarif? Für die nächste Entscheidung reicht diese Angabe. Keine Passwörter, Schlüssel oder Dumps in den Chat schicken.

**An dieser Stelle nicht „Restore/Wiederherstellen“ anklicken.** Eine Wiederherstellung des bestehenden Projekts kann dessen aktuellen Datenstand ersetzen. Das ist nicht der geplante Test.

Die [offizielle Supabase-Backupdokumentation](https://supabase.com/docs/guides/platform/backups) beschreibt tägliche Sicherungen für kostenpflichtige Tarife und eigene logische Exporte für kostenlose Projekte. Die beschriebenen Aufbewahrungszeiträume sind tarifabhängig. Physische Sicherungen sind nicht generell als Datei herunterladbar. Maßgeblich sind der tatsächlich gebuchte Tarif und die in eurem Projekt angezeigten Sicherungen. Es wird kein kostenpflichtiger Tarif automatisch gebucht.

Die Anbieterangaben wurden aus dem [offiziellen Dokumentationsquelltext](https://github.com/supabase/supabase/blob/master/apps/docs/content/guides/platform/backups.mdx) geprüft; der direkte Dokumentationsabruf war aus der Arbeitsumgebung gesperrt.

## Vier Teile gehören zu einem vollständigen Sicherungsstand

| Teil | Was erhalten bleiben muss |
|---|---|
| Datenbankstruktur und Fachdaten | Tabellen, Fremdschlüssel, Sequenzen, Funktionen, Trigger, RLS, Policies, Grants und erforderliche Erweiterungen. Die aktuelle Quelle deklariert 41 Tabellen in `public`. Ein CSV-Export ersetzt das nicht. |
| Privates Schema und Auth | `app_private.learning_answer_keys`, `team_invitations`, `team_mail_limits`; optional `team_assistant_requests`. Dazu das erforderliche verwaltete Auth-Schema mit stabilen Benutzer-UUIDs, Identitäten und weiteren benötigten Auth-Daten. Profile referenzieren `auth.users.id`; neue Konten mit anderen UUIDs sind kein gleichwertiger Ersatz. |
| Originaldateien | Die privaten Buckets `team-knowledge` und `course-videos`, einschließlich älterer veröffentlichter Versionen und passender Pfade/Zuordnungen. **Datenbankbackups enthalten Storage-Metadaten, aber keine hochgeladenen Originalbytes.** |
| Anwendung und Einrichtung | Geprüfter Git-Stand, tatsächlicher Datenbankstand, Edge Functions, Auth-/Redirect-/SMTP-Einstellungen, Bucketregeln, Hintergrundjobs und benötigte Konfigurationsnamen. Secrets separat in einer geschützten Geheimnisverwaltung erhalten; ihre Werte weder ins Git noch ins Protokoll übernehmen. |

Auch zusätzliche Tabellen oder Buckets, die außerhalb der aktuellen Teamhub-Quelle angelegt wurden, gehören in die Betreiberinventur. Eine reine `public`-Sicherung lässt private Tabellen und Auth-Zuordnungen aus. Ein Standard-CLI-Export darf nicht ungeprüft als vollständige Sicherung verwalteter Auth-/Storage-Schemata gelten. Für den gewählten Supabase-Tarif und die PostgreSQL-Version den [offiziellen Export-/Restoreweg](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore) prüfen.

Supabase weist außerdem darauf hin, dass Passwörter selbst angelegter Datenbankrollen nicht in täglichen Sicherungsdateien enthalten sind. Benötigte Zugangskonfiguration für das Ziel muss über die geschützte Verwaltung wiederherstellbar sein. Mitarbeiterpasswörter werden dafür nicht im Chat angefordert.

Browserlokale Demo-Daten, persönliche Anordnung und noch nicht erfolgreich hochgeladene Aufnahmen liegen außerhalb eines Serverbackups. Sie dürfen nicht als gesicherte gemeinsame Teamdaten ausgewiesen werden.

## Lesende Vorprüfung

Die vollständige Datei [scripts/backup-readiness.sql](../scripts/backup-readiness.sql) kann der berechtigte Betreiber im **SQL Editor des ausgewählten Supabase-Projekts** ausführen. Sie ist keine neue Migration und legt nichts an.

- Die Datei startet eine schreibgeschützte Transaktion, begrenzt Lauf- und Lockwartezeit und beendet sie mit `ROLLBACK`.
- Die Ausgabe enthält feste Tabellen-/Routinennamen, Vorhandensein, RLS-Flags und aggregierte Bucket-Metadaten. Keine E-Mails, Benutzer-IDs, Inhalte, Originaldateipfade, Cron-Befehle oder Secrets werden ausgegeben.
- Die 45 Anwendungstabellen und zwei Auth-Tabellen werden im Katalog gesucht. Fehlende Tabellen werden als fehlend ausgewiesen. Die optionale KI-Tabelle wird nicht angelegt oder aktiviert.
- RLS-Flags zeigen nur den Katalogzustand. Ohne Prüfung der Schemafreigaben und konkreten Policies sind sie keine Rechteabnahme; verwaltete Auth-Tabellen nicht allein anhand dieses Flags bewerten.
- `additional_app_table_count` weist auf weitere Tabellen in `public`/`app_private` hin; ihre Namen und Inhalte werden nicht ausgegeben.
- `estimated_rows` sind Katalogschätzungen, eventuell `null`, **keine exakten Vergleichszahlen für eine Wiederherstellung**.
- `objects_in_metadata` und `recorded_bytes` beruhen ausschließlich auf Storage-Metadaten. Sie bestätigen weder vorhandene Originalbytes noch deren Inhalt. Unbekannte oder ungültige Größen werden getrennt gezählt.
- `auth.users` und `auth.identities` sind nur zwei Präsenzindikatoren. Die Abfrage inventarisiert nicht das gesamte verwaltete Auth-Schema, beispielsweise Sessions und MFA.
- Vorhandene Funktionssignaturen bestätigen keine aktuellen Funktionskörper und insbesondere keine Installation der Sicherheitsänderungen 015/017. Auch die beiden Cron-Präsenzflags bestätigen keinen aktiven, korrekt konfigurierten Job.
- `backup_created`, `restore_verified` und `storage_bytes_verified` bleiben ausdrücklich **false**. Diese Angaben beschreiben nur, was diese Abfrage nicht ausführt; sie sagen nichts darüber aus, ob beim Anbieter bereits Sicherungen vorliegen.

Voraussetzung sind die üblichen Supabase-Tabellen `storage.buckets` und `storage.objects`. Fehlen diese oder fehlen Leserechte, bricht die Abfrage ab; das ist kein erfolgreicher Teilnachweis. Falls die Oberfläche danach eine offene/fehlgeschlagene Transaktion meldet, nur `ROLLBACK;` ausführen. Nicht versuchen, durch Anlegen verwalteter Tabellen die Vorprüfung „grün“ zu machen.

Die Ausgabe gehört in die geschützte Betriebsablage. Für Rückfragen reicht eine nicht personenbezogene Zusammenfassung der offenen Punkte. Die Vorprüfung löst keine Sicherung, keinen Versand und keine Reparatur aus.

## Sicherungsverfahren vor dem ersten echten Lauf festlegen

| Entscheidung | Noch zu bestätigen |
|---|---|
| Sicherungsweg | Vorhandenes Anbieterbackup oder eigener vollständiger Export; genaue Abdeckung und Version prüfen. |
| Geschützte Ablage | Verschlüsseltes Unternehmensziel mit begrenztem Zugriff, möglichst außerhalb des Quellprojekts. Dumps und Originale nicht ins öffentliche Repository, GitHub-Artefakte oder diesen Chat hochladen. |
| Häufigkeit | Maximal tolerierbaren Datenverlust festlegen; Datenbank und Dateien gemeinsam berücksichtigen. Tägliche DB-Sicherung allein schützt keine zwischenzeitlich veränderten Originale. |
| Aufbewahrung | Anzahl/Alter der Stände, Löschregeln, Schutz vor versehentlicher Löschung und Zugriff bei Ausfall des Quellprojekts bestimmen. |
| Verantwortung | Zuständige Rolle, Vertretung, Fehlerkontrolle und Zugriff auf benötigte Entschlüsselungsmittel festlegen. |
| Wiederherstellungsziel | Getrenntes, ausdrücklich identifiziertes Testprojekt beziehungsweise eine abgeschottete Testinstanz. Projektkennung, Version, Zugriffsschutz und mögliche Kosten vorab prüfen. |
| Wiederanlauf | Gewünschte maximale Ausfallzeit festlegen und beim Test tatsächlich messen. |

Bis diese Angaben feststehen, werden keine produktiven Dumps in die Entwicklungsumgebung kopiert und keine echten Wiederherstellungsbefehle vorbereitet oder ausgeführt, die ein unbekanntes Ziel verwenden. Zugangsdaten werden ausschließlich über eine dafür vorgesehene sichere Verwaltung bereitgestellt, nicht über Chat oder Quellcode.

## Einen zusammengehörigen Sicherungssatz erstellen

1. Quelle, Zeitpunkt und gewählten Exportumfang festhalten. Kurzes abgestimmtes Wartungs-/Schreibpausenfenster oder ein nachweislich konsistentes Verfahren für Datenbank und Storage festlegen. Kopien zu unterschiedlichen Zeitpunkten können unterschiedliche Dateiversionen referenzieren.
2. Datenbank nach dem freigegebenen Anbieter-/Exportverfahren sichern. Vollständige Auth-/Private-Schema-Abdeckung, Rechte und benötigte Strukturen prüfen. Nicht nur Tabellenzeilen oder eigene Schemata exportieren und „vollständig“ nennen.
3. Beide privaten Dateibereiche einschließlich benötigter älterer Originale über ein geeignetes, authentifiziertes Storage-/S3-Verfahren sichern. Pfade, Zuordnungen und relevante Metadaten erhalten. Ein Ordner mit heruntergeladenen Dateien ohne Zuordnungsmanifest reicht nicht.
4. Ein geschütztes Manifest mit Umfang, Dateigrößen und SHA-256-Prüfsummen führen. Dateilisten können personenbezogene Namen enthalten und werden ebenfalls geschützt. Metadaten-Größen aus der SQL-Vorprüfung ersetzen keine Prüfung der tatsächlichen Dateien.
5. Konfigurationsinventar und verwendeten Git-Stand zuordnen. Bei manuell ausgeführten SQL-Dateien ist deren Vorliegen im Repository kein Nachweis des gehosteten Installationsstands.
6. Sicherung verschlüsselt ablegen, Lesbarkeit/Entschlüsselbarkeit prüfen und Zeitpunkt, Ergebnis und Fehler dokumentieren. Ein Datei-Hash allein ist keine Verschlüsselung und kein Restoretest.

Unvollständige Wissens- und Video-Uploads weder löschen noch als „bereit“ umetikettieren. Resumable-Teilstände sind nicht automatisch vollständig oder portierbar. Die vorhandenen Uploadrechte laufen bei Wissensentwürfen nach 24 Stunden und bei Videos nach sieben Tagen ab; Fortsetzbarkeit nach einer Wiederherstellung gesondert prüfen.

## Wiederherstellung ausschließlich im isolierten Ziel

1. Quell- und Zielprojekt anhand ihrer tatsächlichen Kennungen vergleichen: **Quelle und Ziel müssen verschieden sein.** Kein Restore im bestehenden Teamhub-Projekt und keine Produktionsdaten überschreiben.
2. Vor dem Start des wiederhergestellten Systems dessen Zugriff begrenzen. Ausgehende Mail-/Modell-/Integrationsverbindungen und Hintergrundjobs zunächst unterbinden; öffentliche Registrierung und ungewollten Mitarbeiterzugriff verhindern. Kann das gewählte Verfahren diese Isolation nicht gewährleisten, vor dem Restore ein geeignetes Ziel/Verfahren festlegen.
3. Das zum Sicherungsformat und zur PostgreSQL-Version passende Anbieter-/Restoreverfahren verwenden. Verwaltete Supabase-Schemata und Eigentümer nicht mit improvisierten `DROP`-/Neuanlagebefehlen reparieren. Für Provider-Klone siehe [Restore to a new project](https://supabase.com/docs/guides/platform/backups#restore-to-a-new-project).
4. Datenbank und Originaldateien abgestimmt zurückspielen. Originalpfade und Identitätszuordnungen prüfen; keine neuen UUIDs erraten. `storage.objects` nicht durch blinde SQL-Einträge als wiederhergestellte Bytes ausgeben. Fehlende Dateien bleiben fehlend, bis die Originale tatsächlich nachgewiesen sind.
5. Eigene Test-URL, Ziel-Backendkonfiguration und Auth-Redirects verwenden. Die Testanwendung darf nicht versehentlich auf die Quelle zeigen. Für Browser-Isolation eine eigene Origin verwenden; ein weiterer Pfad unter derselben GitHub-Pages-Origin trennt LocalStorage/Sitzungen nicht vollständig.
6. Aktuellen Quell-/Datenbankstand vergleichen. Ältere Komplettmigrationen nicht einfach erneut ausführen: Beispielsweise würde 010 spätere Funktionskorrekturen überschreiben. Cron/Integrationen erst gezielt nach Prüfung freigeben. Generative KI bleibt ausgeschaltet.
7. Mit freigegebenen Prüfkonten und ohne ungewollten Mailversand abnehmen. Tatsächliche Dauer und erreichbaren Datenstand dokumentieren. Keine realen Praxiseinweisungen nur zum Test als erledigt markieren.

## Was für einen erfolgreichen Restore nachgewiesen werden muss

- Vollständiger Sicherungsumfang und exakte Vergleichszahlen für die gewählte Datenmenge, nicht nur Katalogschätzungen.
- Auth-/Profil-/Studio-UUIDs und Verknüpfungen stimmen; keine verwaisten Zuordnungen.
- Rollen, einzelne Funktionsrechte, Studioeinschränkungen und private Aufgaben wirken im Ziel tatsächlich.
- Berechtigte Downloads einer veröffentlichten Wissensdatei und älteren Version sowie Wiedergabe eines Kursvideos funktionieren. Prüfsummen stimmen mit dem geschützten Manifest überein; unberechtigte Konten erhalten keinen Zugriff.
- Lesestand, Quiz, Praxisbestätigung, Onboarding und persönlicher Nachweis entsprechen dem Sicherungsstand.
- Unvollständige Uploads bleiben als solche erkennbar; fehlende Dateien werden nicht als erfolgreich verfügbar behandelt.
- Kein unbeabsichtigter Versand oder Modellaufruf; geplante Jobs werden kontrolliert geprüft und aktiviert.
- Wiederherstellungsdauer und Datenverlustgrenze wurden gemessen und durch die verantwortliche Rolle bewertet.

Die [Protokollvorlage](templates/BACKUP_WIEDERHERSTELLUNGSNACHWEIS.md) dafür in die **geschützte interne Ablage kopieren**. Das öffentliche Template bleibt unausgefüllt. Ein grüner Softwaretest oder ein erfolgreiches Frontend-Deployment bestätigt keinen echten Restore.

Ein temporäres Restoreziel erst nach dokumentierter Abnahme und abgestimmter Aufbewahrung abbauen. Nicht das Quellprojekt löschen: Laut Supabase werden dabei auch zugehörige Anbieterbackups entfernt. Vorherige Sicherungen nicht automatisch löschen, um Speicherplatz freizugeben.
