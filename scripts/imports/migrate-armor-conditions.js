/**
 * Scarmark - Migrate Armor Conditions (one-shot maintenance macro, 1.0.58)
 * ------------------------------------------------------------------------------
 * Armor now has a condition at every location it covers (system.coverage[].condition), and its
 * durability (system.quality) is the average of them. Armor stored before 1.0.58 has condition 0
 * at every location, and 0 means "does not protect", so until this macro has run such armor
 * protects nothing. For every armor piece with coverage whose conditions are all 0:
 *   - system.originalQuality is filled in when it is 0: from the compendium item the piece was
 *     copied from, else from the piece's own durability when that is above 0.
 *   - every coverage condition is set to the piece's stored durability (system.quality), at most
 *     the original durability, so a damaged piece keeps its damage. In an Item compendium (a
 *     pristine template) the condition is the original durability.
 *   - system.quality is written as the same number (the system recomputes it anyway).
 * Left as they are: Natural armor (durability -1), pieces with no coverage, pieces that already
 * have a condition above 0 (so it is safe to repeat), and destroyed pieces (durability 0 and no
 * original to restore): they stay at 0 and are listed in the report.
 * Where: system and world compendia, world items and actors, unlinked tokens. Locked packs are
 * unlocked and locked again.
 *
 * HOW TO USE (GM, a COPY of the world first, Scarmark 1.0.58-beta or later):
 *   0. After updating the system files RELOAD the world (F5).
 *   1. Back up the world and commit the system packs.
 *   2. New Script macro -> paste this file -> Execute -> "Report only".
 *   3. Read the chat summary (details in the F12 console) -> run again -> "Apply".
 *   4. Reload the world (F5). Open a character's Combat tab and an armor piece.
 */
(async () => {
  if ( game.system.id !== "scarmark-test" ) return ui.notifications.error("Migrate Armor Conditions: this world does not run the scarmark-test system.");
  if ( !game.user.isGM ) return ui.notifications.warn("Migrate Armor Conditions: run this as the GM.");
  const armorSchema = CONFIG.Item.dataModels?.armor?.defineSchema?.();
  if ( !armorSchema?.coverage || !armorSchema?.originalQuality ) {
    return ui.notifications.error("Migrate Armor Conditions: this page runs an older system (armor has no coverage). Update the system and reload the world (F5), then run the macro again.", { permanent: true });
  }

  const PERMANENT = -1; // Natural armor: durability that never decays

  const mode = await foundry.applications.api.DialogV2.wait({
    window: { title: "Migrate Armor Conditions" },
    content: `<p>Every armor piece whose location conditions are all 0 gets its conditions from its durability, and its original durability when it has none.</p>
      <p>System and world compendia, world items and actors, unlinked tokens. <b>Back up the world first.</b></p>`,
    buttons: [
      { action: "report", label: "Report only", default: true },
      { action: "apply", label: "Apply" }
    ],
    rejectClose: false
  });
  if ( !mode ) return;
  const apply = mode === "apply";

  const count = { armor: 0, destroyed: 0, packs: 0 };
  const rows = [];
  const errors = [];
  const sourceCache = new Map();

  /** The original durability stored on the compendium item a piece was copied from, else its durability; null when there is no such item. */
  async function sourceOriginal(item) {
    const uuid = [item._stats?.compendiumSource, item.flags?.core?.sourceId].find(u => typeof u === "string" && u.startsWith("Compendium."));
    if ( !uuid ) return null;
    if ( !sourceCache.has(uuid) ) {
      let value = null;
      try {
        const source = await fromUuid(uuid);
        const stored = source?.type === "armor" ? source._source.system : null;
        const original = Number(stored?.originalQuality);
        const quality = Number(stored?.quality);
        value = original > 0 ? original : (quality > 0 ? quality : null);
      } catch ( err ) { console.warn("Migrate Armor Conditions: cannot read", uuid, err); }
      sourceCache.set(uuid, value);
    }
    return sourceCache.get(uuid);
  }

  /** The update for an armor piece, or null when there is nothing to do. `pristine` = a template in an Item compendium. */
  async function armorChanges(item, pristine) {
    if ( item.type !== "armor" ) return null;
    const sys = item._source.system;
    const coverage = Array.isArray(sys.coverage) ? sys.coverage : [];
    if ( !coverage.length ) return null;
    if ( Number(sys.quality) === PERMANENT ) return null;
    if ( coverage.some(e => Number(e.condition) > 0) ) return null;

    const stored = Math.max(0, Number(sys.quality) || 0);
    const hadOriginal = Number(sys.originalQuality) || 0;
    let original = hadOriginal;
    if ( original <= 0 ) original = (await sourceOriginal(item)) ?? 0;
    if ( original <= 0 && stored > 0 ) original = stored;

    const condition = pristine ? (original > 0 ? original : stored) : (original > 0 ? Math.min(stored, original) : stored);
    if ( condition === 0 && original === hadOriginal ) return { destroyed: true };
    return {
      destroyed: condition === 0,
      "system.coverage": coverage.map(e => ({ type: e.type, side: e.side ?? "", condition })),
      "system.originalQuality": original,
      "system.quality": condition
    };
  }

  function record(where, item, changes) {
    if ( changes.destroyed ) count.destroyed++;
    if ( !("system.coverage" in changes) ) {
      rows.push({ where, item: item.name, condition: 0, original: item._source.system.originalQuality ?? 0, note: "destroyed, left at 0" });
      return;
    }
    count.armor++;
    rows.push({ where, item: item.name, condition: changes["system.quality"], original: changes["system.originalQuality"], note: changes.destroyed ? "destroyed, original filled in" : "" });
  }

  const payload = (changes) => Object.fromEntries(Object.entries(changes).filter(([key]) => key.startsWith("system.")));

  async function processItem(item, where, pristine) {
    const changes = await armorChanges(item, pristine);
    if ( !changes ) return;
    record(where, item, changes);
    if ( apply && "system.coverage" in changes ) await item.update(payload(changes), { diff: false });
  }

  async function processActor(actor, where, onlyIds = null) {
    const updates = [];
    for ( const item of actor.items ) {
      if ( onlyIds && !onlyIds.has(item.id) ) continue;
      const changes = await armorChanges(item, false);
      if ( !changes ) continue;
      record(`${where} > ${actor.name}`, item, changes);
      if ( "system.coverage" in changes ) updates.push({ _id: item.id, ...payload(changes) });
    }
    if ( apply && updates.length ) await actor.updateEmbeddedDocuments("Item", updates, { diff: false });
  }

  async function guarded(where, fn) {
    try { await fn(); }
    catch ( err ) {
      console.error(`Scarmark | Migrate Armor Conditions failed in ${where}`, err);
      errors.push({ where, error: err?.message ?? String(err) });
    }
  }

  ui.notifications.info(`Migrate Armor Conditions: ${apply ? "migrating" : "checking"}, please wait...`);

  // Compendia of this system and of the world.
  for ( const pack of game.packs ) {
    if ( !["Item", "Actor"].includes(pack.documentName) ) continue;
    if ( ![game.system.id, "world"].includes(pack.metadata.packageName) ) continue;
    count.packs++;
    const label = `[${pack.metadata.label}]`;
    const wasLocked = pack.locked;
    await guarded(label, async () => {
      const docs = await pack.getDocuments();
      if ( apply && wasLocked ) await pack.configure({ locked: false });
      try {
        for ( const doc of docs ) {
          if ( pack.documentName === "Actor" ) await processActor(doc, label);
          else await processItem(doc, label, true);
        }
      } finally {
        if ( apply && wasLocked && (pack.locked === false) ) await pack.configure({ locked: true });
      }
    });
  }

  for ( const item of [...game.items] ) await guarded(`World item ${item.name}`, () => processItem(item, "World item", false));
  for ( const actor of game.actors ) await guarded(`World actor ${actor.name}`, () => processActor(actor, "World actor"));
  for ( const scene of game.scenes ) {
    for ( const token of scene.tokens ) {
      if ( token.actorLink || !token.actor || !token.delta ) continue;
      const own = new Set((token.delta._source?.items ?? []).map(i => i._id));
      if ( own.size ) await guarded(`Scene ${scene.name} token ${token.name}`, () => processActor(token.actor, `Scene ${scene.name}`, own));
    }
  }

  console.log(`Scarmark | Migrate Armor Conditions (${apply ? "APPLY" : "REPORT"})`, count);
  if ( rows.length ) console.table(rows);
  if ( errors.length ) console.table(errors);

  const v = apply ? "" : " (would be)";
  let content = `<div class="scarmark-card"><div class="card-title">Migrate Armor Conditions - ${apply ? "done" : "report only"}</div>`;
  content += `<div class="card-line">Armor pieces written${v}: <b>${count.armor}</b></div>`;
  content += `<div class="card-line">Destroyed pieces (durability 0, left at 0, see the console): <b>${count.destroyed}</b></div>`;
  content += `<div class="card-line">Compendia checked: <b>${count.packs}</b>${errors.length ? `, <b>errors: ${errors.length}</b> (see the console)` : ""}</div>`;
  content += apply ? `<div class="card-line"><i>Reload the world (F5).</i></div>` : `<div class="card-line"><i>Nothing was changed. Run again and choose Apply.</i></div>`;
  content += `</div>`;
  await ChatMessage.create({ whisper: [game.user.id], content });
})();
