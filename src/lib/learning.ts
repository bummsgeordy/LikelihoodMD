import type { EvidenceProfile } from "../types";
import { calculateProfileOutcome, isProbability } from "./calculations";
import { cohortCounts } from "./cohortExplanation";

export function learningScenario(
  profile: EvidenceProfile,
  probability: number,
  denominator = 1000,
) {
  if (!isProbability(probability)) return null;
  const outcome = calculateProfileOutcome(profile, probability);
  if (outcome.status !== "computed") return null;
  return {
    result: outcome.result,
    counts: cohortCounts(profile, probability, denominator),
  };
}

export const lectureCases = [
  {
    title: "Basisrate",
    question:
      "Hypothetischer Test: Sensitivität 90 %, Spezifität 90 %, Prätest 1 %. Was bedeutet ein positives Ergebnis?",
    clue: "Von 1000 Personen sind 10 erkrankt und 990 nicht erkrankt.",
    answer:
      "9 richtig positive und 99 falsch positive Befunde: 9 von 108 positiven Befunden, also etwa 8,3 %, betreffen Erkrankte. Ein positives Ergebnis allein ist keine Diagnose.",
    transfer:
      "Parallelfrage: Wie ändert sich die Begründung bei 10 % Prätest? Erst schätzen, dann im Vergleich prüfen.",
    source: "https://doi.org/10.1007/s10459-020-10025-8",
  },
  {
    title: "Interferenz",
    question: "ARR auffällig unter Betablocker. Ist PA damit gesichert?",
    clue: "Der Nenner der ARR, Renin, kann medikamentös supprimiert sein.",
    answer:
      "Aldosteronhöhe, Reninmethode, Kalium und Medikation prüfen. Eine sichere, fachärztlich abgestimmte Wiederholung kann informativer sein als sofortige Bestätigungskaskaden. Medikamente nicht eigenständig absetzen.",
    transfer:
      "Parallelfrage: Was ändert eine negative ARR unter Spironolacton?",
    source:
      "https://www.endocrine.org/clinical-practice-guidelines/primary-aldosteronism-2",
  },
  {
    title: "Testabhängigkeit",
    question:
      "Zwei Cortisoltests sind positiv. Darf man ihre veröffentlichten LR einfach multiplizieren?",
    clue: "Beide können auf dieselbe biologische Störung oder Interferenz reagieren.",
    answer:
      "Nur passende bedingte Testgüte rechtfertigt die sequenzielle Rechnung. Sonst klinisch bestätigen und Diskordanzen klären, ohne scheinpräzise Endwahrscheinlichkeit.",
    transfer:
      "Parallelfrage: Warum wäre ein negatives D-Dimer plus hypothetisch positives CT kein regulärer Ausschlusspfad?",
    source:
      "https://www.endocrine.org/clinical-practice-guidelines/diagnosis-of-cushing-syndrome",
  },
  {
    title: "Zufallsbefund",
    question:
      "Ein kleiner Schilddrüsenknoten wird zufällig entdeckt. Ist FNA automatisch der nächste Schritt?",
    clue: "Sonografische Kategorie, Größe, Warnmerkmale und klinischer Kontext bestimmen die Indikation.",
    answer:
      "EU-TIRADS 1 bedeutet kein Knoten. Auch bei vorhandenem Knoten ist nicht jede Kategorie oder Größe punktionsbedürftig. FNA-Kategorien werden nicht in positiv/negativ erzwungen.",
    transfer:
      "Parallelfrage: Was ändert ein suspekter Lymphknoten gegenüber einem stabilen kleinen Knoten?",
    source: "https://doi.org/10.1530/ETJ-23-0067",
  },
  {
    title: "Grenzwert",
    question:
      "IGF-1 knapp über der Altersnorm, ohne typischen Phänotyp. Ist Akromegalie bestätigt?",
    clue: "Grenzwert, Messmethode und Phänotyp sind unterschiedliche Informationen.",
    answer:
      "Assay, Referenz und Störfaktoren prüfen, IGF-1 ggf. wiederholen. OGTT kann bei unklarer Konstellation helfen. Er ist nicht pauschal für jeden typischen Fall obligatorisch.",
    transfer:
      "Parallelfrage: Was unterscheidet einen typischen Phänotyp mit IGF-1 >1,3 × ULN?",
    source: "https://doi.org/10.1007/s11102-023-01360-1",
  },
  {
    title: "Angemessenes Beobachten",
    question:
      "Ein grenznaher HbA1c ohne eindeutige Hyperglykämie-Symptome. Sofort Diagnose und Therapie?",
    clue: "Bestätigung und Verlässlichkeit des HbA1c müssen geklärt sein.",
    answer:
      "Ohne eindeutige Hyperglykämie benötigt die Diagnose Bestätigung. Nahe am Grenzwert können Verlauf und Wiederholung nach 3–6 Monaten sinnvoll sein; Störfaktoren, Symptome und Dringlichkeit verändern den Weg.",
    transfer:
      "Parallelfrage: Wie verändert eine Hämolyse die Wahl des Bestätigungstests?",
    source: "https://doi.org/10.2337/dc26-S002",
  },
] as const;
