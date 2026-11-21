/** The roll-downs of the Actions panel (sheets/actions/action-panel.mjs) and the keys the action runner (helpers/item-actions.mjs) acts on. Pure data: stored key -> lang key. */

/** "on": who an action's effect goes onto. */
export const ACTION_TARGET_SELECTED_TOKEN = "selectedToken";
export const ACTION_TARGETS = {
  [ACTION_TARGET_SELECTED_TOKEN]: "SCARMARK.Action.targetSelectedToken"
};

/** "when": what sets an action off. */
export const ACTION_TRIGGER_USED = "used";
export const ACTION_TRIGGERS = {
  [ACTION_TRIGGER_USED]: "SCARMARK.Action.triggerUsed"
};
