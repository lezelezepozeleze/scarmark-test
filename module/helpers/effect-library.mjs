/**
 * The effect library: every standalone Active Effect compendium of this system (alcohol, hangovers, potion sickness, combat poisonings, outnumbered ...). The Add button of the actor Effects tab lists them, and picking one puts a stamped copy on the actor - the same stamp Consume uses.
 */
import { SYSTEM_ID, FLAGS } from "../constants.mjs";
import { durationSeconds } from "../rules/index.mjs";

/**
 * Turn effect data into the copy that goes on an actor: enabled, not transferred, with the countdown started at `now` and the calendar-independent expiry stamp (Foundry cannot compute a time-based duration's "remaining" without game.time.calendar, which Simple Calendar does not set; the sweep in foundry/effect-expiry.mjs reads the stamp). Pure: returns a new object.
 */
export function stampEffectData(source, { now = null, origin = null } = {}) {
  const data = structuredClone(source);
  delete data._id;
  data.disabled = false;
  data.transfer = false;
  if (origin) data.origin = origin;
  if (now !== null) data.start = { ...(data.start ?? {}), time: now };
  const seconds = durationSeconds(data.duration);
  if (now !== null && seconds !== null) {
    data.flags = data.flags ?? {};
    data.flags[FLAGS.scope] = { ...(data.flags[FLAGS.scope] ?? {}), [FLAGS.expireWorldTime]: now + seconds };
  }
  return data;
}

/** The current world time, or null when the time module makes the getter throw. */
export function currentWorldTime() {
  try { return game.time?.worldTime ?? null; } catch { return null; }
}

/** The effect packs of this system: [{ label, entries: [{ uuid, name, img }] }], packs and entries sorted by name. */
export async function listEffectLibrary() {
  const packs = game.packs.filter(p => p.documentName === "ActiveEffect" && p.metadata.packageName === SYSTEM_ID);
  const groups = [];
  for (const pack of packs) {
    const index = await pack.getIndex();
    const entries = index.map(e => ({ uuid: e.uuid ?? `Compendium.${pack.collection}.ActiveEffect.${e._id}`, name: e.name, img: e.img }));
    entries.sort((a, b) => a.name.localeCompare(b.name));
    if (entries.length) groups.push({ label: pack.metadata.label, entries });
  }
  return groups.sort((a, b) => a.label.localeCompare(b.label));
}

/** Create an effect on a document; returns it. */
async function createEffect(document, data) {
  const [created] = await document.createEmbeddedDocuments("ActiveEffect", [data]);
  return created ?? null;
}

/** Put a library effect on an actor. Returns the created effect, or null when the uuid no longer resolves. */
export async function applyLibraryEffect(actor, uuid) {
  const effect = await fromUuid(uuid);
  return effect ? createEffect(actor, stampEffectData(effect.toObject(), { now: currentWorldTime(), origin: effect.uuid })) : null;
}

/** Put a plain copy of a library effect on a document (an item keeps it as part of its definition, so the copy is not stamped or started, and does not transfer to the owner). The copy remembers where it came from. Returns the created effect, or null when the uuid no longer resolves. */
export async function copyLibraryEffect(document, uuid) {
  const effect = await fromUuid(uuid);
  if (!effect) return null;
  const data = effect.toObject();
  delete data._id;
  data.transfer = false;
  data.flags = { ...(data.flags ?? {}), [FLAGS.scope]: { ...(data.flags?.[FLAGS.scope] ?? {}), [FLAGS.librarySource]: uuid } };
  return createEffect(document, data);
}
