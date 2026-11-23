# Vorlage – Sicherungs- und Wiederherstellungsnachweis

**Status: NICHT DURCHGEFÜHRT.** Dieses öffentliche Dokument enthält keine echten Betriebsnachweise. Vor dem Ausfüllen in die geschützte Unternehmensablage kopieren. Keine Dumpdateien, Dateilisten, Zugangsdaten, Mitarbeiterkennungen oder ausgefüllten privaten Protokolle im öffentlichen Repository ablegen.

| Angabe | Tatsächlich einzutragen |
|---|---|
| Interne Vorgangskennung | Offen |
| Verantwortliche Rolle / Vertretung | Offen |
| Quelle und getrenntes Ziel intern eindeutig geprüft | Offen |
| Tarif, Datenbankversion und Sicherungsverfahren | Offen |
| Git-/Anwendungsstand und tatsächlich geprüfter Datenbankstand | Offen |
| Sicherungsbeginn/-ende und Bezugszeitpunkt, UTC | Offen |
| Datenbankumfang einschließlich Auth/privater Schemata | Offen |
| Storageumfang einschließlich alter Originale | Offen |
| Konsistenzverfahren / abgestimmte Schreibpause | Offen |
| Geschützte Ablage und Zugriffsschutz | Offen |
| Verschlüsselung und Wiederverfügbarkeit der Entschlüsselung geprüft | Offen – keine Schlüsselwerte eintragen |
| Geschütztes Manifest mit Größen und SHA-256 vorhanden | Offen – keine persönlichen Dateilisten hier einfügen |
| Aufbewahrung und Löschzuständigkeit | Offen |
| Gewünschter maximaler Datenverlust / Ausfallzeit | Offen |
| Restorebeginn/-ende und tatsächlich gemessene Dauer | Offen |
| Tatsächlich erreichbarer Datenstand | Offen |

## Isolation vor Wiederherstellung

- [ ] Quell- und Zielprojekt sind verschieden; das Quellprojekt wird nicht wiederhergestellt oder überschrieben.
- [ ] Ziel ist geschützt; Testanwendung nutzt die Zielkonfiguration und eigene Origin/Redirects.
- [ ] Unbeabsichtigte Mail-, Modell- und Integrationsaufrufe sowie automatische Jobs sind unterbunden.
- [ ] Kein öffentlicher Mitarbeiterzugang und keine öffentliche Registrierung im ungeprüften Restoreziel.

## Tatsächliche Ergebnisprüfung

- [ ] Datenbankstruktur, Tabellen, Rechte, Funktionen und benötigte Erweiterungen verglichen.
- [ ] Verwaltete Auth-Daten und stabile Benutzer-/Profil-/Studiozuordnungen geprüft.
- [ ] Exakte Vergleichszahlen und fehlende Verknüpfungen bewertet; Schätzwerte nicht als Beleg verwendet.
- [ ] Beide privaten Storagebereiche mit tatsächlichen Originalbytes wiederhergestellt.
- [ ] Datei- und Video-Prüfsummen mit dem geschützten Manifest verglichen.
- [ ] Berechtigter Dateidownload/Videoabruf funktioniert; unberechtigter Zugriff scheitert.
- [ ] Rollen, Funktionsrechte, Studiofilter und Privat-Aufgaben mit Prüfkonten getestet.
- [ ] Lesen, Quiz, Praxis, Onboarding und persönlicher Nachweis stimmen.
- [ ] Fehlende Originale und unvollständige Uploads korrekt erkannt, keine automatische Bereinigung.
- [ ] Kein unbeabsichtigter Versand oder Modellaufruf; Jobs kontrolliert bewertet.
- [ ] Wiederherstellungsdauer und Datenverlustgrenze tatsächlich gemessen.

## Abschluss

Ergebnis: **OFFEN – keine Freigabe.**

Festgestellte Abweichungen, Einschränkungen und nächste Maßnahmen: offen.

Bewertung und Freigabe durch verantwortliche Rolle mit Datum: offen.

Aufbewahrung beziehungsweise spätere Entfernung des isolierten Testziels: offen. Quelle und bisherige Sicherungen nicht automatisch löschen.
