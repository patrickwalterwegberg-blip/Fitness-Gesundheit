# Assistent im Teamzugang

Der angemeldete Teamhub zeigt den Assistenten im Fuß der Navigation und als schwebenden Einstieg. Das bestehende Schwarz-Gold-Design bleibt erhalten. Der Zugang setzt den Bereich Wissenshub und die Funktionsfreigabe `knowledge.read` voraus. Es ist keine neue SQL-Erweiterung erforderlich.

Der Assistent bietet derzeit eine quellenbasierte Wissenssuche. Ein externes generatives KI-Modell ist nicht angebunden. Fragen werden in Suchbegriffe übersetzt und mit der bestehenden deutschen Volltextsuche `search_knowledge` gesucht. Antworten zeigen bis zu drei Originalauszüge mit einem Einstieg zur Quelle. Fehlt ein Treffer, wird das ausdrücklich angezeigt. Dateien ohne auslesbaren Text liefern höchstens ihre Beschreibung; Videos werden nicht transkribiert.

Alle Abfragen laufen mit der angemeldeten Supabase-Sitzung und den bestehenden Datenbankrechten. Nach der Suche werden die Dokumentfreigabe und die aktuell veröffentlichte Version erneut geprüft. Entwürfe, archivierte Dokumente und nicht veröffentlichte Versionen werden nicht als Antworten verwendet. Eine Aufgabenfrage zeigt bei freigegebenem Aufgabenbereich ausschließlich eigene Aufgaben: offene Aufgaben einschließlich zukünftiger Fälligkeiten, bis heute fällige Aufgaben oder strikt vor heute überfällige Aufgaben (Europe/Berlin). Für andere Zeiträume, erledigte Aufgaben und fremde Zuständigkeiten nennt der Assistent seinen begrenzten Umfang und verweist auf die entsprechenden Übersichten. Der Assistent verändert keine Daten.

Der Verlauf bleibt im Arbeitsspeicher der geöffneten Ansicht. Navigation, Abmeldung und eine Änderung der Bereichs- oder Funktionsfreigaben entfernen ihn. Fehlgeschlagene Suchen liefern keine Antwort; die Frage bleibt zur Wiederholung im Eingabefeld.

Grenzfälle für Suchlänge, Aufgabenfragen und Textauszüge werden mit `node --test tests/assistant-model.test.mjs` geprüft und gehören zu `npm run test:db`. Browserprüfungen: `npx playwright test tests/assistant.spec.js`. Der Produktions-Smoke-Test öffnet ebenfalls den Assistenten und prüft eine Suche ohne Treffer; Netzwerkzugriffe werden dabei simuliert.
