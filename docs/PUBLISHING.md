# Veröffentlichung und Datenpflege

## GitHub Desktop

1. Änderungen an Code und Daten prüfen.
2. Die in der [README](../README.md#daten-und-entwicklung) aufgeführten Prüfungen ausführen; Browserprüfungen verwenden den zuvor erzeugten Produktionsbuild.
3. Evidenzbericht mit `npm run audit:evidence` aktualisieren und zusammen mit den Änderungen lokal committen.
4. In GitHub Desktop **Push origin** wählen.

Ein Push auf `main` startet die Pages-Prüfung und Veröffentlichung. Ein lokaler Commit allein verändert die öffentliche Seite nicht. Das Projekt führt selbst keine Git-Operationen aus.

## GitHub Actions

Unter **Settings → Pages** muss **GitHub Actions** ausgewählt sein. Der Workflow prüft Daten, Unit-Tests, Abhängigkeiten, reproduzierbaren Evidenzbericht, Build, relative Seitenpfade, Bundlebudget und Browserfunktionen mit Chromium/WebKit.

Schlägt ein Lauf fehl, zuerst im betroffenen Job den ersten fehlgeschlagenen Schritt öffnen. Ein rotes `validate` bedeutet nicht automatisch einen Fehler im Pages-Hosting. Den Fehler lokal beheben, Bericht gegebenenfalls neu erzeugen und den geprüften Commit pushen.

## Datenpflege

Kuratierte Daten liegen in `src/data/`; dazu gehören auch `practice-questions.json` und `pretest-evidence-gaps.json`. Die [Beitragsregeln](CONTRIBUTING.md) beschreiben Pflichtangaben und fachliche Prüfung.

Browser-Ergänzungen werden nur lokal gespeichert. Ein JSON-Vorschlag oder eine lokale Reviewmarkierung ist keine Änderung der öffentlichen Datenbasis und keine fachliche Freigabe. Erst die geprüfte Repository-Änderung wird veröffentlicht.

Das Exportformat ist **v7** mit optionalem numerischem Prätestwert (`null` bedeutet fehlend). v1–v6 werden importiert und migriert. Ältere externe Editoren müssen vor Nutzung neuer Felder gesondert geprüft werden. Die private Mac-App liegt außerhalb dieses Repositorys und wird nicht mit veröffentlicht.

## Offline-Aktualisierung

Der Build erzeugt eine inhaltsabhängige Cache-Revision und hält Hauptseite, Simulation, Informationsseiten und Datenmodule lokal vor. Ein vollständiger Online-Aufruf ist Voraussetzung. Unterseiten erhalten bei Verbindungsfehlern ihren eigenen Cacheinhalt, nicht die Hauptseite als Ersatz.

Nach einem Update die App online öffnen und neu laden. Externe Leitlinienlinks sind nicht Teil des Offline-Caches. Browserspeicher kann gelöscht werden; eigene Ergänzungen als JSON sichern.

## Repository-Schutz

Branch Protection für `main`, verpflichtende erfolgreiche Prüfungen und fachlich nachvollziehbare Pull Requests sind empfohlen. `reviewed` wird erst nach dokumentierter menschlicher Einzelprüfung gesetzt.
