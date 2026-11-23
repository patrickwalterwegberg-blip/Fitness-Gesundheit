# Paket 1Q – Praxisbestätigung im Controlling

Stand: 23.11.2026. GitHub `main` und lokaler Ausgangsstand: `bc01aba49030c482ff6ee8a3fd59e1c145f0af06`. Dessen Controlling-Studiofilter wurde im [Workflow 45169439943](https://github.com/patrickwalterwegberg-blip/Fitness-Gesundheit/actions/runs/45169439943) einschließlich Bereitstellung desselben Commits erfolgreich abgenommen.

## Ziel und bestätigter Befund

Eine Person mit delegiertem Praxisprüfrecht soll im Controlling ausschließlich zulässige Bestätigungen angeboten bekommen. Bisher konnte sie auch bei ihrem eigenen Lernauftrag das Bestätigungsformular öffnen. SQL 015 weist diese Selbstbestätigung für Nichtadmins zurück; der Lernhub blendet sie bereits aus. Der Browserfall am unveränderten Controlling reproduzierte den angebotenen eigenen Button: ein Treffer statt des erwarteten fehlenden Buttons.

Priorität P2: irreführende Oberflächenaktion mit anschließendem Rechtefehler. Kein nachgewiesener neuer Sicherheitsbypass. Die bereits vorhandene Serverregel bleibt verbindlich; ihre gehostete Installation wird mit dieser lokalen Prüfung nicht unabhängig bestätigt. Die bestehende Admin-Ausnahme bleibt erhalten.

## Änderung

`ControllingCenter` prüft das aktuelle Praxisprüfrecht, die Identität der lernenden Person und die Admin-Ausnahme gemeinsam. Eigene Praxis wird für Nichtadmins nicht angeboten. Stattdessen steht dort: „Deine eigene Praxiseinweisung muss eine andere berechtigte Person bestätigen.“ Der Hinweis erscheint bei eigenen erforderlichen, noch offenen Einweisungen mit delegiertem Prüfrecht.

Eine geöffnete Bestätigung wird anhand ihrer ID gegen die aktuellen Zuweisungen aufgelöst und an die Identität der Prüfperson beim Öffnen gebunden. Lesen, bestandener Wissenstest, erforderliche und noch nicht bestätigte Praxis werden vor einem Aufruf erneut berücksichtigt. Bei Rechte- oder Identitätsverlust, entferntem Auftrag oder ungültig gewordenen Voraussetzungen wird der offene Dialogzustand gelöscht. Ein später erneut erteiltes Recht öffnet das alte Formular nicht automatisch wieder.

Während eines erlaubten laufenden Speichervorgangs bleibt die Ladeanzeige erhalten, auch wenn die Serveraktualisierung schon den neuen Fortschritt liefert. Der Rechteentzug schließt das Formular auch in diesem Zustand. Eine weitere Praxisbestätigung kann während der noch ausstehenden Antwort nicht geöffnet werden. Ein bereits gestarteter Serveraufruf wird durch diesen UI-Guard nicht rückgängig gemacht; serverseitige Rechteprüfung und gespeicherter Ergebnisstand bleiben maßgeblich. Es gibt keine automatische Wiederholung.

Ein abgelehnter, weiterhin erlaubter Speicherversuch behält Formular und Notiz und meldet keinen Abschluss. Die Änderung betrifft die bestehende Oberfläche, nicht Rollen, Grundrechte oder SQL. Schwarz-Gold-Design bleibt erhalten; keine Datenbankmigration, keine Datenbereinigung, keine Mail- oder KI-Aktivierung.

## Gezielte Prüfung

**21 Chromium-Browserfälle bestanden** mit einem lokalen QA-Einstieg, der dieselbe Komponente bei aktuellen Daten- und Rechteänderungen weiterverwendet:

- Mitarbeiter und Studioleitung: eigener Button fehlt, Erklärung sichtbar, kein Bestätigungsaufruf; berechtigte Fremdbestätigung funktioniert mit Notiz genau einmal.
- Admin-Selbstbestätigung bleibt möglich; reines Leserecht gewährt keine Praxisaktion.
- Fehlende Lesebestätigung oder fehlender Wissenstest halten den Fremdbutton deaktiviert.
- Offener Dialog wird bei Praxisrechtentzug, Wechsel zur lernenden Person, Wechsel zwischen fremden Prüfpersonen, Controllingentzug, entferntem Auftrag, bereits bestätigter Praxis, entzogenen Lesebestätigungen, entzogenem Quizstatus oder entfallener Praxisanforderung geleert. Wiederherstellung öffnet ihn nicht erneut; bewusstes Wiederöffnen startet ohne alte Notiz.
- Admin-Herabstufung entfernt eine geöffnete eigene Bestätigung.
- Erlaubte Bestätigung mit vor der Antwort aktualisiertem Fortschritt erzeugt keinen falschen Fehler. Rechteentzug während der ausstehenden Antwort belebt den alten Dialog nicht wieder und verursacht keinen zweiten Aufruf.
- Abgelehnte Bestätigung behält die Notiz und zeigt keinen abgeschlossenen Lernauftrag an.
- Eigener Hinweis passt bei 390 Pixeln in den Dialog; Screenshot visuell geprüft. Kein physischer Gerätetest.

Die Testeinträge und Steuerfunktionen liegen ausschließlich unter `tests/` und werden nicht von der Produktionsanwendung importiert. Der Produktionssmoke ergänzt die gleiche Regel am kompilierten echten Einstieg mit `TeamAdministration`: Admin-Eigenformular öffnen und abbrechen ohne Schreibzugriff; delegierter Mitarbeiter erhält den Eigenhinweis; genau eine fremde Bestätigung wird mit dem passenden Zuweisungsziel gespeichert und ohne falschen Fehler angezeigt. Sämtliche Backendaufrufe dieser Browser-/Produktionsprüfungen sind simuliert.

Die unabhängige Quell- und QA-Abnahme bestand mit **187 Datenbank-/Modelltests**, **13 Zugriffsdiensttests**, **9 Mock-Assistentdiensttests** und dem Build mit synthetischer Backendkonfiguration. Vor und nach der Prüfung waren alle 190 Quell-/Test-/Konfigurationsdateien zwischen Arbeitsrepo und eingefrorener Prüfkopie hashgleich. Die bestehende Chunkgrößenwarnung bleibt erhalten.

Der Produktionssmoke bestand einschließlich der neuen delegierten Praxisprüfung, Admin-Ausnahme und genau einer fremden Bestätigung sowie der bisherigen Login-, Video- und PDF-Prüfungen. Alle Netzaufrufe waren simuliert. Die vollständige Browserregression bestand mit **408 Tests (7,9 Minuten)**. Vor und nach der Prüfung waren erneut alle 190 Dateien zwischen Arbeitsrepo und Prüfkopie hashgleich. Es gab keine Quelländerung während der Prüfung; die QA-Steuerfunktionen sind im Produktionsartefakt nicht enthalten. Lokale Browser-/Portausführung nutzte die reguläre automatische Freigabeprüfung. Die Bereitstellung ist erst nach erfolgreichem GitHub-Prüflauf und Deployment genau des geprüften Commits bestätigt; dieser Abschluss wird separat kontrolliert.

## Rückweg und manuelle Abnahme

Keine neue Supabase-Einrichtung erforderlich. Der Rückweg entfernt nur dieses Quellpaket; bestehende Nachweise, Notizen und Datenbankregeln bleiben bestehen. Die vorherige unzulässige eigene Oberflächenaktion wäre dann wieder sichtbar.

Nach bestätigter Bereitstellung bei einer Person mit delegiertem Praxisprüfrecht den eigenen und einen fremden Lernauftrag vergleichen. Nur der zulässige Fremdauftrag bietet die Bestätigung an. Die bestehende Admin-Ausnahme separat berücksichtigen. Dafür keine neuen Mitarbeiter oder Postfächer anlegen und keine echten Praxiseinweisungen nur zum Test als erledigt markieren. Geräteabnahme, echte Neueinladung, gehostete Erweiterung 017, Mitarbeiter-PDF-Abnahme, Backups und Datenschutzunterlagen bleiben separat offen; generative KI bleibt zurückgestellt.
