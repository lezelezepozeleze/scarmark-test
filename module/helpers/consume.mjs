/** Consuming an item: its Active Effects (plus its toxicity) go onto the actor with their countdown started, and one unit is spent. */
import { TOXICITY_SKILL, ACTION_TRIGGER_CONSUMED, ACTION_TARGET_SELF } from "../config/index.mjs";
import { durationSeconds, actionsFor } from "../rules/index.mjs";
import { stampEffectData, currentWorldTime } from "./effect-library.mjs";
import { runActions, announce } from "./item-actions.mjs";

/**
 * Add the Vitality penalty of a toxicity to the effects that are about to be applied: it goes into the longest-lasting effect, so it ends with it. An item with no effect gets a permanent one of its own. Returns the same array (mutated) when there is a toxicity, as given otherwise.
 *
 * @param {object[]} effects effect data (stamped copies, safe to change)
 * @param {{toxicity: number, name: string, img: string, uuid: string}} item the consumed item
 */
export function withToxicity(effects, { toxicity, name, img, uuid }) {
  if (!(toxicity > 0)) return effects;
  const change = { key: `system.mods.skill.${TOXICITY_SKILL}`, type: "add", value: -toxicity, priority: 20, phase: "initial" };
  if (!effects.length) return [{ name, img, disabled: false, transfer: false, origin: uuid, system: { changes: [change] } }];
  const seconds = (effect) => durationSeconds(effect.duration) ?? 0;
  const lasting = effects.reduce((best, e) => (seconds(e) > seconds(best) ? e : best), effects[0]);
  lasting.system = { ...(lasting.system ?? {}), changes: [...(lasting.system?.changes ?? []), change] };
  return effects;
}

/**
 * Fold the toxicity into the effects an item's "consumed" actions are about to put on the consumer (the longest-lasting one, see withToxicity). Returns whether there was one to fold it into.
 */
function mergeToxicity(plan, info) {
  const own = plan.filter(entry => entry.on === ACTION_TARGET_SELF).map(entry => entry.data);
  if (own.length) withToxicity(own, info);
  return own.length > 0;
}

/** The toxicity as an effect of its own, permanent, for a consumable whose actions put no effect on the consumer. */
async function applyStandaloneToxicity(actor, info) {
  const [effect] = withToxicity([], info);
  if (effect) await actor.createEmbeddedDocuments("ActiveEffect", [effect]);
}

/**
 * Consume one unit of a consumable, and say so in the chat ("<actor> consumed <item>.", unless an action card already did). An item with actions is consumed by them (only its "consumed" ones fire, the toxicity goes into the longest-lasting effect they add, or is a permanent effect of its own); an older consumable with none puts all its effects on the consumer. When "consumed" actions exist but none could run, nothing is spent. Errors are reported to the user, not thrown.
 */
export async function consumeItem(actor, item) {
  const now = currentWorldTime();
  const info = { toxicity: Number(item.system.toxicity) || 0, name: item.name, img: item.img, uuid: item.uuid };
  const buildEffects = () => withToxicity(item.effects.contents.map(e => stampEffectData(e.toObject(), { now, origin: item.uuid })), info);
  try {
    let announced = false;
    if ((item.system.actions?.length ?? 0) > 0) {
      let merged = false;
      const result = await runActions(item, ACTION_TRIGGER_CONSUMED, { adjustPlan: (plan) => { merged = mergeToxicity(plan, info); } });
      if (!result.done && actionsFor(item.system.actions, ACTION_TRIGGER_CONSUMED).length) return;
      if (!merged) await applyStandaloneToxicity(actor, info);
      announced = result.announced;
    } else {
      await applyOwnEffects(actor, buildEffects);
    }
    if (!announced) await announce(item, ACTION_TRIGGER_CONSUMED);
    const quantity = item.system.quantity ?? 1;
    if (quantity > 1) await item.update({ "system.quantity": quantity - 1 });
    else await item.delete();
  } catch (err) {
    console.error("Scarmark | consume failed", err);
    ui.notifications.error(game.i18n.format("SCARMARK.Gear.consumeFailed", { error: err.message }));
  }
}

/** Put the item's own effects (with the toxicity) on the actor. A time or calendar module can make Foundry's duration processing throw (game.time.worldTime unavailable): then they go on without the timed duration so consuming still works. */
async function applyOwnEffects(actor, buildEffects) {
  const effects = buildEffects();
  if (!effects.length) return;
  try {
    await actor.createEmbeddedDocuments("ActiveEffect", effects);
  } catch (durationError) {
    console.warn("Scarmark | effect-duration processing failed; applying without duration", durationError);
    await actor.createEmbeddedDocuments("ActiveEffect", buildEffects().map(effect => { delete effect.duration; return effect; }));
    ui.notifications.warn(game.i18n.localize("SCARMARK.Gear.consumedNoDuration"));
  }
}
