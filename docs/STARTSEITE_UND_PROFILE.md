# Startseite, Mitarbeiterprofile und Rollen

Der Teamzugang behält Schwarz und Gold. Die neue Startseite orientiert sich an einer Intranet-Startseite: Begrüßung, persönliche Funktionen, wichtige Links, Neuigkeiten, Ansprechpartner und die bisherigen echten Aufgaben-/Lernzahlen. Schnellzugriffe folgen den individuellen Bereichsrechten.

## Einmalige Datenbankerweiterung

Voraussetzung: Migrationen 001–007 sind installiert. Öffne [008_home_portal.sql](../backend/supabase/008_home_portal.sql), kopiere den vollständigen SQL-Inhalt und füge ihn in [Supabase → SQL Editor → New query](https://supabase.com/dashboard/project/ftcurcqduzrxsvkujfql/sql/new) ein. Klicke **Run**. Lade danach die Teamseite neu.

Die Migration kann erneut ausgeführt werden und löscht keine bestehenden Konten oder Lern-/Aufgabendaten. Es werden keine fiktiven Neuigkeiten, Links, Kontakte oder Profilangaben angelegt. Ohne 008 bleiben die bisherigen Funktionen nutzbar; die Startseite zeigt dem Admin einen Einrichtungshinweis.

## Startseite pflegen

1. **Meine Übersicht → Startseite bearbeiten → Eintrag hinzufügen** öffnen.
2. Wichtigen Link, Neuigkeit oder Ansprechpartner auswählen; Titel, Beschreibung und optional Zieladresse/Telefon ergänzen.
3. Studio und Leserrollen auswählen. Die Reihenfolge bestimmt die Position innerhalb der jeweiligen Kategorie.
4. Als Entwurf speichern oder **Auf der Startseite veröffentlichen** aktivieren.
5. Über **Mitarbeiteransicht** zur normalen Anzeige zurückkehren. Dies ist die Ansicht mit dem eigenen tatsächlichen Konto; es simuliert keine fremde Mitarbeiterrolle.

Die Zieladresse unterstützt `https://`, `mailto:` und `tel:`. Freitext wird als Text angezeigt, nicht als HTML ausgeführt. Externe Ziele öffnen separat. Inhalte lassen sich ausblenden; eine endgültige Löschfunktion oder ein Papierkorb mit Wiederherstellung wird hier noch nicht angeboten.

Admins verwalten Inhalte für alle Studios. In **Mitarbeiterzugänge → Nutzerprofil → Berechtigungen → Startseite gestalten** kann ein Admin ausgewählten Mitarbeitern das Bearbeiten und Veröffentlichen für deren zugeordnete Studios erlauben. Ein Startseitenbearbeiter kann keine globalen Inhalte und keine Inhalte anderer Studios verändern. Die eigene Übersicht muss zusätzlich freigegeben sein. Sperre, Bereichsentzug und Entzug des Bearbeiterrechts werden bei jeder Serverabfrage geprüft.

## Nutzerverwaltung wie eine Mitgliederverwaltung

Die Reiter **Alle Nutzer**, **Mitarbeiter**, **Studioleitungen**, **Admins** filtern die serverseitig paginierte Liste. Unter **Rollen & Rechte** erklären drei Karten die vorhandenen Grundrollen. Konten werden weiterhin einzeln oder über den vorhandenen CSV-/XLSX-Import eingeladen.

Klicke den Namen einer Person, um ihr Profil zu öffnen:

- **Informationen:** Name, Firmen-E-Mail, Studios, Anmeldung, Einladung, Mitarbeiter-ID und optionale berufliche Angaben. Position, geschäftliche Telefonnummer und Eintrittsdatum lassen sich durch Admins ergänzen. Rolle, Zuordnung und Sperre werden separat über **Zugang bearbeiten** gemeinsam gespeichert.
- **Aufgaben:** tatsächliche zugewiesene, offene, überfällige und erledigte Aufgaben.
- **Lernfortschritt:** zugewiesene Kurse, gelesene Lektionen, Quiz und gegebenenfalls Praxisnachweise.
- **Berechtigungen:** Bereichsfreigaben, Modulbearbeitung/-erstellung/-veröffentlichung und die neue Startseitenfreigabe.

Der Profilbutton unten in der Seitenleiste öffnet das eigene Profil. Normale Mitarbeiter sehen darüber nur ihre eigenen Stammdaten und können die Passwortfunktion aufrufen. Individuelle berufliche Angaben sind dem jeweiligen Mitarbeiter und der Geschäftsführung zugänglich; eine interne Telefonnummer wird dadurch nicht automatisch als Ansprechpartner veröffentlicht.

## Welche Rollen tatsächlich bestehen

- **Mitarbeiter:** eigene Aufgaben und zugewiesenes Lernen; standardmäßig Übersicht, Aufgaben, Kalender, Lernhub, Wissenshub, Chat und Feedback.
- **Studioleitung:** bestehende Verwaltungsrechte innerhalb der zugeordneten Studios; Bereichsrechte und Zusatzrechte gelten weiterhin.
- **Admin / Geschäftsleitung:** alle Studios, Nutzerverwaltung, Kursverwaltung und Controlling. Das eigene Administratorkonto kann sich nicht versehentlich herabstufen oder sperren.

Es werden keine nur optischen Rollen wie „Inhaber“, „Kursmanager“ oder „Nutzermanager“ eingeführt, denen die API dieselben Vollrechte geben würde. Feiner aufgeteilte Kursverwaltungsrollen, Gruppen-/Sammelzuweisung und eine Inhaberregel für endgültige Löschung sind spätere eigenständige Erweiterungen.

## Prüfen

Browserprüfungen verwenden simulierte Serverantworten. PostgreSQL/PGlite-Prüfungen installieren alle acht Migrationen zweimal und prüfen die tatsächlichen SQL-Berechtigungen. Sie ersetzen keinen Test gegen das gehostete Projekt. Für einen Praxistest nach Installation von 008: einen Entwurf und eine Veröffentlichung anlegen, ein Mitarbeiterprofil ergänzen und mit einem zweiten Konto die Studio-/Rollenfreigaben prüfen.

## Ergänzung: individuelle Funktionen

Mit Migration 009 werden Zusatzfunktionen unabhängig von Grundrollen einzeln verwaltet. Die bisherige Aussage, dass Nutzerverwaltung oder Controlling nur über die Adminrolle erreichbar sind, gilt dann nicht mehr: ausgewählte Mitarbeiter können genau diese Funktionen innerhalb ihrer Studios erhalten. Rollen- und Rechtevergabe sowie Adminzugänge bleiben administrativ. [Anleitung](FUNKTIONSRECHTE.md).
