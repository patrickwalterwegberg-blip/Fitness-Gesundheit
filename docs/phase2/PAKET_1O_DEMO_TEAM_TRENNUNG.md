# Paket 1O – Demodaten erst beim Öffnen der Demo

Stand: 23.11.2026. Ausgangsstand auf GitHub `main` und lokal: `be8a8a3afeba7cffcee1092eb94580b895bf0419`. Der Nutzer möchte nach der Mailprüfung mit einem anderen offenen Thema fortfahren. Keine bestehenden Einträge löschen oder automatisch übertragen.

## Befund und Änderung

Der tatsächliche Anwendungseinstieg initialisierte sämtliche lokalen Demo-Speicherhooks, bevor er zum Teamzugang abzweigte. Schon der erste Aufruf der konfigurierten Startseite, von `/?team=1` oder `/login.html` legte deshalb `fg-hub-*`-Beispieldaten im Browser an. Bestehende lokale Daten wurden dabei ebenfalls gelesen, migriert und neu geschrieben. Ein Upload dieser Daten nach Supabase wurde nicht festgestellt. Die neue Browserprüfung schlug auf dem unveränderten Einstieg mit einem gefüllten statt leeren Demospeicher fehl.

`App` entscheidet nun vor dem Start der Demo-Hooks über den Bereich. Erst ein tatsächlicher Demoaufruf aktiviert `DemoApp`. Bestehende lokale Datensätze bleiben beim erstmaligen Team-Einstieg unverändert. Der Rückweg heißt „Zum Teamzugang“; der Banner erklärt, dass die Vorschau Änderungen nur in diesem Browser speichert. Farben, Schriftarten und Karten bleiben im vorhandenen Schwarz-Gold-Design.

Die unabhängige Quellprüfung fand in einem ersten Entwurf eine Regression: Ein vollständiges Unmounten der Demo beim Bereichswechsel verlor den Bibliothekseintrag eines noch laufenden lokalen Uploads. Ein deterministisch verzögertes Lesen einer synthetischen Textdatei reproduzierte diesen Fehler: kein Dokumenteintrag statt genau eines. Die finale Lösung behält den Demo-Speicher nach dem ersten bewussten Aufruf im Arbeitsspeicher; beim Wechsel zum Teamzugang verschwindet seine Oberfläche einschließlich Dialogen. Bereits gestartete lokale Speicheroperationen dürfen abschließen. Auch das lokale Suchgespräch und vorhandene Demo-Zustände bleiben dadurch erhalten. Das ist keine automatische Löschung oder Migration alter Testdaten und keine serverseitige Rechteänderung.

## Prüfung

Neun gezielte Chromium-Browsertests am echten `src/main.jsx`-Einstieg bestanden:

- Drei Team-Einstiegsadressen einschließlich erneutem Laden erzeugen keine Demoschlüssel.
- Bereits vorhandene lokale Daten bleiben bytegleich; keine Demo-Speicherschreiboperation beim Team-Einstieg.
- Admin → Demo → Team → erneutes Laden erhält dieselbe simulierte Sitzung und lokale Aufgaben; keine Aufgabenübertragung und kein neuer Login-/Mailaufruf.
- Mitarbeitereinstieg bei 390 Pixeln ohne Demo-Button und ohne Demospeicher.
- Demo-Banner bei 360 Pixeln ohne Überbreite; Teamwechsel und Browser-Zurück/Vorwärts funktionieren. Screenshot visuell geprüft.
- Zwei laufende Uploads über Bereichswechsel beziehungsweise Browserhistorie behalten genau einen Bibliothekseintrag; der tatsächlich heruntergeladene Dateiinhalt stimmt überein.

Ein zwischenzeitlich zu enger Testselektor erwartete nur den Dateinamen als vollständigen Namen der Dateikarte. Die Karte hat weitere beschreibende Inhalte; die Auswahl wurde berichtigt. Das Speicherergebnis der finalen Lösung bestand bereits davor. Anschließend bestanden alle neun Fälle einschließlich Download.

Der Produktionssmoke prüft zusätzlich am kompilierten Team-Einstieg und an der kompilierten Loginseite, dass keine Demo-Schlüssel angelegt werden. Alle Backendaufrufe der automatischen Tests sind simuliert. Physische iPhones/Android-Geräte und das gehostete Supabase-Projekt sind dadurch nicht abgenommen.

Die unabhängige QA-Abnahme bestand mit **187 Datenbank-/Modelltests**, **13 Zugriffsdiensttests**, **9 Mock-Assistentdiensttests** und dem Build mit synthetischer Backendkonfiguration. Alle 186 Quell-/Test-/Konfigurationsdateien waren vor und nach den Prüfungen zwischen Arbeitsrepo und eingefrorener Prüfkopie hashgleich. Ein lokaler Kopierfehler hatte zunächst die Startlinks in `node_modules/.bin` dereferenziert; die ursprünglichen Symlinks wurden ausschließlich in der Prüfkopie wiederhergestellt und der Build erfolgreich wiederholt. Keine Quelländerung oder Netzabhängigkeit hierfür.

Der Produktionssmoke bestand einschließlich kompiliertem Team-/Login-Einstieg ohne Demodaten und tatsächlichem PDF-Inhaltsvergleich. Die vollständige Browserregression bestand mit **376 Tests (7,6 Minuten)**. Vor und nach diesem Lauf waren alle 186 Dateien erneut hashgleich; keine Quelländerung während der Abnahme. Lokale Vite-/Chromium-Prüfungen liefen über die reguläre automatische Freigabeprüfung, da die normale Sandbox lokale Portbindungen blockiert. Die Veröffentlichung wird nach tatsächlichem GitHub-Abschluss ergänzt.

## Manuell bestätigter Mailstand

Der Nutzer meldete am 23.11.2026 den eigenen SMTP-Schalter als aktiviert. Anmeldelink erhalten, Anmeldung damit sowie Profil/Rolle/Studio wurden von ihm bestätigt. Anschließend bestätigte er den Passwort-Reset einschließlich empfangener Mail, gespeichertem Passwort und erfolgreicher Passwort-Anmeldung. Das sind manuelle Nutzerrückmeldungen, keine durch Werkzeuge unabhängig nachgewiesenen Zustellungen.

Eine echte Neueinladung bleibt offen: Es steht aktuell kein zusätzliches erreichbares Postfach ohne bestehenden Teamhub-Zugang zur Verfügung. SPF/DKIM, Anbieter-Konfiguration, Zustellung an weitere Adressen und die vollständige Gerätematrix sind ungeprüft. Generative KI bleibt zurückgestellt.

## Rückweg und kurze manuelle Kontrolle

Kein SQL und keine neue Supabase-Einrichtung erforderlich. Ein Rückweg betrifft nur diesen isolierten Quellpaketstand; gespeicherte Daten werden weder im Vorwärts- noch im Rückweg bereinigt. Der frühere Einstieg würde wieder Demo-Beispiele automatisch anlegen.

Nach bestätigter Veröffentlichung als Admin den Teamhub öffnen, „Zur Demo“ wählen und über „Zum Teamzugang“ zurückkehren. Der Teamhub soll denselben Zugang zeigen. Eine lokale Demodatei beziehungsweise Aufgabe darf nicht in den gemeinsamen Teamdaten erscheinen. Die Installation der bisherigen Datenbankerweiterung 017 und die echte Mitarbeiterprüfung des PDF-Nachweises bleiben separat unbestätigt.
