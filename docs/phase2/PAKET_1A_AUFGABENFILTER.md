# Paket 1A – Persönliche Aufgaben aus den Zahlenkacheln öffnen

Stand: 08.11.2026. **Auftragsstand vor Umsetzung. Den aktuellen Umsetzungs- und Prüfstand beschreibt [PAKET_1A_ERGEBNIS.md](PAKET_1A_ERGEBNIS.md).** Grundlage: veröffentlichter Quellstand `200edc5`, akzeptierte Phase-1-Inventur und Gegenlesen durch die fünf Agentenrollen. Der tatsächliche gehostete Datenbankstand ist weiterhin offen.

## Ziel und Umfang

Ein Klick auf eine Zahlenkachel der Startseite öffnet die passende persönliche Aufgabenliste. Bei gleichem Datenstand umfasst deren Gesamtzahl dieselben Aufgaben wie die Kachel. Das gilt für Mitarbeiter, Studioleitung und Geschäftsleitung einschließlich zusätzlicher Einzelrechte.

Das Paket verändert ausschließlich die Weitergabe und Darstellung der Aufgabenauswahl und die dafür nötigen Leseabfragen. Zähler, Schreibfunktionen, RLS und Datenbankstruktur bleiben bestehen. Es werden keine Aufgaben angelegt, geändert, gelöscht oder automatisch bereinigt. Keine E-Mail-, Video-, Demo- oder KI-Änderungen.

## Bestehende Regeln beibehalten

Alle vier Kennzahlen beziehen sich auf die dem angemeldeten Konto zugewiesenen Aufgaben innerhalb der bestehenden Zugriffsrechte. Selbst erstellte, einer anderen Person zugewiesene Aufgaben gehören nicht dazu.

| Kachel | Persönliche Ergebnismenge |
|---|---|
| Offene Aufgaben | Status `open` oder `in_progress`, ohne Einschränkung des Fälligkeitsdatums |
| Überfällig | Nicht erledigt und Fälligkeitsdatum vor dem heutigen Berliner Datum |
| Heute fällig | Nicht erledigt und Fälligkeitsdatum gleich dem heutigen Berliner Datum |
| Erledigt | Status `done`, ohne Einschränkung des Fälligkeitsdatums |

Quelle: `backend/supabase/007_chat_feedback_access.sql`, Definition `my_team_dashboard`; zuvor `006_pilot_learning.sql`. Beide schließen bei „Heute fällig“ erledigte Aufgaben ausdrücklich aus. Die frühere gegenteilige Inventuraussage war falsch und ist in Phase 1 berichtigt. Eine Änderung dieser Zählregel ist nicht Teil des Pakets.

Eigene private Aufgaben sind entsprechend der bestehenden Regeln enthalten. Fremde private Aufgaben bleiben ausgeschlossen, auch bei Leitungsrechten. Zusätzliche Teamrechte erweitern diese persönliche Auswahl nicht. Fehlende Aufgabenfreigaben oder entzogene Zugriffe dürfen durch die Navigation nicht umgangen werden.

## Bedienvertrag

1. Die Kachel übergibt eine validierte Auswahl und das vom Dashboard verwendete Berliner Bezugsdatum. „Heute“ wird nicht aus der Gerätezeitzone abgeleitet.
2. Die Aufgabenansicht setzt alte widersprechende Filter, Seitennummer und offene Details zurück. Der Studiofilter startet bei allen freigegebenen Studios, entsprechend dem Zähler.
3. Oberhalb der Liste steht der persönliche Bereich mit aktivem Filter, bei Tagesfiltern einschließlich Bezugsdatum. Beispiel: „Meine Aufgaben · Heute fällig · 08.11.2026“.
4. „Alle meine Aufgaben anzeigen“ entfernt Status-, Datums- und Studioeinschränkungen innerhalb der persönlichen Auswahl. Der bisherige normale Menüzugang zur Aufgabenverwaltung bleibt erhalten und richtet sich weiterhin nach den vorhandenen Rechten.
5. Eine ausdrückliche Änderung des Statusfilters ersetzt den Kachelfilter einschließlich seiner Datumsbedingung. Die persönliche Auswahl bleibt sichtbar bestehen. Eine Studioauswahl schränkt die aktuelle persönliche Auswahl zusätzlich ein. Keine unsichtbaren Filter.
6. „Zurück zur Übersicht“ führt zur Startseite. Fokus und Scrollposition sollen die auslösende Kachel wieder erreichbar machen. Eine allgemeine Umstellung der Browsernavigation ist nicht Teil dieses Pakets.
7. Laden, keine Treffer und Fehler erscheinen als unterschiedliche Zustände. Fehler zeigen keine alte Erfolgsliste; ein erneuter Versuch ist möglich. Auch eine Kachel mit Zahl null bleibt sinnvoll bedienbar.

Beschriftung für die Tagesauswahl: „Du siehst deine heute fälligen, noch nicht erledigten Aufgaben.“ Leerer Zustand: „Du hast heute keine noch offenen Aufgaben.“ Filter bleiben durch Text und sichtbaren Fokus verständlich; Farbe allein reicht nicht. Schwarz-Gold-Design und deutsche Du-Ansprache bleiben erhalten.

## Technischer Änderungsplan

- `src/TeamPilot.jsx`: Die vier bisherigen identischen Aufrufe zur Aufgabenansicht um die jeweilige Auswahl und das Bezugsdatum ergänzen.
- `src/TeamWorkspace.jsx`: Navigation validieren, persönlichen Auswahlzustand und Filterrücksetzung führen sowie dessen Anzeige ergänzen.
- Leseabfrage: persönliche Zuweisung, Status und gegebenenfalls Datum serverseitig vor der Seitenauswahl anwenden. Nicht nur die acht Dashboard-Vorschaueinträge oder eine bereits geladene Seite filtern. Exakte Gesamtzahl und bestehende Seiteneinteilung verwenden.
- Gemeinsames Berlin-Datum für Zähler und Liste bewahren. Nach einem Tageswechsel muss eine Aktualisierung das Bezugsdatum und die betroffenen Daten zusammen erneuern; keine pauschale 24-Stunden-Rechnung.
- Vorhandene Absicherung gegen verspätete Antworten sowie Löschung privater Ansichtsstände bei Konto-/Rechtewechsel erhalten und auf den neuen Auswahlzustand ausdehnen.
- Tests mit synthetischen Aufgaben müssen Abfragefilter und Seitenauswahl tatsächlich auswerten. Ein Mock, der unabhängig von Filtern immer alle Aufgaben liefert, belegt die Anforderung nicht.

Keine Migration vorgesehen. Rückweg: ausschließlich den isolierten Frontend-Patch zurücknehmen und den vorherigen geprüften Stand erneut bereitstellen. Bereits vorhandene unveröffentlichte Label-/Videokorrekturen nicht in diesen Patch aufnehmen.

## Unabhängige Prüfmatrix für Phase 3

Grunddatensatz: neun eigene Aufgaben – je `open`, `in_progress` und `done` für gestern, heute und morgen nach Berliner Datum. Erwartung: **6 offen, 2 überfällig, 2 heute fällig, 3 erledigt**. Ergänzende Fälle verwenden getrennte synthetische Daten; erwartete Mengen werden je Fall ausdrücklich berechnet.

| Pflichtfall | Erwartung |
|---|---|
| Vier Kacheln | Genaue Aufgaben-IDs und Gesamtzahl stimmen mit der jeweiligen Zählregel überein; offen enthält auch `in_progress` |
| Rollen und Einzelrechte | Gleicher persönlicher Umfang für Mitarbeiter, Studioleitung, Geschäftsleitung und Mitarbeiter mit zusätzlichem Teamrecht |
| Studios und Privatheit | Eigene zulässige Aufgaben enthalten; fremde öffentliche und private Aufgaben ausgeschlossen; Studioeinschränkungen respektiert |
| Rechteänderung | Ohne Aufgabenfreigabe kein Zugriff; Abmeldung, inaktives Konto und entzogene Rechte entfernen bisherige private Ansichten |
| Vorheriger Zustand | Alter Status-/Studiofilter, Seite und Detailansicht verfälschen den Kachelwechsel nicht |
| Filter und Rücksetzen | Aktive Filter sichtbar; Status-/Studioänderung und „Alle meine Aufgaben anzeigen“ erfüllen den Bedienvertrag |
| Mehr als 50 Treffer | Serverfilter vor Paging; korrekte Gesamtzahl, stabile Reihenfolge, keine fehlenden oder doppelten Aufgaben |
| Datum und Zeitwechsel | Gestern/heute/morgen, Berliner Mitternacht sowie Sommer-/Winterzeit; abweichende Gerätezeitzone verändert den Bezug nicht |
| Null, Fehler, Aktualisierung | Ehrliche Leeranzeige, wiederholbare Fehlerbehandlung; keine veraltete Liste als Erfolg; Änderungen lassen sich neu laden |
| Schnelle Wechsel | Späte Antworten einer vorherigen Auswahl überschreiben die aktuelle Ansicht nicht |
| Tastatur und kleine Ansichten | Kacheln mit Tab, Enter und Leertaste bedienbar; sichtbarer Fokus, verständliche Bezeichnungen, mindestens 44 Pixel hohe zentrale Bedienflächen; Filter und Paging erreichbar |
| Regression | Bestehende Aufgabenverwaltung, erlaubte Teamansicht, Kalender und private Ansichten funktionieren weiterhin |

Entwicklung führt die passenden vorhandenen Prüfungen und den Build aus. Danach prüft QA unabhängig den festgehaltenen Stand; während Browserprüfungen keine gleichzeitigen Quelländerungen. Fehlgeschlagene oder blockierte Pflichtfälle verhindern die Paketabnahme. P2-Befunde werden dokumentiert und vom Lead bewertet.

## Ergebnis und manuelle Prüfung

**Derzeit kein Implementierungs- oder Testergebnis.** In Phase 2 wurden Quellen und Aufträge geprüft; keine neuen Tests ausgeführt, keine Datenbankänderung und keine Veröffentlichung vorgenommen.

Nach Umsetzung dokumentieren: Ziel → tatsächliche Änderung → ausgeführte Tests mit Version/Rolle/Umgebung → Ergebnis → offene manuelle Abnahmen. Synthetische IDs dürfen in Testnachweisen stehen; echte personenbezogene Daten bleiben außerhalb der Berichte.

Manuelle Abnahme bleibt separat: mit den beiden vorhandenen Prüfkonten Kachelzahl und Aufgabenliste vergleichen; auf einem echten iPhone mit Safari und Android mit Chrome Darstellung und Bedienung prüfen. Zugriffstrennung muss zusätzlich gegen die tatsächlich gehostete Datenbank belegt werden. Lokale Mocks und simulierte Bildschirmgrößen ersetzen diese Nachweise nicht. Echte E-Mail-Zustellung und allgemeine Go-live-Kriterien werden durch Paket 1A nicht bestätigt.
