# Paket 1K – Zuweisungen trotz Studiofilter und Listenseiten anzeigen

Stand: 09.11.2026. Grundlage: veröffentlichte Navigationspakete 1I/1J (`16bb1e2`).

## Problem und Änderung

Nach erfolgreicher Onboarding-Zuweisung merkte sich die Leitungsansicht zwar die zurückgegebene Plan-ID, behielt aber den bisherigen Studiofilter und die bisherige Listenseite. Der neue Plan konnte dadurch außerhalb der geladenen Liste liegen. Die Ansicht öffnete dann ungefragt den ersten anderen Plan.

Eine erfolgreiche Zuweisung stellt die Ansicht jetzt auf das gewählte Studio und die erste Seite um. Bei einer ausdrücklich ausgewählten Plan-ID wird kein anderer Plan als Ersatz geöffnet. Liegt die ID außerhalb der geladenen Seite, erklärt ein neutraler Hinweis die Situation und verweist auf Studiofilter, Seitenauswahl und bewusste Planwahl. Eine inzwischen leere Folgeseite behält den Zurück-Button.

Der Hinweis ist an eine erfolgreiche Teamlistenabfrage und die bestehende Prüffreigabe gebunden. Ein Lesefehler bleibt als solcher sichtbar. Eine fehlgeschlagene Zuweisung verändert weder Filter noch Seite oder Formulareingaben. Die persönlichen Pläne und ihre bisherigen Hinweise bleiben erhalten.

## Wiederholung nach unklarer Antwort

Die bestehende Serverfunktion kann für eine unveränderte Anfrage mit derselben Vorgangs-ID den bereits gespeicherten Plan zurückgeben. Dessen Erstellzeitpunkt wird nicht geändert. Nach zwischenzeitlichen weiteren Zuweisungen kann dieser ältere Plan auf einer späteren Seite liegen. Daher wird kein automatisches Finden auf Seite 1 versprochen: Der Hinweis und die bestehende Seitenauswahl ermöglichen die gezielte weitere Navigation, ohne einen anderen Plan vorzutäuschen oder eine zweite Zuweisung anzulegen.

## Abnahmefälle

- Alter Studiofilter, Zuweisung in anderem freigegebenem Studio: Filter folgt dem Zielstudio und die richtige Plan-ID wird ausgewählt.
- Zuweisung von einer Folgeseite: Rückkehr auf die erste Seite mit neuem Plan.
- Bereits gespeicherte Zuweisung mit verlorener Antwort: identische Wiederholung, nur ein angelegter Plan; liegt er außerhalb der ersten Seite, Hinweis und manuelle Navigation zum richtigen Plan.
- Leere Folgeseite nach Aktualisierung: kein falscher Erststart-Text, Zurück bleibt erreichbar; danach einen vorhandenen Plan bewusst wählen.
- Teamlistenfehler: Fehlermeldung statt Behauptung, der Plan sei nicht auf der Seite.
- Defensive Freigabeprüfung ohne Prüffunktion: keine Teamlistenabfrage und kein falscher Fehlziel-Hinweis.
- Abgelehnte Zuweisung: Formular, Studiofilter, Seite und bisheriger Bestand bleiben erhalten.

Die Browser-Testdaten wenden echte Studiofilterung, Sortierung nach Erstellzeit und ID sowie Seitenausschnitte an. Es sind synthetische Daten und simulierte Serverantworten; gehostete Rollen und echte Mitarbeiterzuweisungen sind separat abzunehmen. Die saubere Baseline zeigte vier erwartete Fehler und zwei bereits bestandene Sicherheits-/Fehlerfälle (32,3 Sekunden). Nach der Korrektur bestanden alle 55 gezielten Onboarding-, Kurs-, Einladungs- und Benachrichtigungsfälle (1,2 Minuten). Build und Produktionssmoke der exakt übereinstimmenden Prüfkopie bestanden ebenfalls. Die unabhängige QA gab Quelländerung, Rollenbegrenzung und Hashgleichheit frei. Die vollständige GitHub-Abnahme und Bereitstellung bleiben bis zum tatsächlichen Lauf offen. Keine Datenbankmigration oder SMTP-Änderung.

Manuell prüfen: In „Onboarding verwalten“ zunächst einen Studiofilter beziehungsweise eine Folgeseite wählen, dann einen Plan zuweisen. Nach Erfolg müssen Studio, Seite und geöffneter Plan zusammenpassen. Bei einem Hinweis die Seitenauswahl oder die bewusste Auswahl aus der Liste verwenden.

Rückweg: den isolierten Komponenten-/Test-/Dokumentationscommit zurücknehmen. Gespeicherte Zuweisungen werden dabei nicht gelöscht.
