# Mitarbeiter-Onboarding

Die neue Einarbeitung verbindet vorhandene Kurse mit Videos und Prüfungen, Teamaufgaben und persönlichen Checklisten. Mitarbeiter sehen ihre eigenen Pläne. Die Leitung kann Pläne für ihre freigegebenen Studios begleiten. Die Kursübersicht erhält dunkle Titelkacheln im bestehenden Schwarz-Gold-Design.

## Einmalig aktivieren

Voraussetzung: Erweiterungen 001 bis 011 sind installiert.

1. [012_employee_onboarding.sql](https://github.com/patrickwalterwegberg-blip/Fitness-Gesundheit/blob/main/backend/supabase/012_employee_onboarding.sql) öffnen und den gesamten Inhalt kopieren.
2. Im [Supabase SQL Editor](https://supabase.com/dashboard/project/ftcurcqduzrxsvkujfql/sql/new) eine neue Abfrage öffnen, den Inhalt einfügen und **Run** klicken.
3. Den Teamhub neu laden. Im Lernhub erscheinen **Meine Kurse**, **Mein Onboarding** und bei entsprechender Berechtigung **Onboarding verwalten**.

Die Migration ist wiederholt ausführbar. Sie erzeugt keine Mitarbeiter, Kurse, Aufgaben oder veröffentlichten Vorlagen automatisch. Bereits vorhandene Kurse, Aufgaben, Prüfungsergebnisse und Zugänge bleiben erhalten.

## Vorlage erstellen

**Lernhub → Onboarding verwalten → Vorlage erstellen**

Titel, Willkommenstext und Studio wählen. Die Geschäftsleitung kann Vorlagen für alle Studios erstellen; delegierte Vorlagenautoren bleiben auf ihre eigenen Studios beschränkt.

Über **Studio-Onboarding-Struktur einsetzen** wird eine bearbeitbare Struktur ins Formular eingesetzt: Orientierung im Teamhub, ein vorhandener aktiver Kurs oder ein Service-Check, eine persönliche Geräte-/Sicherheitseinweisung, eine erste Aufgabe und ein Feedbackgespräch. Der Inhalt muss vor Freigabe an die tatsächlichen Abläufe im Studio angepasst werden. Die Struktur ist kein automatisch veröffentlichter Kurs und enthält keine erfundenen Unternehmensregeln.

Bis zu 30 Schritte sind möglich. Pro Schritt stehen zur Verfügung:

- **Kurs mit Wissenscheck:** Einen vorhandenen aktiven Kurs mit Lerninhalt auswählen. Videos und Prüfungen bleiben beim Kurs. Optional kann die vorhandene separate Praxisbestätigung verlangt werden.
- **Aufgabe im Kalender:** Bei Zuweisung entsteht eine Teamaufgabe für den Mitarbeiter mit Fälligkeit. Sie bleibt mit dem Kalender und dem Aufgabenstatus verbunden.
- **Checkliste / Einweisung:** Der Mitarbeiter bestätigt seine Erledigung. Bei Bedarf muss eine andere berechtigte Person zusätzlich bestätigen.

Die Reihenfolge lässt sich ändern. Über **Tage nach Start** wird die Fälligkeit relativ zum persönlichen Startdatum festgelegt. Die Reihenfolge dient als Orientierung; sie sperrt spätere Schritte nicht künstlich.

**Als Entwurf speichern** hält die Vorlage zur weiteren Bearbeitung bereit. Erst **Vorlage freigeben** macht sie für die Zuweisung verfügbar. Nach der ersten Zuweisung bleibt die Vorlage unverändert. **Kopie erstellen** erlaubt eine neue Version, ohne laufende Pläne umzuschreiben.

## Einer Person zuweisen

Bei einer freigegebenen Vorlage **Plan zuweisen** wählen. Mitarbeiter, Studio, Startdatum und Ansprechpartner festlegen. Die Liste der Ansprechpartner berücksichtigt auch einzeln freigeschaltete Mitarbeiter mit Onboarding-Begleitung und einem aktiven Lernhubzugang.

Die Zuweisung erzeugt den persönlichen Plan samt benötigten Kurs- und Aufgabenverknüpfungen in einer Datenbanktransaktion. Wiederholungen derselben Anfrage erzeugen keine doppelten Aufgaben. Dieselbe Vorlage kann einer Person nur einmal zugewiesen werden.

Vorhandene Kurszuweisungen im passenden Studio werden weiterverwendet. Eine bestehende Praxisanforderung wird nicht herabgesetzt. Verlangt die neue Vorlage Praxis, obwohl der vorhandene Lernauftrag keine solche Anforderung enthält, wird die Zuweisung mit einer Erklärung abgelehnt. Ebenso werden widersprüchliche Studios und unpassende Kursvideos zurückgewiesen. Bereits während des Versuchs angelegte Aufgaben und Meldungen werden dann vollständig zurückgerollt.

Die persönliche Zuweisung ist bewusst ausdrücklich. Eine Mitarbeiter-Einladung weist derzeit noch keinen Onboardingplan automatisch zu.

## Mitarbeiteransicht

Auf **Meine Übersicht** erscheint bei einem vorhandenen Plan eine Zusammenfassung mit Fortschritt, Ansprechpartner und **Onboarding fortsetzen**. Die Schaltfläche führt direkt zur passenden Lernhubansicht.

Unter **Mein Onboarding** sieht der Mitarbeiter ausschließlich seine zugänglichen persönlichen Pläne, die Reihenfolge, Fälligkeiten und den nächsten offenen Schritt. Kurs- und Aufgabenschritte öffnen die bereits vorhandenen Funktionen im Hub. Eine neue Zuweisung wird zusätzlich in der Benachrichtigungsglocke hinterlegt.

Fortschritt wird aus echten Serverdaten berechnet:

- Ein Kurs ist erst abgeschlossen, wenn alle Lektionen bestätigt, die Prüfung bestanden und eine gegebenenfalls verlangte Praxiseinweisung bestätigt sind.
- Eine Aufgabe zählt erst bei ihrem tatsächlichen Aufgabenstatus **Erledigt**.
- Ein Checklistenschritt zählt bei Mitarbeiterbestätigung und, falls verlangt, zusätzlicher Bestätigung durch eine andere berechtigte Person.

Kurskacheln berücksichtigen neben den Lektionen auch Prüfung und gegebenenfalls Praxis. Zwei von zwei gelesenen Lektionen allein ergeben daher noch keine 100 Prozent. Der gesamte Onboardingfortschritt zeigt den Anteil vollständig erledigter Schritte; ein teilweise bearbeiteter Kurs bleibt ein offener Schritt.

Bereits gelesene oder kopierte Inhalte können technisch nicht rückwirkend ungesehen gemacht werden. Neue Abfragen werden nach Entzug von Studio- oder Lernhubzugriff erneut gesperrt. Der Verlauf bleibt auf dem Server erhalten.

## Leitung und Rechte

Unter **Onboarding verwalten** zeigt die Teamübersicht Fortschritt und offene Schritte innerhalb der freigegebenen Studios. Eine erforderliche manuelle Einweisung wird dort separat bestätigt. Niemand bestätigt seine eigene Einweisung als zweite prüfende Person. Die Mitarbeiterbestätigung muss vorher vorhanden sein. Eine Bestätigung lässt sich durch berechtigte Leitung zurücknehmen; bestätigte Schritte können vom Mitarbeiter nicht einfach zurückgesetzt werden. Änderungen werden mit Person und Serverzeit protokolliert.

Drei einzeln freischaltbare Funktionen ergänzen die bestehenden Rollen:

- **Onboardingvorlagen erstellen und freigeben:** Standardmäßig Geschäftsleitung. Benötigt die bestehende Funktion zum Erstellen von Kursen, damit passende Kurse verfügbar sind.
- **Einarbeitungspläne Mitarbeitern zuweisen:** Standardmäßig Geschäftsleitung. Die nötigen Funktionen für Kurszuweisungen, Teamaufgaben und Onboarding-Begleitung werden als sichtbare Abhängigkeiten mit freigeschaltet.
- **Onboarding im eigenen Studio begleiten und bestätigen:** Standardmäßig Studioleitung und Geschäftsleitung. Gewährt keine Mitarbeiterverwaltung, keine Rechtevergabe und keine automatische Freigabe für Kursprüfungen.

Die Bestätigung einer **Kurs-Praxiseinweisung** bleibt eine gesonderte Funktion des Lernhubs. Onboarding-Begleitung allein ersetzt diese Berechtigung nicht. Private Aufgaben anderer Personen werden nicht in einen Einarbeitungsplan aufgenommen.

## Praktischer Test

1. Eine kurze Vorlage mit einem Kurs, einer Aufgabe und einem Check erstellen und freigeben.
2. Einer Testperson im richtigen Studio zuweisen und eine berechtigte andere Person als Ansprechpartner wählen.
3. Im Mitarbeiterkonto den Plan über die Übersicht oder Glocke öffnen.
4. Den Check erledigen: Bei zusätzlicher Bestätigung bleibt der Schritt noch offen.
5. Als Leitung die Einweisung bestätigen, anschließend im Mitarbeiterkonto den Kurs und die Aufgabe abschließen.
6. Prüfen, dass Kurs, Kalender, Aufgaben und Onboarding denselben Stand zeigen und erst nach allen nötigen Nachweisen 100 Prozent erreicht werden.

Die lokalen Browserprüfungen verwenden simulierte Serverantworten; Datenbankprüfungen kontrollieren die tatsächlichen SQL-Regeln. Die Installation und erste Zuweisung im produktiven Projekt müssen danach praktisch geprüft werden.
