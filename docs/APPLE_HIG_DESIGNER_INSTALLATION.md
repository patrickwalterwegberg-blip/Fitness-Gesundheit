# Apple HIG Designer für den Teamhub

Geprüft am 09.11.2026. Gefundenes Projekt: [axiaoge2/Apple-Hig-Designer](https://github.com/axiaoge2/Apple-Hig-Designer). In dessen README steht der vom Nutzer genannte `xcopy`-Befehl. Es handelt sich um einen Community-Skill mit MIT-Lizenz, nicht um ein offizielles Apple-Plugin.

## Für diese Arbeitsumgebung

Der Skill liegt bereits im Projekt unter `.agents/skills/apple-hig-designer/`. Die Hauptdatei `SKILL.md` wurde gelesen. Der Assistent kann die lokalen Anleitungen in dieser Unterhaltung als Referenz nutzen. Eine automatische Aufnahme in den bereits geladenen Skill-Katalog wird dadurch nicht behauptet.

Die Herkunft ist durch `UPSTREAM.json` an Commit `ff17b91ff2903ecd52940afabf97de5a73c9cd1b` gebunden. Die MIT-Lizenz und die Referenzdateien sind enthalten. `SKILL.md` ergänzt einen Verweis auf die Projektvorgaben in `TEAMHUB.md`: Schwarz-Gold, bestehende Schriften und Symbole, deutsche Oberfläche und kleine geprüfte Änderungen. Die Beispiele werden nicht automatisch in die Anwendung importiert.

Die Dateien sind im aktuellen Arbeitsordner vorbereitet. Für andere Rechner oder spätere frische Cloud-Checkouts müssen sie im GitHub-Projekt mitgespeichert und übertragen werden. Die Installation auf deinem Windows-PC allein stellt dieser Cloud-Unterhaltung keine Dateien bereit.

## Windows: projektbezogen für Codex einrichten

Wenn du die vorbereiteten Projektdateien bereits über GitHub erhalten hast, beginne bei Schritt 6. Anderenfalls:

1. Öffne das oben verlinkte Repository.
2. Wähle **Code → Download ZIP**.
3. Öffne die heruntergeladene ZIP-Datei und wähle **Alle extrahieren**. Im entpackten Ordner `Apple-Hig-Designer-main` muss `SKILL.md` liegen.
4. Öffne deinen lokalen Projektordner `Fitness-Gesundheit`. Erstelle darin `.agents`, darin `skills` und darin `apple-hig-designer`.
5. Kopiere `SKILL.md`, `REFERENCE.md`, `LICENSE` und den vollständigen Ordner `resources` hinein. Die Struktur muss direkt so aussehen; kein weiterer `Apple-Hig-Designer-main`-Unterordner dazwischen:

   ```text
   Fitness-Gesundheit/
     .agents/
       skills/
         apple-hig-designer/
           SKILL.md
           REFERENCE.md
           LICENSE
           resources/
   ```

6. Öffne das Projekt in Codex und starte eine neue Sitzung. Projektbezogene Skill-Erkennung hängt vom verwendeten Codex-Client ab. Falls der Skill nicht angezeigt wird, kann Codex die Datei auf ausdrücklichen Auftrag direkt lesen. [Offizielle Codex-Dokumentation zu Skills](https://developers.openai.com/codex/skills).
7. Verwende beispielsweise diesen Auftrag:

   > Lies `.agents/skills/apple-hig-designer/SKILL.md` und, soweit vorhanden, `TEAMHUB.md`. Nutze die Empfehlungen für mobile Bedienung, Formulare und Popups. Behalte unser Schwarz-Gold-Design, die vorhandenen Schriften und Symbole bei. Prüfe zuerst die betroffenen Ansichten und ändere sie anschließend in kleinen getesteten Paketen.

Für weitere Cloud-Sitzungen diese Projektdateien über deinen üblichen GitHub-Ablauf mit einem Commit speichern und übertragen. Keine Zugangsdaten hinzufügen.

## Falls du stattdessen Claude Code verwendest

Das ursprüngliche Repository beschreibt einen anderen Zielordner: `%USERPROFILE%\.claude\skills\apple-hig-designer`. In der Windows-Eingabeaufforderung kannst du aus dem Verzeichnis, das den entpackten Ordner enthält, Folgendes ausführen:

```bat
xcopy /E /I "Apple-Hig-Designer-main" "%USERPROFILE%\.claude\skills\apple-hig-designer"
```

Der Quellordnername muss dem tatsächlichen entpackten Ordner entsprechen. Falls du ihn in `apple-hig-designer` umbenannt hast, verwende diesen Namen im ersten Argument. Bei bereits vorhandenen Dateien fragt `xcopy` gegebenenfalls nach Überschreiben. Danach Claude Code neu starten und den Skill ausdrücklich nennen. Diese benutzerbezogene Installation gilt für Claude Code auf diesem Rechner.

## Prüfung und Rückweg

Die vorbereiteten Dateien enthalten Anleitungen, CSS-/React-Beispiele und Referenzen. Es wurden keine Installationsskripte ausgeführt, keine Pakete installiert und keine Änderungen an Supabase vorgenommen. Die lokale Ergänzung verweist auf die vorhandene Teamhub-Gestaltung. Entfernen des ausschließlich für diesen Skill angelegten Ordners nimmt die Einrichtung zurück; die Anwendung verwendet ihn nicht als Laufzeitabhängigkeit.
