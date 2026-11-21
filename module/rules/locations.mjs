/**
 * Location type keys: old keys map to the type they became, and a set of covered locations
 * is checked with the old keys it may still hold. Pure: values come from module/config/.
 */
import { LEGACY_LOCATION_MAP, LOCATION_SIDES, SIDED_TYPES, LEGACY_SIDED_KEYS, ARMOR_LOCATIONS, QUALITY_INITIAL } from "../config/index.mjs";

const LEGACY_OF = {};
for (const [old, current] of Object.entries(LEGACY_LOCATION_MAP)) (LEGACY_OF[current] ??= []).push(old);

/** Current key of a location type (an old key maps to the type it became). */
export const locationKey = (type) => LEGACY_LOCATION_MAP[type] ?? type;

/** Does a set of covered location types cover `type` (a current key), counting old keys it may still hold? */
export const covers = (locations, type) => !!locations && (locations.has(type) || (LEGACY_OF[type] ?? []).some(k => locations.has(k)));

const SIDE_WORD = /\b(left|right)\b/i;

/** The side of a hit location item ("left", "right" or ""): its `side` field, else the word Left or Right in its name (hit locations made before the field existed). */
export function locationSide(item) {
  const side = item?.system?.side;
  if (LOCATION_SIDES.includes(side)) return side;
  const word = SIDE_WORD.exec(item?.name ?? "");
  return word ? word[1].toLowerCase() : "";
}

/** Does a location type exist on both sides? */
export const hasSides = (type) => SIDED_TYPES.includes(locationKey(type));

/**
 * Does armor with this coverage cover a struck location (its type and side)? A coverage entry is { type, side }: it covers the locations of its type, on its side only, or on both sides when its side is "". A struck location with no known side is covered by an entry with no side, and, for a type that has sides, by entries that together cover both sides (armor split into a left and a right entry covers what a both-sides entry did).
 *
 * @param {{type: string, side?: string}[]|undefined} coverage the armor's coverage entries
 * @param {string} type the struck location's type
 * @param {string} [side] "left", "right" or ""
 */
export function coversLocation(coverage, type, side = "") {
  const wanted = locationKey(type);
  if (!coverage) return false;
  const matching = coverage.filter(entry => locationKey(entry.type) === wanted);
  if (side || !hasSides(wanted)) return matching.some(entry => !entry.side || entry.side === side);
  return matching.some(entry => !entry.side) || LOCATION_SIDES.every(s => matching.some(entry => entry.side === s));
}

/**
 * Indexes of the coverage entries that meet a struck location (its type and side): the entries of its type on its side or on both sides; for a struck location with no known side on a type that has sides, every entry of the type.
 *
 * @param {{type: string, side?: string}[]|undefined} coverage
 * @param {string} type
 * @param {string} [side] "left", "right" or ""
 * @returns {number[]}
 */
export function entryIndexesAt(coverage, type, side = "") {
  const wanted = locationKey(type);
  const sideKnown = side || !hasSides(wanted);
  const indexes = [];
  (coverage ?? []).forEach((entry, index) => {
    if (locationKey(entry.type) !== wanted) return;
    if (!sideKnown || !entry.side || entry.side === side) indexes.push(index);
  });
  return indexes;
}

/**
 * Does armor with this coverage still hold at a struck location, meaning one of the entries that meet it has a condition above 0? A condition of 0 means that part of the armor no longer protects; the rest of the piece still does.
 *
 * @param {{type: string, side?: string, condition?: number}[]|undefined} coverage
 * @param {string} type
 * @param {string} [side] "left", "right" or ""
 */
export const holdsAt = (coverage, type, side = "") => entryIndexesAt(coverage, type, side).some(i => (coverage[i].condition ?? 0) > 0);

/**
 * Index of the coverage entry a hit wears: the first entry that meets the struck location and still has a condition above 0. -1 when there is none.
 *
 * @param {{type: string, side?: string, condition?: number}[]|undefined} coverage
 * @param {string} type
 * @param {string} [side] "left", "right" or ""
 * @returns {number}
 */
export const wearIndexAt = (coverage, type, side = "") => entryIndexesAt(coverage, type, side).find(i => (coverage[i].condition ?? 0) > 0) ?? -1;

/**
 * The durability of a piece: the average condition of its coverage entries, rounded. null when it has no entries (nothing to average).
 *
 * @param {{condition?: number}[]|undefined} coverage
 * @returns {number|null}
 */
export function averageCondition(coverage) {
  const entries = Array.from(coverage ?? []);
  if (!entries.length) return null;
  return Math.round(entries.reduce((sum, entry) => sum + (entry.condition ?? 0), 0) / entries.length);
}

/**
 * The condition a new coverage entry starts with: the original durability of the piece; a piece without one (0 or less) starts at its current durability, else at QUALITY_INITIAL.
 *
 * @param {number} original system.originalQuality
 * @param {number} [quality] system.quality
 */
export const startingCondition = (original, quality = 0) => (original > 0 ? original : quality > 0 ? quality : QUALITY_INITIAL);

/**
 * Split the both-sides entries of a type that has sides into a left and a right entry (the condition is copied; a side the armor already covers keeps its own entry). Entries of types without sides, and entries that already have a side, stay as they are; old type keys become their current type. Returns a new array.
 *
 * @param {{type: string, side?: string, condition?: number}[]|undefined} coverage
 * @returns {{type: string, side: string, condition: number}[]}
 */
export function splitBothSides(coverage) {
  const out = [];
  const seen = new Set();
  const push = (type, side, condition) => {
    const id = `${type}:${side}`;
    if (seen.has(id)) return;
    seen.add(id);
    out.push({ type, side, condition });
  };
  const existing = (coverage ?? []).filter(e => e.side).map(e => `${locationKey(e.type)}:${e.side}`);
  for (const entry of coverage ?? []) {
    const type = locationKey(entry.type);
    const condition = Number(entry.condition) || 0;
    if (entry.side || !hasSides(type)) { push(type, entry.side ?? "", condition); continue; }
    for (const side of LOCATION_SIDES) if (!existing.includes(`${type}:${side}`)) push(type, side, condition);
  }
  return out;
}

/**
 * The coverage entries of armor that stored its locations the old way: a set of keys (a type such as "arm" for both sides, or a key such as "leftArm" for one) and a map of key -> condition. Old type keys become their current type, duplicates are dropped, the condition is the number stored for the key or 0.
 *
 * @param {Iterable<string>|undefined} keys
 * @param {Object<string, number>|undefined} conditions
 * @returns {{type: string, side: string, condition: number}[]}
 */
export function legacyCoverage(keys, conditions) {
  const seen = new Set();
  const entries = [];
  for (const key of keys ?? []) {
    const sided = LEGACY_SIDED_KEYS[key];
    const type = sided ? sided.type : locationKey(key);
    const side = sided ? sided.side : "";
    const id = `${type}:${side}`;
    if (seen.has(id)) continue;
    seen.add(id);
    const condition = Number(conditions?.[key]);
    entries.push({ type, side, condition: Number.isFinite(condition) ? condition : 0 });
  }
  return entries;
}

/**
 * The value of a picker option for a coverage entry ("arm:left", "head:").
 *
 * @param {{type: string, side?: string}} entry
 * @returns {string}
 */
export const entryValue = (entry) => `${entry.type}:${entry.side ?? ""}`;

/**
 * The coverage entry for a picker option value (the reverse of entryValue).
 *
 * @param {string} value
 * @returns {{type: string, side: string}|null} null when the type is not a canonical location or the side is not left, right or empty
 */
export function entryFromValue(value) {
  const [type, side = ""] = String(value ?? "").split(":");
  if (!type || !(type in ARMOR_LOCATIONS) || (side && !LOCATION_SIDES.includes(side))) return null;
  return { type, side };
}

/**
 * The coverage entries the armor picker may offer for a wearer, in the order of the canonical locations (left before right). Without hit location items (armor not on an actor, or an actor with none) every location is offered, a type with sides as its left and its right entry; otherwise only the locations the wearer has, and only the sides it has (both when the side of a location is not known).
 *
 * @param {object[]|null} locationItems the wearer's armorLocation items ({name, system: {locationType, side}})
 * @returns {{type: string, side: string}[]}
 */
export function pickerEntries(locationItems) {
  const wanted = new Map(); // "type:side" -> entry
  const add = (type, side) => wanted.set(`${type}:${side}`, { type, side });
  const items = locationItems?.length ? locationItems : null;
  for (const type of Object.keys(ARMOR_LOCATIONS)) {
    if (!SIDED_TYPES.includes(type)) { if (!items || items.some(i => locationKey(i.system?.locationType) === type)) add(type, ""); continue; }
    if (!items) { LOCATION_SIDES.forEach(side => add(type, side)); continue; }
    for (const item of items.filter(i => locationKey(i.system?.locationType) === type)) {
      const side = locationSide(item);
      if (side) add(type, side);
      else LOCATION_SIDES.forEach(s => add(type, s));
    }
  }
  const order = Object.keys(ARMOR_LOCATIONS);
  return [...wanted.values()].sort((a, b) => order.indexOf(a.type) - order.indexOf(b.type) || LOCATION_SIDES.indexOf(a.side) - LOCATION_SIDES.indexOf(b.side));
}

/** The lang key of the name of a location type. */
export const armorLocationLabel = (type) => ARMOR_LOCATIONS[locationKey(type)]?.label ?? `SCARMARK.ArmorLocation.type.${type}`;
