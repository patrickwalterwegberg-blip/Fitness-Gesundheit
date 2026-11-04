# Chat, Feedback und Bereichsfreigaben

Diese Erweiterung verbindet Kommunikation und individuelle Bereichsrechte mit der gemeinsamen Supabase-Datenbank. Lokale Demo-Inhalte werden nicht übertragen. Admin und Geschäftsleitung verwenden die gemeinsame technische Rolle `admin` mit Vollzugriff; vorhandene Admin-Konten behalten ihre Rolle.

## Einmalig einrichten

Voraussetzung: Die Migrationen 001–006 sind erfolgreich installiert.

1. [007_chat_feedback_access.sql](https://github.com/patrickwalterwegberg-blip/Fitness-Gesundheit/blob/main/backend/supabase/007_chat_feedback_access.sql) öffnen und **Copy raw file** wählen.
2. [Neue Abfrage im Supabase SQL Editor](https://supabase.com/dashboard/project/ftcurcqduzrxsvkujfql/sql/new) öffnen. Den vollständigen Inhalt einfügen und **Run** klicken.
3. Erwartet: **Success. No rows returned.** Bei Fehlern zuerst deren Ursache klären. Die vollständige Datei kann erneut ausgeführt werden; vorhandene Nachrichten und Meldungen werden nicht gelöscht.
4. Den [Teamhub](https://patrickwalterwegberg-blip.github.io/Fitness-Gesundheit/login.html) neu laden. Unter **Meine Übersicht → Serverstatus prüfen** erscheint Erweiterung **7**.

Neue Passwörter, Tokens, SMTP-Einstellungen oder externe Chat-Anbieter sind nicht nötig. Die GitHub-Veröffentlichung stellt die Oberfläche bereit; sie führt die Migration nicht im privaten gehosteten Projekt aus. Der Entwickler kann dieses Projekt aus der aktuellen Entwicklungsumgebung wegen deren Netzwerkbeschränkung nicht direkt ändern.

## Standardzugriffe

| Rolle | Sichtbare Bereiche und Daten |
| --- | --- |
| Mitarbeiter | Eigene Übersicht, Aufgaben, Kalender, Lernhub, Wissenshub, Chat und Feedback |
| Studioleitung | Zusätzlich Dateien und eigene Module; weiterhin nur freigegebene Studios/Daten. Der Baukasten erfordert ergänzende Bearbeiterrechte. |
| Admin / Geschäftsleitung | Alle gemeinsamen Bereiche, alle Studios, Nutzerverwaltung, Controlling und sämtliche Chatkanäle/Feedbackmeldungen |

Die Mitarbeiterfreigaben entsprechen der vereinbarten Auswahl einschließlich Feedback. Aufgaben bleiben auf die eigene Zuweisung beschränkt, Kurse auf eigene Lernaufträge, Wissen auf freigegebene Rollen und Studios. Ein normaler Mitarbeiter kann im Wissenshub lesen; Artikel/Dateien hinzufügen erfordert eine zusätzliche Freigabe für **Dateien**. Die lokale Demo bleibt getrennt. Der Link zur Demo wird angemeldeten normalen Mitarbeitern nicht angeboten.

Admin öffnet **Mitarbeiterzugänge → Nutzerprofil → Freigegebene Bereiche**, setzt zusätzliche Bereiche und klickt **Bereichsfreigaben speichern**. **Rollenstandard verwenden** entfernt individuelle Abweichungen. **Kalender** benötigt auch **Aufgaben**; die Oberfläche hält diese Auswahl zusammen. Für den Modulbaukasten werden sowohl die Bereichsfreigabe als auch die bestehenden Bearbeiterrechte benötigt.

Diese Regeln gelten auch in Datenbankabfragen und Schreibfunktionen. Ein ausgeblendeter Navigationsknopf ist nicht die einzige Sperre. Normale Mitarbeiter können ihre Freigaben nicht selbst verändern; eine Bereichsfreigabe erteilt keine Adminrolle. Admin-/Geschäftsleitungskonten behalten immer Vollzugriff. Änderungen werden bei der nächsten Serverabfrage durchgesetzt; die Navigation prüft zusätzlich beim Fensterfokus und ungefähr alle 30 Sekunden neu.

**Übergang:** Vor Installation von 007 zeigt die Oberfläche bereits die eingeschränkte Standardnavigation, aber erst die Migration aktiviert die zusätzlichen serverseitigen Bereichssperren. Chat/Feedback zeigen bis dahin einen Einrichtungshinweis. Vorhandene Aufgaben und Logins bleiben erreichbar.

## Chats

Es entstehen automatisch acht leere Kanäle: **Gesamtes Team** sowie je ein Kanal für Sögel, Bersenbrück, Dörpen, Lathen, Haselünne, Löningen und Werlte. Es werden keine Beispielnachrichten angelegt.

- Im Gesamtteam können alle aktiven Mitarbeiter mit Chatfreigabe lesen und schreiben.
- Einen Studiokanal sehen die diesem Studio zugeordneten Mitarbeiter sowie Admin/Geschäftsleitung.
- Über **Studioübergreifenden Chat erstellen** legt Admin einen Kanal für mindestens zwei ausgewählte Studios an. Mitarbeiter eines beteiligten Studios erhalten Zugriff auf dessen gesamten Verlauf. Andere Studios sehen diesen Kanal nicht.
- **Chat verwalten** erlaubt Admin die Umbenennung sowie Archivierung/Reaktivierung. Ein archivierter Kanal bleibt für Admin lesbar, erlaubt aber keine neuen Nachrichten. Die Zugehörigkeit der sieben festen Studiokanäle und des Gesamtteams wird nicht verändert.
- Nachrichten zeigen die tatsächliche absendende Person und Serverzeit. Text wird als Text dargestellt. Anhänge, Direktnachrichten und Nachrichtenbearbeitung gehören noch nicht zu dieser Version.

Ein geöffneter Verlauf lädt neue Nachrichten ungefähr alle fünf Sekunden. Beim Laden älterer Nachrichten pausiert diese Aktualisierung, damit der Verlauf beim Lesen erhalten bleibt. **Neueste Nachrichten anzeigen** wechselt zurück. Der Verlauf lädt in Seiten; ältere Nachrichten werden nicht durch eine feste Gesamtlänge abgeschnitten.

### Sichtbare Benachrichtigungen

Ungelesene Nachrichten anderer Personen erscheinen als **roter Zähler am Chat und an der Glocke**, zusätzlich als Hinweis in den anderen Arbeitsbereichen. Die Zähler werden ungefähr alle 15 Sekunden und beim Fensterfokus vom Server aktualisiert. Eigene Nachrichten erzeugen keinen eigenen Ungelesen-Zähler.

Der Lesestand wird pro Person und Kanal gespeichert. Das Öffnen in einem sichtbaren, fokussierten Fenster bestätigt den geladenen Verlauf. Ein Hintergrundfenster markiert keine Nachrichten automatisch als gelesen. Ein fehlgeschlagener Leseabgleich reduziert die Zähler nicht durch eine unbestätigte lokale Änderung. Wiederholtes Senden nach ungewisser Antwort verwendet dieselbe Nachrichtenkennung und erzeugt keinen zweiten identischen Beitrag.

Diese Benachrichtigungen gelten im geöffneten Teamhub. Betriebssystem-Push bei geschlossener Seite, E-Mail-Hinweise, Ton und individuelle Erwähnungen sind noch nicht eingerichtet.

## Feedback

**Feedback → Feedback geben** bietet Studio, Thema, Titel und Text. Mitarbeitende sehen ihre eigenen namentlichen Meldungen sowie ihnen ausdrücklich zugewiesene Anliegen. Admin/Geschäftsleitung sehen alle Meldungen. Studioleitung erhält nicht automatisch alle Feedbackmeldungen ihres Standorts.

Unter **Zuständigkeiten** hinterlegt Admin für ein Thema einen Empfänger pro Studio oder einen allgemeinen Adminstandard. Eine passende Studiozuständigkeit hat Vorrang. Die Person muss aktiv, dem Studio zugeordnet und für Feedback freigegeben sein. Fehlt eine geeignete Person, bleibt die Meldung zur Zuweisung bei Admin/Geschäftsleitung. Neue Regeln gelten für neue Meldungen; bestehende Fälle können separat neu zugewiesen werden.

Die zuständige Person oder Admin kann **Offen**, **In Bearbeitung** oder **Erledigt** setzen und antworten. Nur Admin kann die zuständige Person ändern. Die ursprüngliche Rückmeldung bleibt erhalten; Änderungen an Bearbeitungsstand/Antwort werden mit ausführender Person und Serverzeit protokolliert. Gleichzeitige Änderungen überschreiben sich nicht unbemerkt. Feedback wird nicht in das Leistungscontrolling aufgenommen.

### Meldung ohne Namenszuordnung

Mit **Ohne Namen im Feedbackeintrag senden** wird keine Autor-ID im Meldungsdatensatz gespeichert. Der Rückmeldecode ist zufällig und nicht fortlaufend. Die Meldung erscheint deshalb nicht in der persönlichen Liste des Absenders. Den Code aufbewahren; **Feedback mit Code nachverfolgen** zeigt damit nur Status und Antwort. Die ursprüngliche Person ist im Eintrag und seinen Bearbeitungsereignissen nicht als Absender hinterlegt. Technische Dienstprotokolle und selbst in den Text geschriebene Namensangaben sind davon unabhängig; absolute technische Anonymität wird nicht zugesagt.

## Testdurchlauf

1. Mit deinem Admin-Konto im Gesamtteam eine Testnachricht senden, neu laden und den gespeicherten Beitrag prüfen.
2. Einen Kanal für zwei Studios erstellen und anschließend archivieren/reaktivieren.
3. Unter Feedback eine Zuständigkeit hinterlegen, eine namentliche Meldung senden, diese zuweisen und beantworten.
4. Eine Meldung ohne Namen senden und deren Status mit dem Code prüfen.
5. Sobald ein weiterer Mitarbeiterzugang eingerichtet ist: in einem zweiten Browserprofil anmelden. Die Person muss genau ihre freigegebenen Bereiche und Studiokanäle sehen. Eine Nachricht an sie senden und rote Zähler/Hinweis prüfen. Zum Prüfen des Ungelesen-Zählers sind zwei Personen erforderlich; die eigene Nachricht erzeugt keinen künstlichen Zähler.
6. Bei einem Mitarbeiter zusätzliche **Dateien** freigeben, danach entziehen und die Oberfläche aktualisieren. API-/Speicherzugriffe ohne diese Freigabe müssen ebenfalls abgewiesen werden.
7. **Abmelden** bleibt im Teamzugang oben rechts auch beim Scrollen erreichbar. Nach Abmelden und Neuladen dürfen keine privaten Ansichten offen bleiben.

Automatische Prüfungen verwenden PostgreSQL/PGlite mit echten SQL-Rollen und Browserabläufe mit simulierten HTTP-Antworten. Sie legen keine Nachrichten oder Feedbackmeldungen im gehosteten Projekt an und ersetzen keinen echten Test mit zwei Mitarbeiterkonten.
