import { cohortCounts, formatExpectedCount } from "../lib/cohortExplanation";
import "../frequency.css";
import type { EvidenceProfile } from "../types";
import { element as el } from "./dom";

export function renderFrequencyTree(
  host: HTMLElement,
  profile: EvidenceProfile,
  probability: number,
  denominator = 1000,
): void {
  host.replaceChildren();
  const c = cohortCounts(profile, probability, denominator);
  if (!c) {
    host.append(
      el(
        "p",
        "Kein Häufigkeitsbaum: direkt belegte Sensitivität und Spezifität erforderlich. LR-Werte werden nicht rückwärts in Testgüte umgerechnet.",
      ),
    );
    return;
  }
  host.append(
    el(
      "p",
      `${denominator.toLocaleString("de-DE")} ähnliche Personen · modellierte Erwartungswerte, keine beobachtete Patientengruppe.`,
      "frequency-root",
    ),
  );
  const branches = el("div", "", "frequency-branches");
  const branch = (
    title: string,
    count: number,
    first: string,
    a: number,
    second: string,
    b: number,
    kind: string,
  ) => {
    const section = el("section", "", kind);
    section.append(el("h4", `${formatExpectedCount(count)} ${title}`));
    const outcomes = el("div", "", "frequency-leaves");
    outcomes.append(
      el("p", `${first}: ${formatExpectedCount(a)}`),
      el("p", `${second}: ${formatExpectedCount(b)}`),
    );
    section.append(outcomes);
    return section;
  };
  branches.append(
    branch(
      "erkrankt",
      c.diseased,
      "Richtig positiv",
      c.truePositive,
      "Falsch negativ",
      c.falseNegative,
      "diseased",
    ),
    branch(
      "nicht erkrankt",
      c.notDiseased,
      "Falsch positiv",
      c.falsePositive,
      "Richtig negativ",
      c.trueNegative,
      "healthy",
    ),
  );
  host.append(branches);
}
