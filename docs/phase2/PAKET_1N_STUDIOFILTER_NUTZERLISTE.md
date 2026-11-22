# Paket 1N – Studiofilter der Mitarbeiterliste absichern

Stand: 22.11.2026. Lokaler Ausgangsstand `b5980aa8874d07c613357fe02920ff7479e860ac`. Der erneute GitHub-Abgleich konnte nicht ausgeführt werden: Die automatische Freigabeprüfung für den Netzwerkbefehl scheiterte wegen eines Nutzungslimits. Das ist keine Sicherheitsbewertung des Befehls. Aktueller Remote-Stand und Veröffentlichung dieses Pakets sind daher offen.

## Ziel und bestätigter Befund

Eine Person mit delegiertem `users.view` sieht Mitarbeiter ihrer eigenen Studios. Hat ein bereits sichtbarer Kollege auch eine Zuordnung zu einem fremden Studio, nahm `admin_team_directory` jedoch diesen fremden `p_studio`-Filter an. Ein passendes Ergebnis beziehungsweise die Trefferzahl verriet damit eine zusätzliche, außerhalb der eigenen Freigabe liegende Studiozuordnung. Die zurückgegebene Liste der Studio-IDs selbst war bereits eingeschränkt.

Der Befund betrifft diese ableitbaren Zuordnungsinformationen. Er belegt keinen allgemeinen Zugriff auf sämtliche fremden Profile, Aufgaben oder Lernnachweise. Die Oberfläche bietet regulär nur freigegebene Studios an; die Servergrenze muss trotzdem direkte RPC-Aufrufe absichern. Priorität P1: Studiofreigaben sollen auch bei Filtern und Mehrfachzuordnungen gelten.

## Kleine Änderung

[017_directory_studio_filter.sql](../../backend/supabase/017_directory_studio_filter.sql) ergänzt genau eine Serverprüfung: Ein nicht leerer `p_studio` muss durch `app_private.has_studio(p_studio)` freigegeben sein. Sonst wird mit `42501` abgewiesen, bevor Ergebniszeilen oder Trefferzahlen berechnet werden.

Vorhandene Funktions-/Bereichsrechte, Filtervalidierung, Sortierung, Seiteneinteilung, Ergebnisfelder und Admin-Verhalten bleiben erhalten. Es werden weder Rollen noch Mitgliedschaften, Mitarbeiterdaten oder andere Routinen verändert. Keine Frontend-, Design-, SMTP- oder KI-Änderung.

## Nachweise und lokale Prüfung

Der unveränderte Backendstand nahm den unzulässigen Filter in allen 14 neuen Fällen an: zwei delegierte Grundrollen × sieben Studios. Die Tests scheiterten jeweils mit „Missing expected rejection“. Nach der Korrektur bestanden **18 gezielte PostgreSQL-/PGlite-Fälle**:

- Je Studio und Rolle: eigener Filter funktioniert, Studio-IDs bleiben beschränkt, fremder Filter wird abgewiesen, Grundrolle unverändert.
- Eine entzogene Studiozuordnung wird beim nächsten Aufruf berücksichtigt; das verbleibende Studio funktioniert weiter. Entzug von `users.view` sperrt die Übersicht.
- Zwei erlaubte Studios funktionieren, eine dritte Mitgliedschaft wird nicht über einen fremden Filter erkennbar.
- Administratorfilter unterstützen weiterhin alle sieben Studios.
- Rückmigration und erneute Anwendung erhalten die Datensätze; die ursprüngliche Filterannahme und die erneute Sperre werden tatsächlich ausgeführt.

Ein zu weit gewählter Testnamensfilter startete zunächst zusätzlich einen älteren, von vorherigen Testdaten abhängigen Fall ohne dessen Vorbereitung. Die Auswahl wurde auf die neuen Fälle begrenzt; diese bestanden vollständig. Anschließend bestand auch der gesamte Datenbanklauf mit seiner vollständigen Testvorbereitung. Keine gehosteten Konten, realen E-Mails oder Mitarbeiterdaten wurden dafür verwendet. Die Migration wird im Testaufbau zweimal angewandt.

Die unabhängige lokale Abnahme bestand mit **187 Datenbank-/Modelltests**, **13 Zugriffsdiensttests**, **9 Mock-Botdiensttests** und dem **Build mit synthetischer Backendkonfiguration**. Vor und nach der Prüfung waren alle **185 Quell-/Test-/Konfigurationsdateien** zwischen Arbeitsrepo und eingefrorener Prüfkopie unverändert und hashgleich. Die unabhängige Quellprüfung bestätigte, dass die Routine bis auf den zusätzlichen Guard exakt der bisherigen Definition entspricht und die Rückmigration den vorherigen Körper wiederherstellt. Keine Netzwerk-, Eskalations-, Browser- oder Versandaktionen wurden bei dieser Abnahme ausgeführt. Der gehostete Datenbankstand, echte Rollen-/Studioabnahme und Veröffentlichung dieses neuen Pakets bleiben ausdrücklich offen.

## Bereitstellung und Rückweg

**Noch nicht veröffentlicht.** Nach Wiederherstellung der automatischen Freigabeprüfung zuerst `main` abgleichen, bestehende Änderungen erhalten und erst den dann geprüften Stand übertragen. Die bisher veröffentlichten 367 Browsertests gehören zu `b5980aa`; sie werden nicht als neue Browserabnahme von 017 ausgegeben.

Nach bestätigter Bereitstellung die vollständige Erweiterung 017 im eigenen Supabase SQL-Editor anwenden. Die Oberfläche installiert SQL nicht automatisch. Reguläre eigene Filter und delegierte Nutzerübersicht mit den Prüfkonten testen; direkte fremde Filter benötigt zusätzlich eine technische Abnahme. Historische Migration 009 nicht allein darüber einspielen, weil sie spätere Funktionskorrekturen ersetzt.

Ein Quell-Rückweg entfernt den isolierten Paketcommit. Für eine bereits installierte Datenbankänderung existiert [rollback/017_directory_studio_filter.sql](../../backend/supabase/rollback/017_directory_studio_filter.sql). Sie stellt die vorherige Routine wieder her, verändert keine Datensätze und öffnet dabei die beschriebene Zuordnungsinferenz erneut. Vor einem erforderlichen Rückweg die delegierte Nutzerverwaltung entziehen; bevorzugt vorwärts korrigieren. Keine automatische Datenbereinigung.

## Andere weiterhin offene Abnahmen

- Migration 016 wurde vom Nutzer als ausgeführt bestätigt; der echte Mitarbeiter-PDF-Test ist noch nicht gemeldet.
- Der Nutzer kennt den aktuellen SMTP-Modus noch nicht. Anleitung und genaue Rückfrage zu den Anbieter-Einstellungen sind bereitgestellt; echte Mailzustellung und DNS-Konfiguration bleiben ungeprüft.
- Generative KI bleibt zurückgestellt. Geräteeinsatz, Backups/Wiederherstellung und gehostete Rollenprüfungen werden durch lokale SQL-Tests nicht bestätigt.
