/** Updates of combat items that belong to the other side, relayed through the active GM. */

import { L } from "./util.mjs";
import { QUERIES } from "../../constants.mjs";
import { LOCATION_SIDES } from "../../config/index.mjs";

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

/** Register the GM query (called once at init). */
export function registerScarmarkQueries() {
  CONFIG.queries[QUERIES.updateCombatItem] = handleUpdateCombatItem;
}
