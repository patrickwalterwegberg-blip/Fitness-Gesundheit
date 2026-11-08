# Paket 1A – Umsetzung und Prüfung

Stand: 08.11.2026. **Lokale Paketprüfung bestanden. Gehostete Konto-/Geräteabnahme und bestätigter Veröffentlichungsstatus bleiben getrennte Nachweise.**

## Ziel

Die vier Zahlenkacheln öffnen dieselben persönlichen Aufgaben, die sie zählen. Zählregeln bleiben erhalten: offen umfasst auch „In Bearbeitung“; überfällig und heute fällig schließen erledigte Aufgaben aus. Bezugsdatum ist das Berliner Serverdatum.

## Änderung

- Jede Kachel übergibt ihren Filter und das vom Dashboard gelieferte Datum.
- Die Aufgabenabfrage filtert persönliche Zuweisung, Status und Datum vor der Seiteneinteilung; auch Leitungskonten erhalten über Kacheln ausschließlich die eigene Auswahl.
- Aktive persönliche Auswahl ist sichtbar. Statuswechsel hebt den Tagesfilter auf, Studioauswahl schränkt weiter ein. „Alle meine Aufgaben anzeigen“ bleibt persönlich; der normale Menüzugang nutzt die bisherigen Rechte.
- Rückkehr zur Übersicht stellt die Ursprungskachel mit Fokus wieder her. Laden, leere Treffer und Lesefehler sind getrennte Zustände.
- Gegenprüfung ergänzte die Absicherung verspäteter Detail-/Kommentarantworten bei Konto-/Rechtewechsel. Bei Rückkehr in die Aufgabenansicht per Fokus wird gegen die bestehenden Serverrechte neu gelesen; ein nicht mehr zugängliches Detail wird geschlossen. Unveränderte ungespeicherte Formulareingaben bleiben erhalten.
- Schwarz-Gold-Design bleibt bestehen; zentrale Filteraktionen haben mindestens 44 Pixel Höhe.

Keine Datenbankmigration, Rechteerweiterung oder Datenbereinigung. Unveröffentlichte Video-/Labelkorrekturen sind ausgeschlossen.

## Tests und Ergebnis

Für die Browserprüfung wurde ein isolierter Stand aus dem veröffentlichten Commit `200edc5` und ausschließlich den Paketdateien unter `/tmp/teamhub-paket1a-run` angelegt. Damit werden frühere unveröffentlichte Korrekturen nicht versehentlich mitgeprüft oder veröffentlicht. Testkonten und Aufgaben sind vollständig synthetisch; Backendaufrufe werden abgefangen.

Bereits ausgeführt:

| Prüfung | Ergebnis |
|---|---|
| Datenbank- und Modelltests | 141 bestanden; lokale PGlite-/Modellprüfungen, keine Live-Supabase-Abnahme |
| Einladungs-/Zugriffsfunktion | 13 bestanden; lokale Funktionsprüfung, kein echtes Postfach |
| Assistentenfunktion | 9 bestanden; lokale Regression, keine Aktivierung eines KI-Modells |
| Neue Paket-Browsertests | 17 bestanden, synthetischer Backendstand |
| Bestehende Pilot-/Zugangsabläufe gezielt | 24 bestanden; Meldungsselektoren auf den betreffenden Dialog präzisiert |
| Unabhängige QA | 10 bestanden, einschließlich zwei Geometrieprüfungen nach dem mobilen Fokusfix; zwei vorherige Fehler im eigenen Testaufbau korrigiert |
| Gesamte Browserregression | 278 bestanden in 5,3 Minuten; ein Worker, Chromium, isolierter Paketstand |
| Build und Produktions-Smoke des isolierten Paketstands | Bestanden; synthetische öffentliche Testkonfiguration, sämtliche Backendaufrufe abgefangen |

Die unabhängige mobile Sichtprüfung bestätigte vor der Abnahme einen zusätzlichen Fehler: Die fokussierte Filterüberschrift wurde bei 360 und 390 Pixeln durch die feste Kopfleiste verdeckt. Geometrie und `elementFromPoint` belegten die Überlagerung. Ein zur gemessenen Kopfleistenhöhe passender Scrollabstand für Überschrift und Rückkehrkachel behebt den Fehler. Zwei dauerhafte QA-Regressionsfälle bestätigen Fokus, sichtbare Überschrift, Trefferprüfung mit `elementFromPoint` und bedienbares Rücksetzen bei 360 und 390 Pixeln. Der erste vollständige Lauf wurde nach 187 erfolgreichen Fällen kontrolliert unterbrochen; dieser Zwischenstand war keine vollständige Abnahme. Der erneute vollständige Lauf auf dem korrigierten Stand bestand mit 278 Tests.

Quellprüfungen durch Entwicklung, Security und UX ersetzen keine Browser- oder Geräteabnahme. Die anfängliche lokale Serverblockade `listen EPERM` wurde durch den freigegebenen Start des lokalen Testservers behoben.

## Manuell prüfen

Nach einer bestätigten Veröffentlichung:

1. Mit dem eigenen Prüfzugang nacheinander „Offene Aufgaben“, „Überfällig“, „Heute fällig“ und „Erledigte Aufgaben“ öffnen. Zahl und passende persönliche Liste bei unverändertem Bestand vergleichen.
2. Dasselbe mit dem Mitarbeiter-Prüfzugang durchführen. Private Aufgaben dürfen nur im eigenen Konto sichtbar sein. Kennwörter und persönliche Inhalte nicht in den Bericht kopieren.
3. Status und Studio ändern, „Alle meine Aufgaben anzeigen“ und „Zurück zur Übersicht“ ausprobieren. Die normale Aufgabenverwaltung muss weiter erreichbar sein.
4. Auf einem echten iPhone mit Safari und einem Android-Gerät mit Chrome Filter, Rückweg und Bedienelemente prüfen. Simulierte Bildschirmgrößen belegen diese echte Geräteprüfung nicht.

Gehostete Rollen-/Studio-/Privatheitstests, echte E-Mail-Zustellung, Datenschutz- und Wiederherstellungsnachweise bleiben gesonderte offene Go-live-Kriterien. Studioentzug wird bei der nächsten Aktualisierung/Fokus-Revalidierung erkannt; es gibt keine sofortige Sperrübertragung bei dauerhaft unverändert fokussierter Ansicht.

## Rückweg und nächste Pakete

Bei einem bestätigten Fehler ausschließlich den isolierten Frontend-Paketcommit zurücknehmen und den vorherigen geprüften Stand erneut bereitstellen. Es gibt keine Datenbankänderung zurückzurollen.

Als Nächstes folgen einzeln Paket 1B (direkte Pflegeaktionen in leeren Startseitenbereichen) und 1C (Assistentenbutton ohne Überlagerungen). Auftrag und Rollen stehen in [PAKET_1A_AUFGABENFILTER.md](PAKET_1A_AUFGABENFILTER.md) und [AGENTENTEAM.md](AGENTENTEAM.md).

## Nachtrag zur Veröffentlichung

Am 08.11.2026 wurde über GitHubs öffentliche Workflowseite der erfolgreiche Abschluss von „Teamhub veröffentlichen“ für Commit `8b6fb81` bestätigt: [Workflowlauf 42492803713](https://github.com/patrickwalterwegberg-blip/Fitness-Gesundheit/actions/runs/42492803713). Die strukturierte Webantwort meldet `COMPLETED` und `SUCCESS` für genau diesen Commit auf `main`. Damit ist der zuvor offene Workflowabschluss belegt; echte Konto-/Geräteabnahmen werden dadurch nicht ersetzt.
