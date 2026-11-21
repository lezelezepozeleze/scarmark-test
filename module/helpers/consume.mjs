/** Consuming an item: its Active Effects (plus its toxicity) go onto the actor with their countdown started, and one unit is spent. */
import { TOXICITY_SKILL, ACTION_TRIGGER_CONSUMED, ACTION_TARGET_SELF } from "../config/index.mjs";
import { durationSeconds, actionsFor } from "../rules/index.mjs";
import { stampEffectData, currentWorldTime } from "./effect-library.mjs";
import { planActions, applyPlan, rollTests } from "./item-actions.mjs";

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
 * Consume by the item's "when consumed" actions. The toxicity goes into the longest-lasting effect that lands on the consumer (or stands alone, permanent, when no action does); the tests are rolled after the effects are on, so a Vitality test is against the Vitality the toxicity has just lowered. Returns how many effects were added and tests rolled.
 */
async function applyConsumedActions(actor, item, info) {
  const plan = await planActions(item, ACTION_TRIGGER_CONSUMED);
  const own = plan.filter(entry => entry.on === ACTION_TARGET_SELF).map(entry => entry.data);
  const withPenalty = withToxicity(own, info);
  if (!own.length && withPenalty.length) plan.push({ on: ACTION_TARGET_SELF, data: withPenalty[0], targets: [actor], silent: true });
  const applied = await applyPlan(plan);
  return applied + await rollTests(item, ACTION_TRIGGER_CONSUMED);
}

/** Consume one unit of a consumable: apply its effects to the actor, then reduce its quantity (delete at the last one). Errors are reported to the user, not thrown. */
export async function consumeItem(actor, item) {
  const now = currentWorldTime();
  const info = { toxicity: Number(item.system.toxicity) || 0, name: item.name, img: item.img, uuid: item.uuid };
  const buildEffects = () => withToxicity(item.effects.contents.map(e => stampEffectData(e.toObject(), { now, origin: item.uuid })), info);
  try {
    // An item with actions is consumed by them (only its "consumed" ones fire); an older consumable with none puts all its effects on the consumer. When "consumed" actions exist but none could run, nothing is spent.
    const byActions = (item.system.actions?.length ?? 0) > 0;
    if (byActions) {
      const done = await applyConsumedActions(actor, item, info);
      if (!done && actionsFor(item.system.actions, ACTION_TRIGGER_CONSUMED).length) return;
    }
    const effects = byActions ? [] : buildEffects();
    if (effects.length) {
      try {
        await actor.createEmbeddedDocuments("ActiveEffect", effects);
      } catch (durationError) {
        // A time or calendar module can make Foundry's duration processing throw (game.time.worldTime unavailable): apply the effects without the timed duration so consuming still works.
        console.warn("Scarmark | effect-duration processing failed; applying without duration", durationError);
        await actor.createEmbeddedDocuments("ActiveEffect", buildEffects().map(effect => { delete effect.duration; return effect; }));
        ui.notifications.warn(game.i18n.localize("SCARMARK.Gear.consumedNoDuration"));
      }
    }
    const quantity = item.system.quantity ?? 1;
    if (quantity > 1) await item.update({ "system.quantity": quantity - 1 });
    else await item.delete();
    ui.notifications.info(game.i18n.format("SCARMARK.Gear.consumed", { name: item.name }));
  } catch (err) {
    console.error("Scarmark | consume failed", err);
    ui.notifications.error(game.i18n.format("SCARMARK.Gear.consumeFailed", { error: err.message }));
  }
}
