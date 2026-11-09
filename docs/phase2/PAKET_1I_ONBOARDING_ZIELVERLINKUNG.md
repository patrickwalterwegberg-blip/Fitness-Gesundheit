# Paket 1I – Den angezeigten Onboardingplan öffnen

Stand: 09.11.2026. Grundlage: veröffentlichtes Paket 1H (`8a6bfa0`).

## Problem und Änderung

Die Startseiten-Zusammenfassung zeigt den ersten noch offenen persönlichen Onboardingplan. Sie übergab beim Öffnen aber keine Plan-ID. Die Detailansicht wählte deshalb den neuesten Plan der Serverantwort. War dieser bereits abgeschlossen, führte „Onboarding fortsetzen“ in einen anderen Plan als den auf der Karte angezeigten.

Kartenfläche und Schaltfläche übergeben jetzt ausdrücklich dieselbe dargestellte Plan-ID. Die ID wird über die Startseite und die vorhandene Zielnavigation bis in die persönliche Onboardingansicht weitergegeben. Es entsteht weder eine neue Zuweisung noch eine Statusänderung.

Fehlt ein ausdrücklich gewählter persönlicher Plan nach erfolgreicher Abfrage, erscheint ein verständlicher Hinweis. Ein anderer Plan wird nicht automatisch als Ersatz ausgewählt. Verfügbare eigene Pläne können bewusst aus der Liste gewählt werden; dadurch verschwindet der Hinweis. Das gilt auch nach einer Aktualisierung. Bei leerer Liste erscheint kein widersprüchlicher Erststart-Text. Lade- und Abfragefehler werden weiterhin getrennt dargestellt. Die Auswahlregeln der Leitungsansicht bleiben in diesem Paket unverändert.

## Prüfungen und Grenzen

- Zwei synthetische eigene Pläne aus unterschiedlichen Vorlagen: neuerer abgeschlossen, älterer offen. Die Kartenfläche am PC und „Onboarding fortsetzen“ am Handy müssen den älteren angezeigten Plan öffnen.
- Ziel zwischen Startseite und Detailabruf entzogen: weder ein anderer Plan noch dessen Schritte werden ungefragt als Ersatz geöffnet.
- Fehlendes Ziel bei leerer Antwort: Hinweis statt Erststart-Text.
- Ziel nach Aktualisierung entfernt: Hinweis und keine fremde Ersatzdetailansicht.
- Verfügbare eigene Alternative bewusst wählen; Hinweis endet.
- Bestehende Zuweisungs-, Fortschritts-, Kurs- und Einladungsabläufe als Regression prüfen.

Alle fünf neuen Fälle scheiterten nachvollziehbar am bisherigen Anwendungsstand. Mit der Korrektur bestanden alle 42 gezielten Kurs-, Onboarding-, Dashboard- und Einladungsfälle in 52,6 Sekunden. Build und Produktionssmoke der exakt übereinstimmenden Prüfkopie bestanden. Die unabhängige Quellabnahme fand keine blockierenden Befunde. Der vollständige GitHub-Lauf bleibt bis zur Übertragung und tatsächlichen Abnahme offen. Tests verwenden ausschließlich simulierte Backenddaten. Echte Zuweisung und Sichtbarkeit mit zwei Mitarbeiterzugängen im gehosteten Backend bleiben separat abzunehmen. Keine Datenbank-, SMTP- oder Rechteänderung.

Die Bestandsaufnahme fand zwei weitere, getrennt zu behandelnde Codebefunde: Ein ursprünglicher Kurs-Zieleinstieg wird bei einem späteren Neuladen erneut angewandt; außerdem kann eine neue Zuweisung bei einem anderen Leitungsfilter beziehungsweise auf einer Folgeseite außerhalb der aktuellen Liste liegen. Beide sind Folgepakete und nicht als behoben ausgegeben.

Manuell prüfen: Bei mehreren eigenen Plänen auf der Startseite den angezeigten Namen mit dem nach „Onboarding fortsetzen“ geöffneten Namen vergleichen. Bei zwischenzeitlich fehlendem Ziel muss ein Hinweis erscheinen; einen anderen verfügbaren Plan erst durch eigene Auswahl öffnen.

Rückweg: den isolierten Komponenten-/Test-/Dokumentationscommit zurücknehmen. Keine Datenrückmigration erforderlich.
