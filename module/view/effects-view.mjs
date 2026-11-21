/**
 * View models of Active Effects for the sheets: the Effects tab groups and the options of the change-key picker. Pure: no Foundry globals; the text comes through `localize`.
 */
import { ATTRIBUTES, EFFECT_PICKER_GROUPS, ITEM_MOD_STATS, ITEM_MOD_KEY_PREFIX } from "../config/index.mjs";

/**
 * Split a Document's effects into Temporary / Passive / Inactive groups.
 * Standard Foundry convention: has a duration -> Temporary, disabled -> Inactive, else Passive.
 */
export function categorizeEffects(effects) {
  const categories = { temporary: [], passive: [], inactive: [] };
  for (const effect of effects) {
    if (effect.disabled) categories.inactive.push(effect);
    else if (effect.isTemporary) categories.temporary.push(effect);
    else categories.passive.push(effect);
  }
  return categories;
}

/**
 * Grouped {label, key} options for the Active Effect change-key picker. Combines
 * the static mod keys (EFFECT_PICKER_GROUPS, the same 18 keys as SCARMARK.effectKeys), one entry per Attribute base, and -
 * if the effect belongs to an Actor - one entry per skill on that Actor (so the
 * exact ALL-CAPS name is offered and no case guessing is needed).
 *
 * @param {object} effectDoc the ActiveEffect being edited (read: parent, parent.parent)
 * @param {{skillNames?: string[], localize: (key: string) => string}} context the canonical skill names (from the Skills compendium) and the translator
 */
export function buildEffectKeyOptions(effectDoc, { skillNames = [], localize: t }) {
  // Static groups come from module/config/vocab.mjs EFFECT_PICKER_GROUPS (cloned: groups are extended below).
  const groups = EFFECT_PICKER_GROUPS.map(g => ({ label: t(g.label), options: g.options.map(([key, label]) => [key, t(label)]) }));

  // Per-attribute base.
  groups.push({
    label: t("SCARMARK.EffectPicker.groupAttributes"),
    options: Object.keys(ATTRIBUTES).map(k => [`system.attributes.${k}.base`, t(ATTRIBUTES[k].label)])
  });

  // Individual skills: the canonical Skills compendium (cached at ready) unioned
  // with any skills already on the owning Actor. Offering the compendium list
  // means item effects (a potion with no actor yet) still get the full menu; the
  // key `system.mods.skill.<Name>` pairs by name once the effect lands on an actor.
  const parent = effectDoc?.parent;
  const actor = parent?.documentName === "Actor" ? parent
    : (parent?.parent?.documentName === "Actor" ? parent.parent : null);
  const names = new Set(skillNames);
  for (const i of actor?.items ?? []) {
    if (i.type === "skill" || i.type === "psionic") names.add(i.name);
  }
  if (names.size) {
    groups.push({
      label: t("SCARMARK.EffectPicker.groupIndividual"),
      options: [...names].sort((a, b) => a.localeCompare(b)).map(n => [`system.mods.skill.${n}`, n])
    });
  }

  // On a weapon or armor piece: its own stats (rules/item-mods.mjs). The effect must not transfer to the owner for them to count.
  const itemStats = ITEM_MOD_STATS[parent?.documentName === "Item" ? parent.type : ""];
  if (itemStats) {
    const label = (stat) => stat.split(".").map((part, i) => (i === 0 ? t(`SCARMARK.EffectPicker.item.${part}`) : t(`SCARMARK.Aspect.${part}`))).join(": ");
    groups.push({
      label: t(parent.type === "weapon" ? "SCARMARK.EffectPicker.groupItemWeapon" : "SCARMARK.EffectPicker.groupItemArmor"),
      options: itemStats.map(stat => [`${ITEM_MOD_KEY_PREFIX}${stat}`, label(stat)])
    });
  }

  return groups;
}
