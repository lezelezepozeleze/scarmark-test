/** The roll-downs of the Actions panel (sheets/actions/action-panel.mjs) and the keys the action runner (helpers/item-actions.mjs) acts on. Pure data.
 * Each option is { label, requires }: the lang key, and the data path of a flag of the document that must be ticked for the option to be offered (null = always). An option a saved action already uses stays in its roll-down even when the flag is later unticked, so nothing is silently lost. */
import { TOXICITY_SKILL } from "./items.mjs";

/** "do": what an action does. An action without one is an "add effect" action (the first actions had no kind). */
export const ACTION_KIND_EFFECT = "effect";
export const ACTION_KIND_TEST = "test";
export const ACTION_KINDS = {
  [ACTION_KIND_EFFECT]: { label: "SCARMARK.Action.kindEffect" },
  [ACTION_KIND_TEST]: { label: "SCARMARK.Action.kindTest" }
};

/** The tests an action can roll: stored key -> { label, skill }. The test is a d100 roll against the ESL of that skill of the character, at the moment of the roll (so a toxicity penalty applied just before counts). */
export const ACTION_TESTS = {
  vitality: { label: "SCARMARK.Action.testVitality", skill: TOXICITY_SKILL }
};

/** "on": what an action's effect goes onto: the actor that carries the item, the selected tokens, or one item of that actor (a second roll-down then picks it). */
export const ACTION_TARGET_SELF = "self";
export const ACTION_TARGET_SELECTED_TOKEN = "selectedToken";
export const ACTION_TARGET_ITEM = "item";
export const ACTION_TARGETS = {
  [ACTION_TARGET_SELF]: { label: "SCARMARK.Action.targetSelf", requires: null },
  [ACTION_TARGET_SELECTED_TOKEN]: { label: "SCARMARK.Action.targetSelectedToken", requires: null },
  [ACTION_TARGET_ITEM]: { label: "SCARMARK.Action.targetItem", requires: null }
};

/**
 * "when": what sets an action off. `target` says whether an add-effect action asks "on what": a trigger without one always acts on the actor that carries the item (self). `card` is the chat card the action posts ({ one, many }: lang keys with {actor} {item} {target} {effect}); none for owned (nothing happens at a moment).
 *   owned      the effect applies by itself while the actor owns the item (the effect is made to transfer, see helpers/item-actions.mjs syncOwnedEffects)
 *   inspected  the character that has the item opens its sheet (not the GM)
 *   used       the Use icon of a usable item
 *   consumed   the Consume icon of a consumable item
 */
export const ACTION_TRIGGER_OWNED = "owned";
export const ACTION_TRIGGER_INSPECTED = "inspected";
export const ACTION_TRIGGER_USED = "used";
export const ACTION_TRIGGER_CONSUMED = "consumed";
export const ACTION_TRIGGERS = {
  [ACTION_TRIGGER_OWNED]: { label: "SCARMARK.Action.triggerOwned", requires: null, target: false, card: null },
  [ACTION_TRIGGER_INSPECTED]: { label: "SCARMARK.Action.triggerInspected", requires: null, target: true, card: { one: "SCARMARK.Action.cardInspected", many: "SCARMARK.Action.cardInspectedMany" } },
  [ACTION_TRIGGER_USED]: { label: "SCARMARK.Action.triggerUsed", requires: "system.usable", target: true, card: { one: "SCARMARK.Action.cardUsed", many: "SCARMARK.Action.cardUsedMany" } },
  [ACTION_TRIGGER_CONSUMED]: { label: "SCARMARK.Action.triggerConsumed", requires: "system.consumable", target: false, card: { one: "SCARMARK.Action.cardConsumed", many: "SCARMARK.Action.cardConsumedMany" } }
};
