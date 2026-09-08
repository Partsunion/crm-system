# CRM-Arbeitsplatz: UI/UX-Prüfung und Überarbeitung

Stand: 8. September 2026. Ausgangspunkt ist die zuletzt veröffentlichte CRM-Version `98104dc9`. Ziel ist der tägliche Partsunion-Vertrieb: Kontakte auswählen, anrufen, Gespräch festhalten, nächsten Schritt planen und Zuständigkeiten im Blick behalten.

## Ergebnis nach Arbeitsbereich

| Bereich | Festgestelltes Problem | Umsetzung / Prüfung |
| --- | --- | --- |
| Leadliste | Datenpflege-Kennzahlen und mehrere Filterzeilen verdrängten die eigentlichen Kontakte. | Kennzahlen aus dem Kopf entfernt; kompakte Tabelle mit den Kernspalten Firma, Kontakt, Status, Zuständigkeit und nächster Schritt. Zusätzliche Spalten und zwei Zeilenhöhen wählbar. |
| Filter und Suche | Häufige Filter waren versteckt; die Arbeitsansicht ging beim Navigieren verloren. | Direkte Ansichten für alle, eigene, fällige und unzugewiesene Leads. Phase und Zuständigkeit am Desktop direkt erreichbar. Weitere Filter öffnen als begrenztes Popover; aktive Einschränkungen erscheinen als entfernbare Chips. Suche berücksichtigt Ort, Umlaute und formatierte deutsche Rufnummern. |
| Persönliche Ansichten | Speichern und Zurücksetzen mussten möglichst ohne Zusatzdialog funktionieren. | „Filter speichern“ übernimmt die aktuelle Kombination einschließlich Sortierung mit einem Klick; erneutes Speichern aktualisiert die gewählte Ansicht. Zurücksetzen leert die Einschränkungen. Gespeicherte Ansichten sind pro Benutzer getrennt; beschädigte Einträge werden ignoriert. |
| Blättern und Navigation | Seitenleiste, Liste und Detailansicht konkurrierten um Platz; der nächste Kontakt erforderte wiederholtes Suchen. | Ergebnisnavigation bleibt außerhalb des scrollenden Tabelleninhalts. Filter, Sortierung, Seitenzahl und Seitengröße bleiben beim Zurückkehren im selben Browser-Tab erhalten. Die Detailansicht bietet vorherigen/nächsten Lead und Position in der gefilterten Liste. |
| Lead bearbeiten | Eingaben im Aktivitätsformular konnten beim Wechsel verloren gehen. | Schutz für ungespeicherte Notiz, Entscheiderangaben, Phasenwechsel, bearbeitete Aktivitäten und Terminplanung. Laufende Speicherungen verhindern das Verlassen. Ein bewusst verworfener Entwurf wird nicht auf den nächsten Lead übertragen. |
| Dashboard | Das Ranking belegte den Einstieg vor den konkreten Aufgaben. Kennzahlen boten keinen direkten Arbeitsweg. | Arbeitsliste und heutige Termine stehen vor dem Ranking. Die schmale Kennzahlenzeile öffnet jeweils die passende Arbeitsliste mit derselben Mitarbeiter-Auswahl. Fällige Rückrufe berücksichtigen offene Leads. |
| Pipeline | Viele Karten wurden sofort gerendert; Suche und Filterauswahl mussten wiederholt gesetzt werden. | Suche, Zuständigkeit, Fokus, Darstellung und gewählte Phase bleiben erhalten. Board-Karten werden je Phase in Gruppen von 25 eingeblendet. Die Listenansicht besitzt Seitennavigation. Phasenwechsel behalten die vorhandene Bestätigung durch den Server und die Fehlerbehandlung. |
| Kalender | Filter und Darstellungsart gingen beim Verlassen verloren; technische Einrichtungshinweise belegten den Arbeitsbereich. | Mitarbeiter-, Team- und Statusfilter sowie Darstellungsart bleiben erhalten; gemeinsames Zurücksetzen. Schmale Terminübersicht. Erstellung, Einladungsvalidierung, Konfliktprüfung und Bearbeitung durch bestehende Funktionstests abgedeckt. |
| Berichte | Ein fehlgeschlagener Abruf konnte wie ein leerer Datenbestand aussehen; Zeitraumwahl war umständlich. | Ladefehler mit Wiederholen; getrennte Lade- und Leerzustände. Schnellwahl für diesen Monat, letzten Monat und dieses Jahr. Filter bleiben erhalten. Kennzahlen als schmale Zeile; Diagrammfarben reagieren auf den Moduswechsel. Die Kennzahlen bleiben ausdrücklich Bestandsauswertungen, keine gebuchten Umsätze. |
| Einstellungen | Telefonie, Listen und Unternehmensfelder lagen auf einer langen Seite; ein Verlassen konnte Änderungen verlieren. | Drei direkt erreichbare Bereiche: Telefonie, CRM-Felder, Unternehmen. Speichern zeigt den tatsächlichen Änderungszustand; Schutz ungespeicherter Angaben. Gemeinsame CRM-Einstellungen sind für Vertrieb ohne Leitungsrolle schreibgeschützt. |
| Pipeline-Setup | Große Zählerboxen ohne Arbeitswert; mehrfaches Auslösen einer Speicherung war möglich. | Schmale Phasenübersicht und einheitliche Bezeichnung „Phase“. Änderungen werden während der Speicherung gesperrt. Geänderte Formulare sind gegen versehentliches Schließen geschützt; fehlgeschlagene Speicherungen bleiben bearbeitbar. |
| Lead-Quellen | Eigener Arbeitsablauf für Umkreis, ganzes Land und einzelne URL. | Alle drei Einstiege und die Formularzustände geprüft. Die bestehende Autoteile-Spezialisierung bleibt erhalten. Keine echten Suchaufträge oder Importe durch die Browserprüfung gestartet. |
| Import, Export, Dubletten | Werkzeuge dürfen die normale Kontaktbearbeitung nicht überladen. | Weiterhin im Werkzeugmenü. Dialoge für Neuanlage, CSV-Import und Dubletten geöffnet; Auswahl-/Import-/Batch-Verhalten durch vorhandene Tests geprüft. Keine CRM-Daten für die Prüfung verändert. |
| Team und Kontosicherheit | Rollen und Teamzugehörigkeiten müssen verständlich und getrennt bleiben. | Aaron wurde im Live-System als CRM-Vertriebsleiter gesetzt. Sein allgemeiner Kontotyp und der Admin-Zugang wurden dabei nicht erweitert. Teamübersicht, Teamerstellung sowie Passwort-/Authenticator-Einstiege geprüft. |
| Telefonie und Ranking | Die laufende Arbeit darf durch Ansichtswechsel nicht unterbrochen werden. | Globaler Telefonie-Arbeitsplatz bleibt außerhalb der einzelnen Seiten. Eigene Leitung, Gesprächsnotizen, Verlauf, Aufnahmen und Wochen-/Monatsranking bleiben vorhanden. SDK, API-Adapter und Notizenspeicherung sind Bestandteil der Tests. Ein echter Anruf oder eine Webex-Freigabe ist durch diese UI-Prüfung nicht bestätigt. |

## Gestaltung und Bedienung

Die gemeinsame Partsunion-Navigation, Schriftfamilien und Farbrollen bleiben die Grundlage. Dunkle Grundflächen wurden an die Admin-Tokens angeglichen. Sichtbare Arbeit erhält Vorrang vor dekorativen Kennzahlenkarten. Statusfarben kennzeichnen weiterhin Vertriebsphasen, während Filter und Tabellen weitgehend neutral bleiben.

Am Desktop stehen häufige Filter direkt neben der Suche. Auf schmalen Displays wandern Phase und Zuständigkeit in dasselbe Filtermenü; gespeicherte Filter bleiben direkt erreichbar. Popover bleiben innerhalb des Bildschirms, besitzen eine begrenzte Höhe und lassen sich per Escape schließen. Der Tastaturfokus kehrt zum Auslöser zurück.

Die Arbeitsansicht wird je Benutzer im `sessionStorage` dieses Tabs gehalten; ausdrücklich gespeicherte Filter liegen im benutzerspezifischen `localStorage`. Das ist kein geräteübergreifendes Profil. Die Suchindizes werden pro Datenbestand aufgebaut. Automatisches Vorladen beschränkt sich auf Leads und Kalender; weitere Ansichten laden bei Navigation bzw. Maus-/Tastaturfokus. Datensparende Verbindungen werden respektiert. Der Webex-Calling-SDK wird dadurch nicht beim normalen CRM-Start geladen.

## Prüfverfahren und Grenzen

Abschlussprüfung: **381 Tests bestanden, 0 fehlgeschlagen**, TypeScript-Prüfung und Produktionsbuild erfolgreich. **13 Browserabläufe** bestanden; keine dabei erfassten JavaScript-Laufzeitfehler. Alle zehn Hauptbereiche sowie drei mobile Ansichten wurden zusätzlich als Bildschirmprobe geprüft.

| Lokaler Vergleich, 1440 × 900 Pixel | Vorher | Nachher |
| --- | ---: | ---: |
| Vollständig sichtbare Leadzeilen | 3 | 6 |
| Beginn der ersten Leadzeile | 491 px | 352 px |
| Höhe der ersten Leadzeile | 97 px | 79 px |
| Beim Dashboard-Start geladene JavaScript-Ressourcen | 21 / 674.121 Byte | 15 / 612.439 Byte |
| Beim Leadlisten-Start geladene JavaScript-Ressourcen | 20 / 654.183 Byte | 14 / 592.109 Byte |
| Sofort gerenderte Pipeline-Karten bei 2.000 Kontakten | 2.000 | 200 |
| DOM-Elemente der Pipeline bei 2.000 Kontakten | 58.387 | 6.195 |

Die JavaScript-Werte sind unkomprimierte Ressourcen nach dem initialen Laden und Leerlauf-Vorladen. Webex-Calling wurde in beiden Vergleichsversionen nicht automatisch geladen. Die begrenzte Kartendarstellung verändert weder den Datenbestand noch die ausgewiesenen Gesamtzahlen.

- Browserprüfung aller zehn Hauptbereiche, Lead-Detailansicht und Filtermenü, ergänzt um mobile und dunkle Darstellung.
- Automatisierte Arbeitsabläufe mit 215 synthetischen Autoteile-Kontakten; die Vergleichsversion verwendet identische Testdaten.
- Zusätzlicher Vergleich der Pipeline mit 2.000 synthetischen Kontakten; vollständige Zähler trotz begrenzter anfänglicher Darstellung.
- Eingabeerhalt bei abgelehntem Verlassen, Wiederherstellung von Ansichten, Seitenposition, Filter-Reset, Datumsfilter und absichtlich fehlgeschlagene API-Speicherungen im Browser geprüft.
- TypeScript, Produktionsbuild und bestehende CRM-Tests einschließlich Telefonie, Terminbearbeitung, Import und Kontrastprüfung.

Die Browserprüfungen verwenden lokale API-Testdaten. Echte Nachrichten, Anrufe, Einladungen, Importe und Kontosicherheitsänderungen werden dabei nicht ausgeführt. Die Messungen sind reproduzierbare lokale Vergleiche, keine gemessenen Core Web Vitals echter Nutzer. Das Backend liefert den Leadbestand weiterhin vollständig; die begrenzte Darstellung reduziert DOM-Arbeit, ersetzt aber keine serverseitige Pagination für wesentlich größere Bestände.

Prüfskripte, Screenshots und Messwerte liegen im gemeinsamen Workspace unter `.artifacts/crm-ux-20260908/`. Die Live-Rollenänderung und die Veröffentlichung haben getrennte Prüfprotokolle. Das Frontend wird ausgehend vom vorherigen Live-Image veröffentlicht; bei fehlgeschlagener Prüfung setzt das Deployment dieses Image wieder ein.

Als Bedienungsreferenz dient das Prinzip direkt erreichbarer Filter und gespeicherter Ansichten aus der [offiziellen monday-Dokumentation](https://support.monday.com/hc/en-us/articles/360003624660-The-Board-Filters). Das CRM wurde für den Partsunion-Arbeitsablauf überarbeitet; ein vollständiger Funktionsvergleich mit monday oder umsatz.io war nicht Gegenstand dieser Prüfung.
