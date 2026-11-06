# Mitarbeitereinladung mit Onboarding

Unter **Mitarbeiterzugänge → Mitarbeiter einladen** lässt sich jetzt optional ein persönlicher Einarbeitungsplan vorbereiten. Schwarz-Gold-Design, Rollen und individuelle Freigaben bleiben bestehen.

## Ablauf

1. Name, Firmen-E-Mail, Rolle und zugeordnete Studios eingeben.
2. **Onboarding direkt mit dieser Einladung zuweisen** aktivieren.
3. Ein zugeordnetes Studio, Startdatum, veröffentlichte Vorlage und freigegebenen Mentor auswählen. Die Vorlage wird passend zur Tätigkeit manuell gewählt; es gibt keine automatische Rollenregel.
4. Die Vorschau mit allen Schritten, Fälligkeiten, Wissenschecks und gegebenenfalls Praxis- oder Leitungsbestätigungen prüfen und bestätigen.
5. **Einladung und Onboarding starten** wählen.

Vor dem Mailversand werden Veröffentlichung und Revision der Vorlage sowie die Mentorfreigabe erneut gelesen. Bei einer Änderung wird noch keine Einladung angefordert. **Vorlagen und Ansprechpartner neu laden**, die aktualisierte Vorschau prüfen und erneut bestätigen.

Nach einer bestätigten Mailanforderung wird die vom Einladungsdienst zurückgegebene Mitarbeiter-ID für die vorhandene Funktion `enroll_onboarding` verwendet. Sie erzeugt die tatsächlichen Kurszuweisungen, Studioaufgaben, Fristen und die vorhandene Onboarding-Benachrichtigung. Die Mailanforderung ist noch keine Bestätigung der Zustellung.

## Rechte und Voraussetzungen

Es werden die bestehenden Erweiterungen 003 und 012 verwendet. Eine neue SQL-Migration oder eine neue Version der Edge Function ist für diese Verbindung nicht nötig. Der eingerichtete Einladungsdienst muss weiterhin erreichbar sein.

Für die direkte Zuweisung sind **Mitarbeiter einladen** sowie **Einarbeitungspläne Mitarbeitern zuweisen**, einschließlich der zugehörigen Bereiche, erforderlich. Ohne das zusätzliche Onboardingrecht bleibt eine normale Einladung verfügbar. Die Vorlage muss veröffentlicht und für das gewählte Studio passend sein; Mentoren werden über die serverseitige Liste berechtigter Personen ausgewählt. Der Server prüft Studios, Kursrechte und Mentor erneut. Ein Mehrstudio-Mitarbeiter erhält in diesem Ablauf einen Plan für ein ausgewähltes Studio.

## Getrennte Rückmeldung und Wiederholung

E-Mail-Anforderung und Datenbankzuweisung sind zwei getrennte Vorgänge. Bei einer fehlgeschlagenen Einladung wird kein Onboarding gestartet. Nach einer erfolgreichen Einladung bleiben die Zugangsdaten im Formular gesperrt. Schlägt nur die Zuweisung fehl oder bleibt ihre Bestätigung aus, wiederholt **Onboarding erneut zuweisen** ausschließlich die Zuweisung mit derselben Mitarbeiter-ID und derselben Vorgangskennung. Die bestehende serverseitige Wiederholungssicherung verhindert zusätzliche Pläne, Aufgaben oder Kurse für diesen Vorgang.

Wird das Formular geschlossen, bleibt im geöffneten Bereich die Karte **Einladung angefordert · Onboarding noch offen** mit einer eigenen Wiederholungsmöglichkeit. Eine weitere neue Einladung ist bis zur Auflösung dieses Vorgangs gesperrt. **Später im Lernhub prüfen** beendet die offene Rückmeldung; zunächst im Lernhub prüfen, ob der Plan bereits vorhanden ist, und gegebenenfalls dort zuweisen. Ohne bestätigte Mitarbeiter-ID wird kein anderes Konto geraten und keine Zuweisung gestartet.

Die offene Rückmeldung bleibt im Arbeitsspeicher des Bereichs. Nach Navigation, Abmeldung oder Neuladen muss der Mitarbeiter beziehungsweise sein Plan über die Zugangsliste und den Lernhub geprüft werden. Der gemeinsame CSV-/Excel-Import bleibt unverändert und weist keine Pläne zu.

## Prüfung

`npx playwright test tests/invitation-onboarding.spec.js tests/invitation-ui.spec.js` prüft Vorschau, Zuweisung an die bestätigte Mitarbeiter-ID, Mailfehler, Teilfehler, Wiederholung nach bereits erfolgter Speicherung, fehlende ID, veränderte Vorlage, Rechteentzug und mobile Bedienung mit simuliertem Backend. `node --test tests/invitation-onboarding-model.test.mjs` prüft Datumsgrenzen und die Zuordnungsdaten. Die vorhandenen Datenbank- und Onboardingtests prüfen zusätzlich Rechte, idempotente Zuweisung, Kursfortschritt und Prüfungsabläufe.

Für die Abnahme im echten Projekt bleibt der Test mit einem erreichbaren Mitarbeiterpostfach erforderlich: Einladung empfangen, Passwort festlegen, anmelden und den zugewiesenen Plan mit Kurs und Wissenscheck bearbeiten. Die automatisierten Tests senden keine echten E-Mails.
