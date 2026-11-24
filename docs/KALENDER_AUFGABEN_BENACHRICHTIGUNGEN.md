# Kalender, Aufgaben, Gerätewartung und Benachrichtigungen

Die Funktionen verwenden die gemeinsame Supabase-Datenbank. Das bestehende Schwarz-Gold-Design bleibt erhalten. Lokale Geräte aus der Demo werden nicht automatisch in den Teamzugang übertragen.

## Einmalige Einrichtung

Voraussetzung: Erweiterungen 001 bis 009 sind installiert.

Die folgenden Schritte gelten für die erstmalige Kalender-Einrichtung. In einem bereits eingerichteten Projekt mit späteren Korrekturen keine alte Komplettmigration 010 erneut darüber einspielen; sie kann neuere Funktionsstände ersetzen. Für die neue Benachrichtigungsgrenze ausschließlich die unten beschriebene Ergänzung 018 anwenden.

1. [010_calendar_tasks_notifications.sql](https://github.com/patrickwalterwegberg-blip/Fitness-Gesundheit/blob/main/backend/supabase/010_calendar_tasks_notifications.sql) öffnen. Den **vollständigen Dateiinhalt** kopieren (über „Raw“ lässt er sich leichter markieren).
2. [Neue SQL-Abfrage in deinem Supabase-Projekt](https://supabase.com/dashboard/project/ftcurcqduzrxsvkujfql/sql/new) öffnen, Inhalt in das große Codefeld einfügen und **Run** anklicken.
3. Bei „Success. No rows returned“ den Teamhub neu laden. Der Kalender zeigt dann „Kalender & Aufgaben“ und die neuen Schaltflächen.

Die Migration ist wiederholt ausführbar. Sie erhält bestehende Teamaufgaben, Zugänge und Bereichsrechte. Sie ändert keine Mitarbeiterrolle und versendet keine E-Mails.

## Was du testen kannst

- **Termin:** Kalender → Termin anlegen. Beginn und Ende gelten in der Zeitzone Europe/Berlin, auch wenn das Gerät eine andere Zeitzone nutzt. Termine über mehrere Tage erscheinen an jedem betroffenen Tag. Private Termine sieht nur der Ersteller. Studioleitung und Geschäftsleitung können zusätzlich Studiotermine erstellen und bearbeiten. Termine lassen sich absagen; die Historie bleibt erhalten.
- **Private Aufgabe:** Aufgaben → Private Aufgabe erstellen oder im Kalender → Private Aufgabe. Der Ersteller ist die einzige verantwortliche Person. Andere Mitarbeiter, Studioleitung und Geschäftsleitung sehen diese Aufgabe auch in Profilstatistiken und Auswertungen nicht. Die Studiozuordnung muss zu einem freigegebenen Standort gehören.
- **Zuweisung:** Leitung → Aufgaben → Teamaufgabe erstellen → Studio und verantwortliche Person auswählen. Die Aufgabe erscheint bei dieser Person und bei berechtigten Leitungen des Studios.
- **Wiederholung:** z. B. „Monatlich“ und Abstand „6“. Beim Abschluss entsteht genau eine Folgeaufgabe sechs Monate nach der bisherigen Fälligkeit. Der Rhythmus richtet sich nach der Fälligkeit, nicht nach dem tatsächlichen Abschlussdatum. Eine verspätet erledigte Aufgabe kann deshalb einen bereits fälligen Folgetermin haben. Monatsenden bleiben korrekt verankert, etwa 31. August → 28. Februar → 31. August. Erledigte Serienaufgaben mit Folgetermin können nicht erneut geöffnet werden. Zum Beenden einer normalen Aufgabenserie die noch offene Folgeaufgabe auf „Einmalig“ ändern.
- **Gerätewartung:** Kalender → Gerätewartung → Wartungsplan anlegen. Gerät, Gerätenummer, Hinweise, Studio, verantwortliche Person, erste Fälligkeit und Abstand in Monaten festlegen. Der Standard ist sechs Monate. Der Plan erstellt automatisch eine verknüpfte Teamaufgabe. Änderungen erfolgen am Wartungsplan, der Abschluss über die Aufgabe. Nach dem Abschluss werden Folgeaufgabe und nächstes Wartungsdatum zusammen gespeichert.
- **Glocke:** Öffnet das Benachrichtigungsfeld. Neueste Meldungen stehen oben, ältere Seiten bleiben erreichbar. „Als gelesen“ entfernt nichts aus dem Verlauf. „Angezeigte als gelesen“ betrifft nur die aktuell sichtbare Seite.

Lernbenachrichtigungen öffnen den konkret zugewiesenen eigenen Kurs und laden neue Zuweisungen auch aus einer bereits geöffneten Onboarding-Ansicht nach. Ein nicht mehr verfügbarer Lernauftrag bleibt beim fehlgeschlagenen Öffnen ungelesen. Bei einer fehlgeschlagenen Lesebestätigung bleibt der aktuelle Bereich bestehen.

Die Benachrichtigungen umfassen neue Aufgabenzuweisungen, fällige Aufgaben und Wartungen, neue Chatnachrichten, neue/geänderte/abgesagte Studiotermine, Terminbeginn, neue Lernaufträge und Feedback-Zuweisungen bzw. Statusantworten. Der Verlauf beginnt mit der Einrichtung dieser Erweiterung; vorhandene fällige Aufgaben und noch ungelesene Chatnachrichten werden übernommen. Die aktuelle Sichtbarkeit wird bei jeder Abfrage erneut geprüft. Für Feedback und Lernaufträge benötigt die Korrektur nach Studioentzug zusätzlich **018**, wie unten beschrieben.

### Korrektur für Feedback- und Lernbenachrichtigungen

Nach den bestehenden Erweiterungen die vollständige [018_notification_source_access.sql](../backend/supabase/018_notification_source_access.sql) im SQL Editor des richtigen Teamhub-Projekts ausführen und den Hub aktualisieren. Keine ältere Komplettmigration erneut darüber einspielen. Der Frontend-Deploy installiert diese Serverkorrektur nicht.

Neue Tabellen-/Inbox-Abfragen und Lesemarkierungen berücksichtigen danach auch bei diesen beiden Kategorien den aktuellen Quellzugriff. Fremdes Feedback und Lernaufträge aus einem entzogenen Studio werden nicht weiter über deren Titel in Meldungen lesbar. Vorhandene Meldungen werden nicht gelöscht; mit erneutem Zugriff werden dieselben Einträge wieder sichtbar. Eigene Autor-Meldungen und die bestehenden Admin-Ausnahmen folgen weiterhin ihren bisherigen Quellrechten. Bereits empfangene Inhalte können dadurch nicht zurückgeholt werden.

Die sieben Studios und beide delegierten Grundrollen wurden lokal mit tatsächlichen SQL-/RLS-Abfragen geprüft. Die gehostete Installation und echte Rollenabnahme bleiben separat zu bestätigen; [Paketnachweis und Rückweg](phase2/PAKET_1S_BENACHRICHTIGUNGEN_QUELLZUGRIFF.md).

## Erinnerungen und Hintergrundbetrieb

Fälligkeit von Aufgaben ist der Beginn des Fälligkeitstages in Europe/Berlin. Bei geöffnetem Teamhub wird die Glocke spätestens alle 30 Sekunden und beim Zurückkehren zum Fenster aktualisiert. Fällige Aufgaben werden bei jeder Abfrage nachgetragen. Der Lesestand ist auf dem Server gespeichert und gilt auch auf einem zweiten Gerät.

Für die regelmäßige Erzeugung auch bei geschlossenem Teamhub in Supabase unter **Database → Extensions** die Erweiterung **pg_cron** aktivieren. Bei einer bereits eingerichteten Kalenderverwaltung anschließend im SQL Editor mit der Standardrolle `postgres` ausschließlich diese Abfrage ausführen:

```sql
select cron.schedule(
 'teamhub-due-notifications',
 '* * * * *',
 'select app_private.sync_due_notifications()'
);
```

Die Kalenderfunktion muss bereits aus Erweiterung 010 vorhanden sein. Die Abfrage registriert beziehungsweise aktualisiert den benannten Job für diese Datenbankrolle, ohne die übrigen Funktionen neu anzulegen. Erwartet wird eine Job-ID. Danach die Betriebsprüfung aktualisieren: genau ein aktiver Job ist der technische Sollzustand. Nach mindestens einem tatsächlichen Lauf auch die Job-Ausführung und das Erscheinen einer fälligen Meldung prüfen. Ohne pg_cron werden Fälligkeiten beim nächsten Öffnen nachgetragen. E-Mail- oder Betriebssystem-Push-Nachrichten sind damit nicht verbunden.

Bereits installierte neuere Erweiterungen bleiben erhalten. Für die alleinige Cron-Einrichtung nicht die vollständige ältere Migration 010 erneut ausführen: Sie würde unter anderem die Berechtigungsversion und den Funktionskatalog auf ihren älteren Stand zurücksetzen.

## Einzelne Freischaltungen

Unter Mitarbeiterzugänge → Profil → Rechte → Einzelne Funktionen stehen zusätzlich zur Grundrolle zur Verfügung:

- Private Aufgaben für mich erstellen und bearbeiten
- Wiederkehrende Aufgaben anlegen
- Eigene Termine anlegen und bearbeiten
- Termine für das Studio anlegen und bearbeiten
- Gerätewartungen planen und bearbeiten

Normale Mitarbeiter haben private Aufgaben, Wiederholungen und eigene Termine als Grundfunktionen. Studioleitung erhält Studiotermine und Wartungsplanung für ihre Standorte. Geschäftsleitung hat die Verwaltungsrechte für alle Studios; persönliche private Inhalte anderer bleiben verborgen. Zusatzfreigaben ändern die Rolle nicht. Für Wartungsplanung werden die erforderlichen Aufgabenfunktionen und Seiten mit freigegeben.

## Technische Prüfung

`npm run test:db` prüft Rechte, private Inhalte, Wiederholungen, Monatsenden, Wartungssynchronisation, Benachrichtigungen und Berliner Zeitumstellung. `npx playwright test tests/schedule.spec.js tests/communication.spec.js` prüft die Bedienabläufe inklusive mobiler Ansicht und fehlgeschlagener Speicher-/Lesebestätigungen. Die Browserprüfungen simulieren Serverantworten; eine erfolgreiche lokale Prüfung bestätigt noch keine Installation im produktiven Supabase-Projekt.
