# E-Mail-Zugang Schritt für Schritt prüfen

Stand: 08.11.2026. Echte Zustellung bisher **nicht nachgewiesen**. Die automatischen Tests simulieren den Versand. Diese Anleitung richtet sich an die Geschäftsführung; verwende nur eigene oder ausdrücklich vereinbarte Prüfpostfächer.

## 1. Versandeinstellung ansehen

1. Öffne [dein Supabase-Projekt](https://supabase.com/dashboard/project/ftcurcqduzrxsvkujfql) am Computer.
2. Öffne **Authentication** und suche dort die E-Mail-/SMTP-Einstellungen. Die Bezeichnung kann je nach Supabase-Oberfläche abweichen.
3. Prüfe, ob **Custom SMTP / eigener SMTP-Server** aktiviert ist. Notiere nur „aktiviert“, „Standardversand“ oder „unklar“; schicke keine Zugangsdaten oder ungeschwärzten Screenshots.
4. Beim Standardversand können Empfänger beschränkt sein. Für den Mitarbeitereinsatz braucht ihr einen dafür geeigneten Versanddienst. Welcher Anbieter, Vertrag und Absender verwendet werden, muss anhand eurer tatsächlichen Einrichtung entschieden werden.

Ein Postfach allein bestätigt noch keine Freigabe für automatischen Versand. Host, Port und Verschlüsselung beim tatsächlichen Anbieter prüfen. Zugangsdaten ausschließlich in Supabases geschützter Konfiguration hinterlegen. SPF und DKIM durch die Person prüfen lassen, die eure Domain verwaltet; bestehende DNS-Einträge nicht blind ersetzen oder doppelte SPF-Einträge hinzufügen. [Technischer Hintergrund](EMAIL_VERSAND.md).

## 2. Rücksprung und Vorlagen kontrollieren

Unter Authentication die URL-Konfiguration ansehen:

| Einstellung | Erwarteter Wert für diese Veröffentlichung |
| --- | --- |
| Site URL | `https://patrickwalterwegberg-blip.github.io/Fitness-Gesundheit/` |
| Erlaubte Redirect URL | `https://patrickwalterwegberg-blip.github.io/Fitness-Gesundheit/?team=1` |

E-Mail-Anmeldung muss aktiv, öffentliche Selbstregistrierung deaktiviert sein. Die Vorlagen **Invite user**, **Magic Link** und **Reset Password** müssen Supabases Bestätigungslink enthalten. Keine feste Startseitenadresse als Ersatz einsetzen. Das sind Sollwerte aus dem Code; die gespeicherte Projekteinstellung ist noch zu bestätigen.

## 3. Bestehenden Zugang prüfen

1. Melde dich als Geschäftsführung im [Teamhub](https://patrickwalterwegberg-blip.github.io/Fitness-Gesundheit/?team=1) an.
2. Öffne **Mitarbeiterzugänge**, wähle den vereinbarten Prüfzugang und **E-Mail-Zugang prüfen**.
3. Kontrolliere Empfängeradresse, aktiven Zugang und Studiozuordnung. Korrigiere nur bewusst geprüfte Angaben.
4. Fordere genau einen Anmeldelink für dieses Prüfpostfach an. Die Meldung über eine angenommene Anfrage bestätigt noch keinen Versand oder Empfang.
5. Prüfe Posteingang und Spam. Öffne den neuesten Link auf einem Gerät, auf dem du den Zugang testen möchtest. Achte darauf, welches Konto anschließend angemeldet ist.

Wenn nichts ankommt: nicht wiederholt klicken oder ein zweites Konto anlegen. In Supabase die Auth-Protokolle und beim Versanddienst den Zustellungsstatus zum Zeitpunkt der Anfrage prüfen. Für eine Rückmeldung reichen Zeitpunkt mit Zeitzone, bereinigter Fehlercode und die angezeigte Referenznummer, soweit vorhanden. Keine vollständigen E-Mail-Links, Tokens, Passwörter oder personenbezogenen Protokolle weitergeben.

## 4. Einladung und Passwort getrennt testen

1. Für die Einladung einen ausdrücklich vereinbarten, noch nicht vorhandenen Prüfzugang verwenden. Rolle und Studio vor dem Absenden prüfen. Nach einem Zeitablauf zuerst die Zugangsliste aktualisieren; nicht vorsorglich doppelt einladen.
2. Einladungsmail empfangen und den neuesten Link öffnen. Den vorgesehenen Onboarding-Ablauf durchlaufen und die tatsächlichen Rechte kontrollieren.
3. Auf der Anmeldung **Passwort festlegen / vergessen?** wählen. Die entsprechende E-Mail an das bestehende Prüfpostfach anfordern und den neuesten Link öffnen.
4. Ein eigenes Teamhub-Passwort mit mindestens 12 Zeichen festlegen. Nie das Postfachpasswort verwenden oder ein Passwort hier mitteilen.
5. Den angezeigten Abmeldeschritt abschließen; gegebenenfalls **Jetzt abmelden** wählen. Anschließend mit E-Mail und neuem Passwort anmelden. Das falsche Passwort muss eine verständliche Fehlermeldung ergeben.
6. Alte, abgelaufene oder bereits verbrauchte Links dürfen keinen fremden Zugang öffnen. Fehlermeldung prüfen und bei Bedarf einen neuen Link anfordern. Keine Gültigkeitsdauer annehmen: Sie hängt von der gespeicherten Supabase-Einstellung ab.

## 5. Ergebnis festhalten

Alle Punkte sind zunächst offen. Trage erst nach tatsächlicher Durchführung Datum, Gerät und Ergebnis ein; verwende für Konten neutrale Kürzel.

| Nachweis | Status | Zeitpunkt / Gerät / Ergebnis |
| --- | --- | --- |
| Eigener SMTP-Anbieter, Absender und Versandfreigabe bestätigt | Offen | |
| SPF/DKIM und Auth-URL-Konfiguration geprüft | Offen | |
| Anmeldelink im vereinbarten Postfach angekommen und verwendet | Offen | |
| Einladung angekommen und Konto aktiviert | Offen | |
| Passwort-Reset angekommen, Passwort gespeichert, erneute Anmeldung erfolgreich | Offen | |
| Falsches Passwort und ungültiger Link verständlich behandelt | Offen | |
| Mitarbeiterkonto sieht nur erlaubte Funktionen und Studios | Offen | |
| Geschäftsführungszugang funktioniert weiterhin | Offen | |
| iPhone Safari und Android Chrome tatsächlich geprüft | Offen | |

Die Oberfläche und der Supabase-Einladungsdienst werden separat veröffentlicht. Ein grüner GitHub-Pages-Lauf beweist keine aktuelle Bereitstellung des Einladungsdienstes und keine Mailzustellung. Unklarheiten am Dienst anhand von [Mitarbeiterzugänge](MITARBEITERZUGAENGE.md) prüfen.

Bekannter Randfall: Sehr lange erlaubte E-Mail-Adressen über 200 Zeichen können aktuell an der Kontoprüfung scheitern. Das ist separat zu beheben und erklärt nicht ohne weiteren Nachweis einen allgemeinen Versandfehler.
