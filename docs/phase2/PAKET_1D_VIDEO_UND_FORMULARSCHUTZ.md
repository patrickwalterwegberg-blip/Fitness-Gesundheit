# Paket 1D – Videoentwürfe und Formularbeschriftungen schützen

Stand: 08.11.2026. Grundlage: GitHub-Stand `7bbe8e8`, die in Phase 1 zurückgestellten Korrekturen und erneute unabhängige Produkt-/Security-/QA-Quellsicht. Status: lokale Paketprüfung vollständig bestanden; echte Geräte-/Kontenabnahme bleibt getrennt.

## Ziel und Änderung

Eine ausgewählte Videodatei oder gestoppte Browseraufnahme bleibt beim Abbruch einer Wechselentscheidung erhalten. Alle von der Videobibliothek angebotenen Wege zum Verlassen dieser lokalen Vorschau werden abgesichert: anderen Upload fortsetzen, neue Aufnahme öffnen, Bibliothek schließen oder ein vorhandenes Video für die Lektion verwenden.

- „Geöffnete Auswahl behalten“, Escape und Schließen des Entscheidungsdialogs erhalten Datei, lesbare Vorschau, Titel und Studio. Die zuvor gewünschte Aktion wird dabei nicht ausgeführt.
- Erst „Auswahl verwerfen und wechseln/schließen/Video verwenden“ führt die passende Aktion aus. Ein Wechsel entfernt keine gespeicherten Serveruploads und erzeugt keine Upload- oder Löschaufrufe.
- Die gleiche effektive Uploadticket-ID erhält den vorhandenen Editor ohne Verlustabfrage. Ein bestätigter anderer/neuer Editor erhält eine neue Sitzung, damit Dateivorschau und Ticket nicht verwechselt werden.
- Scheitert eine bestätigte Videozuordnung, bleibt der noch geöffnete Aufnahmeentwurf erhalten. Keine vorsorgliche Löschung lokaler Daten.
- Aktive Aufnahme, Upload und Löschvorgänge behalten ihre bestehenden Bedienungssperren. Ein bestätigter erfolgreicher Upload darf weiterhin normal abschließen.
- Beim Verwerfen einer lokalen Datei oder Start einer neuen Aufnahme darf ein kurzzeitig noch vorhandener Blob-Link nicht auf eine bereits geleerte Datei zugreifen und die Ansicht zum Absturz bringen.
- Beschriftungen von Checkboxen und Auswahlfeldern liegen über der Karten-Klickfläche. Ein Klick auf den Checkboxtext bestätigt genau einmal; ein Klick auf eine Feldbeschriftung fokussiert das Feld und öffnet nicht die Karte.

Schwarz-Gold-Design und vorhandene Studio-/Funktionsrechte bleiben bestehen. Keine Datenbankmigration, neue Speicherung, automatische Bereinigung, Schnittfunktion oder Bildschirmaufnahme.

## Test und Abnahme

Vorhandene Browserfälle prüfen Datei/Browseraufnahme, Behalten/Escape, bestätigten Wechsel, unterbrochenen Upload und erneuten Aufruf desselben Tickets. Ergänzende Fälle prüfen Bibliothek schließen, vorhandenes Video auswählen, gescheiterte Zuordnung, lokales Verwerfen und die tatsächlichen Label-Klickflächen.

Unabhängige QA ergänzt mehrfachen Wechsel zwischen zwei Tickets sowie die Lesbarkeit lokaler Blob-Daten und die Aufnahme-/Wechselsperre. Danach vollständige Browserregression, passende Video-/Datenmodellprüfung, Build und Test der kompilierten Anwendung. Während Browserprüfungen keine Änderungen an ihren Anwendungssourcen.

## Ergebnis und Grenzen

| Prüfung | Ergebnis |
|---|---|
| Fehlernachweis am Basisstand | Drei neue Fälle schlagen gezielt fehl: Checkboxtext bestätigt nicht, lokales Verwerfen bricht die Ansicht ab, Bibliothek schließt ohne Verlustabfrage |
| Gezielte Browserprüfungen | 62 bestanden, einschließlich aller vorhandenen Video-/Onboarding-/Kartenfälle und neuer Schutzfälle |
| Unabhängige QA | 4 bestanden: zwei Uploadtickets, Handykamera-Dateieingabe mit Downloadvergleich, aktive/gestoppte Aufnahme, verschachtelter Kurseditor |
| Datenbank-/Modellprüfung | 141 bestanden, lokale Datenbank und Modelle |
| Zugriffs-/Assistentenfunktionen | 13 + 9 bestanden, ausschließlich lokale Testaufrufe |
| Build und Produktions-Smoke | Bestanden, einschließlich Behalten und echtem lokalen Download mit unveränderten Bytes |
| Vollständige Browserregression | 328 bestanden in 6,6 Minuten; unabhängige QA, ein Chromium-Worker, unveränderte Quellen |

Security hat den endgültigen Quellstand unabhängig geprüft: keine neue Rechtefreigabe, keine Serverlöschung durch Wechsel oder Abbruch; der Nullzugriff in der Vorschau ist behoben. Produkt hat die Bibliothekswege und die Grenzen des Schutzes abgegrenzt.

Der Produktions-Smoke prüft das lokale Sichern über den tatsächlichen Download-Button. Ein anfänglicher direkter Testabruf der Blob-URL wurde durch die bestehende CSP blockiert; dafür wurde nur die Testmethode geändert. Die Sicherheitsrichtlinie wurde nicht erweitert. Ein unpassender Textarea-Locator im eigenen QA-Fall wurde ebenfalls ausschließlich im Test korrigiert. Die mobile Warnung im verschachtelten Picker wurde bei 390 Pixeln abschließend visuell geprüft: Text, Schließen und beide Entscheidungen sind erreichbar.

Der isolierte Stand unter `/tmp/teamhub-paket1d-run` enthält `7bbe8e8` plus ausschließlich die Paketdateien. Die auf realer Hardware zu prüfenden Kamera-/Uploadabläufe werden dadurch nicht vorweggenommen. Lokale Prüfungen verwenden synthetische Daten, simulierte Server-/Storageaufrufe und gegebenenfalls Chromiums künstliche Kamera. Sie bestätigen keine echte Handykamera oder produktive Speicherrechte.

Die Zusage bezieht sich auf die genannten Bedienwege innerhalb der Videobibliothek. Neuladen/Tab-Schließen, Browsernavigation, Sitzungsende, unerwartetes Unmount und Dateiersatz innerhalb des Aufnahmeformulars bleiben getrennte Grenzen. Ein lokaler Entwurf wird nicht automatisch dauerhaft auf dem Gerät gespeichert; dafür steht „Video auf diesem Gerät sichern“ zur Verfügung.

Nach Bereitstellung am tatsächlichen Handy eine kurze Aufnahme stoppen, Titel/Studio setzen und die vier geschützten Bedienwege jeweils abbrechen. Vorschau und Eingaben müssen erhalten bleiben. Anschließend einen bewusst gewählten Upload mit dem eigenen Prüfzugang abschließen; keine echten Mitarbeiterdaten für Testmaterial verwenden.

Rückweg: den isolierten Frontend-Paketcommit zurücknehmen und vorherigen Stand erneut bereitstellen. Keine Datenbankänderung zurückzurollen.

Der Veröffentlichungsabschluss wird nach der Git-Übertragung über GitHubs öffentliche Workflowseite geprüft und an den konkreten Commit gebunden. Erfolgreiche lokale Prüfungen ersetzen diesen Nachweis nicht.
