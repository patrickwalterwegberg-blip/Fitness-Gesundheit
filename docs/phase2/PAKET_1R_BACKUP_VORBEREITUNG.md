# Paket 1R – Sicherung und Wiederherstellung vorbereiten

Stand: 23.11.2026. Ausgangsstand auf GitHub `main` und lokal: `94a31d1fb2b64f42574696247914a2f9f1b48d5d`. Der vorherige [Workflow 45183478839](https://github.com/patrickwalterwegberg-blip/Fitness-Gesundheit/actions/runs/45183478839) bestätigte 408 Browsertests und die Bereitstellung dieses Stands.

## Auftrag und tatsächlicher Zugriff

Der Nutzer hat den empfohlenen Beginn mit Backups/Wiederherstellung bestätigt. Diese Vorbereitung ändert weder die Daten des Teamhubs noch seine Oberfläche. Sie ist **keine ausgeführte Sicherung und kein Wiederherstellungsnachweis**.

Die Arbeitsumgebung bietet keine Supabase-Verwaltungsverbindung, keine konfigurierten privaten Supabase-Zugänge und keine entsprechende Netzfreigabe. Auch ein isoliertes Ziel und eine geschützte Sicherungsablage sind noch nicht festgelegt. Die Rückfrage an den Nutzer nach vorhandenen Sicherungen unter „Database → Backups“ ist gestellt; daraus wird ohne tatsächliche Rückmeldung kein Tarif oder Sicherungsstand abgeleitet. Keine Zugangsdaten werden im Chat angefordert.

Die direkte öffentliche Supabase-Dokumentation war gesperrt. Der offizielle Dokumentationsquelltext auf GitHub wurde gelesen: kostenpflichtige tägliche Datenbanksicherungen, eigene Exporte für kostenlose Projekte, tarifabhängige Aufbewahrung, Einschränkungen physischer Downloads und fehlende Storage-Originalbytes sind dort beschrieben. Das bestätigt keine konkrete Tarifbuchung oder aktuelle Sicherung unseres Projekts.

## Konkrete Vorbereitung

- [Betreiberanleitung](../BACKUP_UND_WIEDERHERSTELLUNG.md): erster Dashboard-Schritt, Umfang von Datenbank/Auth/privaten Schemata/Originaldateien/Konfiguration, offene Betreiberentscheidungen, konsistenter Sicherungssatz, Verschlüsselung und isolierte Wiederherstellung. Keine destruktiven Restorebefehle für ein unbekanntes Ziel.
- [Lesende SQL-Vorprüfung](../../scripts/backup-readiness.sql): bekannte 41 öffentliche und vier private Anwendungstabellen sowie zwei verwaltete Auth-Präsenzindikatoren; aggregierte Metadaten der beiden privaten Buckets; Routinen-/Cron-Präsenz. Schreibgeschützte Transaktion, Zeitlimits und Rollback. Kein Export, keine Migration, kein neuer RPC und keine Aktivierung der optionalen KI-Tabelle.
- [Unausgefüllte Nachweisvorlage](../templates/BACKUP_WIEDERHERSTELLUNGSNACHWEIS.md): zur späteren Verwendung ausschließlich in geschützter interner Ablage. Alle echten Abnahmen bleiben offen; keine persönlichen Daten, Dumps oder Secrets ins öffentliche Repository.
- README, Betriebsprüfung und echte Abnahmecheckliste verweisen auf den neuen Ablauf. Die bestehende Restore-Checkbox bleibt ungeprüft.

Die Vorprüfung nennt keine Benutzerkennungen, E-Mails, Originalpfade, Dateiinhalte oder Secretwerte. Tabellenzeilenzahlen sind ausdrücklich geschätzt, Dateigrößen stammen nur aus Metadaten. Weitere Tabellen werden als Zähler gemeldet, ohne ihre Namen auszugeben. Vorhandene Auth-Tabellen beziehungsweise Funktionssignaturen sind weder eine vollständige Auth-Sicherung noch ein Nachweis aktueller Funktionskörper/Sicherheitsmigrationen. Die explizit falschen Sicherungs-/Restore-/Bytesfelder beschreiben nur diese Abfrage, nicht den tatsächlichen Anbieter-Backupbestand.

`storage.buckets` und `storage.objects` werden als Supabase-Plattformtabellen vorausgesetzt; fehlen sie, bricht die Abfrage ab. Einzelne fehlende Buckets sowie fehlende Anwendungstabellen werden dagegen ausgewiesen. SQL-Fehler sind kein erfolgreiches Teilresultat. Es gibt keine automatische Reparatur oder Datenbereinigung.

## Prüfungen

Vier gezielte PostgreSQL-/PGlite-Fälle bestanden:

1. Inventur deckt die aus allen Quellmigrationen ermittelten Anwendungstabellen ab; alle fünf Routinen sind im vollständigen lokalen Modell vorhanden. Ausgabe ist auf erlaubte Metadatenfelder begrenzt. Datensätze und Routinenanzahl bleiben unverändert.
2. Eine im äußeren Testkontext vorübergehend umbenannte optionale KI-Tabelle wird vom SELECT als fehlend erkannt und nicht angelegt. Dieser Fall prüft die SELECT-Ausgabe; er behauptet keine vollständige Read-only-Transaktion im äußeren Schreibtest.
3. Ein absichtlich in die vollständige Vorprüfung eingefügter Schreibversuch scheitert tatsächlich mit PostgreSQL-Code `25006`; die Probetabelle wird nicht angelegt.
4. Ein separates unvollständiges Datenbankmodell meldet einen fehlenden Bucket korrekt, behandelt fehlende/ungültige Größen ohne Castfehler und zählt zusätzliche Tabellen ohne Namensausgabe. Synthetische private Pfade/Inhalte gelangen nicht ins Ergebnis.

Der vollständige Lauf mit **191 Datenbank-/Modelltests** bestand. Es wurden nur synthetische lokale Daten verwendet. Kein Datenbankdump, kein Originaldateiexport, kein Cloud-Restore und keine Mail-/Modellaktion wurden ausgeführt. Eine lokale PGlite-Prüfung ist kein Supabase-Wiederherstellungstest.

Die unabhängige Abnahme bestätigte erneut **191 bestandene Datenbank-/Modelltests**, einen erfolgreichen Build mit synthetischer Backendkonfiguration und unveränderte Hashes aller **191 Coredateien** vor/nach den Prüfungen zwischen Repo und Prüfkopie. Die neue SQL-Datei, Tests und Betreiberunterlagen wurden unabhängig gelesen; 43 lokale Dokumentationslinks hatten vorhandene Ziele. Die bekannte Chunkgrößenwarnung bleibt bestehen. Ein neuer GitHub-Prüflauf und die Bereitstellung werden anschließend für genau den übertragenen Commit kontrolliert. Diese Freigabe gilt ausschließlich für die Vorbereitung, nicht für einen echten Backup-/Restorestand. Frontend-/Backend-Anwendungssourcen und Abhängigkeiten bleiben unverändert; die vorhandenen 408 Browserprüfungen werden vom bestehenden GitHub-Veröffentlichungsworkflow vor einer Bereitstellung erneut ausgeführt.

## Verbleibende echte Aufgaben

Anbieterstatus und Tarif feststellen; sicheren Zugriff, Ablage, Verantwortlichkeit, Häufigkeit/Aufbewahrung und isoliertes Ziel festlegen; konsistente vollständige Sicherung erstellen; Originalbytes und Verschlüsselung prüfen; ausschließlich ins freigegebene getrennte Ziel zurückspielen und Rechte/Dateien/Lernnachweise sowie Dauer und Datenstand tatsächlich abnehmen. Bis dahin bleibt der echte Restore offen.

## Rückweg

Dieses reine Vorbereitungspaket kann aus dem Repository zurückgenommen werden. Es wurden keine Serverroutinen, Rollen, Daten oder Projekte geändert; eine Datenbank-Rückmigration ist nicht erforderlich. Bestehende Sicherungen oder Projekte werden dabei nicht gelöscht. Generative KI bleibt zurückgestellt.
