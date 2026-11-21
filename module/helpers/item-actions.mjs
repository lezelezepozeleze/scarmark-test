/** Running the actions of an item: "when <trigger> add <effect> on <target>", "roll <test>", "repair / improve <item>" or "send <message>". Using a usable item sets off its "used" actions, opening the sheet of an item the character carries its "inspected" ones, consuming a consumable its "consumed" ones (helpers/consume.mjs). Using and consuming always say so in the chat (announce). */
import { ACTION_TARGET_SELECTED_TOKEN, ACTION_TARGET_SELF, ACTION_TRIGGER_USED, ACTION_TRIGGER_INSPECTED, ACTION_TRIGGERS, ACTION_ALTERATIONS, ACTION_ALTER_REPAIR, ATTRIBUTES, ATTRIBUTE_TEST_MULTIPLIER } from "../config/index.mjs";
import { FLAGS } from "../constants.mjs";
import { actionsFor, isEffectAction, isTestAction, isAlterAction, isMessageAction, usesEffect, parseActionTest, ownedEffectChanges, armorRepairProblem, repairedArmor, isTimedDuration, capTarget } from "../rules/index.mjs";
import { esc } from "./escape.mjs";
import { stampEffectData, currentWorldTime, copyLibraryEffect } from "./effect-library.mjs";
import { rollD100Test } from "./dice/shared.mjs";

/** The actor that carries the item (null for a loose item). */
const ownerOf = (item) => item.parent?.documentName === "Actor" ? item.parent : null;

/** Warn the user: a lang key, formatted with `data` when given. */
const warn = (key, data) => ui.notifications.warn(data ? game.i18n.format(key, data) : game.i18n.localize(key));

/** A public chat card of one line (the lang key formatted with `data`, escaped), spoken by the actor. */
const say = (actor, key, data) => ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), content: `<div class="scarmark-card"><div class="card-line">${esc(game.i18n.format(key, data))}</div></div>` });

/** The chat line of using or consuming an item: "<actor> used <item>." Not every trigger has one (inspecting says nothing). */
export function announce(item, trigger) {
  const key = ACTION_TRIGGERS[trigger]?.card?.announce;
  const actor = ownerOf(item);
  return key && actor ? say(actor, key, { actor: actor.name, item: item.name }) : undefined;
}

/** The actors an add-effect action's "on" names for this item; empty when there are none. */
function targetsOf(action, item) {
  const owner = ownerOf(item);
  if (action.on === ACTION_TARGET_SELF) return owner ? [owner] : [];
  if (action.on === ACTION_TARGET_SELECTED_TOKEN) return [...new Set((canvas.tokens?.controlled ?? []).map(token => token.actor).filter(Boolean))];
  return [];
}

/** The lang key of the warning for an add-effect action that has nobody to act on. */
const NO_TARGET_MESSAGE = {
  [ACTION_TARGET_SELF]: "SCARMARK.Action.noOwner",
  [ACTION_TARGET_SELECTED_TOKEN]: "SCARMARK.Action.noTarget"
};

/**
 * What the add-effect actions of `item` that fire on `trigger` would do: one entry per action, { trigger, item, effectName, on, data, targets }, with the effect already stamped for putting on an actor. Actions that cannot run (the effect is gone, nobody to target) are reported to the user and left out.
 */
async function planActions(item, trigger) {
  const plan = [];
  for (const action of actionsFor(item.system.actions, trigger).filter(isEffectAction)) {
    const effect = item.effects.get(action.effect);
    if (!effect) {
      warn("SCARMARK.Action.effectMissing", { item: item.name });
      continue;
    }
    // A trigger that asks for no target (consumed, owned) always acts on the actor that carries the item.
    const on = ACTION_TRIGGERS[trigger]?.target === false ? ACTION_TARGET_SELF : action.on;
    const targets = targetsOf({ ...action, on }, item);
    if (!targets.length) {
      warn(NO_TARGET_MESSAGE[on] ?? "SCARMARK.Action.noTarget");
      continue;
    }
    plan.push({ trigger, item, effectName: effect.name, on, data: stampEffectData(effect.toObject(), { now: currentWorldTime(), origin: item.uuid }), targets });
  }
  return plan;
}

/**
 * Put the effect of every plan entry on its targets (the ones the user owns) and post its chat card: "<actor> used <item>. <target> is now <effect>." (wording per trigger, config/actions.mjs; not for an entry marked `silent`).
 *
 * @returns {Promise<{applied: number, cards: number}>} how many effects were added and cards posted
 */
async function applyPlan(plan) {
  let applied = 0;
  let cards = 0;
  for (const entry of plan) {
    const done = [];
    for (const target of entry.targets) {
      if (!target.isOwner) {
        warn("SCARMARK.Action.noPermission", { actor: target.name });
        continue;
      }
      await target.createEmbeddedDocuments("ActiveEffect", [foundry.utils.deepClone(entry.data)]);
      done.push(target);
    }
    applied += done.length;
    const card = ACTION_TRIGGERS[entry.trigger]?.card;
    const actor = ownerOf(entry.item);
    if (done.length && !entry.silent && card && actor) {
      await say(actor, done.length > 1 ? card.many : card.one, { actor: actor.name, item: entry.item.name, target: done.map(target => target.name).join(", "), effect: entry.effectName });
      cards++;
    }
  }
  return { applied, cards };
}

/**
 * Run `handler(action, actor)` for each action of `item` of that kind that fires on `trigger`; an item that is not on a character cannot (a warning). The handler returns whether it did something.
 *
 * @returns {Promise<number>} how many actions did something
 */
async function forEachAction(item, trigger, kind, handler) {
  const actor = ownerOf(item);
  let count = 0;
  for (const action of actionsFor(item.system.actions, trigger).filter(kind)) {
    if (!actor) {
      warn("SCARMARK.Action.noOwner");
      continue;
    }
    if (await handler(action, actor)) count++;
  }
  return count;
}

/** The marker of an effect an "improve" put on an item: where it came from (the library effect, else the effect of the improving item), so one source cannot improve an item twice. */
const sourceOf = (effect) => effect.getFlag(FLAGS.scope, FLAGS.librarySource) ?? effect.uuid;

/** Why an armor repair was refused: problem key -> lang key ({target}). */
const ARMOR_PROBLEM_MESSAGE = {
  natural: "SCARMARK.Action.noArmorWear",
  noCoverage: "SCARMARK.Action.noArmorCoverage"
};

/** Repair an armor piece: every location back to full, and the temporary modifiers it got from "improve" removed (permanent ones stay). */
async function repairItem(target) {
  const problem = armorRepairProblem(target._source.system);
  if (problem) {
    warn(ARMOR_PROBLEM_MESSAGE[problem], { target: target.name });
    return false;
  }
  await target.update({ "system.coverage": repairedArmor(target._source.system).coverage });
  const temporary = target.effects.filter(effect => effect.getFlag(FLAGS.scope, FLAGS.improvedBy) && isTimedDuration(effect._source.duration)).map(effect => effect.id);
  if (temporary.length) await target.deleteEmbeddedDocuments("ActiveEffect", temporary);
  return true;
}

/** Improve an item: a copy of the effect of `item` the action names goes onto the target as a modifier (timed if the effect has a duration). Refused when the target already has an effect from the same source. Returns the effect added, or null. */
async function improveItem(item, target, action) {
  const effect = item.effects.get(action.effect);
  if (!effect) {
    warn("SCARMARK.Action.effectMissing", { item: item.name });
    return null;
  }
  const source = sourceOf(effect);
  if (target.effects.some(existing => existing.getFlag(FLAGS.scope, FLAGS.improvedBy) === source)) {
    warn("SCARMARK.Action.alreadyHasEffect", { target: target.name, effect: effect.name });
    return null;
  }
  const data = stampEffectData(effect.toObject(), { now: currentWorldTime(), origin: item.uuid });
  data.transfer = false;
  const scope = { ...(data.flags?.[FLAGS.scope] ?? {}), [FLAGS.improvedBy]: source };
  delete scope[FLAGS.librarySource];
  delete scope[FLAGS.ownedByAction];
  data.flags = { ...(data.flags ?? {}), [FLAGS.scope]: scope };
  await target.createEmbeddedDocuments("ActiveEffect", [data]);
  return effect;
}

/** Do the "repair" and "improve" actions of `item` that fire on `trigger`, on items of the carrying character, and post a public card for each. Problems are reported to the user and the action is skipped. Returns how many items were altered. */
function alterItems(item, trigger) {
  return forEachAction(item, trigger, isAlterAction, async (action, owner) => {
    const target = owner.items.get(action.targetItem);
    if (!target) {
      warn("SCARMARK.Action.noTargetItem");
      return false;
    }
    const alteration = ACTION_ALTERATIONS[action.alteration];
    if (!alteration || !alteration.itemTypes.includes(target.type)) {
      warn("SCARMARK.Action.wrongItemType", { target: target.name });
      return false;
    }
    const repairing = action.alteration === ACTION_ALTER_REPAIR;
    const effect = repairing ? null : await improveItem(item, target, action);
    if (repairing ? !await repairItem(target) : !effect) return false;
    await say(owner, alteration.card, { actor: owner.name, item: item.name, target: target.name, effect: effect?.name });
    return true;
  });
}

/** Post the "send message" actions of `item` that fire on `trigger` to the chat: "<actor> used <item>. <message>". Returns how many were sent. */
function sendMessages(item, trigger) {
  const key = ACTION_TRIGGERS[trigger]?.card?.message;
  return forEachAction(item, trigger, isMessageAction, async (action, actor) => {
    if (!key) return false;
    await say(actor, key, { actor: actor.name, item: item.name, message: action.message.trim() });
    return true;
  });
}

/** Roll one test action for the actor: a d100 against the ESL of the test's skill of the character (found by name), or against its effective attribute times the test multiplier, right now. The roll posts its own card. Returns whether it was rolled. */
async function rollTest(actor, action) {
  const test = parseActionTest(action.test);
  if (test.type === "attribute") {
    const attribute = actor.system.attributes?.[test.name];
    if (!attribute) {
      warn("SCARMARK.Action.noAttribute", { actor: actor.name, attribute: test.name });
      return false;
    }
    const label = game.i18n.localize(ATTRIBUTES[test.name]?.label ?? test.name);
    await rollD100Test(actor, `${esc(label)} ${game.i18n.localize("SCARMARK.Test")}`, capTarget(attribute.effective * ATTRIBUTE_TEST_MULTIPLIER));
    return true;
  }
  const skill = actor.items.find(i => i.type === "skill" && i.name.toLowerCase() === test.name.toLowerCase());
  if (!skill) {
    warn("SCARMARK.Action.noSkill", { actor: actor.name, skill: test.name });
    return false;
  }
  await rollD100Test(actor, `${esc(skill.name)} ${game.i18n.localize("SCARMARK.Test")}`, capTarget(skill.system.esl));
  return true;
}

/** Roll the test actions of `item` that fire on `trigger`. Returns how many tests were rolled. */
const rollTests = (item, trigger) => forEachAction(item, trigger, isTestAction, (action, actor) => rollTest(actor, action));

/**
 * Set off the actions of `item` that fire on `trigger`: the effects first, then the item alterations, the messages and the tests.
 *
 * @param {object} [options]
 * @param {(plan: object[]) => void} [options.adjustPlan] called with the effects about to be added, before they are (consuming adds the toxicity)
 * @returns {Promise<{done: number, announced: boolean}>} how many things were done, and whether a card already said "<actor> used <item>" (effect and message cards do)
 */
export async function runActions(item, trigger, { adjustPlan } = {}) {
  const plan = await planActions(item, trigger);
  adjustPlan?.(plan);
  const { applied, cards } = await applyPlan(plan);
  const altered = await alterItems(item, trigger);
  const sent = await sendMessages(item, trigger);
  const rolled = await rollTests(item, trigger);
  return { done: applied + altered + sent + rolled, announced: cards + sent > 0 };
}

/** Use an item: set off its "when used" actions, and say in the chat that it was used (unless an action card already did). */
export async function useItem(item) {
  try {
    const { announced } = await runActions(item, ACTION_TRIGGER_USED);
    if (!announced) await announce(item, ACTION_TRIGGER_USED);
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
  const flag = `flags.${FLAGS.scope}.${FLAGS.ownedByAction}`;
  const effects = item.effects.map(effect => ({ id: effect.id, transfer: Boolean(effect.transfer), managed: effect.getFlag(FLAGS.scope, FLAGS.ownedByAction) === true }));
  const updates = ownedEffectChanges(effects, item.system.actions).map(change => ({ _id: change.id, transfer: change.transfer, [flag]: change.managed }));
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
    if (!usesEffect(action) || !String(action.effect ?? "").startsWith("Compendium.")) continue;
    const source = action.effect;
    const copy = item.effects.find(effect => effect.getFlag(FLAGS.scope, FLAGS.librarySource) === source) ?? await copyLibraryEffect(item, source);
    if (!copy) {
      warn("SCARMARK.Action.effectMissing", { item: item.name });
      continue;
    }
    action.effect = copy.id;
    changed++;
  }
  if (changed) await item.update({ "system.actions": actions });
  return changed;
}
