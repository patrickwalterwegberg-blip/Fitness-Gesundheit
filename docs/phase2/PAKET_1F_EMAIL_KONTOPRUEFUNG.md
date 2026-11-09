# Paket 1F – E-Mail-Kontoprüfung bei langen Adressen

Stand: 09.11.2026. Grundlage: veröffentlichtes Paket 1E (`4be14e8`). Status: lokale Abnahme abgeschlossen, vollständiger GitHub-Lauf und Veröffentlichung folgen nach Übertragung.

## Ziel und Änderung

Die bestehende Kontoprüfung übergab die vollständige E-Mail-Adresse als Suchtext. Die Adresse darf bis 254 Zeichen lang sein, der Directory-RPC akzeptiert jedoch höchstens 200 Zeichen. Zusätzlich wurde nur die erste Seite mit höchstens 100 Treffern geprüft.

Die Kontoprüfung begrenzt jetzt ausschließlich den Suchpräfix auf 200 Unicode-Zeichen. Die vollständige Adresse aus dem frisch geprüften Datensatz bleibt sichtbar. Falls nötig liest sie weitere gefilterte Ergebnisseiten desselben bestehenden RPCs. Nur die exakte ausgewählte Mitarbeiter-ID wird akzeptiert; nach diesem Treffer endet die Suche. Fremde Datensätze werden nicht angezeigt oder gesammelt. Leere Suche, ungültige Antwort, fehlendes Ziel und Abruffehler geben den Versand nicht frei. Derselbe AbortController gilt für alle Seiten; Schließen oder Wechsel verwirft spätere Antworten.

Rechte pro Rolle und Studio werden weiterhin serverseitig eingeschränkt. Keine neue Datenbankfunktion, Migration, SMTP-Konfiguration oder Verwendung des schreibenden Login-Ziel-RPCs. Ein ausdrücklicher Versand verwendet weiterhin nur die geprüfte Mitarbeiter-ID; Lesen fordert keine Mail an.

## Abnahme

- Adresslängen 200, 201 und 254 bei eingehaltenem RPC-Suchlimit.
- Ziel hinter den ersten 100 Treffern; fremde IDs werden nicht übernommen.
- Fehlendes Ziel, Fehler auf einer späteren Seite und fehlgeschlagener Refresh.
- Schließen während einer verzögerten Folgeseite; kein verspätet geöffneter Dialog oder Versand.
- Bestehende aktive/gesperrte/studiolose Konten, Einzelrechte, Mobilansicht und ausdrückliche Versandaktion.
- Build vor artifactabhängigen Browserprüfungen; Produktionssmoke und vollständige Browserreihe als verpflichtende GitHub-Gates.

Am alten Komponentenstand schlugen die neuen Fälle für 254 Zeichen und einen Treffer nach der ersten Seite nachvollziehbar fehl (2/2). Mit der Korrektur bestanden 52 gezielte Browserfälle zu Kontoprüfung, Anmeldung und Einladungen in 58,7 Sekunden. Build und Produktionssmoke mit synthetischer Backend-URL waren erfolgreich. Die exakte Gleichheit von Anwendung, Tests, Skripten und Konfiguration zwischen Prüfkopie und Arbeitsstand wurde vor dem Commit erneut geprüft. Die Quellsicht des Security-Agenten und die erneute unabhängige QA fanden keine blockierenden Befunde. Der Produktionssmoke wurde vor dem Commit mit einem gesonderten Protokoll für die unveränderte Prüfkopie erneut erfolgreich ausgeführt. Alle Prüfungen verwenden ausschließlich synthetische Konten und simulierte Antworten. Eine erfolgreiche Kontoprüfung beweist keine echte E-Mail-Zustellung. Die [Postfachabnahme](../EMAIL_ABNAHME_SCHRITT_FUER_SCHRITT.md) und der SMTP-Status bleiben offen.

Rückweg: diesen isolierten Komponenten-/Test-/Dokumentationscommit zurücknehmen; keine Datenrückmigration erforderlich.
