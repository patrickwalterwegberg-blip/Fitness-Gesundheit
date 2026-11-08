# Paket 1C – Assistent ohne verdeckte Inhalte

Stand: 08.11.2026. Grundlage: GitHub-Stand `86c6c83`, Phase-1-Browserproben sowie unabhängige UX-/QA-Quellsicht. Status: lokale Paketprüfung vollständig bestanden. Gehostete Geräte-/Kontenabnahme und bestätigter Veröffentlichungsstatus bleiben getrennte Nachweise.

## Ziel und Änderung

Der Assistentenbutton bleibt erreichbar und verdeckt keine Karten, Pfeile oder Formulare. Die Phase-1-Proben dokumentierten 62 Überlappungen in zwölf Kombinationen aus Rolle und Bildschirmgröße.

Der bisher fixierte Launcher des gemeinsamen Teamhubs wechselt in eine eigene Zeile direkt unter der Kopfleiste und vor der Kontextzeile. Die Zeile liegt im normalen Seitenfluss und scrollt mit. Desktop und Mobilansicht verwenden die bisherigen Inhaltsabstände, das Sparkles-Symbol und Schwarz-Gold. Der vorhandene Assistenteneintrag im Menü bleibt erreichbar, wenn die Zeile aus dem sichtbaren Bereich gescrollt ist.

Zugänglicher Name bleibt „KI-Assistent öffnen“, sichtbarer Text „Frag den Assistenten“. Die vorhandene Assistentenfreigabe und der Navigationspfad bleiben maßgeblich. Ohne Freigabe oder nach Abmeldung erscheinen beide Einstiege nicht; auf der Assistentenseite entfällt der zusätzliche Launcher.

Keine Änderung des Headers, der Fenster-Scrollcontainer, von Berechtigungen, Datenbank oder KI-Modellbetrieb. Die bisherige Demo verwendet ihre eigenen globalen Stile weiter. Vorbereitete Video-/Labelkorrekturen bleiben außerhalb dieses Pakets.

## Test und Abnahme

- Drei Rollen × vier Bildschirmgrößen (360, 390, 768, 1440 Pixel): oben, nach mittlerem Scrollen und am Seitenende bleiben Karten, Pfeile und Bedienelemente frei. Rechtecke und tatsächliche Klicktreffer prüfen.
- Launcher und Menüeintrag öffnen dieselbe Assistentenseite. Vorhandene Rechteentzugs-/Logout-Fälle bestehen weiter.
- Tastatur: Launcher erreicht Enter/Leertaste, Fokus ist sichtbar, kein unsichtbarer alter Button bleibt vorhanden.
- Native Formulare bleiben bedienbar und behalten ihre Eingaben; außerhalb liegender Launcher dringt nicht in die modale Fokusreihenfolge ein.
- Schmale und kurze Ansichten: mindestens 44 Pixel hohe Launcherfläche, verständlicher Umbruch, Menü/Glocke/Abmelden erreichbar und kein horizontaler Überlauf.
- Kachelfilter/Rückkehr aus Paket 1A bleiben mit sichtbarem Fokus unter der Kopfleiste funktionsfähig. Pflegeaktionen aus Paket 1B bleiben erreichbar.

Entwicklung prüft gezielt, QA führt unabhängig ergänzende Fälle und die gesamte Browserregression aus. Build und Produktions-Smoke prüfen zusätzlich das kompilierte Artefakt mit eingebundenen Schriftarten. Keine parallelen Änderungen an den geprüften Anwendungssourcen.

## Ergebnis und manuelle Prüfung

| Prüfung | Ergebnis |
|---|---|
| Fehlernachweis am bisherigen Stand | Bei 360 Pixeln und 25 % Scrollposition verdeckt der fixierte Button eine Linkkarte; neuer Test schlägt am Basisstand gezielt fehl |
| Neue Platzierungsfälle | 15 bestanden: zwölf Rollen-/Viewportkombinationen, Tastatur sowie zwei schmale/kurze Ansichten mit vergrößertem Launchertext |
| Gezielte Regression | 56 bestanden, einschließlich Assistentenrechten und Startseitenpaketen 1A/1B |
| Unabhängige QA | 3 bestanden: Dialogfokus/Entwurferhalt, Menü nach tiefem Scrollen, lange Überschrift mit Glocke und Abmeldung |
| Build und Produktions-Smoke | Bestanden; kompilierte 360-Pixel-Ansicht mit geladenen Schriftarten, reservierter Launcherfläche und tatsächlicher Klickprüfung |
| Vollständige Browserregression | 312 bestanden in 6,2 Minuten; ein Chromium-Worker, unabhängige QA, unveränderte Quellen |

UX hat Mobilbilder und Quellen unabhängig geprüft; Security bestätigt unveränderte Sichtbarkeit und Rechte. Zwei Fehler im eigenen QA-Prüfaufbau (fehlende Funktionsversion für private Aufgaben und eine noch laufende Menüanimation) wurden ausschließlich im Test korrigiert. Dafür war keine Anwendungsänderung nötig.

Der isolierte Prüfstand unter `/tmp/teamhub-paket1c-run` besteht aus `86c6c83` und genau den Paketquellen/-tests. Veränderte Anwendungssourcen sind ausschließlich `TeamShell.jsx` und `team-shell.css`; der Produktions-Smoke wurde um die mobile Geometrieprüfung ergänzt. Die finale unabhängige Sichtprüfung der gesicherten 360-/390-Pixel-Bilder bestätigt freie Header-, Launcher- und Inhaltsflächen. Der neue private Aufgabenentwurf bleibt während des Dialog-Fokuswechsels erhalten.

Lokale Tests verwenden synthetische Daten und simulierte Backendaufrufe. Echte iPhone-/Android-Safe-Area, Bildschirmtastatur, gehostete Konten und Live-Rechte bleiben gesonderte Nachweise.

Nach Bereitstellung mit beiden Prüfzugängen Startseite, Aufgaben und ein Formular öffnen, scrollen und den Assistenten über Button und Menü aufrufen. Ohne Wissensfreigabe dürfen die Einstiege nicht erscheinen. Bei einem Fehler ausschließlich den isolierten Frontend-Paketcommit zurücknehmen; keine Datenbankänderung zurückzurollen.

Der Abschluss der automatischen GitHub-Pages-Veröffentlichung ist aus dieser Umgebung nicht bestätigt; der Zugriff auf die GitHub-Status-API war bislang netzwerkseitig gesperrt. Git-Übertragung und bestätigtes Deployment werden getrennt ausgewiesen.

## Nachtrag zur Veröffentlichung

Am 08.11.2026 wurde über GitHubs öffentliche Workflowseite der erfolgreiche Abschluss von „Teamhub veröffentlichen“ für Commit `7bbe8e8` bestätigt: [Workflowlauf 42496550412](https://github.com/patrickwalterwegberg-blip/Fitness-Gesundheit/actions/runs/42496550412). Die strukturierte Webantwort meldet `COMPLETED` und `SUCCESS` für genau diesen Commit auf `main`. Damit ist der zuvor offene Workflowabschluss belegt; echte Konto-/Geräteabnahmen werden dadurch nicht ersetzt.
