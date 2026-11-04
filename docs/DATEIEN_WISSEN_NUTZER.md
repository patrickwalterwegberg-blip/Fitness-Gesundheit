# Gemeinsame Dateien, Wissen und Nutzermanagement aktivieren

## Was du einmalig tun musst

Die ersten drei Datenbankmigrationen und der Einladungsdienst sind bereits eingerichtet. Für diese Erweiterung werden zwei weitere SQL-Abfragen benötigt. Neue Passwörter oder Zugriffstokens sind dafür nicht notwendig.

1. In Supabase **SQL Editor → New query** öffnen.
2. [004_knowledge_files.sql](../backend/supabase/004_knowledge_files.sql) vollständig kopieren, einfügen und **Run** ausführen. Auf **Success** achten.
3. Eine neue Abfrage öffnen und [005_user_management.sql](../backend/supabase/005_user_management.sql) vollständig ausführen.
4. Bei einer Fehlermeldung zuerst deren Ursache klären; anschließend kann die jeweilige vollständige Migration erneut ausgeführt werden. Vorhandene Dokumente werden nicht überschrieben.
5. Die veröffentlichte Teamhub-Seite neu laden und als Administrator anmelden.

Migration 004 legt Dokumenttabellen, Dateiversionen, Suchindex, Zugriffsregeln und den privaten Storage-Bucket **team-knowledge** an. Er muss privat bleiben. Migration 005 erweitert die Nutzersuche und die persönlichen Übersichten. Die Webseite stellt eine fehlende Migration als Einrichtungshinweis dar. Die bisherigen Anmeldungen und Teamaufgaben bleiben verfügbar; die Nutzerliste verwendet bei noch fehlender Erweiterung zunächst ihre bisherige Abfrage.

Es werden keine neuen kostenpflichtigen Ressourcen gebucht. Dateien belegen Speicherplatz im bestehenden Supabase-Projekt. Die Kapazität und eventuelle Kosten richten sich nach deinem gewählten Tarif.

## So beginnst du mit Dateien und Wissen

1. Im **Teamzugang → Dateien → Datei hochladen** einen ersten Test durchführen.
2. Eine kleine bekannte PDF-, Bild- oder Textdatei auswählen. Titel, Kategorie und Standort festlegen.
3. Leserrollen auswählen und **Entwurf speichern** wählen.
4. Das Original herunterladen beziehungsweise die Vorschau laden und den Inhalt prüfen.
5. Als Geschäftsführung oder zuständige Studioleitung **Version freigeben** wählen.
6. Im **Wissenshub** den freigegebenen Inhalt über Titel oder einen bekannten Textbegriff suchen.

Für den Beginn eignen sich eine Empfangs-Arbeitsanweisung, eine Geräteanleitung, eine Einarbeitungsunterlage und eine Liste der Zuständigkeiten. Echte vertrauliche Inhalte erst nach Prüfung der Standort- und Rollenfreigaben mit getrennten Konten nutzen.

### Ein Inhalt fehlt im Wissenshub

Unter **Dateien** den Inhalt öffnen und den Status prüfen. **Entwurf speichern** legt eine noch nicht freigegebene Version an. **Version freigeben** steht für berechtigte Leitungen oben in den Details. Nach erfolgreicher Freigabe führt **Wissenshub öffnen** direkt zur Ansicht mit den veröffentlichten Inhalten. Beim Freigeben werden die aktiven Suchfilter zurückgesetzt, damit der gerade freigegebene Inhalt nicht durch den bisherigen Entwurfsfilter ausgeblendet bleibt.

Ist ein Inhalt bereits freigegeben, **Filter zurücksetzen** verwenden. Ein leerer Wissenshub bietet außerdem **Sichtbare Entwürfe anzeigen** an; die vorhandenen Zugriffsregeln bleiben dabei wirksam. Fehlt die Datei auch unter **Dateien**, Uploadmeldungen und den verwendeten Bereich prüfen: Die lokale Demo ist von den gemeinsamen Dateien im echten Teamzugang getrennt.

### Dateien und Vorschauen

Unterstützt werden PDF, DOC/DOCX, XLS/XLSX, PPT/PPTX, PNG, JPG/JPEG, WebP, TXT, Markdown, CSV sowie MP4 und WebM. Jede Datei darf maximal **50 MB** groß sein. Für längere Videos können später ein größerer Tarif beziehungsweise eine gesonderte Videoablage und Uploadtechnik nötig werden.

- **Bilder:** Vorschau im Teamhub.
- **Videos:** Wiedergabe über die eingebauten Browser-Steuerelemente. Dafür wird zunächst das Original geladen; es gibt keine automatische Umwandlung oder adaptive Streamingqualität. Abspielbarkeit hängt von Codec und Browser ab.
- **PDF:** Vorschau über die PDF-Unterstützung des Browsers; das Original bleibt als Download verfügbar.
- **Office-Dateien:** Original-Download, noch keine gemeinsame Online-Bearbeitung.
- **TXT/Markdown/CSV:** Ein Textauszug von bis zu 100.000 Zeichen wird nach Freigabe durchsuchbar. Der Original-Download enthält die vollständige Datei.
- **Artikel:** Direkte Texteingabe bis 100.000 Zeichen, ohne HTML-Ausführung.

PDF, Office, Bilder und Videos werden noch nicht automatisch ausgelesen. Es gibt noch keine OCR, Transkription oder angebundene generative Dokumenten-KI. Für die Suche können Titel, Beschreibung, Artikel oder auslesbare Textdateien genutzt werden.

### Freigabe und Versionen

Mitarbeiter können für zugeordnete Studios Inhalte vorschlagen und eigene Entwürfe beziehungsweise neue Versionen eigener sichtbarer Inhalte erstellen. Die Geschäftsführung und zuständige Studioleitung prüfen und veröffentlichen. Studioübergreifende Inhalte werden durch die Geschäftsführung verwaltet. Modulbaukastenrechte sind hiervon getrennt.

Bei **Neue Version** bleiben frühere Originaldateien und Texte erhalten. Eine neue Version wird erst nach ihrer Freigabe zum aktuellen Stand. Bei Artikeln wird der ausgewählte Text als Ausgangspunkt übernommen. Eine früher freigegebene Version lässt sich erneut als aktueller Stand freigeben. Veraltete Bearbeitungsstände werden beim Speichern beziehungsweise Freigeben abgelehnt.

Unter **Freigabe & Zugriff** können berechtigte Leitungen Standort und Leserrollen ändern sowie Inhalte archivieren. Archivierte Inhalte sind für normale Leser ausgeblendet. Administration und zuständige Studioleitung behalten Einsicht. Rollen- und Standortänderungen gelten für künftige Zugriffe auf alle Versionen; bereits heruntergeladene Dateien können nicht zurückgeholt werden.

Die Dateiablage hat dieselben Rechte wie die Dokumentdaten. Originale werden mit authentifizierten Storage-Anfragen geladen; öffentliche oder dauerhafte Freigabelinks werden nicht erstellt. Browser-Vorschauen verwenden lokale Blob-URLs, die beim Verlassen der Vorschau wieder freigegeben werden. Das ist keine Schadsoftwareprüfung. Öffentliche Bucket-Einstellungen oder fremde globale Storage-Regeln nicht als Abkürzung zur Fehlerbehebung verwenden.

### Unvollständige Uploads

Eine Datei wird erst als vollständig markiert, wenn der Storage-Datensatz mit passender Größe und MIME-Art bestätigt wurde. Bei einem Uploadfehler versucht die Oberfläche, den unvollständigen Upload zu entfernen. Ist das nicht bestätigbar, den Entwurf neu laden und den Uploadstatus prüfen. Über **Unvollständigen Upload entfernen** kann ein berechtigter Benutzer einen fehlgeschlagenen Upload bereinigen und anschließend eine neue Version anlegen. Bereits bestätigte Versionen werden dabei erhalten.

## Nutzermanagement verwenden

Im Bereich **Mitarbeiterzugänge** stehen zusätzlich bereit:

- Serverseitige Suche nach Name oder E-Mail sowie Filter für Rolle, Freigabestatus und Studio.
- Ein Nutzerprofil beim Klick auf den Namen: letzte Anmeldung, Status zugewiesener Aufgaben und individuelle Lernziele.
- Getrennte Anzeigen für gelesene Lektionen, Wissensprüfung und praktische Bestätigung.
- Bearbeiterrechte für den Modulbaukasten, ohne automatisch Admin- oder Controllingrechte zu vergeben.
- Import mit Vorschau aus CSV, XLSX oder eingefügten Kontakten.

Die Aufgabenstatistik beschreibt den Status zugewiesener Aufgaben. Wer einen Abschluss tatsächlich ausgelöst hat, ist im Controlling dokumentiert. Lernübersichten stammen aus echten Datenbankzuweisungen; lokale Demo-Fortschritte werden nicht übernommen. Die gemeinsame Kurs- und Testoberfläche wird mit [Migration 006](PILOT_TESTBETRIEB.md) angeschlossen.

### Mitarbeiter importieren

1. **Nutzer importieren** öffnen und ein Standardstudio auswählen.
2. Optional die **CSV-Vorlage** herunterladen. Unterstützte Spalten sind `Name`, `E-Mail`, `Studio`, `Rolle`; statt `Name` sind auch `Vorname` und `Nachname` möglich.
3. Eine CSV- oder XLSX-Datei bis 5 MB auswählen. Bei XLSX wird das erste Tabellenblatt gelesen. Maximal 200 Mitarbeiterzeilen vorbereiten.
4. Alternativ Kontakte zeilenweise einfügen, zum Beispiel `Anna Beispiel <anna@example.org>`. Bei reinen E-Mail-Adressen müssen Namen in der Vorschau ergänzt werden.
5. In der Vorschau Namen, Adressen, Studios und Rollen prüfen und bei Bedarf korrigieren. Doppelte Adressen innerhalb der Auswahl werden blockiert. Bereits in der geladenen Nutzerliste bekannte Konten werden markiert; weitere bestehende Konten prüft der Server vor der Einladung.
6. Höchstens 20 Zeilen pro Durchlauf auswählen und **Einladungen anfordern** klicken. Erst dieser Klick legt Konten an und fordert E-Mails an.
7. Die Ergebnisse pro Zeile prüfen. Eine angeforderte E-Mail ist noch kein Zustellnachweis. Bei nicht bestätigten Vorgängen zunächst Nutzerliste und Mailversand prüfen; nicht blind erneut importieren.

Der Import ändert keine bestehenden Konten. Globale Administratorrechte werden in der Vorschau ausdrücklich angezeigt. Modul-Bearbeiterrechte können anschließend im Nutzerprofil vergeben werden. Das Einlesen einer Importdatei allein versendet keine Nachrichten.

## Was weiterhin offen bleibt

Supabase ist die zentrale Grundlage. Gemeinsam angebunden sind jetzt Zugänge, Studios, einmalige Aufgaben/Rückmeldungen, eigene Formularmodule und deren Rechte sowie – nach diesen Migrationen – Dateien, Wissen und die erweiterten Nutzerübersichten. Akademie-Zuweisungen und Fortschrittsschnittstellen liegen bereits in der Datenbank; die gemeinsame Lernoberfläche steht mit [Migration 006](PILOT_TESTBETRIEB.md) bereit.

CRM, Marketing, Geräte, Lager/Bestellungen, Notfallkontakte, Feedback und weitere bisherige Vorschauansichten werden anschließend schrittweise migriert. Sie sind noch keine gemeinsamen Datenbankmodule. Die vorhandenen Demo-Daten werden nicht automatisch übernommen. Dropbox, GoHighLevel und WhatsApp bleiben bis zur jeweiligen Anbindung eigenständige Systeme.

Die Seite öffnet bei vorhandener öffentlicher Backend-Konfiguration standardmäßig den echten Teamzugang. Die lokale Vorschau bleibt über **Zur Demo** erreichbar. Heruntergeladene HTML-Dateien sind für die lokale Vorschau gedacht; echte Anmeldungen verwenden die veröffentlichte HTTPS-Seite.

## Abschlussprüfung im echten Projekt

Mit einem zweiten Konto eines anderen Studios prüfen, dass Entwürfe, gesperrte Leserrollen und fremde standortgebundene Inhalte nicht geöffnet oder heruntergeladen werden können. Danach Upload, Vorschau, Original-Download, Freigabe und neue Version mit einigen echten Dateiformaten testen. Lokale Browsertests simulieren die HTTP-Antworten; PostgreSQL/PGlite prüft die echten SQL-Policies mit nachgebildeten Storage-Tabellen. Ein Test des gehosteten Supabase-Storage-Dienstes muss nach der Installation zusätzlich erfolgen.
