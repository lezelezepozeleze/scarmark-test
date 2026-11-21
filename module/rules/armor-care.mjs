/** Repairing an armor piece: a one-shot change of its stored data. Armor wear is stored per location (the condition of each coverage entry; the durability is their average). Pure. */
import { startingCondition } from "./locations.mjs";
import { QUALITY_PERMANENT } from "../config/index.mjs";

/**
 * Repair: every covered location goes back to the original durability of the piece (a piece with no original durability: its current one, else the default; see startingCondition).
 *
 * @param {{coverage: {condition: number}[], originalQuality: number, quality: number}} armor the stored data of the armor
 * @returns {{coverage: object[]}} the fields to write
 */
export function repairedArmor({ coverage, originalQuality, quality }) {
  const full = startingCondition(originalQuality, quality);
  return { coverage: coverage.map(entry => ({ ...entry, condition: full })) };
}

/**
 * Why an armor piece cannot be repaired, or null when it can: "natural" (Natural Armor never wears) or "noCoverage" (it covers no location).
 *
 * @param {{coverage?: object[], quality?: number}} armor the stored data of the armor
 * @returns {"natural"|"noCoverage"|null}
 */
export function armorRepairProblem(armor) {
  if (armor.quality === QUALITY_PERMANENT) return "natural";
  if (!(armor.coverage ?? []).length) return "noCoverage";
  return null;
}
