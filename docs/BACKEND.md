# Echte Mitarbeiterzugänge und gemeinsame Teamaufgaben

Die veröffentlichte Seite bleibt eigenständig. GitHub Pages liefert die Oberfläche aus. Für Anmeldung und gemeinsame Daten ist eine Supabase-Anbindung vorbereitet. Ohne Projektkonfiguration zeigt **Teamzugang** eine Einrichtungsansicht; es wird keine Anmeldung simuliert und kein Demo-Datensatz hochgeladen.

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

Mitarbeiter können ihre Rolle, Standortzuordnung, Aufgabenbeschreibung und Fälligkeit nicht selbst ändern. Zeitstempel und Kommentarautoren werden serverseitig abgesichert. SQL-Tests prüfen diese Regeln mit PostgreSQL/PGlite; ein echtes Supabase-Projekt wurde noch nicht eingerichtet oder getestet.

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

Für Studioleitungen `studio_manager` verwenden. Für weitere Standorte zusätzliche Mitgliedschaften anlegen. Die erste Version hat noch keine automatische Einladungsoberfläche; die Benutzerverwaltung erfolgt hier über das geschützte Anbieter-Dashboard.

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

Das Controlling liest echte Aufgabenabschlüsse und zugewiesene Lernziele. Kursmetadaten und Schnittstellen für Lesen, externe Wissensbeurteilung und Praxisbestätigung sind vorbereitet. Eine gemeinsame Kurs- und Testoberfläche ist noch anzubinden; der bisherige Demo-Lernhub überträgt keine Ergebnisse. Einrichtung und Bedienung stehen in [Module und Controlling](MODULE_UND_CONTROLLING.md).

## Umfang dieser Backend-Anbindung

E-Mail-Anmeldung, Rollen, Studiozuordnung, einmalige gemeinsame Aufgaben, Rückmeldungen sowie die oben beschriebenen Module und Controlling-Schnittstellen sind vorbereitet. Die übrigen Bereiche bleiben lokale Demoansichten. Insbesondere Dateispeicher, Feedback-Meldewege, gemeinsame Lerninhalte und automatische Tests, automatische Wiederholungen und Erinnerungen, 1&1-Postfachverarbeitung, Dropbox, GoHighLevel und WhatsApp sind noch nicht Teil des gemeinsamen Backends. Bestehende Demo-Daten werden nicht automatisch übertragen. Die gemeinsame Ansicht lädt auf Anforderung; Live-Synchronisierung ist noch nicht eingebaut.

Vor echten sensiblen Daten müssen organisatorische Zuständigkeiten, Datenverarbeitungsvereinbarung, Backup-/Wiederherstellung und Aufbewahrung für das gewählte Projekt geklärt und umgesetzt sein.
