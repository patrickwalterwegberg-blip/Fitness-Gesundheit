# Paket 1G – Dialoge am Handy schließen

Stand: 09.11.2026. Folgepaket nach der separat geprüften Kontoprüfung 1F (`7186d92`). Grundlage: [Apple HIG Designer](../../.agents/skills/apple-hig-designer/SKILL.md) mit den [Teamhub-Vorgaben](../../.agents/skills/apple-hig-designer/TEAMHUB.md).

## Ziel und Umfang

Der gemeinsame Dialog nutzt für seinen Schließbutton eine globale Größe von 31 × 31 CSS-Pixeln. Die gezielte CSS-Ergänzung vergrößert ausschließlich die Bedienfläche dieses Schließbuttons auf mindestens 44 × 44 CSS-Pixel. Das vorhandene Lucide-X sowie Farben, Schriften und Dialogfunktionen werden weiterverwendet.

Keine Übernahme der Beispielkomponenten oder Apple-Farbpalette. Kein Umbau von Navigation oder Formularen. Die Quellsicht meldete zusätzlich ein mögliches Zusammenspiel von Fehlerposition und klebender Kopfzeile; ohne Browsernachweis wird dies nicht als beobachteter Fehler ausgegeben oder in diesem Paket geändert.

## Prüfung

Der bestehende mobile E-Mail-Dialogtest wird für 360 × 740 und 390 × 844 ausgeführt. Er prüft tatsächliche Button-Abmessungen, Erreichbarkeit innerhalb des Bildschirms, horizontalen Überlauf, die erreichbare Versandaktion, Schließen über den äußeren Bereich der Schaltfläche und Fokus-Rückgabe. Reine Ansicht und Schließen versenden keine Mail.

Die CSS-Änderung wirkt in allen bestehenden ScheduleDialog-Dialogen. Daher folgen vollständige Browserregression und Produktionssmoke vor Veröffentlichung. Die Prüfungen sind Browser-Simulationen; echte iPhone-/Android-Geräte sind gesondert abzunehmen.

Beide neuen Größenprüfungen scheiterten am bisherigen CSS nachvollziehbar mit 44 erwartet / 31 erhalten. Nach der Korrektur bestanden alle 16 Kontoprüfungsfälle in 19,1 Sekunden, einschließlich beider Handygrößen. Die Screenshots wurden visuell geprüft; Farben, Schrift und Symbol entsprechen dem vorhandenen Design. Build und Produktionssmoke der exakt übereinstimmenden Prüfkopie bestanden. Unabhängige QA- und UX-Quellsichten gaben den Diff frei. Die vollständige GitHub-Browserregression und Veröffentlichung bleiben bis zum konkreten Lauf offen. Rückweg: den isolierten CSS-/Test-/Dokumentationscommit zurücknehmen. Keine Datenbankänderung oder Datenrückmigration.
