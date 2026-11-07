# Abnahme im echten Teamhub

Diese Liste ergänzt die automatisierten Prüfungen. Ergebnisse erst nach einem tatsächlichen Test im gehosteten Projekt abhaken. Testdatum, verwendete Konten/Rollen, Studios, Gerät/Browser und Ergebnis festhalten. Die verwendeten Postfächer müssen für den Test erreichbar sein. Die Tests im Repository versenden keine echten Einladungen.

| Angabe | Ergebnis |
|---|---|
| Datum / veröffentlichte Version | Noch einzutragen |
| Geschäftsleitung / Studioleitung / Mitarbeiter getestet | Noch einzutragen |
| Zwei verschiedene Studiozuordnungen geprüft | Noch einzutragen |
| iPhone / Android / Laptop und Browser | Noch einzutragen |
| Ergebnis / offene Fehler | Noch einzutragen |

## Zugang, Rollen und Onboarding

- [ ] Eine Einladung an ein erreichbares Mitarbeiterpostfach anfordern. Genau eine Mail kommt an, der Link führt zum richtigen Hub; Passwort festlegen und separat anmelden.
- [ ] Das Mitarbeiterprofil zeigt die richtige Person, Rolle und Studiozuordnung. Auf gemeinsam genutzten Geräten abmelden und das andere Konto anmelden; vorherige private Ansichten verschwinden.
- [ ] Einer Person eine einzelne Zusatzfunktion geben. Nur diese Funktion und ihre ausgewiesenen Abhängigkeiten werden verfügbar; die Grundrolle und fremde Studios werden dadurch nicht freigegeben.
- [ ] Zusatzfunktion wieder entziehen, während die betroffene Ansicht geöffnet ist. Die Ansicht wird nach dem nächsten Rechteabruf gesperrt und kann keine neue Serveraktion ausführen.
- [ ] Bei einer weiteren Einladung Onboardingvorlage, Startdatum und berechtigten Mentor auswählen. Vorschau und Fälligkeiten prüfen. Nach Abschluss sind die Einladung angefordert und genau ein Plan mit den erwarteten Kursen/Aufgaben vorhanden.
- [ ] Als Mitarbeiter den persönlichen Plan öffnen: richtige Schritte, Ansprechpartner und Fristen. Lesen, Quiz und eine verlangte Praxiseinweisung werden getrennt gezählt; eine Leitungsbestätigung kann nicht durch Selbstbestätigung ersetzt werden.

## Startseite, Anordnung und Wissen

- [ ] Einen Link oder eine Nachricht für ein Studio und eine Rolle veröffentlichen. Berechtigte sehen den Eintrag, das andere Studio beziehungsweise eine nicht freigegebene Rolle nicht.
- [ ] Menü und Schnellzugriffe sortieren, speichern und dieselbe Browserseite neu laden. Reihenfolge bleibt erhalten. Abbrechen verwirft Änderungen; Standardreihenfolge lässt sich wiederherstellen.
- [ ] Eine Wissensdatei als Entwurf hochladen. Ein normaler Mitarbeiter sieht sie erst nach Veröffentlichung und nur innerhalb seiner Freigabe. Original herunterladen und eine neue Version freigeben; frühere Versionen bleiben erhalten.
- [ ] Als Mitarbeiter einen Begriff im Wissenshub und im Assistenten suchen. Die Quelle lässt sich öffnen; unveröffentlichte Texte und fremde Studios erscheinen nicht. Im Modus Originalquellen liefert der Assistent Originalauszüge. Der optionale KI-Modus setzt Erweiterung 013, Modellkonfiguration und das eigene KI-Zusatzrecht voraus; erzeugte Antworten müssen anhand der Quellen geprüft werden.

## Aufgaben, Kalender, Wartung und Glocke

- [ ] Private Aufgabe und privaten Termin erstellen. Andere Mitarbeiter und Leitung können diese privaten Inhalte nicht öffnen. Die Erstellerperson sieht sie im eigenen Kalender.
- [ ] Eine Teamaufgabe einer einzelnen Person zuweisen. Die richtige Person erhält sie; unbeteiligte Studios erhalten keinen Zugriff. Status und Rückmeldung gemeinsam prüfen.
- [ ] Wartungsplan mit einem sechsmonatigen Abstand anlegen. Verknüpfte Aufgabe erscheint am richtigen Kalendertag. Abschließen: genau eine Folgeaufgabe und das nächste Wartungsdatum entstehen; der Monatsrhythmus bleibt verankert.
- [ ] Eine fällige Testaufgabe erzeugt eine Meldung in der Glocke. Neueste Meldungen stehen oben; Als gelesen behält sie im Verlauf. Eine zweite Sitzung sieht denselben serverseitigen Lesestand.
- [ ] Einen neu zugewiesenen Kurs über seine Benachrichtigung öffnen, während zuvor Mein Onboarding geöffnet war. Der richtige Kurs mit seinen Lektionen erscheint ohne manuelles Neuladen.
- [ ] Falls Benachrichtigungen auch bei geschlossenem Hub erzeugt werden sollen: im Supabase-Projekt den Job `teamhub-due-notifications` und seine Ausführungen prüfen. OS-Push und Erinnerungsmails gehören nicht zu diesem Ablauf.

## Video, Prüfung, Chat und Feedback

- [ ] Am tatsächlichen iPhone/Android-Gerät beziehungsweise Laptop Kamera und Mikrofon freigeben, aufnehmen, stoppen und Vorschau prüfen. Ohne Freigabe bleibt der Upload einer vorhandenen Datei bedienbar.
- [ ] Ein geeignetes Testvideo hochladen. Nach Bestätigung ist es in der Bibliothek bereit; einem Kurs zuordnen. Als berechtigter Mitarbeiter abspielen, als nicht berechtigtes Konto keinen neuen Zugriff erhalten.
- [ ] Einen Upload unterbrechen und mit derselben Datei fortsetzen. Kein zweiter Videoeintrag entsteht; ein fehlgeschlagener Upload wird nicht als bereit angezeigt.
- [ ] Lektionen bestätigen, Wissenscheck mit einer/mehreren Antworten und kurzer Texteingabe bearbeiten. Ein falscher Versuch zählt nicht als bestanden. Ggf. separate Praxisbestätigung durch die berechtigte Leitung durchführen.
- [ ] Studiochat mit zwei Konten prüfen: Nachricht und ungelesener Zähler erscheinen bei den richtigen Personen. Teamweite und studioübergreifende Kanäle beachten.
- [ ] Feedback senden, Zuständigkeit und Antwort prüfen. Bei anonymem Feedback wird der Rückmeldecode verwendet; im Eintrag erscheint keine Kontozuordnung zur absendenden Person.

## Ergebnis festhalten

| Test / Gerät | Erwartetes Ergebnis | Tatsächliches Ergebnis | Datum / geprüft durch |
|---|---|---|---|
| Noch auszufüllen | | | |

Offene Screenshot-Funktionen wie KI-Wizard, Videoschnitt, Bildschirmaufnahme, Medienabgaben, native App und Kundenportal nicht als bestanden markieren; sie sind im [Funktionsaudit](FUNKTIONS_AUDIT.md) als offen beschrieben.


## Sicherheits- und Datenschutzabnahme

Siehe [Prüfbericht und lesende Betreiberabfragen](SICHERHEIT_UND_DATENSCHUTZ_PRUEFUNG.md).

- [ ] Aktuelle produktive RLS-/Storage-Regeln mit zwei Rollen und zwei Studios geprüft.
- [ ] Vollständige Datenschutzinformation, Anbietervereinbarungen und Speicherregionen dokumentiert.
- [ ] Löschfristen, Mitarbeiter-Austritt und Zuständigkeiten festgelegt.
- [ ] Backup einschließlich Storage und Wiederherstellung im Testprojekt erfolgreich geprüft.
- [ ] Echte Controlling-Exporte sind korrekt bezeichnet und enthalten keine ausführbaren Formeln aus Mitarbeiterangaben.
- [ ] Browserregeln und Sicherheitsheader an der veröffentlichten Domain geprüft.

- [ ] Erweiterung 014 installiert und als aktiver Admin eine aktuelle Betriebsprüfung abgerufen. Werte mit Anbieter-Verwaltung verglichen; technische Prüffälle zuerst geklärt.
- [ ] Mit einem delegierten Nutzerverwalter geprüft, dass die globale Betriebsprüfung nicht freigegeben ist.
- [ ] Fehlende Originaldateien und unvollständige Uploads fachlich geprüft; keine automatische Löschung aufgrund eines Zählers.

## Modulverlinkungen und Popups

- [ ] In den freigegebenen Bereichen ein neues Formular öffnen; das erste verfügbare Feld ist direkt erreichbar. Am Handy passen Popup und Eingaben in den Bildschirm.
- [ ] Einen gespeicherten Moduleintrag öffnen, bearbeiten und speichern. Erneut öffnen: Änderungen und ursprüngliche Modulversion stimmen. Eine weitere Änderung abbrechen: Gespeicherter Stand bleibt erhalten.
- [ ] Von der Startseite einen persönlichen Lernauftrag und einen Wissenseintrag öffnen: Der ausgewählte Kurs beziehungsweise Inhalt erscheint direkt. **Feedback geben** öffnet das Formular.
- [ ] Popups mit Kreuz und Escape schließen; Tastaturfokus bleibt während der Eingabe im Fenster und kehrt danach zum Auslöser zurück. Keine Änderung wird durch bloßes Schließen gespeichert.
