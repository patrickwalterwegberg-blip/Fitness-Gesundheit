# Phase 2 – Agententeam und Abnahmekriterien

Stand: 08.11.2026. Grundlage ist die vom Nutzer akzeptierte Phase-1-Inventur zum veröffentlichten Stand `200edc5`. Der Hub befindet sich laut Nutzer in einem gemeinsamen Testbetrieb mit zwei Prüfzugängen. Eine getrennte Live-Umgebung und tatsächliche Rollen-/Postfach-/Geräteabnahmen sind noch offen.

Diese Phase legt die Zusammenarbeit fest. Sie ändert keine Anwendung, Datenbank oder Veröffentlichung. Bereits vorhandene, unveröffentlichte Label-/Videokorrekturen bleiben ein getrenntes Arbeitspaket.

## Gemeinsamer Arbeitsvertrag

- Der Lead-Architekt hält Prioritäten, Schnittstellen und Paketgrenzen zusammen und bewertet die Ergebnisse.
- Pro Umsetzungspaket werden Ziel, Änderung, Tests, Ergebnis und manuelle Abnahme dokumentiert. Jedes Paket hat einen klaren Umfang und einen nachvollziehbaren Rückweg.
- Die fünf Rollen bearbeiten jetzt nur ihre Aufträge und Abnahmekriterien. Implementierung und Testausführung folgen paketweise in Phase 3.
- Quellcode und Testdaten werden von gehosteten Daten und echter Geräte-/Postfachabnahme getrennt. Ungeprüfte Punkte bleiben ausdrücklich offen.
- Keine Zugangsdaten oder personenbezogenen Daten in Berichte kopieren. Vorhandene Konfiguration wird über sichere Umgebungsvariablen verwaltet.
- Der generative KI-Modellbetrieb bleibt zurückgestellt. Es werden keine echten Nachrichten versendet und keine Daten eigenständig bereinigt.
- Während Browsertests läuft keine parallele Änderung an ihren Anwendungssourcen. Der unabhängige QA-Agent bewertet die Änderung getrennt vom implementierenden Agenten.
- Zusätzliche Agenten oder Unteragenten werden nur bei einem konkreten Bedarf durch den Lead eingeplant. Die erste Besetzung bleibt bei diesen fünf Rollen.

## 1. Produkt-Agent

**Aufgabe:** Nutzerabläufe und fachliche Regeln verständlich festlegen, Prioritäten und offene Entscheidungen führen.

**Zuständigkeit:** Mitarbeiter, Studioleitung und Geschäftsleitung; Definition von Kennzahlen und Zuständigkeiten; Auswahl benötigter Zusatzmodule vor einem Echtdatenstart.

**Eingaben:** Phase-1-Inventur, Nutzerangaben und Beobachtungen, Rechtekatalog, bestehende Abläufe und vereinbarte Abschlusskriterien.

**Ausgaben:** Kurzer Paketauftrag mit Nutzen, Umfang, ausgeschlossenen Änderungen, fachlichen Akzeptanzfällen und maximal drei notwendigen Nutzerfragen.

**Definition of Done:** Für jede Rolle ist der gewünschte Ablauf beschrieben; Zählregeln und Begriffe sind eindeutig; Kachelzahl und gefilterte Gesamtmenge umfassen bei gleichem Datenstand dieselben Aufgaben; Entscheidungen sind bestätigt oder ausdrücklich offen; Demo und gemeinsame Daten werden unterschieden; keine unbelegten Fertigmeldungen.

## 2. Full-Stack-Agent

**Aufgabe:** Die freigegebene Fachanforderung in einen kleinen, überprüfbaren technischen Änderungsumfang übersetzen und später umsetzen.

**Zuständigkeit nach Paket:** Startseite; Aufgaben/Kalender; Wissen/Kurse; Onboarding; Chat/Feedback; Rollen/Einladungen. Es wird jeweils nur der benötigte Modulauftrag aktiviert.

**Eingaben:** Produktauftrag, Architektur und Quellen, bestehende Schnittstellen, Rechtekatalog, QA-Abnahmefälle und Security-Randbedingungen.

**Ausgaben:** Änderungsplan und später klar begrenzter Patch, gegebenenfalls versionierte Migration mit Rückweg, technische Prüfung und Übergabe an QA.

**Definition of Done:** Verhalten erfüllt den Produktauftrag; Rechte werden nicht erweitert; vorhandene Daten und Versionen bleiben erhalten; Fehlersituationen sind verständlich; notwendige Tests und Build bestehen; Dokumentation und Rückweg passen zum tatsächlichen Patch. Bei reinem UI-Paket wird keine unnötige Migration eingeführt.

## 3. Unabhängiger QA-/Test-Agent – Teamhub-Prüfer

**Aufgabe:** Erwartetes Verhalten unabhängig vom Entwickler prüfen und reproduzierbare Abweichungen melden.

**Zuständigkeit:** Browserabläufe, Regressionsprüfung, Rollen-/Studiofälle, Formulare und Popups, Datenerhalt, Tastaturbedienung und mobile Darstellung. Echte Geräte werden über eine geführte Nutzerabnahme ergänzt.

**Eingaben:** Produktauftrag, freier Teststand, Änderungen, bestehende Tests und bekannte Einschränkungen.

**Ausgaben:** Testmatrix und später Testergebnisse mit Stand, Rolle, Umgebung und Nachweis; Fehlermeldungen mit Auslöser, Erwartung, tatsächlichem Ergebnis und Datei/Zeile; separate Checkliste für echte iPhone-/Android-/Postfachprüfungen.

**Definition of Done:** Jeder Akzeptanzfall hat Ergebnis oder klaren Blocker; fehlgeschlagene oder blockierte Pflichtfälle verhindern die Paketabnahme; bestätigte P0/P1-Abweichungen sind gemeldet; P2-Befunde bleiben sichtbar und werden vom Lead bewertet; Testdaten und echte Daten sind getrennt; Viewport-Simulation wird nicht als echter Gerätetest ausgegeben. QA meldet keinen Eigenpatch als unabhängig geprüft, sondern lässt Korrekturen vom Entwickler beziehungsweise Lead umsetzen.

## 4. Security-/Datenschutz-Agent

**Aufgabe:** Technische Zugriffsgrenzen und erforderliche Betriebs-/Datenschutznachweise beurteilen.

**Zuständigkeit:** Supabase-RLS, Rolle × Studio × Funktion, private Inhalte, Uploadschutz, sichere Konfiguration, Anbieter-/Datenschutzunterlagen, Lösch- und Sicherungskonzept sowie Wiederherstellungsnachweis.

**Eingaben:** Paketauftrag, SQL und Funktionen, Rechtekatalog, Upload-/Authentifizierungsabläufe und ausdrücklich bereitgestellte Metadaten/Betriebsnachweise.

**Ausgaben:** Konkrete technische Befunde und notwendige Nachweise mit Beleg und Schweregrad; Empfehlung für Sicherheits-/Datenschutzabnahme; gezielte Prüfaufträge an Nutzer oder Betreiber, ohne Geheimnisse anzufordern.

**Definition of Done:** Relevante Zugriffsgrenzen sind auf Quellcode-/Testebene bewertet; fehlende Live-Nachweise bleiben offen; keine Freigabe allein aufgrund ausgeblendeter Buttons; personenbezogene Informationen werden minimiert; fachliche oder rechtliche Bestätigungen werden nicht erfunden. Für Go-live sind gehostete Rollenprüfung, echte Zustellung und erfolgreicher Restore gesondert nachzuweisen.

## 5. UX-Agent

**Aufgabe:** Verständliche und konsistente Bedienung im bestehenden Schwarz-Gold-Design festlegen.

**Zuständigkeit:** Leer-, Lade-, Fehler- und Erfolgszustände; mobile Abstände und sichere Klickflächen; Anordnung, Tastatur, Fokus und Barrierefreiheit; deutsche Beschriftungen mit „du“.

**Eingaben:** Nutzerabläufe, vorhandene Oberfläche, Phase-1-Browserbefunde, Rechte und Paketumfang.

**Ausgaben:** Konkrete Zustands-/Interaktionsbeschreibung mit Beschriftungen, Fokusregeln und Bildschirmkriterien; später gezielte Sichtprüfung des umgesetzten Pakets.

**Definition of Done:** Erlaubte nächste Schritte sind sichtbar; nicht erlaubte Aktionen werden nicht angeboten; Dialoge sind bedienbar; interaktive Flächen überlagern sich nicht; Wortwahl und Darstellung bleiben konsistent. Echte mobile Browser und Bedienhilfen bleiben als gesonderte Abnahme erkennbar.

## Paketabnahme

1. Produkt und UX beschreiben das erwartete Verhalten.
2. Entwicklung plant Schnittstellen und Rückweg; Security prüft die relevanten Zugriffsgrenzen.
3. In Phase 3 wird genau dieses Paket umgesetzt.
4. QA prüft unabhängig. Bestätigte Fehler gehen an Entwicklung zurück.
5. Der Lead dokumentiert Ziel → Änderung → Test → Ergebnis → manuelle Prüfung und bewertet die Paketabnahme. Offene Pflichtnachweise werden nicht durch bestandene lokale Tests ersetzt.

## Zuerst vorbereitete Startseitenpakete

- **1A – Zahlenkacheln:** Passenden persönlichen Aufgabenfilter öffnen und die belegten Zählregeln beibehalten. Umfang und Prüfmatrix stehen in [PAKET_1A_AUFGABENFILTER.md](PAKET_1A_AUFGABENFILTER.md).
- **1B – Leere Inhaltsbereiche:** Direkte passende Pflegeaktionen für berechtigte Personen, verständliche Leertexte für Leser.
- **1C – Mobile Klickflächen:** Assistentenbutton so platzieren, dass andere Inhalte erreichbar bleiben; echte Geräteprüfung vorbereiten.

Diese drei Pakete werden nacheinander behandelt. CRM/Marketing/Lager, E-Mail-Einrichtung, Datenbereinigung und die unveröffentlichten Videokorrekturen werden damit nicht nebenbei umgesetzt.
