# Module gestalten und Mitarbeiterfortschritt begleiten

## Was jetzt ausprobiert werden kann

In der lokalen Demo über **Modulbaukasten** und **Controlling** starten. Die Demo-Profilwahl dient ausschließlich der Vorschau; sie ist keine Anmeldung. Rechte, Entwürfe und Fortschritte werden in diesem Browser gespeichert.

### Ausgewählte Mitarbeiter freischalten

1. Als Geschäftsführung **Modulbaukasten → Berechtigungen** öffnen.
2. Beim Mitarbeiter **Bearbeiten**, bei Bedarf **Neu erstellen** und **Veröffentlichen** aktivieren. Erstellen und Veröffentlichen setzen Bearbeiten voraus.
3. Zur Vorschau das betreffende Demo-Profil auswählen. Ein Bearbeiter ohne Veröffentlichungsrecht kann einen Entwurf speichern; die Geschäftsführung kann ihn anschließend prüfen und veröffentlichen.

Baukastenrechte gelten global für die Gestaltung der Module. Sie erlauben keine Einsicht ins Admin-Controlling und ersetzen nicht die Leser- und Schreiberrollen eines veröffentlichten Moduls.

### Ein eigenes Modul oder Zusatzfelder erstellen

1. **Neues Modul** wählen. Im Popup Namen und Bereich festlegen. Ein eigenständiges Modul erscheint unter **Eigene Module**. Zusatzfelder werden beim zugehörigen Eintrag geöffnet, zum Beispiel über das Zusatzfelder-Symbol eines Geräts oder in den Aufgabendetails.
2. Standorte sowie Leser- und Schreiberrollen festlegen. Administratoren behalten zur Verwaltung Einsicht. Standortzugehörigkeit wird im echten Backend zusätzlich geprüft.
3. Felder hinzufügen: Text, langer Text, Zahl, Datum, Auswahl, Checkbox, Mitarbeiter oder lokale Datei. Pflichtfelder und Reihenfolge einstellen; Auswahloptionen zeilenweise eingeben.
4. Über **Vorschau** das Formular ansehen. Die Vorschau speichert keine Einträge.
5. **Entwurf speichern** oder **Veröffentlichen** wählen. Ein Entwurf verändert das bisher veröffentlichte Formular nicht.
6. Im Popup **Modul öffnen** wählen. **Neuer Eintrag** öffnet das Eingabeformular als weiteres Popup; ein gespeicherter Eintrag öffnet seine Details. Über **Eintrag bearbeiten** sind seine bisherigen Werte vorausgefüllt.

Änderungen werden als neue Version veröffentlicht. Bestehende Einträge behalten die ursprüngliche Feldstruktur, auch beim späteren Bearbeiten. Das Entfernen oder Umbenennen eines Feldes löscht keine alten Einträge. **Versionsverlauf → Wiederherstellen** veröffentlicht eine frühere Gestaltung als weitere Version; die Historie bleibt erhalten. Der Bereich eines bereits veröffentlichten Moduls lässt sich nicht wechseln. Gleichzeitige Bearbeitung wird über Versionsstände geprüft; bei einem Konflikt den Entwurf neu öffnen und Änderungen abgleichen.

### Controlling verwenden

1. Als Geschäftsführung **Controlling** öffnen.
2. Standort und Mitarbeiter auswählen. Die Zeitraumwahl begrenzt abgeschlossene, zugewiesene Aufgaben; offene und überfällige Aufgaben zeigen immer den aktuellen Stand.
3. Die Mitarbeiterdetails öffnen. Bei neu dokumentierten Abschlüssen werden Zeitpunkt und ausführende Person angezeigt. Ältere Abschlüsse ohne Datum erscheinen nur bei **Gesamter Zeitraum**; fehlende Nachweise werden nicht ergänzt.
4. Über **Lernziel zuweisen** Kurs, Mitarbeiter, Standort und optional eine Frist wählen. Bei Bedarf zusätzlich eine praktische Einweisung verlangen.
5. Das Mitarbeiterprofil liest im Lernhub die Lektionen und absolviert den Beispiel-Wissenstest. Gelesene Inhalte allein gelten nicht als bestandener Kursnachweis.
6. Die Geschäftsführung bestätigt die Praxis erst nach vollständigem Lesefortschritt, bestandenem Wissenstest und tatsächlich durchgeführter Einweisung. Name, Zeitpunkt und Notiz werden separat gespeichert.

Die Übersicht unterscheidet **gelesen**, **Wissenstest bestanden** und **Praxis bestätigt**. Der CSV-Export folgt den gewählten Filtern. Anonymes Feedback wird nicht in das Controlling übernommen.

## Gemeinsames Backend aktivieren

Im bestehenden Projekt sind die ersten fünf Migrationen laut Einrichtungsrückmeldung installiert. Für neue Projekte zuerst die [Backend-Anleitung](BACKEND.md) durcharbeiten, beginnend mit:

1. `backend/supabase/001_team.sql`
2. `backend/supabase/002_modules_controlling.sql`

Anschließend im echten **Teamzugang** anmelden und dort **Modulbaukasten**, **Eigene Module** oder **Controlling** öffnen. Diese Ansichten lesen ausschließlich Serverdaten und importieren keine lokalen Demo-Daten. Die zweite Migration trennt Entwürfe und veröffentlichte Versionen, schützt Rechte serverseitig und versieht Änderungen mit authentifizierter User-ID und Serverzeit. Alte Aufgabenabschlüsse erhalten keine rückwirkend erfundene ausführende Person.

Im gemeinsamen Backend sind zunächst **eigenständige Module und Aufgaben-Zusatzfelder** angeschlossen. Andere Kernmodule und Upload-Felder innerhalb eigener Formulare sind noch nicht angebunden; diese Auswahl ist im Online-Baukasten deaktiviert. Lokale Dateiwerte werden nicht ins Backend übertragen.

### Lernfortschritt im Backend

Die Migration stellt Kursmetadaten, individuelle Lernziele, Lesefortschritt, getrennte Wissensbeurteilungen, Praxisbestätigungen und Ereignisprotokolle bereit. Es werden keine Beispielkurse oder Quizantworten angelegt. Migration 006 ergänzt die gemeinsame Oberfläche für Textlektionen und serverseitig bewertete Multiple-Choice-Tests. [Einrichtung und vollständiger Testlauf](PILOT_TESTBETRIEB.md). Der bestehende Demo-Lernhub mit Beispieltests bleibt lokal.

Zur Integration einer tatsächlichen Akademie stehen folgende Schnittstellen bereit:

| Schnittstelle | Berechtigung und Verhalten |
| --- | --- |
| `learning_courses` | Administratoren legen echte Kursmetadaten mit Titel und Lektionsanzahl an. Kursinhalte und öffentliche Fragen liegen separat in `learning_material`; Antwortschlüssel liegen geschützt im privaten Schema. |
| `create_learning_assignment` | Administrator weist einen aktiven Kurs einem standortzugehörigen Mitarbeiter zu; auch über das Online-Controlling verfügbar. |
| `report_learning_reads` | Nur für ältere externe Kurse. Online-Kurse verwenden einzelne Lesebestätigungen über `acknowledge_learning_lesson`. |
| `record_learning_assessment` | Administrator erfasst das Ergebnis einer außerhalb des Systems durchgeführten Wissensprüfung mit Notiz. Kein Mitarbeiter kann sich selbst ein bestandenes Ergebnis setzen. |
| `save_learning_course` | Administrator erstellt validierte Textlektionen/Quizfragen. Nach erster Zuweisung bleibt der Inhalt unverändert. |
| `submit_learning_quiz` | Lernende reichen nach allen Lesebestätigungen Antworten ein; ausschließlich der Server bewertet. |
| `confirm_learning_practice` | Administrator bestätigt nach erfüllten Voraussetzungen eine praktische Einweisung; auch über das Online-Controlling verfügbar. |
| `admin_controlling` | Nur Administratoren erhalten die gemeinsame Aufgaben- und Lernübersicht. |

Vor dem Mitarbeiterbetrieb mit mindestens zwei echten Konten verschiedener Rollen und Standorte prüfen: Entwürfe bleiben für normale Leser verborgen; Rechteentzug wirkt bei der nächsten Abfrage; fremde Aufgaben-Zusatzfelder bleiben unsichtbar; Baukastenrechte ermöglichen kein Controlling; Lernende können Wissens- und Praxisnachweise nicht selbst erteilen. Die automatischen Datenbankprüfungen testen diese Regeln lokal, ersetzen aber keine Prüfung im eingerichteten Projekt.

## Verlinkungen und Eingabefenster

Stand 07.11.2026: Die Modulmenüs wechseln weiterhin in den jeweiligen Bereich. Anlegen, Bearbeiten und Detailaktionen verwenden Popups: Modulgestaltung, Moduleinträge, gemeinsame Aufgaben, Wissensinhalte und Datei-Uploads, Controllingdetails, Lernziele und Praxisbestätigungen. Lernaufträge im Kurs, Feedback-Zuständigkeiten und die Passwort-Link-Anforderung aus dem angemeldeten Konto öffnen ebenfalls ein Popup. Mitarbeiterverwaltung, Startseitenformulare, Termine, Wartungspläne, Onboardingvorlagen, Kurseditor und Videostudio hatten bereits Popups. Filter, Suche, Chatnachrichten und das Lesen von Kursen bleiben direkt im jeweiligen Bereich bedienbar.

Die gemeinsamen Fenster setzen den Fokus in das erste verfügbare Eingabefeld, halten Tab im Fenster und lassen sich über das Kreuz oder Escape schließen. Während einer laufenden Speicherung ist Schließen gesperrt. Fehler lassen sich im Formular korrigieren. Bei Moduleinträgen verändern Schließen und Abbrechen keine zuvor gespeicherten Werte. Auf kleinen Bildschirmen ist der Inhalt scrollbar.

Startseitenlinks zu Lernaufträgen öffnen den zugehörigen Kurs anhand der persönlichen Zuweisung. Wissenseinträge öffnen den ausgewählten Inhalt; **Wissenshub öffnen** bei einer Datei behält den Inhalt bei. **Meine Einarbeitung** führt zum Onboarding, wenn Erweiterung 012 verfügbar ist, andernfalls zur Kursübersicht. **Feedback geben** auf der Startseite öffnet direkt das Formular. Rechte und Studiofreigaben werden weiterhin vom Backend geprüft. Kein Datenbank-Update ist für diese Oberflächenänderung nötig.

Nachweis: `tests/module-links.spec.js`, `administration`, `shared-knowledge`, `pilot`, `communication` sowie die bestehenden Rechte-, Kalender- und Benachrichtigungstests. Browserprüfungen nutzen ein simuliertes Backend; externe Zielseiten und echte Mitarbeiterkonten sind damit nicht vollständig abgenommen.

Die Kartenflächen selbst sind jetzt ebenfalls bedienbar. Im Baukasten öffnen sie bei Bearbeiterrecht den Editor; im Controlling öffnen Kennzahlen die zugehörigen Datensätze. Weitere Bereiche und Bedienregeln: [Karten öffnen und bearbeiten](ANKLICKBARKEIT_UND_KARTEN.md).
