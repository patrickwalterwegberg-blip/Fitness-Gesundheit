# Betriebsprüfung im Teamhub

Die Geschäftsleitung kann im Teamhub eine aktuelle, lesende Bestandsaufnahme abrufen. Sie ergänzt den [Sicherheitsbericht](SICHERHEIT_UND_DATENSCHUTZ_PRUEFUNG.md) und die [Abnahme mit echten Konten](ABNAHME_CHECKLISTE.md). Ergebnisse aus einer simulierten Browserprüfung sind keine tatsächlichen Betriebsnachweise.

## Einrichten und öffnen

1. Nach den vorhandenen Erweiterungen **001–012** die vollständige [014_operations_check.sql](../backend/supabase/014_operations_check.sql) im eigenen Supabase SQL Editor ausführen. Die Datei kann erneut ausgeführt werden. Sie legt nur die geschützte Prüffunktion an; keine Konten, Inhalte oder bestehenden Rollen werden geändert. Erweiterung 013 ist für diese Bestandsaufnahme optional und wird als eigener Einrichtungspunkt angezeigt.
2. Mit einem aktiven **Admin-/Geschäftsleitungszugang** den Teamhub neu laden.
3. **Meine Übersicht → Einrichtung prüfen → Betriebsprüfung öffnen** wählen. Derselbe Einstieg steht unter **Mitarbeiterzugänge** bereit.
4. **Betriebsprüfung aktualisieren** lädt die Angaben neu. Alte Ergebnisse werden bereits beim erneuten Abruf verworfen, auch wenn dieser fehlschlägt. Der Prüfzeitpunkt stammt vom Server und erscheint in Europe/Berlin.

Ein fehlendes Backend-Update zeigt die genaue Erweiterungsdatei an. Die Oberfläche installiert keine SQL-Datei automatisch. Es sind keine neuen privaten Schlüssel und keine zusätzliche Edge Function erforderlich. Der vorhandene Veröffentlichungsworkflow liefert die Oberfläche aus und installiert die Migration nicht.

## Was geprüft wird

- **Dateibereiche:** Vorhandensein und private Freigabe der Buckets `team-knowledge` und `course-videos`; Größenlimit. Ein fehlendes beziehungsweise über 50 MB liegendes Limit wird als Prüffall markiert. Ein kleineres Limit wird angezeigt und kann die tatsächliche Uploadgröße begrenzen.
- **Zehn zentrale Tabellen:** Vorhandensein, aktivierte Row Level Security und anonyme Leserechte. Auch nur für einzelne Spalten eingeräumte SELECT-Rechte werden erkannt. Ein RLS-Flag allein bestätigt nicht die korrekte Wirkung jeder einzelnen Policy; Rollen-/Studiotests bleiben nötig. Die Tabelle-Liste ist eine bewusst begrenzte Bestandsaufnahme, kein vollständiger Scan aller Erweiterungen und Datenbankschemata.
- **Privates Datenbankschema:** Ob die anonyme Rolle Schema-USAGE besitzt. Ob ein Schema in der Anbieter-API zusätzlich exponiert wurde, muss separat im Anbieter-Dashboard geprüft werden.
- **Kontozuordnung:** Aktive Mitarbeiter ohne Studio (Admins ausgenommen), Auth-Konten ohne Mitarbeiterprofil und Gruppen mit doppelten normalisierten E-Mails. Ausgabe ausschließlich als Zähler, ohne E-Mail-Adressen oder Nutzerkennungen.
- **Dateikonsistenz:** Unstimmige veröffentlichte Wissensversionen, unvollständige Uploads und Speicherobjekte ohne Hubeintrag. Zusätzlich werden als bereit markierte Datei-/Videoeinträge gezählt, deren Originalobjekt im Speicher fehlt. Geprüft werden die Metadaten, nicht die Nutzbarkeit oder Malwarefreiheit des Dateiinhalts.
- **Einrichtung:** Vorhandene Onboarding-Tabelle sowie KI-Status-/Limitfunktionen. Das bestätigt keine Modell-Secrets und keine echte KI-Antwort.
- **Hintergrundmeldungen:** Vorhandene `pg_cron`-Erweiterung und Anzahl aktiver Jobs mit dem vorgesehenen Namen `teamhub-due-notifications`. Job-Befehle und Zugangsdaten werden nicht gelesen oder zurückgegeben. Genau ein aktiver Job wird als technischer Sollzustand markiert; mehrere gleichnamige aktive Jobs sind zu prüfen. Tatsächliche Ausführungen, richtige Befehle und das Eintreffen einer Meldung sind separat abzunehmen.

Die Bestandsaufnahme versendet keine E-Mail, fordert kein KI-Modell an und führt keine Datenbereinigung aus. Ein Prüffall ist zuerst ein Hinweis: Laufende Uploads oder ältere Konten können einen nachvollziehbaren Grund haben. Keine Datensätze allein aufgrund eines Zählers löschen. Fehlende Originaldateien gegebenenfalls aus einer vorher geprüften Sicherung wiederherstellen.

## Zugriff und Datensparsamkeit

`admin_operations_status()` prüft die aktive Administratorrolle bei jedem Aufruf im Backend. Mitarbeiter, Studioleitungen, gesperrte Personen und delegierte Nutzerverwalter erhalten keinen Zugriff. Zusätzliche Nutzerverwaltungsrechte erweitern diese globale Betriebsprüfung nicht.

Zurückgegeben werden nur vorher festgelegte Tabellen-/Bucketnamen, boolesche technische Merkmale, Serverzeit und aggregierte Anzahlen. Keine Namen, E-Mails, Frage-/Antworttexte, Dokumentinhalte, Dateipfade, Policy-Ausdrücke, Cron-Befehle, Passwörter oder Secrets. Die Oberfläche speichert keinen dauerhaften Prüfverlauf. Schließen, Abmelden oder ein Rechtewechsel entfernen die Ansicht. Rechte-/Bereichsänderungen werden durch die bestehende Berechtigungsaktualisierung erfasst; neue Serveraufrufe unterliegen sofort der aktuellen Rollenprüfung.

## Was weiterhin extern belegt werden muss

Die Bestandsaufnahme erteilt keine pauschale Datenschutz- oder Sicherheitsfreigabe. Folgende Nachweise bleiben getrennt:

| Nachweis | Nächster konkreter Schritt |
|---|---|
| Unternehmensbezogene Datenschutzinformation | Rechtlichen Unternehmensnamen, Anschrift und Datenschutzkontakt bestätigen; den [Entwurf](DATENSCHUTZHINWEISE_ENTWURF.md) mit den tatsächlichen Angaben vervollständigen und prüfen. |
| Anbietervereinbarungen / Speicherregion | Supabase, Hosting, Mail- und gegebenenfalls Modellanbieter im Anbieter-Dashboard und den tatsächlichen Verträgen prüfen. |
| Aufbewahrung / Mitarbeiter-Austritt | Zuständigkeiten und Fristen für Profile, Aufgaben, Lernnachweise, Dateien, Chat und Feedback festlegen. Eine Sperre ist keine Löschung. |
| Backup / Wiederherstellung | Datenbank **und** Originaldateien sichern; in einem getrennten Testprojekt wiederherstellen und Anmeldung, Rechte, Dateidownload und Lernnachweise vergleichen. Produktive Daten dabei nicht überschreiben. |
| E-Mail / KI | Mit einem berechtigten echten Konto einen gezielten Versand beziehungsweise eine Frage testen. Eine angenommene Anfrage ist kein Zustellbeleg. |
| Geräte / gemeinsame Sitzungen | Kamera und Upload am echten Handy/Laptop prüfen; Abmelden und Gerätesperre an gemeinsam genutzten Geräten festlegen. |

Verträge, Sicherungsdateien, Passwörter und personenbezogene Testprotokolle gehören in eure geschützte interne Ablage. Das öffentliche Projekt-Repository ist dafür nicht vorgesehen. Hier nur nicht personenbezogene Zusammenfassungen dokumentieren.

## Lokale Prüfungen

Die Datenbanktests wenden Erweiterung 014 zweimal an, prüfen den Adminschutz, delegierte Rechte, Datenarmut, unveränderte Datensätze, bekannte Auffälligkeiten, öffentliche Buckets, deaktiviertes RLS und spaltenweise anonyme Leserechte. Browserprüfungen simulieren diese Ergebnisse sowie Fehler, fehlende Einrichtung, Rechteentzug und die Handyansicht. Der Produktions-Smoke-Test öffnet ebenfalls eine simulierte Betriebsprüfung. Ein tatsächliches produktives Ergebnis muss nach Installation im Hub abgerufen werden.


Prüfstand nach dieser Erweiterung: **217 Browserfälle, 141 SQL-/Modelltests, 13 Einladungsdiensttests und 9 Bot-Diensttests bestanden**, zusätzlich ein bestandener Produktionstest mit simulierter Betriebsprüfung. Diese Zahlen bestätigen die Implementierung und die simulierten Abläufe, keine produktive Installation der Erweiterung 014 oder echten Betriebsnachweise.
