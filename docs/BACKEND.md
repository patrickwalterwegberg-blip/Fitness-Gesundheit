# Echte Mitarbeiterzugänge und gemeinsame Teamaufgaben

Die veröffentlichte Seite bleibt eigenständig. GitHub Pages liefert die Oberfläche aus. Für Anmeldung und gemeinsame Daten ist eine Supabase-Anbindung vorbereitet. Ohne Projektkonfiguration zeigt **Teamzugang** eine Einrichtungsansicht; es wird keine Anmeldung simuliert und kein Demo-Datensatz hochgeladen.

Einrichtungsstand: Der Nutzer hat das Projekt, die SQL-Migrationen 001–005 und das erste aktive Adminprofil erfolgreich angelegt. Im Pages-Workflow ist die öffentliche Projektkonfiguration als Standard hinterlegt. Der eigene Admin-Login und die Mailzustellung wurden vom Nutzer bestätigt; ein zweites Mitarbeiterkonto ist noch zu testen; der direkte Verbindungstest aus der Entwicklungsumgebung ist durch deren Netzwerkpolicy gesperrt. Die folgende Anleitung bleibt für Einrichtung und spätere Änderungen gültig.

Für die vollständige Einrichtung einschließlich Einladungen über die Webseite die [Schritt-für-Schritt-Anleitung für Mitarbeiterzugänge](MITARBEITERZUGAENGE.md) verwenden. Sie umfasst die ersten drei Migrationen, den ersten Administrator und den geschützten Einladungsdienst. Danach folgen 004–005 für Dateien/Nutzerverwaltung und [006 für den Testbetrieb](PILOT_TESTBETRIEB.md).

## 1. Ein Datenbankprojekt anlegen

1. Bei [Supabase](https://supabase.com/) ein eigenes Konto und Projekt anlegen.
2. Eine EU-Region auswählen. Einen eventuell erforderlichen Tarif selbst prüfen; es wurde kein kostenpflichtiger Dienst gebucht.
3. Das Datenbankpasswort sicher beim Anbieter verwalten. Es gehört weder ins Frontend noch in GitHub-Variablen oder diesen Chat.

## 2. Das Schema einrichten

Im SQL-Editor des **neuen** Projekts [001_team.sql](../backend/supabase/001_team.sql) vollständig ausführen. Das Schema erstellt die sieben Studios, Profile, Standortmitgliedschaften, Aufgaben und Rückmeldungen. Die Row-Level-Security-Regeln sind dabei aktiviert. Nicht in eine bestehende fremde Datenbank kopieren, ohne deren Schema zu prüfen.

Die Regeln erlauben:

- Geschäftsführung (`admin`): Zugriff auf alle Studios, Verwaltung der Profile und Standortzuordnungen.
- Studioleitung (`studio_manager`): Aufgaben des eigenen Studios lesen, erstellen und bearbeiten.
- Mitarbeiter (`employee`): nur eigene Aufgaben in zugeordneten Studios lesen und deren Status ändern; Rückmeldungen dazu schreiben.
- Nicht angemeldete oder deaktivierte Profile: kein Zugriff auf Teamdaten.

Mitarbeiter können ihre Rolle, Standortzuordnung, Aufgabenbeschreibung und Fälligkeit nicht selbst ändern. Zeitstempel und Kommentarautoren werden serverseitig abgesichert. SQL-Tests prüfen diese Regeln mit PostgreSQL/PGlite. Das Projekt wurde laut Einrichtungsrückmeldung angelegt; Login und Mailzustellung für das eigene Konto wurden bestätigt; ein separates Mitarbeiterkonto ist noch zu testen.

## 3. Den ersten Administrator einrichten

1. Unter **Authentication → Users** das erste echte Mitarbeiterkonto über die Einladungsfunktion für die persönliche Firmen-E-Mail anlegen.
2. Die dort angezeigte User-ID (UUID) kopieren.
3. Im SQL-Editor die Platzhalter ersetzen und ausführen:

```sql
insert into public.profiles(id, full_name, role, active)
values ('HIER-DIE-AUTH-USER-UUID', 'Patrick Walter', 'admin', true);
```

Das ist der einmalige administrative Start. Es gibt kein voreingestelltes Passwort oder automatisches Hochstufen des ersten beliebigen Besuchers.

## 4. E-Mail-Anmeldung konfigurieren

1. E-Mail-Anmeldung aktivieren; öffentliche Selbstregistrierung deaktivieren.
2. Als **Site URL** eintragen:

   `https://patrickwalterwegberg-blip.github.io/Fitness-Gesundheit/`

3. Als erlaubte **Redirect URL** zusätzlich eintragen:

   `https://patrickwalterwegberg-blip.github.io/Fitness-Gesundheit/?team=1`

4. Für den echten Mitarbeiterbetrieb den SMTP-Versand beim Anbieter einrichten und eine Testeinladung zustellen lassen. Der Standardversand kann auf wenige Adressen und Anfragen beschränkt sein und ist nicht automatisch für alle Mitarbeiter freigegeben.
5. Bestehendes 1&1-SMTP kann gegebenenfalls dafür genutzt werden (`smtp.1und1.de`). Port, Verschlüsselung, Absender und Zugangsdaten anhand eurer tatsächlichen 1&1-Einstellungen prüfen. Passwörter ausschließlich in den geschützten SMTP-Einstellungen des Backend-Anbieters eintragen.

Die Plattform fordert Anmeldelinks nur für bereits angelegte Konten an (`shouldCreateUser: false`). Auch ein angemeldeter Benutzer ohne freigeschaltetes Profil erhält keine Teamdaten. Eine E-Mail-Adresse ist kein Berechtigungsnachweis; die Datenbank prüft die authentifizierte User-ID.

## 5. Zwei öffentliche Konfigurationswerte hinterlegen

Im Supabase-Projekt die Projekt-URL und den **Publishable Key** finden. Der ältere `anon`-Key ist ebenfalls unterstützt. Diese beiden Werte sind für den Browser bestimmt; Zugriffsschutz entsteht durch die Datenbankregeln.

Im GitHub-Repository:

1. **Settings → Secrets and variables → Actions → Variables → New repository variable** öffnen.
2. `VITE_SUPABASE_URL` mit der HTTPS-Projektadresse anlegen.
3. `VITE_SUPABASE_PUBLISHABLE_KEY` mit dem öffentlichen Publishable Key anlegen.
4. Unter **Actions → Teamhub veröffentlichen → Run workflow → main** neu veröffentlichen.

**Nie** einen Secret Key, `service_role`-Key oder ein Datenbankpasswort in `VITE_`-Variablen speichern. Der Build verweigert bekannte Secret-/Service-Key-Formate, ersetzt aber keine sorgfältige Auswahl. Keine sensiblen Schlüssel im öffentlichen Repository ablegen.

Für lokale Entwicklung `.env.example` nach `.env.local` kopieren und dieselben öffentlichen Werte hinterlegen. Diese Datei ist von Git ausgeschlossen. Mit leeren Werten bleiben Demo und Einrichtungsansicht verfügbar.

## 6. Weitere Mitarbeiter hinzufügen

Den Mitarbeiter bei **Authentication → Users** einladen. Dann dessen UUID als Profil anlegen und einem Studio zuordnen:

```sql
insert into public.profiles(id, full_name, role, active)
values ('MITARBEITER-USER-UUID', 'Name des Mitarbeiters', 'employee', true);

insert into public.studio_memberships(user_id, studio_id)
select 'MITARBEITER-USER-UUID'::uuid, id
from public.studios where name = 'Dörpen';
```

Für Studioleitungen `studio_manager` verwenden. Für weitere Standorte zusätzliche Mitgliedschaften anlegen. Mit Migration 003 und dem bereitgestellten Einladungsdienst können neue Mitarbeiter unter **Teamzugang → Mitarbeiterzugänge** eingeladen und verwaltet werden. Der manuelle SQL-Weg bleibt für den Datenbankinhaber verfügbar.

Beim Ausscheiden das Profil mit `active = false` deaktivieren und offene Aufgaben neu zuweisen. Die Datenbank verweigert anschließend neue Zugriffe auch dann, wenn eine alte Sitzung noch angemeldet ist. Bereits zuvor heruntergeladene Inhalte lassen sich nicht aus dem Browser zurückholen.

## 7. Den echten Zugriff prüfen

1. **Teamzugang** auf der veröffentlichten Seite öffnen und als Administrator anmelden.
2. Eine einmalige Aufgabe für einen zugeordneten Mitarbeiter anlegen.
3. In einem anderen Browser als dieser Mitarbeiter anmelden und die Aufgabe bearbeiten sowie eine Rückmeldung speichern.
4. Als ein Mitarbeiter eines anderen Studios prüfen, dass diese Aufgabe nicht sichtbar ist.
5. Den Status in beiden Sitzungen über **Aktualisieren** neu laden.
6. Testweise ein Profil deaktivieren und kontrollieren, dass es keine neuen Teamdaten mehr lesen oder ändern kann.

Erst diese echten Projekt-, Zustellungs- und Browserprüfungen bestätigen die Einsatzbereitschaft. Die vorhandenen automatischen Tests ersetzen weder die Projektkonfiguration noch die Prüfung der echten Einladungszustellung.

## Module und Controlling ergänzen

Nach `001_team.sql` im SQL-Editor auch `backend/supabase/002_modules_controlling.sql` ausführen. Anschließend stehen im **Teamzugang** eigene Module, der Baukasten und das Admin-Controlling zur Verfügung. Ohne diese zweite Migration meldet die Oberfläche die fehlende Erweiterung. Beide Migrationen können erneut ausgeführt werden; vorhandene Datensätze werden nicht neu angelegt oder gelöscht.

Der Baukasten trennt Erstellen, Bearbeiten und Veröffentlichen, hält Entwürfe von normalen Lesern getrennt und bewahrt alte Formularversionen. Er unterstützt im Backend zunächst eigenständige Module und Zusatzfelder für echte Teamaufgaben. Andere Kernmodule und der gemeinsame Dateispeicher sind noch nicht angeschlossen.

Das Controlling liest echte Aufgabenabschlüsse und zugewiesene Lernziele. Kursmetadaten und Schnittstellen für Lesen, externe Wissensbeurteilung und Praxisbestätigung sind vorbereitet. Migration 006 ergänzt die gemeinsame Kurs- und Testoberfläche; der bisherige Demo-Lernhub überträgt keine Ergebnisse. [Einrichtung und Testdurchlauf](PILOT_TESTBETRIEB.md). Einrichtung und Bedienung stehen in [Module und Controlling](MODULE_UND_CONTROLLING.md).

## Zugangsverwaltung ergänzen

Nach den ersten beiden Migrationen `backend/supabase/003_team_access.sql` ausführen. Die Geschäftsführung kann im Teamzugang bestehende Zugänge umbenennen, Rollen und Studios gemeinsam ändern und Zugänge sperren. Neue Einladungen und zusätzliche Loginlinks benötigen außerdem die Edge Function `team-access` sowie funktionierenden SMTP-Versand. Der manuelle Workflow **Mitarbeiter-Einladungen einrichten** veröffentlicht die Funktion nach Konfiguration des geschützten Supabase Access Tokens. Siehe [vollständige Einrichtung](MITARBEITERZUGAENGE.md).

## Umfang dieser Backend-Anbindung

E-Mail-Anmeldung, Rollen, Studiozuordnung, einmalige gemeinsame Aufgaben, Rückmeldungen sowie die oben beschriebenen Module und Controlling-Schnittstellen sind vorbereitet. Die übrigen Bereiche bleiben lokale Demoansichten. Gemeinsame Dateien und Wissen sind über Migration 004 angebunden, die Nutzerverwaltung über 005, persönliche Übersicht, Kalender und gemeinsame Textkurse/Online-Quiz über 006. Feedback-Meldewege, gemeinsame automatische Aufgabenwiederholungen und E-Mail-Erinnerungen, 1&1-Postfachverarbeitung, Dropbox, GoHighLevel und WhatsApp folgen separat. Bestehende Demo-Daten werden nicht automatisch übertragen. Die gemeinsame Ansicht lädt auf Anforderung; Live-Synchronisierung ist noch nicht eingebaut.

Vor echten sensiblen Daten müssen organisatorische Zuständigkeiten, Datenverarbeitungsvereinbarung, Backup-/Wiederherstellung und Aufbewahrung für das gewählte Projekt geklärt und umgesetzt sein.
