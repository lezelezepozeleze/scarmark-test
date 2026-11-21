/**
 * The effect library: every standalone Active Effect compendium of this system (alcohol, hangovers, potion sickness, combat poisonings, outnumbered ...). The Add button of the actor Effects tab lists them, and picking one puts a stamped copy on the actor - the same stamp Consume uses.
 */
import { SYSTEM_ID, FLAGS, EFFECT_CHOICE_FLAGS, PACKS, ALTERATION_PACKS } from "../constants.mjs";
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

/** The effect packs of this system (not the alteration compendia): [{ label, entries: [{ uuid, name, img }] }], packs and entries sorted by name. */
export async function listEffectLibrary() {
  const packs = game.packs.filter(p => p.documentName === "ActiveEffect" && p.metadata.packageName === SYSTEM_ID && !Object.values(ALTERATION_PACKS).includes(p.collection));
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

/** The data of an effect as the library keeps it: no id, origin or countdown, enabled, not transferring, and none of the flags that tie it to an item. Pure: returns a new object. */
export function libraryEntryData(source) {
  const data = structuredClone(source);
  for (const key of ["_id", "origin", "start"]) delete data[key];
  data.disabled = false;
  data.transfer = false;
  if (data.flags) {
    // Only the choices made in the effect window stay; the flags that tie it to an item go.
    const keep = Object.fromEntries(EFFECT_CHOICE_FLAGS.filter(key => data.flags[FLAGS.scope]?.[key] !== undefined).map(key => [key, data.flags[FLAGS.scope][key]]));
    if (Object.keys(keep).length) data.flags[FLAGS.scope] = keep;
    else delete data.flags[FLAGS.scope];
  }
  return data;
}

/** Run `work(pack)` with the effect library pack writable: a locked pack is unlocked for the work and locked again. Only the GM can; null for anyone else or when the pack is missing. */
async function withLibraryPack(work) {
  const pack = game.user.isGM ? game.packs.get(PACKS.effects) : null;
  if (!pack) return null;
  const wasLocked = pack.locked;
  if (wasLocked) await pack.configure({ locked: false });
  try {
    return await work(pack);
  } finally {
    if (wasLocked) await pack.configure({ locked: true });
  }
}

/**
 * Submit an effect to the effect library (the Effects compendium), as it is saved now, so every item and actor can use it: a new entry, or, when the effect is already linked to an entry (submitted before, or copied from the library), an update of that entry. The effect is linked to its entry (an action that picks the entry finds the item's own effect instead of copying it again). Only the GM can write to the compendium.
 *
 * @returns {Promise<object|null>} the library entry, or null when it was not saved
 */
export async function submitEffectToLibrary(effect) {
  const uuid = effect.getFlag(FLAGS.scope, FLAGS.librarySource);
  const data = libraryEntryData(effect.toObject());
  const entry = await withLibraryPack(async (pack) => {
    const existing = uuid ? await fromUuid(uuid) : null;
    return existing ? existing.update(data, { diff: false }) : ActiveEffect.implementation.create(data, { pack: pack.collection });
  });
  if (!entry) {
    ui.notifications.warn(game.i18n.format("SCARMARK.Effect.libraryNotSaved", { name: effect.name }));
    return null;
  }
  if (entry.uuid !== uuid) await effect.setFlag(FLAGS.scope, FLAGS.librarySource, entry.uuid);
  ui.notifications.info(game.i18n.format("SCARMARK.Effect.librarySubmitted", { name: effect.name }));
  return entry;
}
