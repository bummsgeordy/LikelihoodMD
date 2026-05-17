# Governance und fachliche Prüfung

Dieses Projekt ist als öffentliches Lehr- und Rechentool angelegt. Damit die Zahlen nachvollziehbar bleiben, gelten folgende Regeln.

## Rollen

- Maintainer prüfen technische Konsistenz, Datenformat, Tests und Deployment.
- Medizinische Beitragende liefern Quellen, Populationen, Begründungen und Grenzen.
- Fachliche Freigabe bedeutet: Die Annahme ist transparent dokumentiert, nicht automatisch klinisch allgemein gültig.

## Mindestanforderungen an kuratierte Daten

- Jede Testgüte und jede Prätest-Annahme braucht mindestens eine Quelle.
- Jede Quelle braucht eine Kurznotiz zur Übertragbarkeit.
- Jede Annahme braucht Population, Setting, Begründung und Grenzen.
- Konkurrierende Studienwerte werden als getrennte Evidenzprofile geführt, nicht gegenseitig überschrieben.
- Bewusst abweichende eigene Werte werden als Szenario mit Abweichungsgrund markiert.
- Werte ohne klare Population werden nicht als kuratierte Standardwerte übernommen.

## Review-Checkliste

- Ist der intended use beschrieben?
- Sind Cut-off, Methode und Population eindeutig?
- Sind Sensitivität/Spezifität oder LR-Werte rechnerisch plausibel?
- Ist die Prätestwahrscheinlichkeit als Setting-Annahme und nicht als individuelle Patientendaten formuliert?
- Sind Grenzen und Störfaktoren sichtbar?
- Wurde `npm run validate:data` ausgeführt?

## Regulatorische Grenze

Die Anwendung darf nicht so beschrieben werden, dass sie eine individuelle Diagnose oder Therapieentscheidung vorgibt. Falls das Projekt später als klinisches Entscheidungsprodukt eingesetzt oder beworben werden soll, ist ein separater regulatorischer Review erforderlich.
