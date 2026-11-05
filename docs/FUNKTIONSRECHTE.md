# Einzelne Funktionen pro Mitarbeiter freischalten

Grundrollen bleiben bestehen. Admin und Geschäftsleitung können ergänzende Funktionen einzeln vergeben, ohne die Person zur Studioleitung oder zum Admin zu machen.

## Einmalig aktivieren

Voraussetzung sind die Migrationen 001–007. Öffne [009_function_permissions.sql](../backend/supabase/009_function_permissions.sql), kopiere den vollständigen Inhalt in [Supabase → SQL Editor → New query](https://supabase.com/dashboard/project/ftcurcqduzrxsvkujfql/sql/new) und klicke **Run**. Die benötigte Erweiterung 008 ist enthalten; sie muss nicht gesondert ausgeführt werden. Danach die Teamseite neu laden.

Das Skript kann erneut ausgeführt werden. Bestehende Grundrollen, Zuweisungen, Lernnachweise, Dateien und individuell vorhandene Modul-/Startseitenrechte bleiben erhalten. Die Aktualisierung des Einladungsdienstes läuft bei Änderungen an seiner Implementierung über den Workflow **Mitarbeiter-Einladungen einrichten**. Diese Bereitstellung ändert keine Mitarbeiterrollen und versendet keine Einladungen.

## Bedienung

1. **Mitarbeiterzugänge** öffnen und den Namen einer Person anklicken.
2. **Berechtigungen → Einzelne Funktionen freischalten** öffnen.
3. Eine Funktion suchen und auswählen, beispielsweise **Kurse erstellen**.
4. **Funktionsrechte speichern** klicken.

**Rollenstandard** bleibt aktiv und wird nicht durch Zusatzrechte ausgeschaltet. **Zusatzrecht** kennzeichnet eine individuell freigegebene Funktion. **Alle Zusatzrechte entfernen** setzt ausschließlich die individuell ergänzten Funktionen zurück. Bestehende Bereichsfreigaben bleiben dabei erhalten; Funktionen werden weiterhin separat serverseitig geprüft.

Bei Abhängigkeiten wird die notwendige zusätzliche Funktion sichtbar genannt und mit ausgewählt. Beispiel: Import benötigt Einladungen; Einladungen benötigen die Nutzerübersicht. Benötigte Bereiche werden beim Speichern automatisch geöffnet. Für einen genauen Zugriff die Funktionsmatrix verwenden; bisherige Bereichsfreigaben und Rollenstandards wirken zusätzlich.

## Beispiele

- **Kurse erstellen** erlaubt das Anlegen eigener Kursvorlagen, erteilt aber keine Kurszuweisung, Praxisbestätigung, Nutzerverwaltung oder Controllingeinsicht.
- **Kurse zuweisen** erlaubt Zuweisungen nur in den zugeordneten Studios. Das Erstellen neuer Kurse ist eine andere Freigabe.
- **Mitarbeiterprofile ansehen** öffnet die Nutzerübersicht für Kollegen der eigenen Studios. Bearbeiten, Einladen und Anmeldelinks sind eigene Zusatzrechte.
- **Einzelne Mitarbeiter einladen** erlaubt delegierten Verwaltern ausschließlich Mitarbeiterkonten innerhalb ihrer Studios. Admin-/Studioleitungsrollen können sie nicht vergeben.
- **Inhalte veröffentlichen** gibt einem frisch berechtigten Mitarbeiter nicht automatisch das Bearbeiten fremder Inhalte, deren Archivierung oder die Änderung von Leserrollen.
- **Startseiteneinträge veröffentlichen** kann unabhängig vom Bearbeiten des Textes vergeben werden. Veröffentlichen und Zurücknehmen sind eigene, versionsgeprüfte Aktionen.
- **Teamaufgaben ansehen**, **Aufgaben erstellen**, **Text/Frist bearbeiten**, **anderen zuweisen** und **Teamstatus ändern** sind getrennte Funktionen.
- **Controlling ansehen** bleibt getrennt von CSV-Export, Lernaufträgen und Praxisbestätigungen. Lesbare Daten können grundsätzlich kopiert werden; die CSV-Freigabe steuert die angebotene Exportfunktion.

## Umfang und Grenzen

Die Matrix umfasst nach Erweiterung 011 insgesamt 51 Aktionen in Aufgaben, Lernhub, Dateien/Wissen, Modulbaukasten, Startseite, Chat, Feedback, Nutzerverwaltung und Controlling. Termine und Gerätewartung besitzen mit Erweiterung 010 ebenfalls einzelne Funktionsrechte. Seiten wie Kalender, Wissenshub oder Chat bleiben zusätzlich über die bestehende Bereichsfreigabe steuerbar. Kursvideos können mit Erweiterung 011 gezielt über „Kursvideos aufnehmen, hochladen und zuordnen“ freigeschaltet werden. Passwort, eigenes Profil und Abmelden bleiben persönliche Kontofunktionen.

Grundrollen ändern, Adminzugänge verwalten, Rechte vergeben und technische Serverdiagnosen bleiben bei Admin und Geschäftsleitung. Ein delegierter Nutzerverwalter kann weder sich selbst noch andere durch Rollen- oder Funktionsänderungen zum Admin machen. Die Einladungsfunktion prüft die konkrete Berechtigung erneut vor dem privilegierten Aufruf; bei der späteren Profilanlage werden Rechte und Studios des Einladenden erneut geprüft.

Studiozuordnungen gelten weiterhin. Funktionen für Aufgaben, Zuweisungen, Profile, Controlling, Feedback und Chat eröffnen keine fremden Studios. Globale Startseiten-/Dateifreigaben bleiben administrativ. Kursvorlagen und Moduldesign sind gemeinsame Unternehmensinhalte; die dazugehörigen Lernnachweise und Moduleinträge behalten ihre jeweiligen Studio-/Leserfreigaben.

Bereits vorhandene individuelle Datei-, Modul- und Startseitenfreigaben werden übernommen. Eine Person kann deshalb zusätzliche Rechte bereits mitbringen; diese sind in der Matrix sichtbar. Öffentliche Demoansichten bleiben lokale Vorschauen und verwenden keine echten Mitarbeiterrechte.

## Technik und Prüfung

`src/function-catalog.json` enthält die verwendeten Funktionsschlüssel, Rollenstandards, Bereiche und Abhängigkeiten. `python scripts/permissions/build.py` erzeugt die konkret prüfbare SQL-Migration aus dem Katalog, den vorhandenen Funktionskörpern und `scripts/permissions/base.sql`. Die Migration ersetzt nicht global `is_admin`, sondern erweitert jede delegierbare Aktion gezielt. Versionsprüfung und Sperren verhindern das unbemerkte Überschreiben parallel geänderter Freigaben.

Die Oberfläche fragt die Rechte beim Öffnen, beim Zurückkehren ins Fenster und regelmäßig neu ab. Entzogene Rechte entfernen offene Bereiche beziehungsweise setzen deren private Ansichten zurück. Datenbank und Serverfunktion prüfen jede Aktion unabhängig von der Anzeige. Bereits zuvor gelesene oder heruntergeladene Inhalte lassen sich dadurch nicht zurückholen.

Browserprüfungen verwenden simulierte Antworten. PostgreSQL/PGlite-Prüfungen wenden die Migrationen wiederholt an und prüfen tatsächliche SQL-Rechte, Delegation, Entzug und Studioabgrenzung. Sie ersetzen keinen Test nach Installation im gehosteten Supabase-Projekt.
