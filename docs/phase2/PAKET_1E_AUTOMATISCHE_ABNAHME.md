# Paket 1E – Browserprüfungen vor jeder Veröffentlichung

Stand: 08.11.2026. Grundlage: erfolgreich veröffentlichtes Paket 1D (`317aa84`), 328 bestehende Browserfälle und der offene Phase-1-Befund P1-09. Status: Workflow-Quellprüfung durch unabhängige QA und Security freigegeben; lokale Prüfungen siehe unten. Der GitHub-Lauf des übertragenen Commits wird anschließend gesondert geprüft.

## Ziel und Änderung

GitHub Pages darf erst veröffentlicht werden, wenn zusätzlich zu Datenbank-/Dienstprüfungen sämtliche Browserfälle und der Test der kompilierten Anwendung erfolgreich sind. Bisher wurden diese Prüfungen manuell vor der Übertragung ausgeführt, jedoch nicht durch die automatische Veröffentlichung erzwungen.

Der bestehende Buildjob installiert das zur installierten Playwright-Version gehörende Chromium über die offizielle Playwright-CLI. `chromium.executablePath()` liefert dessen Pfad für `CHROMIUM_PATH` im jobweiten `GITHUB_ENV`. Damit verwenden auch die beiden Videotestdateien und der Produktions-Smoke denselben verfügbaren Browser.

Die vollständige Browserreihe läuft ohne eingeschränkten Dateifilter und ohne Fehlerunterdrückung. Nach dem Build wird das kompilierte Artefakt geprüft. Der Smoke erhält dieselbe öffentliche Backend-URL wie der Build; der Publishable Key bleibt am Buildstep. Erst danach folgen Pages-Konfiguration, Artefaktübergabe und der abhängige Deployjob. Ein fehlgeschlagener Test verhindert die Veröffentlichung des neuen Stands.

Keine Änderung der Anwendung, Rollen, Datenbank, SMTP-Konfiguration, Auth-Endpunkte oder des Modellbetriebs. Keine zusätzlichen Geheimnisse oder Berechtigungen und kein automatischer E-Mail-Versand. Test-Screenshots werden nicht als zusätzliche öffentliche Artefakte hochgeladen.

## Prüfungen

- YAML-Struktur und Schrittreihenfolge prüfen; bestehende Konfiguration unverändert erhalten.
- Browserpfad gilt auch für abweichende Video-Launchoptionen und den separaten Produktions-Smoke.
- Lokale Auth-/Mailregression mit explizitem `CI=true` und Browserpfad; eigener strikter Testserver statt Wiederverwendung.
- Build und Smoke mit einer synthetischen Backend-URL, die vom Standard abweicht. Alle Backendaufrufe bleiben simuliert.
- Unabhängige QA-/Security-Quellsicht und abschließend der tatsächliche GitHub-Workflow für genau den übertragenen Commit: Browser- und Smoke-Schritt erfolgreich vor Upload/Deploy.

Keine neuen Tests, die lediglich YAML-Zeilen nachbilden. Der laufende GitHub-Job liefert den Integrationsnachweis.

## Mailprüfung und offene Grenze

Einladung, Anmeldelink und Passwort-Reset sind im Code und in simulierten Tests prüfbar. Echte Zustellung benötigt weiterhin die private Supabase-Auth-/SMTP-Konfiguration und ein bewusst verwendetes Prüfpostfach. Eine Frage nach dem eingerichteten SMTP-Modus ist offen; Passwörter und Schlüssel werden nicht angefordert.

Die unabhängige Auth-Quellsicht fand keinen allgemeinen Versandblocker. Ein begrenzter Randfall bleibt separat dokumentiert: Die Kontoprüfung übergibt derzeit vollständige E-Mail-Adressen an eine auf 200 Zeichen begrenzte Suche; erlaubte Adressen bis 254 Zeichen können deshalb dort scheitern. Das ist kein Beleg für die bisher ausgebliebene Mail. Eine absolute Dokumentationsaussage zur Kontoneutralität wird präzisiert; die öffentlichen Auth-Endpunkte werden nicht verändert.

## Ergebnis und manuelle Prüfung

45 gezielte Anmelde-/Einladungs-/Mail-Browserfälle mit `CI=true` und lokalem Chromium bestanden (51,8 Sekunden). Die Prüfkopie stimmt in Anwendung, Skripten, Tests und Konfiguration exakt mit `317aa84` überein. YAML-Struktur und Gate-Reihenfolge erfolgreich geprüft; bestehende Berechtigungen, Trigger, Buildkonfiguration und Deployjob unverändert. Der Build und die Produktionsprüfung mit einer abweichenden synthetischen Backend-URL waren erfolgreich; sämtliche Netzwerkanfragen wurden simuliert. Die unabhängigen Quellenprüfungen fanden keine blockierenden Befunde. Nach Übertragung ist der konkrete Lauf unter [GitHub Actions](https://github.com/patrickwalterwegberg-blip/Fitness-Gesundheit/actions/workflows/pages.yml) anhand der Commitkennung abzunehmen. Dort kann die Geschäftsführung die nun verpflichtenden Browser-/Produktionsprüfungen sehen. Echte Geräte-, Rollen-, SMTP- und Postfachabnahmen bleiben eigene Nachweise. [Schrittweise E-Mail-Abnahme](../EMAIL_ABNAHME_SCHRITT_FUER_SCHRITT.md).

Rückweg: den isolierten Workflow-/Dokumentationscommit zurücknehmen. Ein fehlgeschlagener neuer Build darf kein Pages-Artefakt ausliefern; das bisher bereitgestellte Portal bleibt bis zu einer erfolgreichen Bereitstellung bestehen.
