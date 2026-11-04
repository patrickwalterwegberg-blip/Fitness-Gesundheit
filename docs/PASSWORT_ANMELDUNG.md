# Mit E-Mail und persönlichem Passwort anmelden

Die eigene [Loginseite](https://patrickwalterwegberg-blip.github.io/Fitness-Gesundheit/login.html) verwendet Supabase Auth. Bestehende Konten, Rollen, Studiozuordnungen und Lern-/Aufgabendaten bleiben erhalten. Eine neue SQL-Migration, ein weiterer Server oder neue Zugriffstokens sind dafür nicht erforderlich.

## Dein erstes Teamhub-Passwort festlegen

1. [Loginseite öffnen](https://patrickwalterwegberg-blip.github.io/Fitness-Gesundheit/login.html).
2. Falls du schon angemeldet bist: oben **Passwort festlegen / ändern** wählen. Sonst **Passwort festlegen / vergessen?** anklicken und deine freigeschaltete Firmen-E-Mail-Adresse eingeben.
3. **Link zum Passwort festlegen senden** klicken und die neueste E-Mail öffnen. Auch den Spamordner prüfen.
4. Den Link in der E-Mail öffnen. Es erscheint **Dein neues Teamhub-Passwort**. Ein eigenes Passwort mit mindestens 12 Zeichen eingeben und wiederholen.
5. **Passwort speichern und abmelden** wählen. Anschließend mit Firmen-E-Mail und dem neuen Passwort anmelden.

Jeder Mitarbeiter verwendet ein eigenes Passwort. Das Teamhub-Passwort ist unabhängig vom 1&1-Postfachpasswort. Im Chat wird kein Passwort benötigt. Passwörter werden nicht in den lokalen Demo-Daten oder als Klartext in Browser-Speichern abgelegt; die Prüfung und Passwortverwaltung übernimmt Supabase Auth. Wie bisher speichert der Anmeldedienst Sitzungstokens für die angemeldete Sitzung.

## Später anmelden und abmelden

E-Mail und Passwort ausfüllen und **Anmelden** klicken. Ein bestehendes aktives Mitarbeiterprofil bleibt Voraussetzung für den Zugriff auf Teamdaten. **Abmelden** steht im Teamzugang dauerhaft oben rechts, auch beim Scrollen auf dem Handy. Der Knopf beendet die Sitzung auf diesem Gerät; die Oberfläche entfernt die privaten Ansichten. Bei Verwendung gemeinsam genutzter Rechner nach der Arbeit abmelden.

Nach erfolgreichem Festlegen eines neuen Passworts fordert die Seite zusätzlich die Abmeldung bestehender Sitzungen beim Anmeldedienst an. Falls diese serverseitige Bestätigung fehlschlägt, benennt die Oberfläche die erfolgreiche Passwortänderung und den fehlgeschlagenen Teil getrennt. Bereits ausgestellte Zugriffstokens richten sich weiterhin nach ihrer serverseitigen Gültigkeitsdauer.

## Passwort vergessen

Auf der Loginseite **Passwort festlegen / vergessen?** wählen und einen neuen Link anfordern. Die Antwort bleibt neutral, unabhängig davon, ob die Adresse bereits eingerichtet ist. Der Link funktioniert nur mit einer vom Anmeldedienst bestätigten Sitzung. Ein abgelaufener Link oder ein selbst gesetzter URL-Parameter erlaubt keine Passwortänderung. Die Seite behält bei erlaubtem Session Storage einen noch offenen Passwortdialog für denselben serverseitig bestätigten Benutzer für bis zu 15 Minuten bei, damit Neuladen das Formular nicht versehentlich überspringt. Gespeichert werden dafür nur Benutzerkennung und Zeitpunkt, kein Passwort oder zusätzlicher Berechtigungsschlüssel.

Eine fehlgeschlagene Passwortspeicherung meldet keinen Erfolg. Bei einem ungültigen Link einen neuen anfordern und ausschließlich die neueste E-Mail verwenden. Bei Problemen an Patrick Walter wenden.

## Alternative mit Anmeldelink

**Mit Anmeldelink anmelden** bleibt für bereits eingerichtete Konten verfügbar. Dabei werden keine neuen Benutzer automatisch registriert. Ein solcher Anmeldelink setzt kein neues Passwort; dazu den getrennten Weg **Passwort festlegen / vergessen?** verwenden.

## Supabase-Konfiguration

- Der bestehende E-Mail-Anbieter unter **Authentication → Sign In / Providers → Email** muss aktiviert bleiben. Öffentliche Selbstregistrierung bleibt deaktiviert.
- Bestehende Site URL: `https://patrickwalterwegberg-blip.github.io/Fitness-Gesundheit/`
- Bestehende erlaubte Redirect URL: `https://patrickwalterwegberg-blip.github.io/Fitness-Gesundheit/?team=1`
- Die Mailvorlage **Reset Password** muss den echten Bestätigungslink `{{ .ConfirmationURL }}` verwenden. Die Standardvorlage unterstützt diesen Ablauf. Keine feste Teamhub-URL anstelle dieses Platzhalters verwenden.
- Der bestehende SMTP-Versand bleibt unverändert. Die eigene `login.html`-Adresse wird beim Anfordern der Mail auf die oben bereits erlaubte Stammadresse zurückgeführt; eine zusätzliche Redirect-Freigabe ist dafür nicht notwendig.
- Der Client verlangt für neu gewählte Passwörter 12–128 Zeichen; zusätzliche Passwortvorgaben des Projekts werden weiterhin serverseitig durchgesetzt. Bereits gesetzte kürzere Passwörter können im normalen Login eingegeben werden.

## Ältere Ansicht auf dem Desktop

Die Oberfläche zeigt oben eine Versionskennung. Die Demo ist mit **Demo-Vorschau** gekennzeichnet und bietet **Zur Anmeldung**. Öffne die direkte `login.html`-Adresse; falls nötig auf dem Mac mit **⌘ + Umschalt + R** neu laden. Es gibt keine automatische Aktualisierung, die ein gerade ausgefülltes Passwortformular verwirft.

## Prüfung

Die Browserprüfungen verwenden den echten Supabase-JavaScript-Client mit simulierten HTTP-Antworten. Sie prüfen Passwort-Login, falsche Zugangsdaten, gesperrte Profile, neutrale Reset-Antworten, bestätigte und ungültige Recovery-Links, Speicherung, Neuladen, Abmeldung, Serverfehler und mobile Bedienung. Sie versenden keine echten E-Mails und setzen keine Passwörter im gehosteten Projekt. Ein tatsächlicher Passwortdurchlauf im eigenen Konto ist nach Veröffentlichung noch durchzuführen.
