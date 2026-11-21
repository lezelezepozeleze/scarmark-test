/** Running the actions of an item: "add <effect> on <target> when <trigger>". Using a usable item sets off its "used" actions. */
import { ACTION_TARGET_SELECTED_TOKEN, ACTION_TRIGGER_USED } from "../config/index.mjs";
import { actionsFor } from "../rules/index.mjs";
import { stampEffectData, currentWorldTime } from "./effect-library.mjs";

/** The actors an action's "on" names (empty when nothing is selected). */
function targetActors(on) {
  if (on !== ACTION_TARGET_SELECTED_TOKEN) return [];
  return [...new Set((canvas.tokens?.controlled ?? []).map(token => token.actor).filter(Boolean))];
}

/**
 * Set off the actions of `item` that fire on `trigger`: each puts a stamped copy of its effect (from the item or the effect library) on its targets. Problems are reported to the user, not thrown.
 *
 * @returns {Promise<number>} how many effects were applied
 */
export async function runActions(item, trigger) {
  let applied = 0;
  for (const action of actionsFor(item.system.actions, trigger)) {
    const effect = await fromUuid(action.effect);
    if (!effect) {
      ui.notifications.warn(game.i18n.format("SCARMARK.Action.effectMissing", { item: item.name }));
      continue;
    }
    const targets = targetActors(action.on);
    if (!targets.length) {
      ui.notifications.warn(game.i18n.localize("SCARMARK.Action.noTarget"));
      continue;
    }
    const data = stampEffectData(effect.toObject(), { now: currentWorldTime(), origin: item.uuid });
    for (const target of targets) {
      if (!target.isOwner) {
        ui.notifications.warn(game.i18n.format("SCARMARK.Action.noPermission", { actor: target.name }));
        continue;
      }
      await target.createEmbeddedDocuments("ActiveEffect", [foundry.utils.deepClone(data)]);
      applied++;
    }
  }
  return applied;
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
