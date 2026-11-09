# Paket 1J – Gewählten Kurs beim Speichern behalten

Stand: 09.11.2026. Separates Folgepaket zur lokal abgenommenen Onboarding-Verlinkung 1I (`c6e7560`).

## Problem und Änderung

Ein über die Startseite geöffneter Lernauftrag blieb als Navigationsziel gespeichert. Bei jedem späteren Datenabruf wurde dieses Ziel erneut ausgewählt. Wer anschließend einen anderen Kurs öffnete und dort eine Lektion bestätigte oder ein Quiz abschickte, konnte dadurch zum ursprünglichen Kurs zurückspringen. Dabei verschwanden das angezeigte Quizresultat und die Auswahl. Auch ein bewusst geschlossener Kurs wurde beim Aktualisieren wieder geöffnet.

Der Einstieg wird jetzt pro Navigationsziel einmal verarbeitet. Der Datenabruf merkt sich das dazugehörige Zielobjekt; erst die erfolgreich geladenen Daten dieses Ziels dürfen den Einstieg verarbeiten. Manuelle Kurswahl, Speichern und Aktualisieren wenden einen bereits verarbeiteten Einstieg nicht erneut an. Ein neues Navigationsziel oder ein erneuter Einstieg in den Lernhub kann wieder einen Kurs öffnen. Der bestehende Benachrichtigungseinstieg über eine Kurs-ID bleibt erhalten.

Ein nicht mehr vorhandener Einstiegsauftrag wird einmal erklärt und erzwingt keine spätere Rückkehr oder erneute Fehlermeldung, wenn danach ein anderer verfügbarer Kurs bewusst gewählt und aktualisiert wird. Die Änderung enthält weder neue Serverrechte noch eine Kurs-/Fortschrittsmigration.

## Abnahme

- Startseite → Kurs A → eigener Kurs B → Lesebestätigung: B bleibt offen; nur B erhält die Bestätigung.
- Startseite → Kurs A → eigener Kurs B → Wissenscheck: B und sein Serverresultat bleiben sichtbar; A wird nicht als bestanden gesetzt.
- Kurs bewusst schließen und aktualisieren: kein automatisches Wiederöffnen.
- Nicht mehr verfügbarer Einstiegsauftrag → verfügbaren Kurs manuell wählen → aktualisieren: kein veralteter Zielzwang und keine erneut eingeblendete alte Meldung.
- Vorhandene Erstaufrufe, Onboardingkurse, Benachrichtigungseinstiege und erneute Benachrichtigungsaufrufe als Regression prüfen.

Alle vier neuen Fälle scheiterten am bisherigen Komponentenstand. Nach der Korrektur bestanden alle 49 gezielten Kurs-, Onboarding-, Einladungs- und Benachrichtigungsfälle (1,0 Minuten). Build und Produktionssmoke der exakt übereinstimmenden Prüfkopie bestanden. Die unabhängige Quellabnahme fand keine blockierenden Befunde. Der vollständige GitHub-Lauf und die gemeinsame Bereitstellung bleiben bis zur tatsächlichen Ausführung offen. Sämtliche Lernaufträge und Serverantworten in den Browsertests sind simuliert; echte gehostete Zuweisungs-/Abschlussnachweise bleiben separat zu prüfen.

Manuell prüfen: Über die Startseite einen Kurs öffnen, anschließend einen anderen eigenen Kurs wählen und dort eine Lektion bestätigen. Der zweite Kurs muss geöffnet bleiben. Bei einem Wissenscheck müssen Ergebnis und Kurs zusammenpassen.

Rückweg: den isolierten Komponenten-/Test-/Dokumentationscommit zurücknehmen. Gespeicherte Lernfortschritte werden durch diese reine Navigationsänderung nicht zurückgesetzt.
