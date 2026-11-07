# Entwurf: Datenschutzhinweise für den Mitarbeiter-Teamhub

**Unvollständiger Arbeitsentwurf – nicht als fertige Datenschutzinformation veröffentlichen.** Alle Platzhalter und tatsächlichen Anbieter-/Aufbewahrungsangaben müssen vor Veröffentlichung vervollständigt und geprüft werden. Der Entwurf wird deshalb noch nicht als Datenschutzerklärung in der Loginseite verlinkt. Er ist kein Nachweis der DSGVO-Konformität.

## Verantwortlicher und Kontakt

- Vollständiger rechtlicher Unternehmensname: **[vom Unternehmen zu bestätigen]**
- Vollständige Anschrift: **[vom Unternehmen zu bestätigen]**
- Datenschutzkontakt / E-Mail: **[vom Unternehmen zu bestätigen]**
- Datenschutzbeauftragte Person, falls benannt: **[Status und Kontaktdaten bestätigen]**

## Zwecke und Datenarten

Der Teamhub unterstützt die interne Zusammenarbeit, Aufgaben-/Terminorganisation, Schulung und Einarbeitung sowie den Zugriff auf freigegebene Arbeitsunterlagen. Die tatsächlich eingesetzten Module und Zwecke sind durch das Unternehmen zu bestätigen.

| Bereich | Im System vorgesehene Daten |
|---|---|
| Mitarbeiterzugang | Persönliche Firmen-E-Mail, Anzeigename, Rolle, Studiozuordnung, Freigaben, technische Anmeldezeitpunkte und gegebenenfalls berufliche Profilangaben |
| Arbeitsorganisation | Aufgaben, Verantwortlichkeiten, Fälligkeiten, Status, Rückmeldungen und Termine; eigene private Aufgaben/Termine haben getrennte Zugriffsregeln |
| Lernen / Onboarding | Kurszuweisungen, Lesebestätigungen, Quizversuche und Bestehensnachweise, erforderliche Praxis-/Leitungsbestätigungen und Onboardingfortschritte |
| Wissen / Dateien | Eingestellte Artikel, Datei-/Videoinhalte, Versionen, Freigaben und Änderungsnachweise |
| Kommunikation | Chatnachrichten, Lesestände, Feedback, Zuständigkeiten und Antworten |
| Technischer Betrieb | Für Anmeldung, Sicherheit und Betrieb erforderliche Zugriffs-/Protokolldaten gemäß tatsächlicher Anbieter-Konfiguration |
| Optionaler KI-Modus | Aktuelle Frage, bis zu drei vorherige erfolgreiche Wissensfragen sowie passende veröffentlichte Quellentitel/-auszüge, sofern der Modellmodus tatsächlich aktiviert und freigegeben ist |

**Rechtsgrundlagen und Erforderlichkeit je Zweck: [vom Unternehmen/Datenschutzkontakt bestätigen].** Eine allgemeine Zustimmung beim Login ersetzt diese Prüfung nicht. Zulässige Nutzung von Lern-/Aufgabenstatistiken und gegebenenfalls erforderliche Beteiligung der Mitarbeitervertretung ebenfalls klären.

## Zugriff und Empfänger

Interne Zugriffe richten sich nach aktiver Person, Grundrolle, einzelnen Funktionsrechten und Studiozuordnung. Leitungs-/Administrationsrechte ermöglichen entsprechend erweiterte Einsicht. Für tatsächlich eingesetzte Dienste sind Anbieter, Zweck, Rolle als Auftragsverarbeiter, Speicherregion, Unterauftragnehmer und gegebenenfalls Übermittlungsgarantien zu ergänzen:

- Hosting / Auslieferung der Webseite: **[tatsächliche Vereinbarung und Betreiber bestätigen]**
- Supabase-Datenbank, Anmeldung und privater Dateispeicher: **[Region und Vereinbarung bestätigen]**
- E-Mail-Versand: **[tatsächlichen Mailanbieter und Vereinbarung ergänzen]**
- KI-Anbieter / eigener Modellserver, falls aktiviert: **[Anbieter, Region, Aufbewahrung, Vereinbarung und Aktivierungsstatus ergänzen]**
- Weitere tatsächlich genutzte externe Inhalte oder Dienste: **[prüfen und ergänzen]**

Die technische Option `store:false` beim Modellaufruf ist keine Zusicherung vollständiger sofortiger Datenlöschung beim Anbieter. Personenbezogene Informationen in Fragen und veröffentlichten Quellen müssen im vorgesehenen Umfang zulässig und erforderlich sein.

## Speicherung und Löschung

- Konten, Aufgaben, Lernnachweise, Dateien, Chat und Feedback: **[Fristen, Zweckbezug und Löschzuständigkeiten festlegen]**
- Austritt / Sperre: **[Ablauf, benötigte historische Nachweise und anschließende Löschung festlegen]**
- Technische Anbieterprotokolle: **[tatsächliche Aufbewahrungsfristen ergänzen]**
- Backups und Originaldateien: **[Sicherungsumfang, Aufbewahrung und Löschfortschreibung ergänzen]**

Bereits heruntergeladene oder gepufferte Inhalte können technisch nicht aus fremden Geräten zurückgerufen werden. Eine Kontosperre löscht nicht automatisch frühere Arbeitsergebnisse oder Sicherungen.

## Speicherung im Browser und gemeinsame Geräte

Die Anmeldung verwendet Browser-Speicher für die Sitzung. Persönliche Menü-/Startseitenanordnungen werden pro Konto und Browser lokal gespeichert. Die lokale Demo verwendet separat Browser-Speicher und teilweise IndexedDB für Dateien; deren Inhalte sind nicht automatisch eine zentrale Sicherung. Technische Notwendigkeit und rechtliche Einordnung dieser Speicherungen sind anhand des tatsächlichen Betriebs zu bestätigen.

Vorgaben für Abmeldung, gemeinsam genutzte Geräte und Gerätesperren: **[ergänzen]**. Im aktuellen Hub gibt es keinen eigenen automatischen Leerlauf-Logout.

## Feedback und Anonymität

Bei als anonym abgegebenem Feedback enthält die Fachzeile keinen Autor. Technische Auth-/Infrastrukturprotokolle, Zeitpunkte oder selbst eingetragene Inhalte können weiterhin Rückschlüsse zulassen. Eine vollständig anonyme Meldestelle wird damit nicht zugesichert. Tatsächliche Protokollierung und berechtigte Empfänger: **[bestätigen]**.

## Rechte und Kontaktwege

Die zutreffenden Rechte auf Auskunft, Berichtigung, Löschung, Einschränkung und gegebenenfalls weitere Betroffenenrechte sowie deren konkrete Bearbeitungswege sind durch den Verantwortlichen zu vervollständigen. Datenschutzanfragen: **[bestätigten Kontakt einsetzen]**. Zuständige Aufsichtsbehörde und Beschwerdemöglichkeit: **[anhand des tatsächlichen Unternehmenssitzes ergänzen]**.

Stand / Geltungsbereich / geprüfte Freigabe: **[Datum, Version und Zuständigkeit nach tatsächlicher Prüfung ergänzen]**.
