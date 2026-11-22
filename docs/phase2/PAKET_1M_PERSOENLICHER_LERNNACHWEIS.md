# Paket 1M – Persönlichen internen Lernnachweis öffnen und als PDF speichern

Stand: 22.11.2026. Ausgangsstand `3e572beaba1e402267d7584612aa300570bdc10f`; GitHub `main` abgeglichen. Nutzerbestätigung zur Anwendung von 015 liegt vor, gehostete Rollen-/Kontenabnahme bleibt offen. Der generative KI-Betrieb bleibt zurückgestellt.

## Ziel und Datenvertrag

Ein Mitarbeiter erhält zu einem vollständig abgeschlossenen eigenen Lernauftrag einen internen Nachweis mit Vorschau und Browserdruck beziehungsweise „Als PDF speichern“. Das Dokument zeigt eigenen Namen, Studio, aktuellen Kurstitel, dokumentierte Materialrevision oder „Nicht dokumentiert“, Zuweisungsreferenz, Lesestand, bestätigtes Wissen und gegebenenfalls die separat bestätigte Pflichtpraxis.

Ein gesamter Abschlusszeitpunkt wird bisher nicht zuverlässig gespeichert. `learning_progress.updated_at` ist dafür ungeeignet, weil spätere Lese- und Quizaktionen diesen Wert ändern. Deshalb trägt das Dokument einen serverseitigen **Nachweisstand**. Der vorhandene Praxiszeitpunkt wird separat angezeigt. Aktuelle Namen und Kursmetadaten werden nicht als historisch unveränderlich ausgegeben.

Die neue lesende Migration [016_learning_evidence.sql](../../backend/supabase/016_learning_evidence.sql) stellt `learning_evidence(p_assignment)` bereit. Sie verlangt bestehende Lernleserechte **und** eine eigene Zuweisung, auch bei Administratoren. So erhält insbesondere ein delegierter externer Prüfer keine zusätzlichen fremden Profildaten. Teamnachweise und Leitungs-Sammelexporte bleiben ein getrenntes Paket.

Der Server verlangt vollständigen Lesestand und bestätigtes Wissen. Bei verpflichtender Praxis müssen Bestätigung, Prüferreferenz und Zeitpunkt vorhanden sein. Alte externe Wissensnachweise ohne Online-Quizversuch bleiben zulässig; fehlende Materialrevisionen oder Quizpunkte werden nicht erfunden. Der RPC verändert keine Daten und liefert keine privaten Notizen, Antworten, E-Mail-Adressen oder vollständigen Ereignislisten.

## Bedienung und Druck

Im eigenen ausgewählten Kurs öffnet „Lernnachweis öffnen“ einen vorhandenen Teamhub-Dialog. Unvollständige Aufträge erzeugen keinen Nachweis. Nach erfolgreichem Serverabruf wird die Vorschau gezeigt; „Drucken / als PDF speichern“ prüft den Nachweis erneut beim Server. Ein zwischenzeitlich entzogener Zugang oder ein nicht mehr vollständiger Lernstand verhindert den neuen Druckauftrag. Alte Druckdaten werden bei Fehler oder Schließen verworfen.

Der Browserdruck verwendet einen eigenen Dokumentbereich im bestehenden Dokument und die vorhandenen Projektschriften. Nur dieser Nachweis gehört in die erzeugte Druckansicht; Navigation, andere Mitarbeiter, Aufgaben und Benachrichtigungen werden ausgeblendet. Kein Popup, externer PDF-Dienst oder neues KI-Modell. Schwarz-Gold, deutsche Du-Ansprache und die bestehenden Dialog-/Fokusregeln bleiben maßgeblich.

## Gezielte Abnahme

- Eigener vollständiger Auftrag ohne beziehungsweise mit erforderlicher Praxis: Nachweis mit korrekten Daten.
- Lesen, Wissen, Praxis oder notwendige Praxis-Metadaten fehlen: serverseitige Ablehnung.
- Fremde Zuweisung, fremdes Studio, deaktiviertes Konto, entzogenes Lernmodul, unbekannte ID, anonymer Aufruf: Ablehnung.
- Externer Altkurs ohne Material oder Quizversuch: kein erfundenes Kursdatum, keine erfundene Version oder Punktzahl.
- Druck erneuert den Nachweis; Fehler und Rechteentzug erzeugen keinen neuen Druckauftrag.
- Abbruch einer laufenden Abfrage: keine späten Daten oder Druckaktion; Fokus kehrt zurück.
- Sonderzeichen und HTML-ähnliche Namen bleiben Text. PDF enthält den eigenen Nachweis, keine sonstigen Appdaten.
- Schmale Mobilansicht, Tastatur und bestehende Kurse/Quiz/Onboarding als Regression.
- Migration zweimal anwenden, Daten unverändert; Rückweg entfernt ausschließlich den neuen RPC.

14 gezielte Datenbankfälle bestanden bei der Entwicklung, einschließlich des eigenen Admin-Auftrags. Die PDF-Browserprüfung verwendet den tatsächlichen Chromium-PDF-Export und `pdftotext` zum Inhaltsvergleich; der GitHub-Workflow installiert dafür ausdrücklich das Testwerkzeug `poppler-utils`. Die Anwendung bekommt keine PDF-Bibliothek oder externe Datenübertragung.

Die unabhängige Backend-Quellprüfung gab den Datenvertrag und die Zugriffsgrenzen frei. Im eingefrorenen Prüfstand bestanden alle **169 Datenbank-/Modelltests**, **13 Einladungsdiensttests**, **9 lokale Bot-Diensttests**, der **Build**, alle **13 neuen Browser-/PDF-Fälle**, die vollständige Regression mit **367 Browsertests (7,0 Minuten)** und der erweiterte **Produktionssmoke mit tatsächlichem PDF-Inhaltsvergleich**. Alle Netzaufrufe sind simuliert; kein Modell und kein Versand werden aktiviert. Nach Abschluss waren alle 183 Quell-/Test-/Konfigurationsdateien in Arbeitsrepo und Prüfkopie unverändert und hashgleich. Die unabhängige QA gab genau diesen Patch frei. Der GitHub-Veröffentlichungsnachweis folgt erst nach Übertragung.

Im mobilen Testaufbau wurde der Menüweg zunächst zu früh geprüft. Der Test führt jetzt bei der bekannten Handyansicht direkt den Menü-Klick mit automatischem Warten aus; ein fehlender Menüschritt und ungeeignete frühe Bereitschaftsprüfungen wurden im Test korrigiert. Der isolierte Handyfall bestand danach, anschließend alle 13 gezielten Fälle. Bei der Sichtprüfung wurde zusätzlich die freie A4-Fläche auf Weiß gesetzt, begrenzt auf den eigenen Druckauftrag. Die endgültige einseitige PDF und der 390-Pixel-Dialog wurden visuell geprüft; Umlaute, Nachweisstand, Praxiszeitpunkt und Referenz bleiben lesbar, fremde Appteile fehlen. Alle Prüfungen verwenden synthetische Konten und eine isolierte Datenbank beziehungsweise simulierte Serverantworten; echte Geräte und der gehostete Rollenstatus bleiben getrennte Abnahmen.

Eine zusätzliche unabhängige Mobilprobe nach der Gesamtreihe bestätigte bei 390 × 844 Pixeln die tatsächlichen Dialoggrenzen (x12/y12, 366 × 820), den 44 × 44 Pixel großen Schließbutton einschließlich Klicktreffer, die nach Dialogscroll erreichbare Druckaktion und die Fokusrückgabe. Keine Seitenfehler. Für diese Beurteilung wurde ein reines Viewportbild genutzt; das Ganzseitenbild positioniert den nativen Dialog beim Erfassen anders und war dafür ungeeignet. Prüfumgebung: Node 24.22.1, Chromium 155.0.8059.79; PDF-Inhalte zusätzlich mit `pdftotext` verglichen.

## Aktivierung, manuelle Abnahme und Rückweg

Nach Veröffentlichung die vollständige [SQL-Datei 016](https://github.com/patrickwalterwegberg-blip/Fitness-Gesundheit/blob/main/backend/supabase/016_learning_evidence.sql) über „Raw“ kopieren und im eigenen [Supabase SQL-Editor](https://supabase.com/dashboard/project/ftcurcqduzrxsvkujfql/sql/new) nach den vorhandenen Erweiterungen ausführen. GitHub Pages installiert die Funktion nicht automatisch. Das erfordert keine Einrichtung von SMTP oder eines KI-Modells.

Mit dem Mitarbeiter-Prüfkonto einen tatsächlich zugewiesenen Kurs vollständig bearbeiten, bei Pflichtpraxis die berechtigte zweite Person bestätigen lassen und den persönlichen Lernnachweis öffnen. Vorschau und gespeicherte PDF vergleichen, insbesondere Studio, Kurstitel, Nachweisstand und Pflichtpraxis. Auf echten iPhone-/Safari- und Android-/Chrome-Geräten den verfügbaren Druck-/PDF-Ablauf zusätzlich prüfen. Die Browser-Simulation bestätigt keinen echten Gerätedruck und keinen gehosteten Rollenstatus.

Der Quellcommit lässt sich isoliert zurücknehmen. [rollback/016_learning_evidence.sql](../../backend/supabase/rollback/016_learning_evidence.sql) entfernt nur die neue Lesefunktion, keine Lernaufträge, Fortschritte oder Ereignisse. Die Freigabekorrektur aus 015 bleibt bestehen. Inzwischen lokal gespeicherte PDFs werden durch späteren Rechteentzug nicht zurückgerufen; der Nachweis dokumentiert seinen ausgewiesenen Stand.

## Bestätigter Folge- und Betriebsstand

Commit `b5980aa8874d07c613357fe02920ff7479e860ac` wurde im [GitHub-Lauf 45032927991](https://github.com/patrickwalterwegberg-blip/Fitness-Gesundheit/actions/runs/45032927991) erfolgreich geprüft und veröffentlicht: Installation des PDF-Prüfwerkzeugs, 367 Browserfälle (5,6 Minuten), Produktionssmoke und Deployment bestanden; Veröffentlichung am 22.11.2026 um 14:34:37 UTC abgeschlossen.

Der Nutzer bestätigte danach mit „Erledigt“ die Anwendung von Migration 016. Dies ist als Nutzerbestätigung dokumentiert, nicht als unabhängiger gehosteter Funktionstest. Ein Ergebnis der praktischen Mitarbeiter-/PDF- und Geräteprüfung wurde noch nicht gemeldet.
