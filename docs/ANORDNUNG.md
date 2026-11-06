# Persönliche Anordnung mit Drag & Drop

Im angemeldeten Hub können Mitarbeiter ihre sichtbaren Menüeinträge und Startseiten-Kacheln sortieren. Das bestehende Schwarz-Gold-Design und sämtliche Freigaben gelten weiter. Es ist keine SQL-Erweiterung nötig.

- **Menü anordnen** unten in der Seitenleiste öffnet alle freigegebenen Menüeinträge. Eine eigene Reihenfolge wird unter **Dein Menü** angezeigt und kann über die bisherigen Gruppen hinweg angeordnet werden. Der Assistent, das eigene Profil und die Abmeldung behalten ihren festen Einstieg.
- **Anordnung ändern** auf der Startseite sortiert die wichtigsten Funktionen sowie Links, Neuigkeiten und Ansprechpartner innerhalb ihrer Kategorie.
- Am Griff ziehen, auf dem Handy mit dem Finger. Alternativ die Pfeilbuttons verwenden oder den Griff fokussieren und die Pfeiltasten drücken.
- **Anordnung speichern** übernimmt die Vorschau. **Abbrechen** verwirft sie. **Standardreihenfolge** bereitet die ursprüngliche Reihenfolge vor; anschließend speichern.

Die Anordnung wird je Backend und Mitarbeiterkonto im Browser auf dem jeweiligen Gerät gespeichert. Sie synchronisiert sich zwischen geöffneten Tabs desselben Browsers, aber nicht zwischen unterschiedlichen Geräten oder Browsern. Browserdaten löschen setzt die Anordnung zurück. Gespeichert werden ausschließlich Eintragskennungen, keine Titel oder Inhalte. Scheitert das Speichern, bleibt der Entwurf offen und die bisherige Anordnung erhalten.

Diese persönliche Sortierung ändert keine gemeinsamen Startseiteneinträge und keine Berechtigungen. Für die gemeinsame Standardreihenfolge bleibt **Startseite bearbeiten → Eintrag bearbeiten → Reihenfolge** bestehen. Entzogene Freigaben entfernen die betreffenden Einträge auch aus einer bereits angepassten Navigation. Später freigegebene Einträge werden wieder anhand der gespeicherten Kennungen eingeordnet; neue Einträge werden angehängt.

Prüfungen: `npx playwright test tests/layout-order.spec.js`; `node --test tests/layout-order.test.mjs`. Die Browserprüfung nutzt auch echte Touch-Ereignisse über Chromium. Der Produktions-Smoke-Test prüft Speichern und Neuladen der Schnellzugriffe mit simulierten Serverantworten.
