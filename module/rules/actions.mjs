/** Actions of an item: which of them a trigger sets off. Pure. */

/**
 * The actions that fire on `trigger`: the ones whose "when" is that trigger and that name an effect.
 *
 * @param {Array<{effect?: string, on?: string, when?: string}>|undefined} actions the item's actions
 * @param {string} trigger a key of ACTION_TRIGGERS
 */
export function actionsFor(actions, trigger) {
  return (actions ?? []).filter(action => action.when === trigger && action.effect);
}
