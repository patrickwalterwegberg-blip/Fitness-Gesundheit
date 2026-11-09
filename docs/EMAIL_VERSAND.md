# E-Mail-Zugang und Versand prüfen

Stand: 09.11.2026. Die geschützte Zugangskontrolle hilft, Kontofreigabe und Mailzustellung getrennt zu prüfen. Sie repariert keine SMTP-Konfiguration und bestätigt keinen Empfang im Postfach.

## Ohne Mail prüfen

1. Mit einem berechtigten Konto **Mitarbeiterzugänge** öffnen und den Mitarbeiter suchen.
2. **E-Mail-Zugang prüfen** wählen. Die Oberfläche lädt den passenden Datensatz erneut aus der serverseitig eingeschränkten Mitarbeiterliste. Bereits angezeigte Daten werden bei einem fehlgeschlagenen erneuten Abruf verworfen.
3. Konto, aktives Mitarbeiterprofil, Studiofreigabe sowie vermerkte Einladung und letzte Anmeldung prüfen. Die Zeitangaben verwenden Europe/Berlin. Der Prüfzeitpunkt stammt vom Browser.

Lange E-Mail-Adressen werden für die Suche auf höchstens 200 Unicode-Zeichen begrenzt; bei mehreren Ergebnisseiten wird die exakte ausgewählte Mitarbeiter-ID gesucht. Die angezeigte Adresse bleibt vollständig. Fehlende oder unklare Treffer ergeben keine Versandfreigabe.

Die Kontrolle benötigt die bestehende Mitarbeiterlistenfreigabe und die Funktion `users.login`. Serverregeln begrenzen die sichtbaren Mitarbeiter zusätzlich. Eine reine Lesefreigabe für die Mitarbeiterliste erhält keine zusätzlichen Versandaktionen. Die Kontrolle versendet keine Nachricht und verbraucht kein Versandlimit. Sie prüft weder eine zusätzliche Auth-Sperre noch SMTP-Zugangsdaten, Domainfreigaben oder Postfachzustellung. Einladungsdatum und letzter Login sind historische Kontoinformationen, keine Zustellbelege.

## Einen Anmeldelink gezielt anfordern

Nur bei aktivem Profil und Studiofreigabe steht **Anmeldelink für geprüften Zugang anfordern** zur Verfügung. Admins benötigen keine einzelne Studiozuordnung. Eine ausdrückliche Betätigung fordert eine Mail an; die reine Kontrolle löst keine Anfrage aus. Der Server prüft Berechtigung, Zielkonto und Wartezeit erneut und ermittelt selbst die Empfängeradresse. Neue Konten werden dadurch nicht angelegt.

Eine erfolgreiche Rückmeldung bedeutet: Der Anmeldedienst hat die Anfrage angenommen. Posteingang, Spamordner und Anbieterprotokoll müssen den tatsächlichen Empfang bestätigen. Der Hub begrenzt erneute Anfragen mindestens 60 Sekunden; der Anbieter kann längere Limits setzen. Die Oberfläche beendet das Warten auf den Einladungsdienst nach 30 Sekunden. Eine unterbrochene Anfrage kann serverseitig trotzdem verarbeitet worden sein. Vor einer Wiederholung zuerst Konto und Versandprotokoll prüfen. Es gibt keinen automatischen Neuversand.

## Fehler und Vorgangsnummer

Der aktualisierte Einladungsdienst gibt für abgelehnte Mail-Anfragen eine begrenzte Fehlerkategorie zurück. Die Oberfläche erklärt sie ohne rohe Providerdetails:

| Kategorie | Prüfschritt |
|---|---|
| `recipient_restricted` | Empfängerfreigabe des Anbieters und eigenen SMTP-Versand prüfen. Ein eingeschränkter Standardversand erreicht nicht automatisch alle Mitarbeiteradressen. |
| `rate_limited` | Anforderungs-/Versandlimit im Anbieterprotokoll prüfen und dessen Wartezeit beachten. |
| `provider_disabled` | E-Mail-Anbieter und E-Mail-Anmeldung im Auth-Dienst prüfen. |
| `account_unavailable` | Bestehendes Auth-Konto und Freischaltung prüfen; keine doppelte Einladung auslösen. |
| `mail_service_error` | Auth-Protokoll, SMTP-Einstellungen, Absender und Fehler beim Mailanbieter prüfen. |
| `unknown` | Der Dienst liefert keine eindeutige Kategorie. Anhand der Vorgangsnummer weiter prüfen. |

Mit der **Vorgangsnummer** kann ein Betreiber das zugehörige Ereignis im Protokoll der Supabase Edge Function `team-access` suchen (`event: teamhub_mail_request`). Der Eintrag enthält nur Vorgangsnummer, erlaubte Aktion, Ergebniscode, HTTP-Status und gegebenenfalls die Kategorie. Er enthält keine Empfängeradresse, Tokens, Auth-Links, Passwörter oder rohen Providerfehler. Das Auth- und SMTP-Protokoll muss der Betreiber separat korrelieren; dessen Einträge übernehmen diese eigene Vorgangsnummer nicht automatisch.

Öffentliche Link-Anfragen auf der Loginseite und die Passwortwiederherstellung laufen direkt über Supabase Auth. Sie erhalten keine Vorgangsnummer dieses Einladungsdienstes. Öffentliche Erfolgsmeldungen nennen keine Kontodetails; Providerfehler werden bereinigt dargestellt. Direkte Auth-Endpunkte können ausdrücklich abgelehnte Anfragen jedoch mit anderen Fehlercodes beantworten. Eine vollständige Verhinderung von Rückschlüssen auf Konten ist damit nicht nachgewiesen. Zugangsdaten oder vollständige Anmeldelinks niemals in einen Fehlerbericht kopieren.

## Bereitstellung und Abnahme

Keine neue SQL-Migration erforderlich. Benötigt werden die bereits vorhandene Mitarbeiterverwaltung (005; Einzelrechte über 009) und der Einladungsdienst. Bei älteren Listen ohne gefilterte Abfrage bleibt die neue Kontrolle deaktiviert. Die bestehende GitHub Action **Mitarbeiter-Einladungen einrichten** veröffentlicht Änderungen an `backend/supabase/functions/team-access/` automatisch. Die Webseitenveröffentlichung allein aktualisiert diesen Dienst nicht. Beide Workflows müssen erfolgreich sein. Der ältere Dienst bleibt mit der Oberfläche kompatibel, liefert aber noch keine neuen Kategorien oder Vorgangsnummern.

Automatisierte Browser- und Produktionstests simulieren das Backend; Diensttests simulieren den Mailanbieter. Sie prüfen Rechte, aktuellen Kontostatus, fehlenden Versand beim Lesen, eine ausdrückliche Anfrage, Fehlerdarstellung und mobile Bedienung. Sie bestätigen keinen echten Mailversand. Der aktuelle Empfang bei einem weiteren Mitarbeiterkonto und die Ursache der zuvor ausgebliebenen Mail bleiben bis zur Postfach- und Betreiberprüfung offen. Die Entwicklungsumgebung hat keinen Zugriff auf die privaten Auth-/SMTP-Protokolle.

Automatische Erinnerungsmails für Aufgaben sind eine separate offene Funktion. [Ursprüngliche Ideen und offene Punkte](FUNKTIONS_AUDIT.md).

Für die noch offene echte Zustellungsprüfung gibt es eine [Schritt-für-Schritt-Abnahme](EMAIL_ABNAHME_SCHRITT_FUER_SCHRITT.md).
