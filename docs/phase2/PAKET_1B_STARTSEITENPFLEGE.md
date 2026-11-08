# Paket 1B – Direkte Pflege leerer Startseitenbereiche

Stand: 08.11.2026. Auftrag nach abgeschlossenem Paket 1A (`8b6fb81`). Status: lokale Paketprüfung abgeschlossen; gehostete Konten-/Geräteabnahme und bestätigter Veröffentlichungsstatus bleiben getrennte Nachweise.

## Ziel und Änderung

Leere Bereiche für Links, Neuigkeiten und Ansprechpartner erhalten je eine passende Hinzufügen-Aktion. Ein Klick öffnet das vorhandene Startseitenformular mit vorausgewählter Art; erst Speichern legt einen Eintrag an. Das Schwarz-Gold-Design, Sichtbarkeits- und Veröffentlichungsregeln bleiben bestehen.

Die Aktionen setzen sowohl `team_home_data.can_manage === true` als auch das vorhandene Einzelrecht `home.create` voraus. Reine Bearbeitungs-, Veröffentlichungs- oder Archivierungsrechte reichen nicht. Bestehende ausdrücklich freigegebene Anlegerechte gelten unabhängig von der Rollenbezeichnung. Kein Button bei fehlender Einrichtung, Laden oder Ladefehler.

Leser sehen „Für dich sind aktuell keine … freigegeben“ statt einer unbelegten Aussage über sämtliche Daten. Berechtigte Personen erhalten „Link hinzufügen“, „Neuigkeit hinzufügen“ oder „Ansprechpartner hinzufügen“. In der Bearbeitung wird das Fehlen von Einträgen zur Bearbeitung beschrieben.

Ein neues Formular verwendet die bisherigen Leserrollen und Studio-Voreinstellungen; Veröffentlichung ist zunächst aus. Abbrechen, Schließen und Escape verändern keine Daten. Nach erfolgreichem Speichern öffnet die Bearbeitungsansicht auch den neu angelegten Entwurf. Ein verweigerter Speichervorgang erhält die Eingaben.

## Test und Abnahme

- Jede der drei Aktionen öffnet genau ein korrekt vorbelegtes Formular; Titel kann direkt eingegeben werden.
- Leser und Konten ohne `home.create` erhalten keine Anlageaktion. Delegierte Anlegerechte bleiben auf freigegebene Studios begrenzt.
- Öffnen und alle Abbruchwege erzeugen keinen Speicheraufruf. Erst Speichern verwendet den vorhandenen RPC; neue Einträge bleiben ohne Auswahl der Veröffentlichung Entwürfe.
- Speichern, veröffentlichte Sichtbarkeit und Fehlerpfade funktionieren über den vorhandenen Ablauf. Bestehende Einträge verhindern nur die Leeraktion ihres eigenen Bereichs.
- Laden, fehlende Einrichtung und Lesefehler bieten keine scheinbar verwendbare Anlageaktion. Mobilansicht und Tastaturbedienung bleiben erreichbar.

Unabhängige QA, vorhandene Startseiten-/Rollenregression, Build und Produktions-Smoke prüfen den isolierten Paketstand. Echte Geräte und gehostete Konto-/Rechteabnahme bleiben getrennt. Keine Datenbankmigration, automatische Datenbereinigung oder Rechteerweiterung; Rückweg ist der isolierte Frontend-Paketcommit.

## Ergebnis und manuelle Prüfung

| Prüfung | Stand |
|---|---|
| Neue Pflegeaktionsfälle | 13 bestanden |
| Bestehende Startseiten-/Rollenabläufe | 11 bestanden; zusammen 24 gezielte Fälle |
| Unabhängige QA | 3 bestanden: Server-/Einzelrechtgrenze, ausdrückliche Veröffentlichung, Eingabeerhalt bei abgelehnter laufender Speicherung |
| Build und Produktions-Smoke | Bestanden; ausschließlich simulierte Backendaufrufe und synthetische öffentliche Testkonfiguration |
| Vollständige Browserregression | 294 bestanden in 5,9 Minuten; unabhängige QA, ein Chromium-Worker |

Der erste gezielte Lauf fand zwei Fokusfehler beim Formularabbruch. Das Formular merkt sich jetzt den Auslöser und stellt dessen Fokus nach Schließen wieder her; Escape wird kontrolliert behandelt und bleibt während des Speicherns gesperrt. Alle 24 gezielten Fälle bestanden danach. Die unabhängigen mobilen Fälle prüfen zusätzlich Titel-Fokus, Dialoggrenzen und fehlenden horizontalen Überlauf bei 360/390 Pixeln.

Quellstand für die isolierte Prüfung: auf GitHub übertragener Paket-1A-Commit `8b6fb81` plus ausschließlich `TeamHome.jsx`, `team-home.css` sowie die neuen Pakettests und der erweiterte Produktions-Smoke unter `/tmp/teamhub-paket1b-run`. Vorbereitete Video-/Labelkorrekturen sind nicht Teil dieses Pakets. Security hat die Zugriffsbedingungen unabhängig im Quellcode geprüft; eine Live-RLS-Abnahme ist damit nicht belegt. Der finale Produktions-Smoke bestätigt zusätzlich die direkte Kontaktanlage bei 360 Pixeln, den Titelfokus, die Dialogbreite und erfolgreich geladene DM-Sans-/Manrope-Schriftarten im kompilierten Artefakt.

Der Abschluss der automatischen GitHub-Veröffentlichung kann aus dieser Umgebung nicht per API bestätigt werden (Netzwerkzugriff auf die GitHub-Status-API gesperrt). Git-Übertragung, bestätigtes Deployment und echte Kontoabnahme bleiben getrennt.

Nach Veröffentlichung mit einem berechtigten Prüfzugang die drei leeren Bereiche öffnen, je ein Formular abbrechen und anschließend einen ausdrücklich gewählten Prüfeintrag als Entwurf speichern. Mit dem Mitarbeiterkonto ohne Anlegerecht dürfen die Buttons nicht erscheinen. Keine echten persönlichen Informationen für Testeinträge verwenden.

## Nachtrag zur Veröffentlichung

Am 08.11.2026 wurde über GitHubs öffentliche Workflowseite der erfolgreiche Abschluss von „Teamhub veröffentlichen“ für Commit `86c6c83` bestätigt: [Workflowlauf 42494408480](https://github.com/patrickwalterwegberg-blip/Fitness-Gesundheit/actions/runs/42494408480). Die strukturierte Webantwort meldet `COMPLETED` und `SUCCESS` für genau diesen Commit auf `main`. Damit ist der zuvor offene Workflowabschluss belegt; echte Konto-/Geräteabnahmen werden dadurch nicht ersetzt.
