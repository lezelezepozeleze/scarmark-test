/** Running the actions of an item: "add <effect> on <target> when: <trigger>". Using a usable item sets off its "used" actions. */
import { ACTION_TARGET_SELECTED_TOKEN, ACTION_TARGET_SELF, ACTION_TARGET_ITEM, ACTION_TRIGGER_USED } from "../config/index.mjs";
import { actionsFor } from "../rules/index.mjs";
import { stampEffectData, currentWorldTime } from "./effect-library.mjs";

/** The documents (actors, or one item of the owner) an action's "on" names for this item; empty when there are none. */
function targetsOf(action, item) {
  const owner = item.parent?.documentName === "Actor" ? item.parent : null;
  if (action.on === ACTION_TARGET_SELF) return owner ? [owner] : [];
  if (action.on === ACTION_TARGET_ITEM) {
    const target = owner?.items.get(action.targetItem);
    return target ? [target] : [];
  }
  if (action.on === ACTION_TARGET_SELECTED_TOKEN) return [...new Set((canvas.tokens?.controlled ?? []).map(token => token.actor).filter(Boolean))];
  return [];
}

/** The lang key of the warning for an action that has nobody to act on. */
const NO_TARGET_MESSAGE = {
  [ACTION_TARGET_SELF]: "SCARMARK.Action.noOwner",
  [ACTION_TARGET_ITEM]: "SCARMARK.Action.noTargetItem",
  [ACTION_TARGET_SELECTED_TOKEN]: "SCARMARK.Action.noTarget"
};

/**
 * What the actions of `item` that fire on `trigger` would do: one entry per action, { on, data, targets }, with the effect already stamped for putting on an actor. Actions that cannot run (the effect is gone, nobody to target) are reported to the user and left out.
 */
export async function planActions(item, trigger) {
  const plan = [];
  for (const action of actionsFor(item.system.actions, trigger)) {
    const effect = await fromUuid(action.effect);
    if (!effect) {
      ui.notifications.warn(game.i18n.format("SCARMARK.Action.effectMissing", { item: item.name }));
      continue;
    }
    const targets = targetsOf(action, item);
    if (!targets.length) {
      ui.notifications.warn(game.i18n.localize(NO_TARGET_MESSAGE[action.on] ?? "SCARMARK.Action.noTarget"));
      continue;
    }
    plan.push({ on: action.on, data: stampEffectData(effect.toObject(), { now: currentWorldTime(), origin: item.uuid }), targets });
  }
  return plan;
}

/** Put the effect of every plan entry on its targets (the ones the user owns). An effect put on an item is made to transfer, so it applies to the actor that owns the item. Returns how many effects were added. */
export async function applyPlan(plan) {
  let applied = 0;
  for (const { data, targets } of plan) {
    for (const target of targets) {
      if (!target.isOwner) {
        ui.notifications.warn(game.i18n.format("SCARMARK.Action.noPermission", { actor: target.name }));
        continue;
      }
      const copy = foundry.utils.deepClone(data);
      if (target.documentName === "Item") copy.transfer = true;
      await target.createEmbeddedDocuments("ActiveEffect", [copy]);
      applied++;
    }
  }
  return applied;
}

/** Set off the actions of `item` that fire on `trigger`. Returns how many effects were added. */
export async function runActions(item, trigger) {
  return applyPlan(await planActions(item, trigger));
}

/** Use an item: set off its "when used" actions. */
export async function useItem(item) {
  try {
    if (!actionsFor(item.system.actions, ACTION_TRIGGER_USED).length) {
      ui.notifications.info(game.i18n.format("SCARMARK.Gear.usedNothing", { name: item.name }));
      return;
    }
    if (await runActions(item, ACTION_TRIGGER_USED)) ui.notifications.info(game.i18n.format("SCARMARK.Gear.used", { name: item.name }));
  } catch (err) {
    console.error("Scarmark | use failed", err);
    ui.notifications.error(game.i18n.format("SCARMARK.Gear.useFailed", { error: err.message }));
  }
}
