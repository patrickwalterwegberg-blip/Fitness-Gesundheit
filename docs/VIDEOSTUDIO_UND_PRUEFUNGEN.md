# Videostudio und Kursprüfungen

Die Erweiterung ergänzt den bestehenden Lernhub im Schwarz-Gold-Design. Kursautoren können direkt über Kamera und Mikrofon aufnehmen, Videos hochladen und einer Lektion zuordnen. Lernende sehen die Videos innerhalb ihrer freigegebenen Kurse und bearbeiten anschließend den Wissenscheck.

Die aktuelle Verbesserung der Upload-Wiederaufnahme benötigt keine neue SQL-Erweiterung. Bei bereits eingerichtetem Videostudio die veröffentlichte Oberfläche neu laden. Die folgenden Installationsschritte gelten für die erstmalige Einrichtung; ältere Migrationen nicht einzeln über neuere Erweiterungen ausführen.

## Einmalig aktivieren

Voraussetzung: Erweiterungen 001 bis 010 sind installiert.

1. [011_course_videos.sql](https://github.com/patrickwalterwegberg-blip/Fitness-Gesundheit/blob/main/backend/supabase/011_course_videos.sql) öffnen und den vollständigen Inhalt kopieren.
2. Im [Supabase SQL Editor](https://supabase.com/dashboard/project/ftcurcqduzrxsvkujfql/sql/new) in eine neue Abfrage einfügen und **Run** klicken.
3. Den Teamhub neu laden. Im Lernhub erscheint für die Geschäftsleitung **Videostudio**.

Die Migration ist wiederholt ausführbar. Sie erstellt den privaten Storage-Bucket `course-videos` und die zugehörigen Tabellen und Zugriffsregeln. Bestehende Kurse, Lernaufträge und Prüfungsergebnisse bleiben erhalten. Alte SQL-Aufrufe zum Erstellen von Kursen behalten die Bestehensgrenze von 80 Prozent, sofern keine andere angegeben wird.

Die globale Uploadgrenze im Supabase-Projekt darf nicht unter der Dateigrenze des Buckets liegen. Diese erste Version verwendet maximal **50 MB pro Datei**. Uploads werden in 6-MB-Abschnitten über die Supabase-Schnittstelle für fortsetzbare Uploads übertragen.

## Aufnahme und Upload

**Lernhub → Videostudio → Video aufnehmen / hochladen**

- Vorder- oder Rückkamera wählen und das Mikrofon bei Bedarf einschalten.
- **Kamera einschalten** fordert die Browserberechtigung an. Erst **Aufnahme starten** beginnt die Aufnahme.
- **Aufnahme stoppen** beendet Kamera und Mikrofon und öffnet die lokale Vorschau. Aufnahmen werden nach spätestens fünf Minuten oder vor Erreichen der Dateigrenze automatisch gestoppt.
- Über **Videodatei wählen** lassen sich vorhandene MP4-, WebM- und MOV-Dateien auswählen. **Handykamera öffnen** nutzt auf unterstützten Smartphones die Kamera-App des Geräts.
- Die Vorschau bleibt lokal. Über **Video auf diesem Gerät sichern** kann eine Aufnahme vor dem Upload heruntergeladen werden.
- Titel und Studio festlegen, dann ausdrücklich **Video hochladen** klicken. Die Geschäftsleitung kann Videos auch für alle Studios speichern.
- Der Fortschritt zeigt die Übertragung an. Als bereit gilt ein Video erst, wenn die Datenbank die gespeicherte Datei samt Dateigröße und Typ bestätigt hat.
- **Upload unterbrechen** hält die Übertragung an; **Upload fortsetzen** setzt sie mit derselben Datei fort. Nach Schließen des Fensters ist in der Bibliothek der unvollständige Upload sichtbar. Zum Fortsetzen muss die ursprüngliche Datei erneut ausgewählt werden. Für eine lokal aufgenommene Datei daher vor dem Schließen die Sicherung verwenden.
- Nicht verwendete Videos und unvollständige Uploads können nach einer ausdrücklichen Einzelbestätigung entfernt werden. Schlägt das Entfernen fehl, bleibt der Vorgang sichtbar und kann abgeschlossen werden. Videos mit Kurszuordnung bleiben geschützt.

## Einen unvollständigen Upload prüfen

1. **Lernhub → Videostudio** öffnen. Den Eintrag anhand von Titel, **Originaldateiname**, Dateigröße, Studio und **Anlegezeit in Europe/Berlin** zuordnen. Ein unvollständiger Eintrag beweist noch keinen Datenverlust.
2. **Upload-Abschluss prüfen** wählen. Die bestehende Serverfunktion prüft das gespeicherte Original gegen Größe und Dateityp. Ist es vollständig vorhanden, wird derselbe Eintrag als bereit bestätigt. Dafür muss die Datei nicht erneut ausgewählt oder übertragen werden. Eine fehlgeschlagene Prüfung meldet keinen erfolgreichen Abschluss.
3. Fehlen noch Daten: **Fortsetzen** wählen und genau die ursprüngliche Datei auswählen. Dateiname, Format und Größe müssen übereinstimmen. Der bereits vorhandene Eintrag wird wiederverwendet. Eine unterbrochene Aufnahme daher möglichst vorher über **Video auf diesem Gerät sichern** lokal sichern.
4. Die Speicherregeln erlauben neue Upload-Daten nur innerhalb von sieben Tagen ab Anlage des Eintrags. Liegt danach noch kein vollständiges Original vor, muss ein neuer Upload angelegt werden. Die Abschlussprüfung eines bereits vorhandenen vollständigen Originals ist weiterhin möglich.
5. Nur wenn der Eintrag tatsächlich verworfen werden soll: **Upload entfernen** beziehungsweise **Video löschen** wählen. Vor **Endgültig entfernen** werden Titel, Originaldatei, Größe und Anlegezeit zur Prüfung angezeigt. **Abbrechen** startet keine Löschung. Dies gilt auch beim Entfernen aus einem geöffneten Wiederaufnahmeformular.

Die bestätigte Entfernung betrifft genau diesen Eintrag und seine Datei. Eine inzwischen bestehende Kurszuordnung verhindert die Entfernung serverseitig. Bei unterbrochener Entfernung bleibt der Zustand sichtbar und kann über **Entfernen abschließen** erneut geprüft werden. Bereits gelöschte Dateien lassen sich über diese Oberfläche nicht wiederherstellen. Lokale, noch nicht hochgeladene Entwürfe zu anderen Einträgen bleiben bei einer Abschlussprüfung erhalten.

Anschließend **Mitarbeiterzugänge → Betriebsprüfung öffnen → Betriebsprüfung aktualisieren** wählen. Der Zähler unvollständiger Video-Uploads sinkt erst nach einem tatsächlich bestätigten Abschluss oder einer abgeschlossenen Entfernung. Die Entwicklungsprüfung verändert den echten Eintrag nicht.

Die direkte Kameraaufnahme benötigt HTTPS und einen Browser mit MediaRecorder-Unterstützung. Das veröffentlichte GitHub-Pages-Portal verwendet HTTPS. Bei verweigerter Kamerafreigabe bleiben Dateiauswahl und gegebenenfalls die native Handykamera verfügbar. MP4 mit H.264 ist für unterschiedliche Geräte meist am kompatibelsten. MOV-Dateien mit bestimmten Codecs lassen sich nicht auf jedem Gerät abspielen; der Player zeigt dann einen Hinweis zum erneuten Laden beziehungsweise zur Verwendung eines MP4-Videos.

## Im Kurs verwenden

**Neuer Kurs:** Lernhub → Kurs erstellen → Lektion → **Video aufnehmen / auswählen**. Ein fertiges Video aus der Bibliothek auswählen oder erst aufnehmen und hochladen. Die Zuordnung wird mit dem Kurs gespeichert. Eine Videolektion kann einen zusätzlichen Text enthalten; bei einem zugeordneten Video darf der Text leer bleiben.

**Noch nicht zugewiesener Kurs:** Kurs öffnen → Lektion → **Video hinzufügen** beziehungsweise **Video wechseln**. Die Änderung wird mit einer Versionsprüfung gespeichert. Eine bestehende Videozuordnung lässt sich wieder entfernen.

Nach der ersten Zuweisung bleiben Kursinhalt und Videozuordnung unverändert, damit Lernnachweise ihren ursprünglichen Inhalt behalten. Für Änderungen einen neuen Kurs erstellen. Ein Video für ein einzelnes Studio kann nur in diesem Studio als Kurs zugewiesen werden. Für studioübergreifende Schulungen kann die Geschäftsleitung ein Video für alle Studios verwenden.

Lernende laden ein Kursvideo über **Video laden**. Die Berechtigung wird vorher erneut geprüft. Die Wiedergabe nutzt eine zehn Minuten gültige signierte Adresse; es gibt keine öffentliche Videobibliothek. Bereits ausgegebene signierte Adressen bleiben bis zu ihrem Ablauf gültig. Bei abgelaufener Adresse kann über **Video erneut laden** eine neue Berechtigungsprüfung erfolgen.

## Fragen und Prüfungen

Im Kursformular lassen sich bis zu 20 Fragen und eine Bestehensgrenze von 1 bis 100 Prozent einstellen. Der Standard bleibt 80 Prozent. Die unterstützten Fragetypen sind:

- **Eine richtige Antwort:** Eine von zwei bis sechs Antwortmöglichkeiten auswählen.
- **Mehrere richtige Antworten:** Alle richtigen Möglichkeiten markieren. Nur die vollständig richtige Auswahl zählt als richtige Frage; es gibt keine Teilpunkte.
- **Lückentext / kurze Antwort:** Eine kurze erwartete Antwort eingeben. Groß- und Kleinschreibung sowie zusätzliche Leerzeichen werden bei der Auswertung ignoriert. Es handelt sich um einen exakten Textvergleich, keine KI-Bewertung oder freie Langtextkorrektur.

Die Lösungen stehen getrennt von den öffentlichen Kursinhalten in einem privaten Datenbankschema. Die Prüfung wird auf dem Server ausgewertet. Erst nach Bestätigung aller Lektionen wird der Wissenscheck freigeschaltet. Diese Bestätigung ist eine Selbstauskunft; der Player stellt keine manipulationssichere Kontrolle der angesehenen Zeit dar.

Gespeichert werden richtige Fragen, Gesamtzahl, bestanden/nicht bestanden, Bestehensgrenze und Zeitpunkt jedes Versuchs. Ein späterer fehlgeschlagener Versuch löscht einen früher erworbenen Bestehensnachweis nicht. Zwischen Prüfungsversuchen liegen mindestens zehn Sekunden. Eine gegebenenfalls verlangte Praxiseinweisung bleibt ein separater Nachweis durch eine berechtigte Person.

## Rechte

Die Geschäftsleitung hat das Videotool standardmäßig. Anderen Mitarbeitern kann unter **Mitarbeiterzugänge → Rechte → Einzelne Funktionen** die Funktion **Kursvideos aufnehmen, hochladen und zuordnen** freigeschaltet werden. Dafür wird die benötigte Funktion zum Erstellen von Kursen mit freigeschaltet. Die Grundrolle bleibt unverändert.

Ein freigeschalteter Kursautor verwaltet seine eigenen Videos innerhalb seiner Studios. Lernende benötigen keine Uploadfreigabe zum Ansehen eines ihnen zugewiesenen Videos. Das Entziehen der Lernhub- oder Studiofreigabe sperrt neue Abfragen auf Video und Speicher. Richtige Prüfungsantworten sind für Lernende nicht direkt lesbar.

## Prüfungen vor der Veröffentlichung

- `npm run test:db`: Datenbankrechte, private Speicherobjekte, Uploadbestätigung, Kursbindung, unveränderliche zugewiesene Kurse, gemischte Prüfungen und Bestehensgrenzen.
- `npx playwright test tests/course-videos.spec.js`: Browseraufnahme mit simulierten Geräten, Ressourcenfreigabe, lokaler Vorschau, Upload, Wiederaufnahme, Kurszuordnung, Prüfungsablauf und mobilem Layout.
- `npm run test:production`: Das fertig gebaute Portal einschließlich Videostudio und lokaler Vorschau mit abgefangenen Netzwerkzugriffen.

Diese Tests ersetzen nicht den ersten praktischen Upload auf dem produktiven Supabase-Projekt und eine Aufnahme auf dem tatsächlichen iPhone beziehungsweise Android-Gerät. Videoschnitt, Bildschirmaufnahme und Video-/Audioabgaben von Lernenden gehören noch nicht zu dieser Version.

### Zwischen geöffneten Videos wechseln

Ist bereits eine lokale Datei oder gestoppte Browseraufnahme geöffnet, zeigen „Fortsetzen“ eines anderen Uploads und „Video aufnehmen / hochladen“ vor einem Wechsel ein Auswahlfenster. Auch das Schließen der Bibliothek und „Dieses Video verwenden“ bei vorhandener lokaler Vorschau sind geschützt. **Geöffnete Auswahl behalten** und Escape im Auswahlfenster erhalten Datei, Vorschau, Titel und Studio. Erst **Auswahl verwerfen und wechseln**, **… und schließen** oder **… und Video verwenden** führt die gewünschte Aktion aus. Scheitert die Videozuordnung, bleibt der noch geöffnete Entwurf erhalten.

Bei Bedarf das Video zuvor über **Video auf diesem Gerät sichern** herunterladen. Diese Wechselaktionen löschen keine gespeicherten Serveruploads. Ohne lokale Datei sowie beim erneuten Aufruf derselben effektiven Uploadticket-ID ist keine Verlustabfrage nötig. Während einer laufenden Aufnahme oder Übertragung bleiben die bisherigen Sperren bestehen. Beim lokalen Verwerfen wird eine verbleibende Vorschau-URL nicht mehr ohne ihre zugehörige Datei gerendert.

Dieser Schutz bezieht sich auf die Bedienwege innerhalb der Bibliothek. Neuladen, Tab-Schließen, Sitzungsende und ein unerwarteter Seitenwechsel speichern einen lokalen Entwurf nicht automatisch; die Aufnahme vorher herunterladen oder ausdrücklich hochladen. Echte iPhone-/Android-Aufnahmen und produktive Uploads müssen separat geprüft werden.
