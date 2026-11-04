# Echte Mitarbeiterzugänge aktivieren

Die aktuelle Loginseite bietet E-Mail und persönliches Passwort. [Passwort erstmals festlegen und anmelden](PASSWORT_ANMELDUNG.md). Bestehende Anmeldelinks bleiben als Alternative erhalten. Dafür sind keine neuen Migrationen erforderlich.

Für den neu ergänzten gemeinsamen Datei-/Wissenshub und das erweiterte Nutzermanagement anschließend die [Migrationen 004 und 005](DATEIEN_WISSEN_NUTZER.md) installieren. Dafür ist keine erneute Token-Erstellung oder Veröffentlichung des Einladungsdienstes nötig.

E-Mail-Anmeldung, Rollen, Studiozuordnung und Einladungsverwaltung sind im Code vorbereitet. Für diesen Teamhub wurde inzwischen ein Supabase-Projekt angelegt; die drei SQL-Migrationen und das erste aktive Adminprofil wurden laut Einrichtungsrückmeldungen erfolgreich installiert. Der Pages-Workflow enthält dessen öffentliche Projektkonfiguration. Rücksprungadressen, Mailzustellung und der eigene Admin-Login wurden inzwischen bestätigt, der Einladungsdienst wurde erfolgreich bereitgestellt. Ein separates Mitarbeiterkonto ist noch zu testen. Für die aktuelle gemeinsame Oberfläche sind zusätzlich die Erweiterungen 004–006 nötig; [Einrichtung und Testbetrieb](PILOT_TESTBETRIEB.md). Die lokale Demo erzeugt keine Konten und versendet keine Einladungen.

## 1. Projekt anlegen

1. Das [Supabase Dashboard](https://supabase.com/dashboard) öffnen und mit deinem eigenen Konto anmelden.
2. Ein Projekt für Fitness & Gesundheit in einer EU-Region erstellen. Tarif und Kosten beim Anbieter prüfen.
3. Das Datenbankpasswort sicher aufbewahren; es gehört nicht in die Webseite oder in den Chat.
4. Aus den Projekteinstellungen die **Projekt-URL**, den öffentlichen **Publishable Key** und die **Project Reference** notieren. Letztere ist die Projektkennung, kein Schlüssel.

Nur Projekt-URL und öffentlicher Publishable Key dürfen in die Browserkonfiguration. Secret Keys, `service_role`, Access Tokens und Passwörter bleiben in den geschützten Einstellungen.

## 2. Datenbank vorbereiten

Unter **SQL Editor → New query** diese Repository-Dateien vollständig kopieren und nacheinander ausführen:

1. [001_team.sql](../backend/supabase/001_team.sql)
2. [002_modules_controlling.sql](../backend/supabase/002_modules_controlling.sql)
3. [003_team_access.sql](../backend/supabase/003_team_access.sql)

Nach jedem Schritt die erfolgreiche Ausführung prüfen. Nicht nur einzelne Abschnitte ausführen: Rechte und Hilfsfunktionen gehören zusammen. Die Migrationen können erneut ausgeführt werden.

Migration 003 hält Rollen- und Studioänderungen zusammen und sperrt direkte Profiländerungen aus Browserkonten. Der Datenbankinhaber kann im SQL-Editor weiterhin den ersten Administrator oder fehlende Profile einrichten. Auth-Konten ohne aktives Mitarbeiterprofil erhalten keine Teamdaten. Frei gewählte Auth-Metadaten verleihen keine Rolle.

## 3. Anmeldung und Mailversand konfigurieren

Unter **Authentication** E-Mail-Anmeldung aktivieren und öffentliche Selbstregistrierung deaktivieren. In der URL-Konfiguration diese Werte verwenden:

| Einstellung | Wert |
| --- | --- |
| Site URL | `https://patrickwalterwegberg-blip.github.io/Fitness-Gesundheit/` |
| Erlaubte Redirect URL | `https://patrickwalterwegberg-blip.github.io/Fitness-Gesundheit/?team=1` |

Die Mailvorlagen für **Invite user**, **Magic Link** und **Reset Password** müssen den von Supabase vorgesehenen Bestätigungslink verwenden. Keine feste Anmelde-URL ohne Bestätigungstoken einsetzen.

Für echte Mitarbeiter SMTP einrichten. Der eingeschränkte Standardversand des Anbieters ist nicht automatisch für alle Firmenadressen freigegeben. Für ein geeignetes 1&1-Postfach kann `smtp.1und1.de` verwendet werden. Port, Verschlüsselung und Absender anhand eurer tatsächlichen Einstellungen prüfen. Postfachpasswörter ausschließlich in den geschützten SMTP-Einstellungen von Supabase speichern. Der Versandabsender ist unabhängig von den persönlichen Empfängeradressen der Mitarbeiter.

## 4. Deinen ersten Adminzugang anlegen

Unter **Authentication → Users** deine Firmen-E-Mail einladen oder dort ein Konto anlegen. Dessen **User ID / UUID** kopieren. Im SQL-Editor die UUID im Beispiel ersetzen und ausführen:

```sql
insert into public.profiles(id,full_name,role,active)
values ('DEINE-USER-UUID'::uuid,'Patrick Walter','admin',true)
on conflict(id) do update set full_name=excluded.full_name,role='admin',active=true;
```

Administratoren haben Zugriff auf alle Studios; eine zusätzliche Studio-Mitgliedschaft ist dafür nicht erforderlich. Danach kann auf der Anmeldeseite ein neuer Link angefordert werden.

## 5. Webseite verbinden

Für diesen Teamhub sind die öffentliche Projektadresse und der Publishable Key bereits als Standardwerte im Pages-Workflow eingetragen. Die Projektadresse lautet `https://ftcurcqduzrxsvkujfql.supabase.co`, ohne `/rest/v1/`. Der Schlüssel ist zur Verwendung im Browser bestimmt; private Service-Schlüssel werden nicht mit ausgeliefert. Die folgenden Repository-Variablen sind nur nötig, um die Standardwerte zu überschreiben. Bei einem Projektwechsel beide Werte zusammen ersetzen.

Im GitHub-Repository **Settings → Secrets and variables → Actions → Variables** öffnen und diese Repository-Variablen anlegen:

| Variable | Inhalt |
| --- | --- |
| `VITE_SUPABASE_URL` | Deine HTTPS-Projekt-URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Dein öffentlicher Publishable Key |

Dann **Actions → Teamhub veröffentlichen → Run workflow → main** starten. Nach erfolgreicher Bereitstellung den **Teamzugang** öffnen und den neuesten Link aus deinem Firmenpostfach verwenden. Das 1&1-Postfachpasswort wird bei der Anmeldung nicht benötigt.

## 6. Einladungsdienst bereitstellen

Anmeldung und Bearbeitung bestehender Zugänge funktionieren mit den Migrationen. Für neue Einladungen direkt aus der Webseite zusätzlich die Supabase Edge Function bereitstellen:

1. Im Supabase-Konto unter **Account → Access Tokens** einen Access Token für die Bereitstellung erzeugen. Er kann auf berechtigte Projekte zugreifen: sicher aufbewahren und bei Nichtgebrauch widerrufen.
2. Im GitHub-Repository **Settings → Secrets and variables → Actions → Secrets → New repository secret** öffnen.
3. Den Token dort unter `SUPABASE_ACCESS_TOKEN` speichern. Bei projektbezogenen Scoped Tokens werden für diesen Workflow `edge_functions_write` und `edge_functions_secrets_write` benötigt. **Nicht** als `VITE_`-Variable speichern oder im Chat senden.
4. **Actions → Mitarbeiter-Einladungen einrichten → Run workflow** öffnen und die **Project Reference** des Supabase-Projekts eintragen.
5. Den erfolgreichen Abschluss prüfen. Der Workflow setzt die feste Rücksprungadresse und veröffentlicht `team-access`. SQL-Migrationen und den ersten Administrator legt er nicht an.

Die Funktion prüft den Benutzer-Token bei Auth und anschließend das aktive Administratorprofil. Der private Service-Schlüssel bleibt ausschließlich im Backend. Der Gateway-JWT-Check ist in der Konfiguration ausgeschaltet; die verpflichtende Tokenprüfung erfolgt im Funktionscode, damit auch die aktuelle Publishable-Key-Konfiguration unterstützt wird. CORS erlaubt nur die konfigurierte Webseiten-Origin; Datenbankregeln prüfen die eigentlichen Rechte.

Die Supabase-Standardvariablen `SUPABASE_URL`, `SUPABASE_ANON_KEY` und `SUPABASE_SERVICE_ROLE_KEY` müssen in der Edge-Umgebung bereitstehen. `TEAMHUB_SITE_URL` setzt der Workflow. Keine privaten Schlüssel in die Webseite kopieren.

Alternativ mit lokal eingerichteter Supabase CLI aus dem Repository-Verzeichnis:

```sh
npx supabase@2.122.1 login
npx supabase@2.122.1 --workdir backend secrets set TEAMHUB_SITE_URL=https://patrickwalterwegberg-blip.github.io/Fitness-Gesundheit/ --project-ref DEINE_PROJECT_REFERENCE
npx supabase@2.122.1 --workdir backend functions deploy team-access --no-verify-jwt --use-api --project-ref DEINE_PROJECT_REFERENCE
```

Die CLI-Anmeldung erfolgt auf deinem Gerät; im Chat werden keine Access Tokens benötigt.

## 7. Mitarbeiter einladen und verwalten

1. Im echten **Teamzugang** als Geschäftsführung anmelden.
2. **Mitarbeiterzugänge → Mitarbeiter einladen** öffnen.
3. Namen, persönliche Firmen-E-Mail, Rolle und passende Studios wählen.
4. **Einladung anfordern** wählen. Damit wird eine echte E-Mail angefordert.
5. Zusammen mit dem Mitarbeiter Posteingang und Spamordner prüfen. Eine erfolgreiche Anfrage beim Maildienst ist noch kein Zustellnachweis.

Profil und Studiozuordnung entstehen innerhalb der Erstellung des Auth-Kontos, bevor der Einladungsprozess die Mail versendet. Die Freigabe stammt aus der durch den Administrator vorbereiteten Einladung und wird nicht aus frei wählbaren Rollen-Metadaten übernommen.

Bestehende Zugänge lassen sich über **Bearbeiten** umbenennen, anderen Studios zuordnen und sperren. Änderungen werden gemeinsam gespeichert. Die E-Mail-Adresse bleibt dabei unverändert. **Anmeldelink anfordern** verwendet die hinterlegte Adresse eines aktiven Zugangs; erneute Anfragen sind serverseitig für 60 Sekunden begrenzt. Bestehende Konten nicht doppelt einladen. Fehlt bei einem bestehenden Auth-Konto das Profil, dieses im Anbieter-Dashboard wie unter [Backend-Einrichtung](BACKEND.md) zuordnen.

Der eigene Adminzugang kann nicht deaktiviert oder herabgestuft werden. Veraltete Änderungen werden abgelehnt und müssen nach Aktualisierung erneut geprüft werden. Geschützte Ereignisse dokumentieren Änderungen und angeforderte Links; Mitarbeiter können die Protokolle nicht verändern.

Beim Sperren verweigert die Datenbank weitere Teamzugriffe auch bei einer bestehenden Auth-Sitzung. Bereits geladene oder heruntergeladene Inhalte lassen sich nicht zurückholen. Offene Aufgaben ausgeschiedener Mitarbeiter anschließend neu zuweisen.

## 8. Vor dem Betrieb prüfen

Mit einem echten Administrator und mindestens zwei Mitarbeiterkonten verschiedener Studios testen:

- Einladung trifft am richtigen Postfach ein; der Link öffnet die eigenständige Seite.
- Mitarbeiter sehen ausschließlich erlaubte Teamdaten und keine Zugangsverwaltung.
- Studioleitung und Geschäftsführung erhalten die vorgesehenen Rechte.
- Abmelden entfernt die Teamansicht auf dem Gerät.
- Gesperrte Konten können keine neuen Teamdaten abrufen oder ändern.
- Abgelaufene oder bereits verwendete Links lassen sich durch einen neuen Link ersetzen.
- Versandfehler zeigen keine Erfolgsmeldung und lassen Eingaben zur Prüfung stehen.

Die lokalen Tests prüfen Oberfläche, Funktionslogik und SQL-Regeln. Sie versenden keine E-Mails und ersetzen weder Projektbereitstellung noch Zustellungstest.
