# Paket 1P – Studioauswahl im Controlling

Stand: 23.11.2026. GitHub `main` und lokaler Ausgangsstand: `e68264ca8654f4f22c1a0445e50c7c730f1c3fe7`. Die vorherige Demo-Trennung wurde im [Workflow 45131695683](https://github.com/patrickwalterwegberg-blip/Fitness-Gesundheit/actions/runs/45131695683) einschließlich Bereitstellung desselben Commits erfolgreich abgeschlossen.

## Ziel und Befund

Eine Mitarbeiterin aus Bersenbrück und Dörpen darf beim Controllingfilter „Haselünne“ nicht als dort zugehörige Mitarbeiterin erscheinen. Bisher wurde jede Mehrfachzuordnung auf den Anzeigetext „Alle Studios“ reduziert. Die Oberfläche verwendete diesen Text anschließend als Filterregel. Dadurch enthielten Tabelle, Mitarbeiterzahl und CSV auch Personen ohne passende Zuordnung. Der Fehler wurde unabhängig im Quellcode gefunden und im Browser reproduziert: In Haselünne erschienen drei statt der erwarteten zwei Personen.

Priorität P2: unzutreffende Personenauswahl und Zählung in einer bereits freigegebenen Übersicht. Kein nachgewiesener Zugriff auf nicht serverseitig freigegebene Daten. Die Datenbank-/Rollen-/Studiofreigaben werden durch diese Änderung nicht erweitert.

## Änderung

`TeamAdministration` behält die konkreten freigegebenen Studionamen im Controlling-Personenmodell. Die bisher verwendete Vereinigung aus Mitgliedschaften und vorhandenen Lernzuweisungen bleibt erhalten, damit auch bestehende Lernaufträge im zugehörigen Studio auswertbar bleiben. Mehrere Zuordnungen werden als konkrete Namen angezeigt, beispielsweise „Bersenbrück · Dörpen“.

`ControllingCenter` filtert im Onlinebetrieb nach dieser Liste. Die bestehende Admin-Ausnahme bleibt explizit erhalten: Administratoren werden wie bisher in jedem Studio berücksichtigt. „Alle Studios“ zeigt weiterhin alle serverseitig gelieferten Personen, einschließlich Personen ohne Zuordnung. Die lokale Demo verwendet ihre bisherige Filterregel. Tabelle, Kennzahlen, Mitarbeiterdetails und CSV beziehen sich auf dieselbe gefilterte Auswahl.

Keine neue Migration, keine Datenbereinigung und keine Änderungen an Schwarz-Gold-Design, Einladungsversand oder KI-Betrieb.

## Prüfung

Elf gezielte Chromium-Browsertests bestanden mit synthetischen Backenddaten:

- Je Studio Bersenbrück, Dörpen, Haselünne, Lathen, Löningen, Sögel und Werlte: Tabelle, Mitarbeiterzahl und tatsächlicher CSV-Download stimmen mit den erwarteten Personen überein.
- Mehrfachzuordnung erscheint nur in den beiden zugehörigen Studios; Einzelzuordnung, bestehender Lernauftrag ohne aktuelle Mitgliedschaft und Admin-Verhalten bleiben erhalten.
- Für die Person mit zwei Studios stimmen offene beziehungsweise erledigte Aufgaben, CSV-Zahlen und Mitarbeiterdetails je Studio. Aufgaben werden weiterhin über Mitarbeiter-IDs zugeordnet.
- „Alle Studios“ enthält auch Personen ohne Zuordnung und zeigt die konkreten Namen bei Mehrfachzuordnungen.
- Ein widersprüchlicher Mitarbeiter-/Studiofilter erzeugt leere Tabelle, Nullzählung und einen CSV-Export nur mit Kopfzeile.
- Nach Neuladen mit entzogener Studiozuordnung verschwindet die Person dort; die verbleibende Zuordnung funktioniert weiterhin. Keine Aussage über eine sofortige Übertragung einer Rechteänderung auf eine unverändert geöffnete Ansicht.
- Bei 390 Pixeln bleiben Filter, Kennzahlen und Tabelle bedienbar; keine horizontale Überbreite der gesamten Seite. Screenshot mit sichtbarer Mehrfachzuordnung geprüft; die breite Tabelle ist innerhalb ihres Containers scrollbar.

Der Produktionssmoke ergänzt denselben Fehler am kompilierten Anwendungseinstieg: Zwei konkrete Studiozuordnungen erweitern nicht den dritten Studiofilter; dessen tatsächlicher CSV-Download enthält ebenfalls nur die passende Auswahl. Alle Backendaufrufe dieser Tests sind simuliert. Die Serverregeln werden dadurch weder installiert noch als im gehosteten Projekt geprüft bestätigt. Echte Mobilgeräte bleiben gesondert abzunehmen.

Die unabhängige Quell- und QA-Abnahme bestand mit **187 Datenbank-/Modelltests**, **13 Zugriffsdiensttests**, **9 Mock-Assistentdiensttests** und dem Build mit synthetischer Backendkonfiguration. Vor und nach der Prüfung waren alle 187 Quell-/Test-/Konfigurationsdateien zwischen Repo und eingefrorener Prüfkopie hashgleich. Die vorhandene Chunkgrößenwarnung bleibt bestehen.

Der Produktionssmoke einschließlich des neuen Controlling-Filters und seines tatsächlichen CSV-Downloads bestand; ebenso die bisherigen Login-, Video- und PDF-Prüfungen. Alle Netzaufrufe waren simuliert. Die vollständige Browserregression bestand mit **387 Tests (7,4 Minuten)**. Vor und nach dem Lauf waren erneut alle 187 Dateien zwischen Arbeitsrepo und Prüfkopie hashgleich; keine Quelländerung während der Prüfung. Vite/Chromium benötigten die reguläre automatische Freigabeprüfung für lokale Port-/Browserausführung. Die Veröffentlichung ist erst nach erfolgreicher GitHub-Abnahme und Bereitstellung genau des geprüften Commitstands bestätigt; dieser Status wird abschließend separat kontrolliert.

## Rückweg und manuelle Kontrolle

Der Rückweg entfernt nur dieses Quellpaket; es gibt keine Datenbankänderung und keine automatische Datenlöschung. Danach würde der beschriebene Mehrfachzuordnungsfehler wieder auftreten.

Nach bestätigter Veröffentlichung im Controlling dieselbe Person mit zwei Studios unter beiden Standorten, einem dritten Standort und „Alle Studios“ prüfen. Mitarbeiterzahl und CSV müssen zur angezeigten Auswahl passen. Dafür keine zusätzlichen Mitarbeiterkonten oder Postfächer anlegen.

## Getrennter Folgebefund

Das Controlling bietet einer Person mit delegiertem Praxisprüfrecht auch bei einem eigenen Lernauftrag die Praxisbestätigung an. SQL 015 lehnt diese Selbstfreigabe für Nichtadmins korrekt ab; der Lernhub blendet sie bereits aus. Das ist ein weiterer P2-Oberflächenbefund für ein eigenes kleines Paket. Er wird nicht zusammen mit dem Studiofilter umgebaut. Die ausstehende Neueinladungsprüfung, gehostete Erweiterung 017, echte Mitarbeiter-PDF-Abnahme, Backups/Wiederherstellung und Datenschutzunterlagen bleiben separat offen; generative KI bleibt zurückgestellt.
