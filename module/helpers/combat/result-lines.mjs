/** The result-card lines for the Attacker's and Defender's Opportunity and for a tied Riposte. Only the card text lives here; the outcome itself (resolveOutcome, isBlockResult) is pure and lives in rules/outcome.mjs (not to be confused with this file's old name). */

import { L } from "./util.mjs";
import { esc } from "../escape.mjs";

/**
 * Result-card lines for an Attacker's / Defender's Opportunity: the announcement
 * plus an "Initiate ..." button. ata and dta are mutually exclusive, so at most
 * one shows. The button launches a classic attack from the clicker's controlled
 * token (wired in wireCombatCard), so the winner selects their token, targets
 * the foe, and clicks to strike. (data-ta values kept for older chat messages.)
 */
export function taLines(outcome, attacker, target) {
  if (outcome.ata) return [
    `<div class="card-line ta">${esc(attacker.name)} &mdash; ${L("attackersOpportunity")}</div>`,
    `<div class="card-buttons"><button data-ta="ata">${L("initiateAttackersOpportunity")}</button></div>`
  ];
  if (outcome.dta) return [
    `<div class="card-line ta">${esc(target.name)} &mdash; ${L("defendersOpportunity")}</div>`,
    `<div class="card-buttons"><button data-ta="dta">${L("initiateDefendersOpportunity")}</button></div>`
  ];
  return [];
}

/** Riposte on an equal success level: say which roll won the tie, or that it was dead even. */
export function tieLines(outcome) {
  const t = outcome.tie;
  if (!t) return [];
  const key = t.winner === "defender" ? "riposteTieDefender" : t.winner === "attacker" ? "riposteTieAttacker" : "riposteTieEven";
  return [`<div class="card-line">${game.i18n.format(`SCARMARK.CombatAuto.${key}`, { a: t.a, d: t.d })}</div>`];
}
