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
- Jeder kuratierte Datensatz braucht `reviewStatus`, `evidenceQuality` und `dataCompleteness`.
- Konkurrierende Studienwerte werden als getrennte Evidenzprofile geführt, nicht gegenseitig überschrieben.
- Bewusst abweichende eigene Werte werden als Szenario mit Abweichungsgrund markiert.
- Werte ohne klare Population werden nicht als kuratierte Standardwerte übernommen.
- Binäre LR-Berechnung ist nur bei passender Population, Methode und Cut-off zulässig. Kategorische und workflowbasierte Verfahren erhalten keine LR-1/1-Platzhalter.
- Quellenabgleich allein setzt keinen Eintrag auf `reviewed`; dafür ist ein benannter fachlicher Reviewer erforderlich.
- `sourceCheck` nennt Datum, konkrete Fundstelle und Einordnung: `verified` (abgeglichen), `restricted` (eingeschränkt/offen), `withdrawn` (numerische Nutzung zurückgezogen). Der Status bezieht sich auf den dokumentierten Inhalt, nicht pauschal auf jede Aussage einer Quelle.

## Reviewstatus

- `reviewed` wird nur nach fachlicher Prüfung durch Maintainer oder benannte medizinische Reviewer gesetzt.
- `needs-review` bleibt der konservative Standard für kuratierte Startwerte und importierte Vorschläge, die noch nicht final geprüft wurden.
- `draft` kennzeichnet lokale oder unvollständige Vorschläge.
- Unsichere oder nicht direkt datenbasierte Annahmen werden zusätzlich mit `expert-opinion`, `unclear`, `partial` oder `minimal` markiert.
- Konkurrierende Studien, Cut-offs oder Populationen werden als separate Evidenzprofile aufgenommen, damit Nutzer die Annahme bewusst auswählen können.

## Prätestwahrscheinlichkeiten

Die hinterlegten Prätestwahrscheinlichkeiten sind quellenbasierte Startwerte für didaktische Visualisierung und klinische Entscheidungsunterstützung. Sie sind keine harte Wahrheit und dürfen nicht als alleinige Diagnose- oder Therapiegrundlage verwendet werden.

Die Verlässlichkeit wird konservativ markiert. Direkt gemessene Setting-Daten sind belastbarer als ähnliche Referral-Kohorten, Register-/Routinedaten, leitlinien- oder reviewbasierte Schätzungen und lokale Expertenschätzungen. Lokale Population, Überweisungskontext, Spektrumseffekte, Präanalytik und Medikamente können die Prätestwahrscheinlichkeit und die Testinterpretation erheblich verändern.

Klinische Modifikatoren werden nicht addiert. Die aktuelle Rechenvorschau erlaubt nur einen einzelnen, quellengeprüften diagnostischen LR ohne bekannte Überlappung. Odds Ratios, mehrere korrelierte Faktoren und Testinterferenzen erzeugen keine neue Prozentzahl. Erkrankungsrisiko und Testverfälschung werden getrennt dargestellt.

`probability: null` bezeichnet einen fehlenden Punktwert. Auch eine Leitlinienspanne rechtfertigt keinen automatisch gewählten Mittelpunkt. `evidenceLevel: direct` ist ein historisches Zuordnungsfeld, kein Beleg direkt gemessener Prävalenz; maßgeblich sind `origin`, Quellenfundstelle und Population.

`pretest-assumptions.json` ist die einzige kanonische Prätestbasis. Konkurrierende Populationen werden getrennt benannt. Pro Erkrankung, Setting und Population darf nur eine aktive Startannahme bestehen.

## Review-Checkliste

- Ist der intended use beschrieben?
- Sind Cut-off, Methode und Population eindeutig?
- Sind Sensitivität/Spezifität oder LR-Werte rechnerisch plausibel?
- Ist die Prätestwahrscheinlichkeit als Setting-Annahme und nicht als individuelle Patientendaten formuliert?
- Sind Grenzen und Störfaktoren sichtbar?
- Sind Reviewstatus, Evidenzqualität und Datenvollständigkeit konservativ gesetzt?
- Ist ein klinischer Modifikator nur dann quantifiziert, wenn der Faktor/LR selbst belegt ist?
- Gibt es Hinweise auf Doppelzählung zwischen Setting-Prätestannahme und Modifikator?
- Wurde `npm run validate:data` ausgeführt?
- Ist der Eintrag korrekt als `binary-lr`, `categorical` oder `workflow-only` klassifiziert?
- Hat eine Diagnostikkette einen klinisch begründeten Fortsetzungs- oder Stopppfad?

## GitHub-Prozess

- GitHub Pages sollte über Actions deployen.
- `main` sollte per Branch Protection geschützt werden.
- Pull Requests sollten erst nach grünem `validate`, `test` und `build` gemergt werden.
- Beiträge von außen laufen bevorzugt über Issue-Templates oder JSON-Vorschläge aus dem Tool.

## Regulatorische Grenze

Die Anwendung darf nicht so beschrieben werden, dass sie eine individuelle Diagnose oder Therapieentscheidung vorgibt. Falls das Projekt später als klinisches Entscheidungsprodukt eingesetzt oder beworben werden soll, ist ein separater regulatorischer Review erforderlich.

Ein Disclaimer ersetzt diese Prüfung nicht. Neue Praxisfragen bleiben indikationsbezogene Lehrinhalte ohne automatische Therapieentscheidung. Befund, Diagnose, Prognose und Handlungsentscheidung sind getrennt zu prüfen; ein günstigerer Prozentwert allein definiert keinen Patientennutzen.
