# Eigenständiger KI-Bot im Teamhub

Stand: 06.11.2026. Der Bot ist direkt in den Teamhub integriert. Seine eigene Supabase Edge Function `team-assistant` verbindet freigegebene Wissensinhalte mit einem konfigurierbaren Sprachmodell. Make wird nicht benötigt. Das bestehende Schwarz-Gold-Design und die beiden Einstiege in der Navigation und als schwebender Button bleiben erhalten.

**Für echte KI-Antworten müssen Datenbankerweiterung 013 und ein Modellzugang aktiviert sein.** Fehlt die Einrichtung, bleibt die bestehende Originalquellensuche nutzbar. Die Bereitstellung des Codes allein aktiviert kein kostenpflichtiges Modell. Ein tatsächlicher Modellaufruf mit dem produktiven Konto ist noch abzunehmen.

## Nutzung und einzelne Freischaltung

Der Einstieg setzt den Wissenshub und `knowledge.read` voraus. Die neue Zusatzfunktion **KI-Antworten zu freigegebenen Inhalten nutzen** (`assistant.ask`) wird Mitarbeitern gezielt unter **Mitarbeiterzugänge → Nutzerprofil → Berechtigungen** freigeschaltet. Die Grundrolle bleibt erhalten. Admins haben diese Funktion nach Installation von 013 bereits über ihre Grundrolle. Wird ausschließlich dieses Zusatzrecht entfernt, bleiben Wissenshub und Originalquellensuche erhalten; der Botverlauf wird bei der nächsten Rechteaktualisierung verworfen.

Mit Modellfreigabe stehen **KI-Antwort** und **Originalquellen suchen** zur Wahl. Der KI-Modus formuliert anhand der passenden veröffentlichten Textauszüge eine Antwort und zeigt die verwendeten Originalquellen. Die Prüfung wichtiger Aussagen anhand der Quellen bleibt nötig; gültige Quellenverweise sind kein Beweis, dass jede Formulierung des Modells richtig ist. Fehlt eine ausreichende Grundlage, wird das ausdrücklich angezeigt. Ohne passende Textquelle erfolgt kein Modellaufruf.

Die Originalquellensuche zeigt bis zu drei Auszüge beziehungsweise Beschreibungen mit Einstieg zur Quelle. Dateien ohne auslesbaren Text liefern dort ihre Beschreibung. PDFs, Office-Dateien, Bilder und Videos werden nicht automatisch ausgelesen, transkribiert oder an das Modell hochgeladen. Die KI-Antwort verwendet ausschließlich vorhandene Originaltexte, keine bloßen Dateibeschreibungen.

Eigene offene, bis heute fällige und überfällige Aufgaben bleiben direkt mit den bestehenden Aufgabenrechten abrufbar. Diese Abfragen gehen nicht an das Sprachmodell. Andere Zeiträume und Teamaufgaben verweisen weiterhin auf Kalender und Aufgabenübersicht. Der Bot führt keine fachlichen Schreibaktionen aus. Kurs- und Onboardinginhalte beantwortet er nur, soweit sie als zugängliche Texte im Wissenshub veröffentlicht sind; er liest nicht automatisch alle Kurslektionen.

## KI aktivieren

1. Nach den bestehenden Erweiterungen 001–012 die neue [013_team_assistant.sql](../backend/supabase/013_team_assistant.sql) vollständig im Supabase SQL Editor ausführen. Sie ergänzt das einzelne KI-Recht, liefert Berechtigungsversion 13 und legt ausschließlich eine private Tabelle für Anfragezähler an. Wiederholtes Ausführen erhält bestehende Mitarbeiterrechte und Zähler.
2. Den Workflow **KI-Bot bereitstellen** erfolgreich ausführen lassen. Änderungen an `backend/supabase/functions/team-assistant/` oder `_shared/` veröffentlichen den Dienst automatisch. Der bestehende GitHub-Secret `SUPABASE_ACCESS_TOKEN` dient nur der Bereitstellung. Der Workflow installiert keine SQL-Migration und richtet keinen Modellzugang ein.
3. Unter **Supabase → Edge Functions → Secrets** den gewünschten Modellzugang hinterlegen:

   | Secret | Wert |
   |---|---|
   | `TEAMHUB_AI_API_KEY` | Privater API-Schlüssel des Modellanbieters oder eigenen Modellservers |
   | `TEAMHUB_AI_MODEL` | Gewünschte Modellkennung; ohne Angabe `gpt-4.1-mini` |
   | `TEAMHUB_AI_BASE_URL` | OpenAI-kompatible HTTPS-Basisadresse; ohne Angabe `https://api.openai.com/v1` |
   | `TEAMHUB_AI_ENABLED` | Zur bewussten Aktivierung zuletzt auf `true` setzen; jeder andere Wert deaktiviert den Modellmodus |

   Ein eigener Modellserver kann über eine geschützte HTTPS-Adresse mit OpenAI-kompatibler Chat-Completions-API angeschlossen werden. Er muss JSON-Antworten (`response_format: json_object`), `max_completion_tokens`, `store:false` und die übrigen verwendeten Chat-Parameter unterstützen. Der Pfad `/chat/completions` wird an die Basisadresse angehängt. API-Aufrufe beim Anbieter können Kosten verursachen; dort ein passendes Projektbudget einrichten.

   **Modellschlüssel gehören ausschließlich in die geschützten Backend-Secrets**, nicht in `VITE_*`, Webseitenfelder, Chatnachrichten oder das öffentliche Repository. `TEAMHUB_SITE_URL` wird vom Bereitstellungsworkflow gesetzt. Der Dienst benötigt keinen Service-Role-Schlüssel: Alle Inhaltsabfragen verwenden den angemeldeten Mitarbeiter-Token und die bestehenden Datenbankregeln.

4. Als Admin den Assistenten neu öffnen. Erst bei erreichbarem Backend, Erweiterung 013, Modellkonfiguration und Funktionsfreigabe erscheint der KI-Modus. Gewünschten Mitarbeitern das neue Zusatzrecht geben. Mit einem echten Mitarbeiterkonto eine Frage zu einem veröffentlichten Wissensartikel testen und Originalquelle vergleichen. Ein nur für ein anderes Studio freigegebener Inhalt darf nicht als Quelle erscheinen.

Zum Abschalten `TEAMHUB_AI_ENABLED=false` setzen. Die Originalquellensuche und die eigenen Aufgaben bleiben nutzbar. Eine rein lokale Webseite ohne Backend führt keine KI-Anfragen aus.

## Daten, Rechte und Grenzen

Der Browser übermittelt die aktuelle Frage (höchstens 300 Zeichen) und bis zu drei frühere erfolgreiche Wissensfragen als Kontext. Er darf weder Quellen, Modellkennung noch fremde Nutzerkennungen für die Anfrage bestimmen. Der Server lädt bis zu drei passende veröffentlichte Originaltexte über die aktuelle Sitzung. Die Modellanfrage enthält ausschließlich diese Fragen, Quellentitel und passende Auszüge von ungefähr 700 Zeichen je Quelle. Antworten aus dem bisherigen Verlauf, Mitarbeiterprofile, Kalender, Chatnachrichten, Passwörter oder Anmeldetokens werden nicht automatisch mitgeschickt.

Nach der Modellausgabe werden Berechtigungen, veröffentlichte Versionen und Textauszüge erneut geprüft. Bei zwischenzeitlichen Änderungen wird die Antwort verworfen. Das Modell erhält keine Aktionswerkzeuge. JSON-Format, Abschlussstatus und Quellenverweise werden geprüft; Ausgabe erscheint als Klartext. Modellfehler führen zu keiner scheinbar erfolgreichen Antwort und keinem automatischen Neuversuch. Die Frage bleibt im Eingabefeld erhalten.

Der Verlauf bleibt im Arbeitsspeicher der geöffneten Ansicht. Navigation, Abmeldung, Leeren des Verlaufs und geänderte Bereichs-/Funktionsfreigaben entfernen ihn. Beim Modellanbieter gelten dessen Aufbewahrungsbedingungen; `store:false` fordert dort keine Speicherung als abrufbare Chat-Completion an und ersetzt keine Prüfung der Anbieterbedingungen.

## Anfragelimits und Betrieb

Die Datenbank reserviert vor jedem Modellaufruf atomar einen Platz: **eine Modellanfrage je Mitarbeiter in zehn Sekunden, höchstens 50 je Mitarbeiter und 500 insgesamt pro Kalendertag in Europe/Berlin**. Der gemeinsame Datenbank-Lock gilt über mehrere Edge-Instanzen. Fehlgeschlagene Modellaufrufe zählen ebenfalls; Anfragen ohne Texttreffer und Status-/Originalquellensuchen verbrauchen keinen Platz. Nach erreichtem Limit zeigt die Oberfläche eine Wartezeit und lässt weiterhin die Originalquellensuche zu. Die Ausgabe ist auf 1.200 Modell-Tokens begrenzt. Limits begrenzen Anfragen und Ausgabelänge, nicht einen garantierten Eurobetrag. Weitere Limits des gewählten Modellanbieters gelten zusätzlich.

Die private Zählertabelle enthält ausschließlich zufällige ID, Mitarbeiter-ID und Zeitpunkt. Datensätze älter als sieben Tage werden bei einer weiteren Reservierung entfernt. Fragen und Antworten werden dort nicht gespeichert. Der Dienst protokolliert Ereignis `teamhub_assistant`, Vorgangsnummer, Ergebniscode und HTTP-Status ohne Rohfehler, Fragen, Texte, Modellschlüssel oder Tokens. Eine fehlgeschlagene KI-Anfrage zeigt die Vorgangsnummer zur Fehlersuche. Die Entwicklungsumgebung hat keinen Zugriff auf private Modell- oder Supabase-Protokolle.

## Prüfung

`npm run test:assistant` prüft den Backend-Dienst mit simuliertem Modell: Rechte, Quellenauswahl, Kontingent, ungültige Antworten, Anbieterfehler und nachträglichen Rechteentzug. `npm run test:db` prüft die SQL-Regeln, Freischaltung und Zähler. `npx playwright test tests/assistant.spec.js tests/function-permissions.spec.js` prüft Oberfläche, Fehlermeldungen, Kontext, einzelne Freigaben und Mobilansicht. Der Produktions-Smoke-Test prüft beide Antwortmodi mit vollständig simuliertem Backend. Diese Prüfungen bestätigen weder einen produktiven Modellschlüssel noch die Qualität eines tatsächlich angeschlossenen Modells.
