/** Updates of combat items that belong to the other side, relayed through the active GM. */

import { L } from "./util.mjs";
import { QUERIES, FLAGS } from "../../constants.mjs";
import { LOCATION_SIDES, ON_HIT_ITEM_TYPES } from "../../config/index.mjs";
import { chargesAfterHit } from "../../rules/index.mjs";

/**
 * Update a combat item (weapon broken / shield WQ / armor AQ) even when it
 * belongs to the OTHER side. An exchange resolves on the client that clicked the
 * defense, which often doesn't own the opponent's gear (a player blocking an
 * NPC's club); such updates are relayed to the active GM through a user query.
 * @returns {Promise<boolean>} whether the update was applied
 */
export async function updateCombatItem(item, changes) {
  if (item.isOwner) { await item.update(changes); return true; }
  const gm = game.users.activeGM;
  if (!gm) { ui.notifications.warn(L("needGM")); return false; }
  try {
    await gm.query(QUERIES.updateCombatItem, { uuid: item.uuid, changes });
    return true;
  } catch (err) {
    console.warn("Scarmark | GM item update failed", err);
    ui.notifications.warn(L("needGM"));
    return false;
  }
}

/**
 * GM-side handler for updateCombatItem. Deliberately narrow: only weapon/armor
 * items, and only the fields combat wears or breaks: broken, quality and (armor) the coverage conditions.
 */
async function handleUpdateCombatItem({ uuid, changes } = {}) {
  const item = await fromUuid(uuid);
  if (!(item instanceof Item) || !["weapon", "armor"].includes(item.type)) throw new Error(game.i18n.localize("SCARMARK.CombatAuto.invalidCombatItem"));
  const allowed = {};
  if ("system.broken" in (changes ?? {})) allowed["system.broken"] = !!changes["system.broken"];
  if ("system.quality" in (changes ?? {})) {
    const q = Math.trunc(Number(changes["system.quality"]));
    if (Number.isFinite(q)) allowed["system.quality"] = q;
  }
  if (item.type === "armor" && Array.isArray(changes?.["system.coverage"])) {
    // The condition of each covered location (armor wear): keep only the three fields of an entry, the condition a whole number of 0 or more.
    const entries = changes["system.coverage"].map(e => ({ type: String(e?.type ?? ""), side: LOCATION_SIDES.includes(e?.side) ? e.side : "", condition: Math.max(0, Math.trunc(Number(e?.condition))) }));
    if (entries.every(e => e.type && Number.isFinite(e.condition))) allowed["system.coverage"] = entries;
  }
  if (!Object.keys(allowed).length) throw new Error(game.i18n.localize("SCARMARK.CombatAuto.nothingToUpdate"));
  await item.update(allowed);
  return true;
}

/** Spend one charge of an on-hit effect (a poisoned blade): one fewer, and the effect goes when none are left. An effect with no limit is left alone. */
async function spendCharge(effect) {
  const left = chargesAfterHit(effect.getFlag(FLAGS.scope, FLAGS.charges));
  if (left === null) return;
  if (left <= 0) await effect.delete();
  else await effect.setFlag(FLAGS.scope, FLAGS.charges, left);
}

/**
 * Spend one charge of an on-hit effect on a weapon or missile, even when the weapon belongs to the OTHER side (the exchange resolves on the client that clicked the defense, see updateCombatItem): relayed to the active GM when this user does not own it.
 * @returns {Promise<boolean>} whether the charge was spent
 */
export async function spendOnHitCharge(effect) {
  if (effect.isOwner) { await spendCharge(effect); return true; }
  const gm = game.users.activeGM;
  if (!gm) { ui.notifications.warn(L("needGM")); return false; }
  try {
    await gm.query(QUERIES.spendOnHitCharge, { uuid: effect.uuid });
    return true;
  } catch (err) {
    console.warn("Scarmark | GM charge spend failed", err);
    ui.notifications.warn(L("needGM"));
    return false;
  }
}

/** GM-side handler for spendOnHitCharge. Narrow: only an on-hit effect of a weapon or missile. */
async function handleSpendOnHitCharge({ uuid } = {}) {
  const effect = await fromUuid(uuid);
  if (!(effect instanceof ActiveEffect) || !ON_HIT_ITEM_TYPES.includes(effect.parent?.type) || effect.getFlag(FLAGS.scope, FLAGS.onHit) !== true) throw new Error(game.i18n.localize("SCARMARK.CombatAuto.invalidCombatItem"));
  await spendCharge(effect);
  return true;
}

/** Register the GM queries (called once at init). */
export function registerScarmarkQueries() {
  CONFIG.queries[QUERIES.updateCombatItem] = handleUpdateCombatItem;
  CONFIG.queries[QUERIES.spendOnHitCharge] = handleSpendOnHitCharge;
}
