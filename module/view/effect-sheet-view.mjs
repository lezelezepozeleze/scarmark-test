/**
 * The view model of the effect sheet (sheets/effect-sheet.mjs, templates/effect/sheet.hbs): everything the template shows, worked out here so the template only loops and prints. Pure: the text comes through `localize`.
 */
import { CHARACTER_CHANGE_TYPES, SIMPLE_CHANGE_TYPES, DURATION_UNITS, EFFECT_TARGET_CHARACTER, ITEM_MOD_DEFAULT_PRIORITY, ON_HIT_ITEM_TYPES, ALTERATION_REPAIR } from "../config/index.mjs";
import { FLAGS } from "../constants.mjs";
import { effectFlags, rewriteTarget } from "../rules/index.mjs";

/** A roll-down option. */
const option = (value, label, current) => ({ value, label, selected: value === current });

/** Stat groups as roll-down groups with the current key selected; a key no group offers (typed by hand, or left from another type) gets a group of its own so it is not lost. */
function keyGroups(groups, current, t) {
  const result = groups.map(group => ({ label: group.label, options: group.options.map(([value, label]) => option(value, label, current)) })).filter(group => group.options.length);
  if (current && !result.some(group => group.options.some(entry => entry.selected))) result.push({ label: t("SCARMARK.Effect.otherKey"), options: [option(current, current, current)] });
  return result;
}

/** The label of a change type: the words of the sheet ("override" is "set"), else the type itself. */
const CHANGE_TYPE_LABELS = {
  add: "SCARMARK.Effect.changeType.add",
  multiply: "SCARMARK.Effect.changeType.multiply",
  upgrade: "SCARMARK.Effect.changeType.upgrade",
  downgrade: "SCARMARK.Effect.changeType.downgrade",
  override: "SCARMARK.Effect.changeType.override"
};

/** The units of a duration, with their words. */
const UNIT_LABELS = Object.fromEntries(DURATION_UNITS.map(unit => [unit, `SCARMARK.Effect.unit.${unit}`]));

/**
 * What the effect sheet shows.
 *
 * @param {object} effect the effect as plain data ({ name, img, description, disabled, transfer, duration, system: { changes }, flags })
 * @param {object} o
 * @param {{start: string, types: {type: string, label: string, groups: object[]}[]}} o.picker the stats per type (effects-view.mjs buildEffectTypes)
 * @param {(key: string) => string} o.localize the translator
 * @param {boolean} o.onItem whether the effect sits on an item (only then can it pass to the owner)
 * @param {{label: string, options: {value: string, label: string}[]}[]} [o.tests] the tests a poison can ask for
 * @param {{label: string, entries: {uuid: string, name: string}[]}[]} [o.library] the effects a failed test can put on the target
 */
export function buildEffectSheet(effect, { picker, localize: t, onItem, tests = [], library = [] }) {
  const flags = effectFlags(effect);
  const type = picker.types.some(entry => entry.type === flags[FLAGS.effectType]) ? flags[FLAGS.effectType] : picker.start;
  const immediate = flags[FLAGS.immediate] === true;
  const isCharacter = type === EFFECT_TARGET_CHARACTER;
  const stats = picker.types.find(entry => entry.type === type).groups
    // An immediate effect can only rewrite stored values: attributes, fatigue and skill levels of a character.
    .map(group => (immediate && isCharacter ? { ...group, options: group.options.filter(([key]) => rewriteTarget(key)) } : group));
  const changeTypes = immediate || !isCharacter ? SIMPLE_CHANGE_TYPES : CHARACTER_CHANGE_TYPES;
  const defaultPriority = (changeType) => ITEM_MOD_DEFAULT_PRIORITY[changeType] ?? "";

  const rows = Array.from(effect.system?.changes ?? [], (change, index) => ({
    index,
    keyGroups: keyGroups(stats, change.key ?? "", t),
    typeOptions: [...new Set([...changeTypes, change.type ?? "add"])].map(value => option(value, t(CHANGE_TYPE_LABELS[value] ?? value), change.type ?? "add")),
    value: change.value ?? "",
    priority: change.priority ?? "",
    priorityHint: String(defaultPriority(change.type ?? "add")),
    phase: change.phase ?? "initial"
  }));

  const onHitAllowed = ON_HIT_ITEM_TYPES.includes(type) && !immediate;
  return {
    flagPrefix: `flags.${FLAGS.scope}.`,
    name: effect.name ?? "",
    img: effect.img ?? "icons/svg/aura.svg",
    description: effect.description ?? "",
    disabled: Boolean(effect.disabled),
    typeOptions: picker.types.map(entry => option(entry.type, entry.label, type)),
    kindOptions: [option("ongoing", t("SCARMARK.Effect.kindOngoing"), immediate ? "immediate" : "ongoing"), option("immediate", t("SCARMARK.Effect.kindImmediate"), immediate ? "immediate" : "ongoing")],
    kindHint: t(immediate ? "SCARMARK.Effect.hintImmediate" : "SCARMARK.Effect.hintOngoing"),
    rows,
    hasRows: rows.length > 0,
    showDuration: !immediate,
    durationValue: effect.duration?.value ?? "",
    unitOptions: DURATION_UNITS.map(unit => option(unit, t(UNIT_LABELS[unit]), effect.duration?.units ?? "seconds")),
    showTransfer: onItem && isCharacter && !immediate,
    transfer: Boolean(effect.transfer),
    showUnique: !immediate,
    unique: flags[FLAGS.unique] === true,
    showRepair: type === "armor" && immediate,
    repair: flags[FLAGS.alteration] === ALTERATION_REPAIR,
    showOnHit: onHitAllowed,
    onHit: flags[FLAGS.onHit] === true,
    onHitTests: [{ label: "", options: [option("", "", flags[FLAGS.onHitTest] ?? "")] }, ...tests.map(group => ({ label: group.label, options: group.options.map(entry => option(entry.value, entry.label, flags[FLAGS.onHitTest] ?? "")) }))],
    onHitEffects: [{ label: "", options: [option("", "", flags[FLAGS.onHitEffect] ?? "")] }, ...library.map(group => ({ label: group.label, options: group.entries.map(entry => option(entry.uuid, entry.name, flags[FLAGS.onHitEffect] ?? "")) }))],
    charges: flags[FLAGS.charges] ?? ""
  };
}
