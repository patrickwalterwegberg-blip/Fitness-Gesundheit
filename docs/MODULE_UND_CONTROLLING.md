# Module gestalten und Mitarbeiterfortschritt begleiten

## Was jetzt ausprobiert werden kann

In der lokalen Demo über **Modulbaukasten** und **Controlling** starten. Die Demo-Profilwahl dient ausschließlich der Vorschau; sie ist keine Anmeldung. Rechte, Entwürfe und Fortschritte werden in diesem Browser gespeichert.

### Ausgewählte Mitarbeiter freischalten

1. Als Geschäftsführung **Modulbaukasten → Berechtigungen** öffnen.
2. Beim Mitarbeiter **Bearbeiten**, bei Bedarf **Neu erstellen** und **Veröffentlichen** aktivieren. Erstellen und Veröffentlichen setzen Bearbeiten voraus.
3. Zur Vorschau das betreffende Demo-Profil auswählen. Ein Bearbeiter ohne Veröffentlichungsrecht kann einen Entwurf speichern; die Geschäftsführung kann ihn anschließend prüfen und veröffentlichen.

Baukastenrechte gelten global für die Gestaltung der Module. Sie erlauben keine Einsicht ins Admin-Controlling und ersetzen nicht die Leser- und Schreiberrollen eines veröffentlichten Moduls.

### Ein eigenes Modul oder Zusatzfelder erstellen

1. **Neues Modul** wählen, Namen und Bereich festlegen. Ein eigenständiges Modul erscheint unter **Eigene Module**. Zusatzfelder werden beim zugehörigen Eintrag geöffnet, zum Beispiel über das Zusatzfelder-Symbol eines Geräts oder in den Aufgabendetails.
2. Standorte sowie Leser- und Schreiberrollen festlegen. Administratoren behalten zur Verwaltung Einsicht. Standortzugehörigkeit wird im echten Backend zusätzlich geprüft.
3. Felder hinzufügen: Text, langer Text, Zahl, Datum, Auswahl, Checkbox, Mitarbeiter oder lokale Datei. Pflichtfelder und Reihenfolge einstellen; Auswahloptionen zeilenweise eingeben.
4. Über **Vorschau** das Formular ansehen. Die Vorschau speichert keine Einträge.
5. **Entwurf speichern** oder **Veröffentlichen** wählen. Ein Entwurf verändert das bisher veröffentlichte Formular nicht.
6. Das veröffentlichte Modul öffnen und einen Eintrag anlegen.

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

Ein gehostetes Projekt wurde noch nicht eingerichtet. Zuerst die [Backend-Anleitung](BACKEND.md) durcharbeiten und beide Migrationen in Reihenfolge anwenden:

1. `backend/supabase/001_team.sql`
2. `backend/supabase/002_modules_controlling.sql`

Anschließend im echten **Teamzugang** anmelden und dort **Modulbaukasten**, **Eigene Module** oder **Controlling** öffnen. Diese Ansichten lesen ausschließlich Serverdaten und importieren keine lokalen Demo-Daten. Die zweite Migration trennt Entwürfe und veröffentlichte Versionen, schützt Rechte serverseitig und versieht Änderungen mit authentifizierter User-ID und Serverzeit. Alte Aufgabenabschlüsse erhalten keine rückwirkend erfundene ausführende Person.

Im gemeinsamen Backend sind zunächst **eigenständige Module und Aufgaben-Zusatzfelder** angeschlossen. Andere Kernmodule und gemeinsame Datei-Uploads sind noch nicht angebunden; diese Auswahl ist im Online-Baukasten deaktiviert. Lokale Dateiwerte werden nicht ins Backend übertragen.

### Lernfortschritt im Backend

Die Migration stellt Kursmetadaten, individuelle Lernziele, Lesefortschritt, getrennte Wissensbeurteilungen, Praxisbestätigungen und Ereignisprotokolle bereit. Es werden keine Beispielkurse oder Quizantworten angelegt. Die gemeinsame Lernoberfläche für echte Lektionen und automatisch bewertete Tests ist noch anzubinden. Der bestehende Lernhub mit Beispieltests bleibt lokal.

Zur Integration einer tatsächlichen Akademie stehen folgende Schnittstellen bereit:

| Schnittstelle | Berechtigung und Verhalten |
| --- | --- |
| `learning_courses` | Administratoren legen echte Kursmetadaten mit Titel und Lektionsanzahl an. Kursinhalte und Fragen sind darin noch nicht enthalten. |
| `create_learning_assignment` | Administrator weist einen aktiven Kurs einem standortzugehörigen Mitarbeiter zu; auch über das Online-Controlling verfügbar. |
| `report_learning_reads` | Mitarbeiter meldet ausschließlich seinen eigenen Lesestand, begrenzt auf die Lektionsanzahl. Dies ist eine Selbstrückmeldung. |
| `record_learning_assessment` | Administrator erfasst das Ergebnis einer außerhalb des Systems durchgeführten Wissensprüfung mit Notiz. Kein Mitarbeiter kann sich selbst ein bestandenes Ergebnis setzen. |
| `confirm_learning_practice` | Administrator bestätigt nach erfüllten Voraussetzungen eine praktische Einweisung; auch über das Online-Controlling verfügbar. |
| `admin_controlling` | Nur Administratoren erhalten die gemeinsame Aufgaben- und Lernübersicht. |

Vor dem Mitarbeiterbetrieb mit mindestens zwei echten Konten verschiedener Rollen und Standorte prüfen: Entwürfe bleiben für normale Leser verborgen; Rechteentzug wirkt bei der nächsten Abfrage; fremde Aufgaben-Zusatzfelder bleiben unsichtbar; Baukastenrechte ermöglichen kein Controlling; Lernende können Wissens- und Praxisnachweise nicht selbst erteilen. Die automatischen Datenbankprüfungen testen diese Regeln lokal, ersetzen aber keine Prüfung im eingerichteten Projekt.
