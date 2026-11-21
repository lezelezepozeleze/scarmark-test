/** Running the actions of an item: "when <trigger> add <effect> on <target>" or "when <trigger> roll <test>". Using a usable item sets off its "used" actions, opening the sheet of an item the character carries its "inspected" ones, consuming a consumable its "consumed" ones (helpers/consume.mjs). */
import { ACTION_TARGET_SELECTED_TOKEN, ACTION_TARGET_SELF, ACTION_TARGET_ITEM, ACTION_TRIGGER_USED, ACTION_TRIGGER_INSPECTED, ACTION_TRIGGERS, ATTRIBUTES, ATTRIBUTE_TEST_MULTIPLIER } from "../config/index.mjs";
import { FLAGS } from "../constants.mjs";
import { actionsFor, isTestAction, parseActionTest, ownedEffectChanges, capTarget } from "../rules/index.mjs";
import { esc } from "./escape.mjs";
import { stampEffectData, currentWorldTime, copyLibraryEffect } from "./effect-library.mjs";
import { rollD100Test } from "./dice/shared.mjs";

/** The actor that carries the item (null for a loose item). */
const ownerOf = (item) => item.parent?.documentName === "Actor" ? item.parent : null;

/** The documents (actors, or one item of the owner) an action's "on" names for this item; empty when there are none. */
function targetsOf(action, item) {
  const owner = ownerOf(item);
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
 * What the add-effect actions of `item` that fire on `trigger` would do: one entry per action, { trigger, item, effectName, on, data, targets }, with the effect already stamped for putting on an actor. Actions that cannot run (the effect is gone, nobody to target) are reported to the user and left out.
 */
export async function planActions(item, trigger) {
  const plan = [];
  for (const action of actionsFor(item.system.actions, trigger).filter(a => !isTestAction(a))) {
    const effect = item.effects.get(action.effect);
    if (!effect) {
      ui.notifications.warn(game.i18n.format("SCARMARK.Action.effectMissing", { item: item.name }));
      continue;
    }
    // A trigger that asks for no target (consumed, owned) always acts on the actor that carries the item.
    const on = ACTION_TRIGGERS[trigger]?.target === false ? ACTION_TARGET_SELF : action.on;
    const targets = targetsOf({ ...action, on }, item);
    if (!targets.length) {
      ui.notifications.warn(game.i18n.localize(NO_TARGET_MESSAGE[on] ?? "SCARMARK.Action.noTarget"));
      continue;
    }
    plan.push({ trigger, item, effectName: effect.name, on, data: stampEffectData(effect.toObject(), { now: currentWorldTime(), origin: item.uuid }), targets });
  }
  return plan;
}

/** The public chat card of an action that added an effect: "<actor> used <item>. <target> is now <effect>." (wording per trigger, config/actions.mjs). */
async function postActionCard(entry, targets) {
  const card = ACTION_TRIGGERS[entry.trigger]?.card;
  const actor = ownerOf(entry.item);
  if (!card || !actor) return;
  const text = game.i18n.format(targets.length > 1 ? card.many : card.one, { actor: actor.name, item: entry.item.name, target: targets.map(target => target.name).join(", "), effect: entry.effectName });
  await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), content: `<div class="scarmark-card"><div class="card-line">${esc(text)}</div></div>` });
}

/** Put the effect of every plan entry on its targets (the ones the user owns) and post its chat card (not for an entry marked `silent`). An effect put on an item is made to transfer, so it applies to the actor that owns the item. Returns how many effects were added. */
export async function applyPlan(plan) {
  let applied = 0;
  for (const entry of plan) {
    const done = [];
    for (const target of entry.targets) {
      if (!target.isOwner) {
        ui.notifications.warn(game.i18n.format("SCARMARK.Action.noPermission", { actor: target.name }));
        continue;
      }
      const copy = foundry.utils.deepClone(entry.data);
      if (target.documentName === "Item") copy.transfer = true;
      await target.createEmbeddedDocuments("ActiveEffect", [copy]);
      done.push(target);
    }
    applied += done.length;
    if (done.length && !entry.silent) await postActionCard(entry, done);
  }
  return applied;
}

/** Roll the test actions of `item` that fire on `trigger`: a d100 against the ESL of the test's skill of the carrying character (found by name), or against its effective attribute times the test multiplier, right now. The roll posts its own card. Returns how many tests were rolled. */
export async function rollTests(item, trigger) {
  let rolled = 0;
  for (const action of actionsFor(item.system.actions, trigger).filter(isTestAction)) {
    const actor = ownerOf(item);
    if (!actor) {
      ui.notifications.warn(game.i18n.localize("SCARMARK.Action.noOwner"));
      continue;
    }
    const test = parseActionTest(action.test);
    if (test.type === "attribute") {
      const attribute = actor.system.attributes?.[test.name];
      if (!attribute) {
        ui.notifications.warn(game.i18n.format("SCARMARK.Action.noAttribute", { actor: actor.name, attribute: test.name }));
        continue;
      }
      const label = game.i18n.localize(ATTRIBUTES[test.name]?.label ?? test.name);
      await rollD100Test(actor, `${esc(label)} ${game.i18n.localize("SCARMARK.Test")}`, capTarget(attribute.effective * ATTRIBUTE_TEST_MULTIPLIER));
    } else {
      const skill = actor.items.find(i => i.type === "skill" && i.name.toLowerCase() === test.name.toLowerCase());
      if (!skill) {
        ui.notifications.warn(game.i18n.format("SCARMARK.Action.noSkill", { actor: actor.name, skill: test.name }));
        continue;
      }
      await rollD100Test(actor, `${esc(skill.name)} ${game.i18n.localize("SCARMARK.Test")}`, capTarget(skill.system.esl));
    }
    rolled++;
  }
  return rolled;
}

/** Set off the actions of `item` that fire on `trigger`: the effects first, then the tests. Returns how many effects were added and tests rolled. */
export async function runActions(item, trigger) {
  const applied = await applyPlan(await planActions(item, trigger));
  return applied + await rollTests(item, trigger);
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

/** The character that has the item opened its sheet: set off its "when inspected" actions. Does nothing for the GM (who opens items to edit them) or for an item that is not on a character. Called once when the sheet is first rendered. */
export async function inspectItem(item) {
  if (game.user.isGM || !item.isOwner || !ownerOf(item)) return;
  if (!actionsFor(item.system.actions, ACTION_TRIGGER_INSPECTED).length) return;
  try {
    await runActions(item, ACTION_TRIGGER_INSPECTED);
  } catch (err) {
    console.error("Scarmark | inspect failed", err);
  }
}

/**
 * Make the effects named by the item's "owned" actions transfer to the owner, and undo it for the ones whose action is gone (see rules/actions.mjs ownedEffectChanges). Called when the actions of an item change (foundry/item-hooks.mjs). Returns how many effects were updated.
 */
export async function syncOwnedEffects(item) {
  const scope = `flags.${FLAGS.scope}.${FLAGS.ownedByAction}`;
  const effects = item.effects.map(effect => ({ id: effect.id, transfer: Boolean(effect.transfer), managed: effect.getFlag(FLAGS.scope, FLAGS.ownedByAction) === true }));
  const updates = ownedEffectChanges(effects, item.system.actions).map(change => ({ _id: change.id, transfer: change.transfer, [scope]: change.managed }));
  if (updates.length) await item.updateEmbeddedDocuments("ActiveEffect", updates);
  return updates.length;
}

/**
 * An action can pick an effect of the effect library (a compendium uuid). The item keeps its own copy, so its Effects tab lists everything its actions use: the copy is made (once per library effect, marked with where it came from) and the action is pointed at it. Called when the actions of an item change (foundry/item-hooks.mjs). Returns how many actions were pointed at a copy.
 */
export async function materializeActionEffects(item) {
  const actions = (item.system.actions ?? []).map(action => ({ ...action }));
  let changed = 0;
  for (const action of actions) {
    if (isTestAction(action) || !String(action.effect ?? "").startsWith("Compendium.")) continue;
    const source = action.effect;
    const copy = item.effects.find(effect => effect.getFlag(FLAGS.scope, FLAGS.librarySource) === source) ?? await copyLibraryEffect(item, source);
    if (!copy) {
      ui.notifications.warn(game.i18n.format("SCARMARK.Action.effectMissing", { item: item.name }));
      continue;
    }
    action.effect = copy.id;
    changed++;
  }
  if (changed) await item.update({ "system.actions": actions });
  return changed;
}
