/**
 * Authoritative game-rule CALCULATIONS (pure functions: inputs in, result out). This barrel re-exports every file of module/rules/; import from "rules/index.mjs", never from a single file.
 *
 * See docs/AGENTS.md (folder ownership) and docs/RULES_INDEX.md (where each mechanic lives).
 *
 * Lint (eslint.config.mjs) forbids Foundry globals, Math.random and imports from data/, helpers/, sheets/, foundry/ in this folder.
 */
export { strikeDice, injuryLevelFor, armorAfterPiercing, armorWears, pickWeighted } from "./strike.mjs";
export { capTarget, outcomeLevel } from "./d100.mjs";
export { durationSeconds } from "./time.mjs";
export { actionsFor } from "./actions.mjs";
export { locationKey, covers, locationSide, hasSides, coversLocation, entryIndexesAt, holdsAt, wearIndexAt, averageCondition, startingCondition, splitBothSides, legacyCoverage, entryValue, entryFromValue, pickerEntries, armorLocationLabel } from "./locations.mjs";
export { vitalWoundFor, severityKey, injuryFor, mendLabel, shockTarget, stunProtectionBonus } from "./wounds.mjs";
export { spellLevelPenalty, invocationPenalty, spellTarget, invocationTarget, invocationFpCost, spellFatigue, mendWoundLevelDelta } from "./esoterics.mjs";
export { rangedBlockShields, dodgeVsMissile, rangeBand, aimKey, aimPartKeys, aimPartKey, aimPenalty, matchesAimPart, outnumberedPenaltyFor, protectionSum } from "./combat.mjs";
export { resolveOutcome, isBlockResult } from "./outcome.mjs";
export { skillBase, enduranceOf, loadState, conditionState, conditionPctOf, conditionResourceOf, moveResourceOf, skillBaseDeltaBonus, skillDeltaBonusOf, skillOverridesOf, sunsignBonusOf, skillCategoryMod, fatiguePenaltyOf, loadKgOf, woundLevelOf, worstVital, conditionOf, effectiveAttribute, skillEslOf, standaloneEslOf } from "./derived.mjs";
export { itemTotals, gearIsCarried, gearSummary, containerLoad, ownWeight, itemWeight, containerCapacity, directChildren, contentsWeight, containerFill, chestLayout, splitQuantity, stackSignature, mergeCandidates, buildTransferCopies } from "./inventory.mjs";
export { HELPER_GROUPS, HELPER_GROUP, isCarried, attackable, damageLetters, combatBuckets } from "./combat-helper.mjs";
export { maneuverTextValues } from "./maneuvers.mjs";
export { locationWeights, strikeLocationIndex, fumbleStumbleKind, impactBonusFor } from "./strike-helpers.mjs";
export { mendTarget, psionicTarget } from "./roll-targets.mjs";
