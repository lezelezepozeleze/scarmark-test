/** The roll-downs of the Actions panel (sheets/actions/action-panel.mjs) and the keys the action runner (helpers/item-actions.mjs) acts on. Pure data.
 * Each option is { label, requires }: the lang key, and the data path of a flag of the document that must be ticked for the option to be offered (null = always). An option a saved action already uses stays in its roll-down even when the flag is later unticked, so nothing is silently lost. */

/** "on": what an action's effect goes onto: the actor that carries the item, the selected tokens, or one item of that actor (a second roll-down then picks it). */
export const ACTION_TARGET_SELF = "self";
export const ACTION_TARGET_SELECTED_TOKEN = "selectedToken";
export const ACTION_TARGET_ITEM = "item";
export const ACTION_TARGETS = {
  [ACTION_TARGET_SELF]: { label: "SCARMARK.Action.targetSelf", requires: null },
  [ACTION_TARGET_SELECTED_TOKEN]: { label: "SCARMARK.Action.targetSelectedToken", requires: null },
  [ACTION_TARGET_ITEM]: { label: "SCARMARK.Action.targetItem", requires: null }
};

/** "when": what sets an action off. */
export const ACTION_TRIGGER_USED = "used";
export const ACTION_TRIGGERS = {
  [ACTION_TRIGGER_USED]: { label: "SCARMARK.Action.triggerUsed", requires: "system.usable" }
};
