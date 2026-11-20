# Paket 1L – Prüfungsrechte für Lernnachweise absichern

Stand: 20.11.2026. GitHub-Abgleich: `main` und unveränderter lokaler Ausgangsstand waren `bdbf967ab3ca81a7307364169be24fe0be68757e`. Dieses Paket korrigiert genau eine bestätigte P1-Rechtelücke. Keine Änderung an Oberfläche, Schwarz-Gold-Design, SMTP oder generativem KI-Betrieb.

## Ziel und Änderung

In der Akademie werden eigene Nachweisformulare für Nichtadministratoren bereits ausgeblendet. Die beiden Serverfunktionen `confirm_learning_practice` und `record_learning_assessment` prüften bisher nur Einzelrecht und Studio. Ein Mitarbeiter mit delegiertem Prüfungsrecht konnte deshalb seinen eigenen Nachweis durch einen direkten RPC-Aufruf bestätigen.

Die separate Migration [015_learning_evidence_review.sql](../../backend/supabase/015_learning_evidence_review.sql) verweigert diesen Selbstfall serverseitig mit `42501`, bevor Fortschritt oder Ereignisse geändert werden. Freigaben für Kollegen im berechtigten Studio, vorhandene Voraussetzungen und das bisherige Administratorverhalten bleiben erhalten. Die bestehende Admin-Ausnahme wird damit nicht als allgemein abgenommene Vieraugenregel ausgegeben.

Die Migration ändert ausschließlich diese beiden Routinen und deren ausdrücklich bestehende Aufrufgrenze für `authenticated`. Sie löscht oder korrigiert keine alten Lernnachweise und installiert kein KI-Modell. Die Funktionsversion der Oberfläche muss dafür nicht erhöht werden, weil kein neuer Oberflächenvertrag entsteht.

## Prüfung des Abschlussablaufs

| Bereich | Befund / Prüfgrenze |
|---|---|
| Kursabschluss | Lesen, bestandener Wissenscheck und gegebenenfalls Praxis sind getrennte Voraussetzungen. Kurskarte und Onboarding berücksichtigen die Praxisanforderung. Die Gesamtregression prüft vorhandene Ablauf- und Modellfälle. |
| Quiz | Auswertung erfolgt serverseitig; ein später fehlgeschlagener Versuch löscht einen bereits bestandenen Quizstatus nicht. Antworten bleiben vom Lernmaterial getrennt. |
| Praxisbestätigung | Zusätzliches Einzelrecht und freigegebenes Studio bleiben erforderlich. Fehlende Lesebestätigungen oder ein noch nicht bestandener Wissenscheck verhindern die Praxisfreigabe. |
| Gespeicherte Nachweise | Fortschritt, Quizversuche und Ereignisse bestehen bereits. Praxis speichert Prüfer und Zeitpunkt. Die neuen Tests prüfen auch unveränderte Fortschritts- und Ereignisdaten nach Ablehnung. |
| PDF / Zertifikat | Ein eigenständiger PDF-/Zertifikatsnachweis ist im geprüften Lernablauf noch nicht implementiert. Das bleibt ein eigenes Produktpaket; dieses Paket erzeugt kein Zertifikat. |
| Gehostetes Backend | Installation und tatsächliche Rollen-/Studioabnahme in Supabase sind nicht durch lokale Tests belegt. |

## Test und Ergebnis

Am unveränderten Backendstand scheiterten beide neuen Selbstfalltests mit „Missing expected rejection“: Die unerlaubten Aufrufe wurden angenommen. Die gezielte Prüfung umfasst **14 PostgreSQL-/PGlite-Fälle**:

- Je RPC: Selbstbestätigung abgelehnt; Fortschritt und vollständige Ereignisliste unverändert.
- Je RPC: berechtigter Kollege im eigenen Studio erfolgreich; korrekter Akteur gespeichert.
- Je RPC: fremdes Studio beziehungsweise fehlendes Einzelrecht abgelehnt, keine Datenänderung.
- Je RPC: bisherige Administrator-Selbstbestätigung bleibt möglich.
- Je RPC: fehlende fachliche Voraussetzungen bleiben eine Sperre.
- Ein delegierter Prüfer darf seine bestehenden Wissens-/Praxisnachweise auch nicht selbst über einen negativen externen Wissensentscheid zurücksetzen.
- Rückmigration und erneute Anwendung ändern vorhandene Datensätze nicht; der vorherige RPC-Vertrag und die erneute Sperre werden tatsächlich ausgeführt.

Der Testaufbau verwendet neue synthetische Konten, echte PostgreSQL-Rollen und die vorhandenen SQL-Funktionen. Nur die fachlichen Voraussetzungen werden gezielt in der isolierten Testdatenbank vorbereitet. Das ist kein echter Mitarbeiter- oder Live-Supabase-Test. Die Migration wird im Datenbankaufbau zweimal angewandt, damit auch ihre Wiederholbarkeit geprüft wird.

Die unabhängige Quellprüfung gab Migration und Rückmigration frei: Abgesehen von der Selbstfallprüfung entsprechen die Routinen den vorhandenen Definitionen; Recht×Studio, Admin-Ausnahme und fachliche Voraussetzungen bleiben erhalten. Im eingefrorenen, gegen 178 Quell-/Test-/Konfigurationsdateien abgeglichenen Prüfstand bestanden alle **155 Datenbank-/Modelltests**, **13 Einladungsdiensttests**, **9 lokale Bot-Diensttests**, der Build, alle **354 Browsertests (6,5 Minuten)** und der **Produktionssmoke**. Build und Smoke verwenden dieselbe synthetische Backendkonfiguration; sämtliche Netzaufrufe sind simuliert. Die Bot-Tests aktivieren kein Modell. Nach Abschluss waren alle 178 Dateien in Arbeitsrepo und Prüfkopie unverändert und hashgleich. Die unabhängige QA gab genau diesen Patch frei. Der GitHub-Veröffentlichungsnachweis folgt nach Übertragung; die gehostete Installation bleibt separat offen.

Im ersten Browserprüfaufbau blockierte Vite Schriftdateien aus den nach außerhalb verlinkten Abhängigkeiten. Der Lauf wurde nach 160 bestandenen Fällen kontrolliert unterbrochen und zählt nicht als Gesamtprüfung. Nach vollständigem Prozessende wurden nur die Abhängigkeiten physisch in die Prüfkopie kopiert und deren Vite-Caches entfernt; keine Anwendung oder Sicherheitsregel wurde dafür geändert. Eine separate Browserprobe bestätigte beide Projektschriften als geladen und beide Schriftantworten mit HTTP 200. Der danach vollständig neu gestartete Lauf bestand alle 354 Fälle ohne Schriftwarnungen.

## Aktivierung und manuelle Abnahme

1. Die [Datei 015 auf GitHub](https://github.com/patrickwalterwegberg-blip/Fitness-Gesundheit/blob/main/backend/supabase/015_learning_evidence_review.sql) öffnen, „Raw“ wählen und den vollständigen SQL-Inhalt kopieren. Im eigenen [Supabase SQL Editor](https://supabase.com/dashboard/project/ftcurcqduzrxsvkujfql/sql/new) eine neue Abfrage öffnen, den Inhalt einfügen und „Run“ klicken. Erwartet wird eine Erfolgsmeldung; eine Ergebnisliste ist nicht erforderlich. Erst nach den vorhandenen Teamhub-Erweiterungen ausführen. Erweiterung 013 und ein Modellzugang sind dafür nicht erforderlich. Die Datei unter `rollback/` dabei nicht ausführen.
2. Mit einem nichtadministrativen Prüfzugang und ausdrücklich zugeteiltem Prüfungsrecht einen Nachweis für einen anderen synthetischen Mitarbeiter im eigenen Studio bestätigen. Lesestand und Quiz müssen passend vorbereitet sein.
3. Eigene Nachweise dürfen von diesem Konto nicht bestätigt werden. Ein berechtigter anderer Prüfer muss übernehmen. Fremde Studios und fehlende Rechte müssen weiterhin abgelehnt werden. Ein technischer Prüfer muss die Grenzen zusätzlich an direkten API-Aufrufen gegen das gehostete Projekt prüfen; keine Schlüssel oder Sitzungstokens dafür in den Chat kopieren. Keine produktiven Nachweise für Versuche verändern.
4. Mitarbeiteransicht, Kurskarte, Onboarding und Controlling bei unverändertem Datenstand vergleichen. Ein Kurs mit verpflichtender, noch offener Praxis darf noch nicht abgeschlossen sein; nach zulässiger Freigabe müssen die Anzeigen zusammenpassen. Nach erneutem Anmelden muss der Stand erhalten bleiben.

Ohne eine Verbindung mit administrativem Datenbankzugriff kann Codex diese Migration nicht im gehosteten Projekt ausführen oder deren Installation bestätigen. GitHub Pages führt sie nicht automatisch aus. Echte E-Mail-Zustellung, SMTP, physische Mobilgeräte, Backups und Datenschutzabnahme bleiben offen.

## Rückweg

Der reine Quellcommit kann zurückgenommen werden; eine bereits installierte Migration wird dadurch nicht automatisch rückgängig. Für einen ausdrücklich notwendigen Datenbankrückweg existiert [rollback/015_learning_evidence_review.sql](../../backend/supabase/rollback/015_learning_evidence_review.sql). Sie stellt die vorherigen beiden Funktionsdefinitionen wieder her und erhält die Datensätze.

Dieser Rückweg öffnet die beschriebene Selbstbestätigung wieder. Vor einem gehosteten Rückweg deshalb die delegierten Rechte `learning.practice` und `learning.assess` entziehen und die Ursache prüfen. Das ist keine normale Einrichtungsdatei. Bevorzugt die eng begrenzte Korrektur beibehalten beziehungsweise vorwärts korrigieren. Keine alten Bestätigungen automatisch löschen.
