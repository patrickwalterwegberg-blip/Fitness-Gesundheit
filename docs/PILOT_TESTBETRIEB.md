# Einen vollständigen Testdurchlauf machen

Die veröffentlichte Seite nutzt die gemeinsame Datenbank. **Zur Demo** öffnet weiterhin die getrennte lokale Vorschau. Demo-Datensätze werden nicht in Mitarbeiterkonten kopiert.

## Einmalig die neue Erweiterung installieren

Die Migrationen 001–005 wurden bereits erfolgreich ausgeführt. Für persönliche Übersicht, Aufgabenkalender und die gemeinsame Akademie kommt jetzt **eine** SQL-Datei hinzu:

1. [006_pilot_learning.sql](https://github.com/patrickwalterwegberg-blip/Fitness-Gesundheit/blob/main/backend/supabase/006_pilot_learning.sql) öffnen.
2. Mit **Copy raw file** den vollständigen SQL-Inhalt kopieren.
3. [Neue SQL-Abfrage in deinem Supabase-Projekt](https://supabase.com/dashboard/project/ftcurcqduzrxsvkujfql/sql/new) öffnen. Den Inhalt in den großen Editor rechts einfügen.
4. **Run** klicken. Erwartet: **Success. No rows returned.** Bei einem Fehler zuerst die Fehlermeldung klären; die vollständige Datei kann erneut ausgeführt werden.
5. [Teamhub](https://patrickwalterwegberg-blip.github.io/Fitness-Gesundheit/?team=1) neu laden und anmelden. Unter **Meine Übersicht → Serverstatus prüfen** muss Erweiterung **6** angezeigt werden.

Vorhandene Aufgaben, Konten und Dateien bleiben erhalten. Es sind keine neuen Tokens, Passwörter oder SMTP-Einstellungen erforderlich. Der Entwickler kann die private Projektdatenbank aus dieser Entwicklungsumgebung wegen deren Netzwerkbeschränkung nicht selbst ändern. Der Veröffentlichungsworkflow veröffentlicht nur die Oberfläche und führt keine gehosteten SQL-Migrationen aus.

## Anmeldung mit persönlichem Passwort

Bestehende Konten können ein eigenes Teamhub-Passwort festlegen und sich danach mit E-Mail/Passwort anmelden. Dazu auf der [Loginseite](https://patrickwalterwegberg-blip.github.io/Fitness-Gesundheit/login.html) **Passwort festlegen / vergessen?** wählen oder im angemeldeten Konto **Passwort festlegen / ändern**. [Vollständiger Ablauf](PASSWORT_ANMELDUNG.md). Die bisherigen Anmeldelinks bleiben als Alternative verfügbar.

## 1. Aufgabe vom Anlegen bis zum Controlling

1. **Aufgaben → Teamaufgabe erstellen** öffnen. Titel `[TEST] Empfang prüfen`, einen echten Standort, dich selbst als verantwortliche Person und das heutige Datum wählen. Speichern.
2. **Meine Übersicht** öffnen: Die Aufgabe muss bei den nächsten Aufgaben und unter „Heute fällig“ erscheinen.
3. **Kalender** öffnen und heute auswählen. Die Aufgabe öffnen, auf **In Bearbeitung** setzen, eine Rückmeldung schreiben und anschließend **Erledigt** wählen.
4. **Controlling** öffnen, passenden Standort/Zeitraum wählen. Der Abschluss muss mit tatsächlich ausführender Person und Serverzeit erscheinen.
5. Seite neu laden. Die abgeschlossene Aufgabe bleibt unter **Aufgaben → Status: Erledigt** erhalten. Für den Selbsttest sind keine weiteren E-Mail-Adressen nötig.

## 2. Datei veröffentlichen und wiederfinden

1. **Dateien** öffnen und dort ein kleines PDF, Bild, Video oder einen Wissensartikel anlegen. Erst mit unkritischem Testinhalt beginnen.
2. Inhalt öffnen und **Version freigeben** klicken. Ein Entwurf erscheint noch nicht im Wissenshub.
3. **Wissenshub öffnen** wählen, nach dem Titel suchen und Vorschau/Download prüfen. Seite neu laden und erneut öffnen.
4. **Meine Übersicht → Serverstatus prüfen** hilft, wenn etwas fehlt:
   - **Entwürfe:** Im Dateibereich öffnen und freigeben.
   - **Unvollständige Uploads:** Im Dateibereich den betroffenen Upload prüfen; ein fehlgeschlagener Upload wird nicht als erfolgreich angezeigt.
   - **Dateiobjekte ohne Hubeintrag:** Ein Upload direkt in Supabase Storage erzeugt keinen Wissenseintrag. Neue Inhalte über **Dateien** im Teamhub hochladen.
   - Bereits freigegebener Inhalt fehlt weiterhin: Im Wissenshub die Filter zurücksetzen und Standort-/Rollenfreigabe prüfen. Keine Rechte pauschal öffnen und den privaten Bucket nicht öffentlich machen.

Die Statusprüfung liest echte Metadaten. Sie repariert oder löscht keine Dateien automatisch. Der bisher gemeldete Fall ist im privaten gehosteten Projekt noch nicht abschließend bestätigt.

## 3. Einen Kurs vollständig testen

1. **Lernhub → Kurs erstellen → Testvorlage einsetzen** wählen. Die Vorlage wird erst durch **Kurs auf dem Server speichern** angelegt.
2. Den Kurs dir selbst zuweisen, einen Standort wählen und zum vollständigen Test **Praxiseinweisung erforderlich** aktivieren.
3. Beide Lektionen lesen und jeweils **Lektion als gelesen bestätigen** klicken. Wiederholtes Klicken zählt dieselbe Lektion nicht mehrfach.
4. Den Wissenscheck beantworten und auswerten. Bestehensgrenze: mindestens 80 %. Falsche Antworten erzeugen keinen bestandenen Nachweis. Vor einem weiteren Versuch zehn Sekunden warten.
5. Nach Neuladen müssen Lesestand und Quiznachweis erhalten sein. Die Praxiseinweisung bleibt separat offen.
6. **Controlling** öffnen und die Praxiseinweisung nach tatsächlicher Durchführung bestätigen. In der persönlichen Übersicht und im Nutzerprofil erscheinen dieselben Nachweise.

Die Lesebestätigung ist eine Selbstauskunft. Der Server bewertet Quizantworten; die richtigen Antwortschlüssel werden nicht an Lernende ausgeliefert. Nach der ersten Zuweisung bleibt der Kursinhalt unverändert, damit frühere Nachweise ihren Bezug behalten. Eine überarbeitete Fassung wird als neuer Kurs angelegt. Kurse ohne hinterlegten Lerninhalt bleiben als externe Nachweise sichtbar, bieten hier aber noch keine Lektionen oder Online-Prüfung.

Die erste gemeinsame Lernoberfläche unterstützt Textlektionen und Multiple Choice mit genau einer richtigen Antwort je Frage. Videos und andere Unterlagen stehen im Dateibereich mit privater Vorschau bereit; direkt eingebettete Kursvideos und zusätzliche Fragetypen folgen separat.

## 4. Später mit einem Mitarbeiterkonto prüfen

Sobald eine zweite Firmenadresse verfügbar ist: **Mitarbeiterzugänge** öffnen, Rolle **Mitarbeiter** mit genau einem Studio einladen, in einem zweiten Browserprofil anmelden und eine Aufgabe/einen Kurs zuweisen. Die Person darf nur die eigenen Aufgaben, zugewiesenen Kurse und freigegebenen Studioinhalte sehen. Sie darf weder Rollen vergeben noch das Admin-Controlling öffnen. Dann sperren und prüfen, dass keine weiteren Datenabfragen/Änderungen möglich sind. Der bisherige echte Mailtest betrifft dein eigenes Konto; ein vollständiger Test mit einem separaten Mitarbeiterkonto steht noch aus.

## Was bereits gemeinsam angebunden ist

| Bereich | Stand |
| --- | --- |
| Zugänge, Studios, Rollen | Echte Anmeldung; Einladungsdienst bereits bereitgestellt |
| Nutzerverwaltung | Rollen/Standorte, Sperren, Profilstatistiken, Importvorschau |
| Aufgaben | Zuweisen, bearbeiten, Status, Rückmeldungen, Abschlussnachweis |
| Persönliche Übersicht | Eigene Aufgaben/Fristen, Kurse, zuletzt freigegebenes Wissen |
| Aufgabenkalender | Tagesdetails mit Seitenwechsel; Monatszahlen werden serverseitig über alle berechtigten Aufgaben berechnet |
| Dateien/Wissen | Private Originale, Versionen, Freigabe, Suche und Vorschau |
| Lernhub | Textkurse erstellen, zuweisen, lesen, Quiz serverseitig prüfen |
| Controlling | Aufgaben und getrennte Lern-/Quiz-/Praxisnachweise |
| Eigene Formulare | Berechtigte Bearbeiter, Entwürfe, veröffentlichte Versionen, Aufgaben-Zusatzfelder |

Gemeinsame Chats, Feedback und Bereichsfreigaben werden mit [Migration 007](CHAT_FEEDBACK_RECHTE.md) ergänzt. Wiederkehrende gemeinsame Aufgaben, automatische E-Mail-Erinnerungen, freies Hinweisboard, gemeinsame Notfallkontakte, Geräte, Inventur, Marketing/CRM-Automatisierung, Dropbox und KI-Postfachverarbeitung sind noch nicht vollständig an die zentrale Datenbank angeschlossen. Die entsprechenden vorhandenen Demoansichten bleiben als Vorschau getrennt. Die persönliche Übersicht zeigt aktuelle veröffentlichte Wissensinhalte; sie ersetzt noch kein Hinweisboard mit Lesebestätigungen. Die Ansicht aktualisiert sich beim Öffnen oder über den jeweiligen Aktualisieren-Knopf, nicht live per Push.

## Technische Prüfung

- `npm run test:db`: Alle sieben Migrationen jeweils zweimal auf PostgreSQL/PGlite anwenden; echte Rollen, RLS, Quizbewertung, Nachweise und Idempotenz prüfen.
- `npm run test:access`: Geschützten Einladungsdienst ohne echten Mailversand prüfen.
- `npm test`: Browserabläufe mit simuliertem Supabase-HTTP einschließlich fehlender Migration, fehlgeschlagener Speicherung und mobiler Ansicht prüfen.
- `npm run build`: Statische Veröffentlichung und eigenständige Vorschau erstellen.
- `npm run test:production`: Nach einem Build mit öffentlicher Produktionskonfiguration den kompilierten Start in der persönlichen Übersicht prüfen; sämtliche Netzwerkanfragen werden simuliert.

Diese Prüfungen ersetzen nicht den oben beschriebenen Test im gehosteten Projekt. Sie versenden keine echten Mitarbeiter-E-Mails und legen dort keine Datensätze an.
