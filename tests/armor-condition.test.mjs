// Armor condition per covered location: where a piece still holds, the derived durability, the starting condition and what a hit wears.
import "./support/foundry-stub.mjs";
import { test } from "node:test";
import assert from "node:assert";
import { entryIndexesAt, holdsAt, wearIndexAt, averageCondition, startingCondition } from "../module/rules/index.mjs";
import { QUALITY_INITIAL, QUALITY_PERMANENT } from "../module/config/index.mjs";
import { SCARMARK } from "../module/config.mjs";
import { armorProtection, coveringArmor } from "../module/helpers/combat/armor.mjs";
import ScarmarkArmorData from "../module/data/item-armor.mjs";
import { adapters } from "./golden/adapters.mjs";

const entry = (type, side = "", condition = 0) => ({ type, side, condition });

test("entryIndexesAt: the entries that meet a struck location, by type and side", () => {
  const coverage = [entry("head"), entry("arm", "left"), entry("arm", "right"), entry("chest")];
  assert.deepStrictEqual(entryIndexesAt(coverage, "arm", "left"), [1]);
  assert.deepStrictEqual(entryIndexesAt(coverage, "arm", "right"), [2]);
  assert.deepStrictEqual(entryIndexesAt(coverage, "arm", ""), [1, 2], "no known side on a type with sides meets every entry of the type");
  assert.deepStrictEqual(entryIndexesAt(coverage, "head"), [0]);
  assert.deepStrictEqual(entryIndexesAt(coverage, "belly"), []);
  assert.deepStrictEqual(entryIndexesAt(undefined, "head"), []);
});

test("holdsAt and wearIndexAt: a location at condition 0 no longer protects, the others do", () => {
  const coverage = [entry("head", "", 0), entry("arm", "left", 3), entry("arm", "right", 0)];
  assert.deepStrictEqual([holdsAt(coverage, "head"), holdsAt(coverage, "arm", "left"), holdsAt(coverage, "arm", "right"), holdsAt(coverage, "chest")], [false, true, false, false]);
  assert.deepStrictEqual([wearIndexAt(coverage, "head"), wearIndexAt(coverage, "arm", "left"), wearIndexAt(coverage, "arm", "right")], [-1, 1, -1]);
});

test("averageCondition: the rounded average of the entries, null without entries", () => {
  assert.strictEqual(averageCondition([entry("head", "", 10), entry("arm", "left", 5), entry("arm", "right", 6)]), 7);
  assert.strictEqual(averageCondition([entry("head", "", 10)]), 10);
  assert.strictEqual(averageCondition([entry("head", "", 0), entry("chest", "", 1)]), 1, "0.5 rounds up");
  assert.strictEqual(averageCondition([]), null);
  assert.strictEqual(averageCondition(undefined), null);
});

test("startingCondition: the original durability, else the current one, else the default", () => {
  assert.deepStrictEqual([startingCondition(12, 5), startingCondition(0, 7), startingCondition(0, 0), startingCondition(-1, -1)], [12, 7, QUALITY_INITIAL, QUALITY_INITIAL]);
});

test("the durability of a piece is derived from its conditions; Natural armor and a piece with no coverage keep theirs", () => {
  const prepare = (data) => { const system = Object.assign(new ScarmarkArmorData(), data); system.prepareDerivedData(); return system.quality; };
  assert.strictEqual(prepare({ quality: 99, coverage: [entry("head", "", 10), entry("chest", "", 5)] }), 8);
  assert.strictEqual(prepare({ quality: QUALITY_PERMANENT, coverage: [entry("head", "", 0)] }), QUALITY_PERMANENT);
  assert.strictEqual(prepare({ quality: 4, coverage: [] }), 4);
});

test("worn armor protects each location by its own condition; Natural armor always protects what it covers", () => {
  const piece = (id, quality, coverage, blunt) => ({ id, type: "armor", system: { carried: true, quality, container: "", coverage, protection: { blunt } } });
  const actor = { items: [
    piece("plate", 5, [entry("head", "", 4), entry("arm", "left", 0), entry("arm", "right", 3)], 6),
    piece("hide", QUALITY_PERMANENT, [entry("arm", "left", 0)], 2)
  ] };
  actor.items.get = (id) => actor.items.find(i => i.id === id);
  assert.deepStrictEqual(coveringArmor(actor, "head").map(a => a.id), ["plate"]);
  assert.deepStrictEqual(coveringArmor(actor, "arm", "left").map(a => a.id), ["hide"], "the plate is gone at the left arm, the hide still covers it");
  assert.deepStrictEqual(coveringArmor(actor, "arm", "right").map(a => a.id), ["plate"]);
  assert.strictEqual(armorProtection(actor, "arm", "blunt", "left"), 2);
  assert.strictEqual(armorProtection(actor, "arm", "blunt", "right"), 6);
});

// A strike on one location: what the card says and which armor updates it makes (the 50/50 wear decision is the scripted wearRandom).
const loc = (type, name) => {
  const c = SCARMARK.armorLocations[type];
  return { name, system: { locationType: type, aim: { ...c.aim }, injury: { ...c.injury }, risk: { ...c.risk } } };
};
const strike = (armor, locations, wearRandom = 0.1) => adapters.strike({
  aspect: "blunt", impact: 8, strikeDice: 2, strikeRoll: 6, aim: "mid", skill: "close", armorPiercing: false, locationRandom: 0.5, wearRandom, locations, armor
});
const protection = { blunt: 4, edged: 5, piercing: 3, fire: 2 };
const piece = (name, layer, coverage, quality = 5) => ({ name, quality, layer, carried: true, quantity: 1, weight: 0, coverage, protection });

test("a hit wears only the condition of the struck location of the highest-layer piece that still holds there", async () => {
  const result = await strike([piece("Coif", 4, [entry("head", "", 3), entry("neck", "", 7)]), piece("Cap", 2, [entry("head", "", 3)])], [loc("head", "Head")]);
  assert.strictEqual(result.wear, "armorWorn");
  assert.deepStrictEqual(result.armorUpdates, [{ name: "Coif", updates: [{ "system.coverage": [entry("head", "", 2), entry("neck", "", 7)] }] }]);
});

test("a piece at condition 0 on the struck location is skipped: it gives no protection and the next layer wears", async () => {
  const result = await strike([piece("Plate helm", 5, [entry("head", "", 0), entry("neck", "", 6)]), piece("Cap", 2, [entry("head", "", 1)])], [loc("head", "Head")]);
  assert.strictEqual(result.armorProt, 4, "only the cap protects");
  assert.strictEqual(result.wear, "armorDestroyed", "the cap goes from 1 to 0");
  assert.deepStrictEqual(result.armorUpdates, [{ name: "Cap", updates: [{ "system.coverage": [entry("head", "", 0)] }] }]);
});

test("the wear roll can spare the armor, and Natural armor protects but never wears", async () => {
  const spared = await strike([piece("Helm", 3, [entry("head", "", 3)])], [loc("head", "Head")], 0.9);
  assert.strictEqual(spared.wear, "armorSpared");
  assert.deepStrictEqual(spared.armorUpdates, []);
  const natural = await strike([piece("Hide", 3, [entry("head", "", 0)], QUALITY_PERMANENT)], [loc("head", "Head")]);
  assert.strictEqual(natural.armorProt, 4);
  assert.strictEqual(natural.wear, null);
  assert.deepStrictEqual(natural.armorUpdates, []);
});
