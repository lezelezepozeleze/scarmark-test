/** What a brand-new actor starts with: default armor locations and default skills. */
import { SCARMARK } from "../config.mjs";
import { PACKS } from "../constants.mjs";
import { DEFAULT_LOCATION_PLANS, BASE_SKILLS } from "../config/index.mjs";

/**
 * Embedded-item creation data for an Actor type's default Armor Locations, with
 * the canonical aim/injury/risk baked in (same values the location sheet fills
 * from CONFIG.SCARMARK.armorLocations when a Location Type is picked).
 * @param {string} actorType
 * @returns {object[]} armorLocation item data (empty for types without a plan)
 */
export function defaultArmorLocationItems(actorType) {
  const plan = DEFAULT_LOCATION_PLANS[actorType];
  if (!plan) return [];
  return plan.flatMap(([name, type, side]) => {
    const canon = SCARMARK.armorLocations[type];
    if (!canon) return []; // unknown key: skip rather than break actor creation
    return [{
      name,
      type: "armorLocation",
      system: {
        locationType: type,
        side,
        aim: { ...canon.aim },
        injury: { ...canon.injury },
        risk: { ...canon.risk }
      }
    }];
  });
}

/* -------------------------------------------- */
/*  Default (base) skills                        */
/* -------------------------------------------- */

/** Compendium the base skills are copied from (so they keep SB / sunsign data). */
const SKILL_PACK = PACKS.skills;

// Lowercase, collapse whitespace, and fold every Unicode dash to "-" so the
// list spelling and the compendium spelling always compare equal.
const normalizeName = (s) => String(s).toLowerCase().replace(/[‐-―−]/g, "-").replace(/\s+/g, " ").trim();

/**
 * Copy an Actor type's base skills from the Skills compendium onto the Actor
 * (keeping each skill's SB attributes, Sunsign bonuses, category, level, and
 * description). No-op if the actor already has skills (duplicate/import) or the
 * type has no base list. Names missing from the pack are logged, not fatal.
 * @param {Actor} actor
 */
export async function addDefaultSkills(actor) {
  const names = BASE_SKILLS[actor.type];
  if (!names?.length) return;
  if (actor.items.some(i => i.type === "skill")) return;

  const pack = game.packs.get(SKILL_PACK);
  if (!pack) return void console.warn(`Scarmark | skills pack "${SKILL_PACK}" not found`);

  const index = await pack.getIndex();
  const idByName = new Map(index.map(e => [normalizeName(e.name), e._id]));

  const toAdd = [];
  const missing = [];
  for (const name of names) {
    const id = idByName.get(normalizeName(name));
    if (!id) { missing.push(name); continue; }
    const data = (await pack.getDocument(id)).toObject();
    delete data._id;      // let the actor mint a fresh id
    delete data.folder;   // compendium folder is meaningless on an actor
    toAdd.push(data);
  }
  if (missing.length) console.warn(`Scarmark | base skills not found in ${SKILL_PACK}:`, missing);
  if (toAdd.length) await actor.createEmbeddedDocuments("Item", toAdd);
}
