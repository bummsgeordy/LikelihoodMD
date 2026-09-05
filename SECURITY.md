# Security und Datenschutz

Bitte melden Sie Sicherheitsprobleme nicht über öffentliche Issues, sondern direkt an die Maintainer des jeweiligen Forks oder Repositorys.

## Datenschutzprinzip

Die Anwendung hat kein Backend, keinen Login und keine Serverdatenbank. Eigene Tests und Annahmen werden im Browser gespeichert und können als JSON exportiert werden.

JSON-Importe sind auf 2 MiB, 500 Einträge je Sammlung sowie begrenzte Text- und URL-Längen beschränkt. Importierte Daten werden lokal validiert und überschreiben kuratierte Repository-Daten nicht still. Speicherfehler werden in der App angezeigt.

Bitte keine Patientendaten eingeben. Das Tool ist für populationsbezogene Annahmen, Testgüte und didaktische Berechnungen gedacht.

## Erwartete Risiken

- Unsichere oder falsch übertragene klinische Annahmen.
- Verwechslung von lokaler Annahme und kuratiertem Standardwert.
- Veraltete Quellen.
- Falsch interpretierte Ausgabe als individuelle klinische Empfehlung.
- Manipulierte oder übergroße lokale JSON-Importe.

Diese Risiken werden durch sichtbare Quellen, Begründungen, Grenzen, Validierung und klare Zweckbeschreibung reduziert, aber nicht vollständig beseitigt.

Quellen-URLs müssen HTTP(S) verwenden und dürfen keine eingebetteten Zugangsdaten enthalten. Importierte Werte sind Text, kein ausführbares HTML. Überlange, verschachtelte oder doppelte Datensätze sowie unbekannte Profilzuordnungen werden abgewiesen. Lokale Importe werden dabei nicht als medizinisch freigegeben markiert.

Build-Abhängigkeiten werden per Lockdatei und CI-Audit geprüft. Ein unauffälliger Audit ist eine Momentaufnahme. Der Offline-Cache hält veröffentlichte Inhalte bis zur nächsten erfolgreichen Aktualisierung vor; das ist keine Garantie der medizinischen Aktualität.
