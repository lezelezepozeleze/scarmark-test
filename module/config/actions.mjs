/** The roll-downs of the Actions panel (sheets/actions/action-panel.mjs) and the keys the action runner (helpers/item-actions.mjs) acts on. Pure data.
 * Each option is { label, requires }: the lang key, and the data path of a flag of the document that must be ticked for the option to be offered (null = always). An option a saved action already uses stays in its roll-down even when the flag is later unticked, so nothing is silently lost. */

/** "do": what an action does: add an effect, roll a test, alter an item, or send a chat message. An action without a kind is an "add effect" action (the first actions had no kind). */
export const ACTION_KIND_EFFECT = "effect";
export const ACTION_KIND_TEST = "test";
export const ACTION_KIND_ALTER = "alter";
export const ACTION_KIND_MESSAGE = "message";
export const ACTION_KINDS = {
  [ACTION_KIND_EFFECT]: { label: "SCARMARK.Action.kindEffect" },
  [ACTION_KIND_TEST]: { label: "SCARMARK.Action.kindTest" },
  [ACTION_KIND_ALTER]: { label: "SCARMARK.Action.kindAlter" },
  [ACTION_KIND_MESSAGE]: { label: "SCARMARK.Action.kindMessage" }
};

/**
 * The ways to alter an item: stored key -> { label, itemTypes, needsEffect, card }. `itemTypes` are the kinds of item of the carrying character the picker offers; `needsEffect`: the action also names an effect (improve puts a copy of it on the item); `card` is the public chat card ({item} {target} {effect}).
 *   repair   the wear goes back to full (armor: every location to the original durability) and the temporary modifiers the item got from "improve" are removed; permanent ones stay
 *   improve  a copy of the effect is put on the item as a modifier (once per source: an item that already has an effect from the same source is refused)
 */
export const ACTION_ALTER_REPAIR = "repair";
export const ACTION_ALTER_IMPROVE = "improve";
export const ACTION_ALTERATIONS = {
  [ACTION_ALTER_REPAIR]: { label: "SCARMARK.Action.alterRepair", itemTypes: ["armor"], needsEffect: false, card: "SCARMARK.Action.cardRepair" },
  [ACTION_ALTER_IMPROVE]: { label: "SCARMARK.Action.alterImprove", itemTypes: ["armor", "weapon"], needsEffect: true, card: "SCARMARK.Action.cardImprove" }
};

/** The stats an effect on a weapon or armor can modify. The effect change key is ITEM_MOD_KEY_PREFIX + the stat (e.g. "system.itemMods.impact.edged"), type add; the item sums them (rules/item-mods.mjs) into system.effective, which combat reads. The stored fields are never changed. */
export const ITEM_MOD_KEY_PREFIX = "system.itemMods.";
export const ITEM_MOD_STATS = {
  weapon: ["attack", "defense", "impact.blunt", "impact.edged", "impact.piercing", "impact.fire"],
  armor: ["protection.blunt", "protection.edged", "protection.piercing", "protection.fire"]
};

/** "on": who an add-effect action's effect goes onto: the actor that carries the item, or the selected tokens. */
export const ACTION_TARGET_SELF = "self";
export const ACTION_TARGET_SELECTED_TOKEN = "selectedToken";
export const ACTION_TARGETS = {
  [ACTION_TARGET_SELF]: { label: "SCARMARK.Action.targetSelf", requires: null },
  [ACTION_TARGET_SELECTED_TOKEN]: { label: "SCARMARK.Action.targetSelectedToken", requires: null }
};

/**
 * "when": what sets an action off. `target` says whether an add-effect action asks "on what": a trigger without one always acts on the actor that carries the item (self). `card` is the chat cards of the trigger ({ one, many, message, announce }: lang keys with {actor} {item} {target} {effect} {message}; `announce` is the plain "<actor> used <item>." the chat gets when no action already said it, only used and consumed have one); none for owned (nothing happens at a moment).
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
  [ACTION_TRIGGER_INSPECTED]: { label: "SCARMARK.Action.triggerInspected", requires: null, target: true, card: { one: "SCARMARK.Action.cardInspected", many: "SCARMARK.Action.cardInspectedMany", message: "SCARMARK.Action.messageInspected" } },
  [ACTION_TRIGGER_USED]: { label: "SCARMARK.Action.triggerUsed", requires: "system.usable", target: true, card: { one: "SCARMARK.Action.cardUsed", many: "SCARMARK.Action.cardUsedMany", message: "SCARMARK.Action.messageUsed", announce: "SCARMARK.Action.announceUsed" } },
  [ACTION_TRIGGER_CONSUMED]: { label: "SCARMARK.Action.triggerConsumed", requires: "system.consumable", target: false, card: { one: "SCARMARK.Action.cardConsumed", many: "SCARMARK.Action.cardConsumedMany", message: "SCARMARK.Action.messageConsumed", announce: "SCARMARK.Action.announceConsumed" } }
};
