# Paket 1H – Fehlermeldungen im Dialog sichtbar halten

Stand: 09.11.2026. Grundlage: veröffentlichtes Paket 1F/1G (`d43c513`). Gestaltung nach Apple-HIG-Referenz mit den bestehenden Teamhub-Vorgaben.

## Problem und Änderung

Nach einer Aktion unten in einem langen Dialog scrollte die bisherige Fehlerbehandlung mit `scrollIntoView({block:'nearest'})` zur Fehlermeldung. Die klebende Kopfzeile wurde dabei nicht berücksichtigt. Der Browsernachweis zeigte eine überdeckte Meldung in Hochformat (390 × 844) und Querformat (844 × 390): Die Meldung begann bei y=13 beziehungsweise y=17; die Kopfzeile endete erst bei y=90 beziehungsweise y=102.

Der gemeinsame `ScheduleDialog` misst jetzt die tatsächliche Unterkante seiner eigenen Kopfzeile und den sichtbaren Innenbereich des Dialogs. Er scrollt ausschließlich den eigenen Dialog um den nötigen Abstand, mit acht Pixeln Freiraum. Bereits sichtbare Meldungen lösen keine unnötige Scrollbewegung aus. Bei einer außergewöhnlich langen Meldung wird deren Anfang sichtbar gehalten; eine Meldung über die gesamte verfügbare Höhe hinaus kann nicht gleichzeitig vollständig sichtbar sein.

Die Änderung setzt keinen Fokus und verändert keine Formulardaten, Rechte, E-Mail-Logik, Farben oder Schriften. Es gibt keine Datenbankänderung und keine automatische Wiederholung fehlgeschlagener Aktionen.

## Prüfung

- Zwei Browserfälle reproduzieren vor der Korrektur die überdeckte Fehlermeldung nach genau einer ausdrücklich simulierten Linkanforderung. Reine Sichtbarkeitsprüfungen reichen dafür nicht; die gemessenen Rechtecke müssen sich außerhalb der Kopfzeile befinden.
- Hoch-/Querformat: Meldung vollständig im sichtbaren Bereich, Kontoinformationen erhalten, genau eine simulierte Anfrage.
- Tab und Umschalt+Tab bleiben im Dialog; Escape schließt ihn und gibt den Fokus an den ursprünglichen Auslöser zurück. Dieser Ablauf bestand bereits am Ausgangsstand.
- Bestehender Kalender-Speicherfehler am Handy: Meldung unterhalb der Kopfzeile, eingegebener Titel bleibt erhalten, kein falscher Speichererfolg.
- Gezielte Formular-/Dialogregression, Build und Produktionssmoke; anschließend vollständiger verpflichtender GitHub-Lauf vor Bereitstellung.

Alle Daten und Backendantworten der Browserprüfungen sind synthetisch. Echte Postfachzustellung sowie iPhone-/Android-Geräteabnahme sind gesondert nachzuweisen. Lokal bestanden alle 35 gezielten Browserfälle in 40,7 Sekunden. Build und Produktionssmoke mit synthetischer Backend-URL bestanden ebenfalls. Beide Fehler-Screenshots wurden visuell geprüft; die unabhängige QA gab Quelländerung, Geometrieprüfungen und Hashgleichheit der Prüfkopie frei. Die vollständige GitHub-Abnahme und Veröffentlichung bleiben bis zum tatsächlichen Lauf offen. Ein nachträglicher Orientierungswechsel bei bereits sichtbarem Fehler ist nicht Gegenstand dieser Abnahme.

Manuell prüfen: Einen längeren Dialog am Handy öffnen und nach unten scrollen. Falls eine Aktion eine Fehlermeldung auslöst, muss deren Anfang unter der Kopfzeile sichtbar sein und der Entwurf erhalten bleiben. Keine SMTP-Einstellungen ändern oder echte Mails wiederholt anfordern, um einen Fehler zu erzeugen.

Rückweg: den isolierten Komponenten-/Test-/Dokumentationscommit zurücknehmen; keine Datenrückmigration erforderlich.
