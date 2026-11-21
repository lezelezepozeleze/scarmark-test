/** Actions of an item: which of them a trigger sets off. Pure. */
import { ACTION_TRIGGER_OWNED, ACTION_KIND_TEST, ACTION_KIND_ALTER, ACTION_KIND_MESSAGE } from "../config/index.mjs";

/** Whether an action rolls a test (the others, including older ones with no kind, add an effect). */
export const isTestAction = (action) => action.kind === ACTION_KIND_TEST;

/** Whether an action changes an item once (repair armor, ...). */
export const isAlterAction = (action) => action.kind === ACTION_KIND_ALTER;

/** Whether an action sends a chat message. */
export const isMessageAction = (action) => action.kind === ACTION_KIND_MESSAGE;

/** Whether an action adds an effect to a character (the kind of the actions before there were kinds). */
export const isEffectAction = (action) => !isTestAction(action) && !isAlterAction(action) && !isMessageAction(action);

/** What an action does, by name: the test of a test action, the alteration (a compendium entry) of an alter action, the text of a message, the effect of any other. */
const whatOf = (action) => isTestAction(action) ? action.test : (isAlterAction(action) ? action.alteration : (isMessageAction(action) ? String(action.message ?? "").trim() : action.effect));

/**
 * The actions that fire on `trigger`: the ones whose "when" is that trigger and that name what they do (an effect, a test, or a change).
 *
 * @param {Array<{kind?: string, effect?: string, test?: string, alteration?: string, when?: string}>|undefined} actions the item's actions
 * @param {string} trigger a key of ACTION_TRIGGERS
 */
export function actionsFor(actions, trigger) {
  return (actions ?? []).filter(action => action.when === trigger && whatOf(action));
}

/**
 * What to change on the effects of an item so that the ones named by an "owned" action transfer to the owner, and the ones that did only because of such an action stop when the action is gone. An effect that transfers on its own (not marked as managed) is never touched.
 *
 * @param {{id: string, transfer: boolean, managed: boolean}[]} effects the item's effects; `managed` = made to transfer by an owned action
 * @param {Array<{effect?: string, when?: string}>|undefined} actions the item's actions
 * @returns {{id: string, transfer: boolean, managed: boolean}[]} the effects to update
 */
export function ownedEffectChanges(effects, actions) {
  const wanted = new Set(actionsFor(actions, ACTION_TRIGGER_OWNED).filter(isEffectAction).map(action => action.effect));
  const changes = [];
  for (const effect of effects) {
    if (wanted.has(effect.id) && !effect.transfer) changes.push({ id: effect.id, transfer: true, managed: true });
    else if (!wanted.has(effect.id) && effect.managed) changes.push({ id: effect.id, transfer: false, managed: false });
  }
  return changes;
}

/**
 * Read the value of an action's test roll-down: "skill:<name>" (a d100 against that skill's ESL), "attribute:<key>" (against the attribute times the test multiplier), or an older bare skill name. Null for no test.
 *
 * @param {string|undefined} value
 * @returns {{type: "skill"|"attribute", name: string}|null}
 */
export function parseActionTest(value) {
  const text = String(value ?? "");
  if (!text) return null;
  const colon = text.indexOf(":");
  const type = text.slice(0, colon);
  if (colon > 0 && (type === "skill" || type === "attribute")) return { type, name: text.slice(colon + 1) };
  return { type: "skill", name: text };
}
