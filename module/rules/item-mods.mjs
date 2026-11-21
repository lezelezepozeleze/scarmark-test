/** Modifiers on the stats of a weapon or armor piece: an Active Effect on the item (not transferring to the owner) with changes on ITEM_MOD_KEY_PREFIX keys adds to the stat. The stored fields are never touched; the item exposes the sums as system.effective and combat reads those. Pure. */
import { ITEM_MOD_KEY_PREFIX, DAMAGE_ASPECTS } from "../config/index.mjs";

/** Whether a change adds (a V14 `type: "add"`, an older numeric `mode: 2`, or neither stated). */
const isAdd = (change) => change.type ? change.type === "add" : (change.mode === undefined || change.mode === 2);

/**
 * The sum of the item-stat changes of the effects of an item.
 *
 * @param {Array<{disabled?: boolean, transfer?: boolean, system?: {changes?: object[]}, changes?: object[]}>} effects the item's effects (those that are disabled or that transfer to the owner count for nothing)
 * @returns {Object<string, number>} stat -> sum, e.g. { "impact.edged": 2, attack: -1 }
 */
export function itemModsOf(effects) {
  const mods = {};
  for (const effect of effects ?? []) {
    if (effect.disabled || effect.transfer) continue;
    for (const change of effect.system?.changes ?? effect.changes ?? []) {
      if (!String(change.key ?? "").startsWith(ITEM_MOD_KEY_PREFIX) || !isAdd(change)) continue;
      const value = Number(change.value);
      if (!Number.isFinite(value)) continue;
      const stat = change.key.slice(ITEM_MOD_KEY_PREFIX.length);
      mods[stat] = (mods[stat] ?? 0) + value;
    }
  }
  return mods;
}

/** The weapon stats with the modifiers added. An impact of -1 ("this weapon lacks the aspect") stays -1. */
export function weaponEffective(weapon, mods) {
  const impact = {};
  for (const aspect of Object.keys(DAMAGE_ASPECTS)) {
    const base = weapon.impact?.[aspect] ?? 0;
    impact[aspect] = base < 0 ? base : base + (mods[`impact.${aspect}`] ?? 0);
  }
  return { attack: (weapon.attack ?? 0) + (mods.attack ?? 0), defense: (weapon.defense ?? 0) + (mods.defense ?? 0), impact };
}

/** The armor protection with the modifiers added. */
export function armorEffective(armor, mods) {
  const protection = {};
  for (const aspect of Object.keys(DAMAGE_ASPECTS)) protection[aspect] = (armor.protection?.[aspect] ?? 0) + (mods[`protection.${aspect}`] ?? 0);
  return { protection };
}

/**
 * A stat of a weapon or armor as combat sees it: the effective value (modifiers added) when the item has one, else the stored one.
 *
 * @param {object} system the item's system data
 * @param {string} path e.g. "attack", "impact.edged", "protection.blunt"
 */
export function effectiveStat(system, path) {
  const read = (data) => path.split(".").reduce((value, key) => value?.[key], data);
  return read(system?.effective) ?? read(system);
}
