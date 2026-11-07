# Karten öffnen und bearbeiten

Stand: 07.11.2026. Inhaltliche Karten öffnen per Klick auf ihre Fläche die passende Ansicht. Eingabefelder, Anrufen, Statuswechsel, Zuweisung, Veröffentlichungs- und Löschaktionen behalten ihre eigene Funktion. Tastaturnutzer erreichen die Hauptaktion als benannten Button oder Link; der Fokusrahmen zeigt die Karte an.

| Bereich | Aktion der Kartenfläche |
|---|---|
| Startseite | Links öffnen ihr freigegebenes Ziel. Neuigkeiten ohne Link zeigen ihren vollständigen Text im Popup. Im Bearbeitungsmodus öffnet eine bearbeitbare Karte das vorausgefüllte Formular. |
| Aufgaben und Kalender | Aufgaben öffnen ihre Details. Erledigen bleibt eine separate Aktion. Termine und Wartungspläne öffnen ihre vorhandenen Dialoge. |
| Lernhub | Kurse öffnen den Leser. Eine Onboardingvorlage öffnet bei entsprechendem Recht und unverwendeter Vorlage den Editor, andernfalls ihre Details. Onboardingschritte öffnen Kurs, Aufgabe oder Checkliste. |
| Eigene Module und Baukasten | Freigegebene Module öffnen die Einträge; Baukastenkarten öffnen bei Bearbeiterrecht den Editor. Versionsverlauf, Veröffentlichung und Wiederherstellung behalten ihre eigenen Aktionen. |
| Mitarbeiter | Rollenkarten öffnen die gefilterten Nutzer. Berufliche Informationen lassen sich bei Profilrecht direkt zur Bearbeitung öffnen. Aufgabenkennzahlen und Lernziele öffnen lesbare Details; Einzelaufgaben werden nicht aus Aggregatzahlen erfunden. |
| Controlling | Kennzahlen öffnen die passenden Mitarbeiter oder Aufgaben; von dort sind die vorhandenen Detailaktionen erreichbar. |
| Videostudio | Bereite Videos öffnen die Vorschau; der Originalzugriff wird weiterhin erst mit „Video laden“ angefordert. Unvollständige Uploads öffnen die Fortsetzung. Ist bereits ein anderer lokaler Entwurf geöffnet, öffnet sich eine Statusansicht und der Entwurf bleibt erhalten. |
| Betriebsprüfung | Jeder Prüfkasten öffnet seine Erklärung. Dies führt keine Reparatur, Bereinigung oder Datenänderung aus. Escape schließt zuerst das oberste Fenster. |
| Lokale Demo | Geräte, CRM-Kontakte, Mitarbeiter, Lagerartikel und Notfallkontakte können mit ihren bisherigen Werten bearbeitet werden. Kampagnen öffnen ihre Planung und deren Editor. Hinweise, Bestellvorgänge und Auswertungen öffnen Details. Die Integrationskarten zeigen den Einrichtungsstand. |

Das Öffnen einer Karte speichert oder bestätigt nichts. Formularänderungen werden über den zugehörigen Speichern-Button übernommen. Bereits separat beschriftete Aktionen wie Erledigen und Statuswechsel funktionieren wie bisher. Rechte, Studios und Serverprüfungen gelten weiterhin; die lokalen Demobereiche werden nicht mit den gemeinsamen Daten vermischt. Es wird keine zusätzliche Datenbankmigration benötigt.

## Prüfung

`clickable-cards`, `home-roles`, `onboarding`, `operations` und `course-videos` prüfen Kartenflächen, vorausgefüllte Werte, unveränderte Datensatz-IDs, Abbrechen, getrennte Bedienelemente, Tastaturbedienung, Drag-and-drop zwischen sichtbaren CRM-Spalten und mobile Darstellung. Die vollständige Browserreihe prüft die bestehenden Abläufe weiter. Browser- und Produktionstests arbeiten mit Testdaten und simulierten Serverantworten.
