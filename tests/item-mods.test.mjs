// Modifiers on weapon and armor stats (rules/item-mods.mjs) and repairing armor (rules/armor-care.mjs). All pure.
import "./support/foundry-stub.mjs";
import { test } from "node:test";
import assert from "node:assert";
import { itemModsOf, applyItemMods, weaponEffective, armorEffective, effectiveStat, repairedArmor, armorRepairProblem, isTimedDuration } from "../module/rules/index.mjs";
import { buildEffectTypes } from "../module/view/effects-view.mjs";

const change = (key, value, extra = {}) => ({ key: `system.itemMods.${key}`, type: "add", value, ...extra });
const effect = (changes, extra = {}) => ({ disabled: false, transfer: false, system: { changes }, ...extra });
const add = (value, priority = 20) => ({ type: "add", value, priority });
const set = (value, priority = 50) => ({ type: "override", value, priority });

test("itemModsOf: the item-stat changes of the effects that count, per stat, with their priority", () => {
  const mods = itemModsOf([
    effect([change("impact.edged", 2), change("attack", -1)]),
    effect([change("impact.edged", "1", { type: "override", priority: 5 }), { key: "system.mods.skill.Vitality", type: "add", value: 5 }]),
    effect([change("attack", 9)], { disabled: true }),
    effect([change("attack", 9)], { transfer: true })
  ]);
  assert.deepStrictEqual(mods, { "impact.edged": [add(2), set(1, 5)], attack: [add(-1)] });
});

test("itemModsOf: add and set only, a number value, the older modes 2 and 5, the default priority of the type, no effects", () => {
  const mods = itemModsOf([effect([change("attack", 4, { type: "multiply" }), change("defense", "x"), { key: "system.itemMods.defense", mode: 2, value: 3 }, { key: "system.itemMods.quality", mode: 5, value: 7 }, change("attack", 1, { priority: null })])]);
  assert.deepStrictEqual(mods, { defense: [add(3)], quality: [set(7)], attack: [add(1)] });
  assert.deepStrictEqual(itemModsOf([{ changes: [change("attack", 2)] }]), { attack: [add(2)] });
  assert.deepStrictEqual(itemModsOf(undefined), {});
  assert.deepStrictEqual(itemModsOf([]), {});
});

test("applyItemMods: in priority order, an add adds and a set replaces; a set wins over an add by default", () => {
  assert.strictEqual(applyItemMods(5, undefined), 5);
  assert.strictEqual(applyItemMods(5, [add(2), add(-1)]), 6);
  assert.strictEqual(applyItemMods(5, [set(9), add(2)]), 9, "the add has the lower default priority, so it comes first and the set replaces it");
  assert.strictEqual(applyItemMods(5, [add(2, 60), set(9)]), 11, "an add given a later priority is applied on top of the set");
  assert.strictEqual(applyItemMods(5, [set(1, 10), set(3, 10)]), 3, "equal priorities: the later effect wins");
});

test("weaponEffective: stored values with the modifiers applied; no aspect (-1) and no durability (0) stay as they are", () => {
  const weapon = { quality: 8, attack: 5, defense: 3, specialization: 2, impact: { blunt: 1, edged: 4, piercing: -1, fire: 0 } };
  assert.deepStrictEqual(weaponEffective(weapon, { quality: [add(2)], attack: [add(2)], specialization: [set(0)], "impact.edged": [add(1)], "impact.piercing": [add(3)], "impact.fire": [set(4)] }), { quality: 10, attack: 7, defense: 3, specialization: 0, impact: { blunt: 1, edged: 5, piercing: -1, fire: 4 } });
  assert.deepStrictEqual(weaponEffective(weapon, {}).impact, weapon.impact);
  assert.strictEqual(weaponEffective({ ...weapon, quality: 0 }, { quality: [add(5)] }).quality, 0);
});

test("armorEffective: the protection with the modifiers applied; durability changes the condition of every location, never below 0", () => {
  const armor = { protection: { blunt: 1, edged: 2, piercing: 0, fire: 0 }, coverage: [{ type: "chest", side: "", condition: 3 }, { type: "arm", side: "left", condition: 0 }] };
  const copy = structuredClone(armor);
  assert.deepStrictEqual(armorEffective(armor, { "protection.edged": [add(2)], "protection.fire": [set(1)] }).protection, { blunt: 1, edged: 4, piercing: 0, fire: 1 });
  assert.deepStrictEqual(armorEffective(armor, { quality: [add(2)] }).coverage.map(e => e.condition), [5, 2]);
  assert.deepStrictEqual(armorEffective(armor, { quality: [set(6)] }).coverage.map(e => [e.type, e.side, e.condition]), [["chest", "", 6], ["arm", "left", 6]]);
  assert.deepStrictEqual(armorEffective(armor, { quality: [add(-9)] }).coverage.map(e => e.condition), [0, 0]);
  assert.strictEqual(armorEffective(armor, {}).coverage, armor.coverage);
  assert.deepStrictEqual(armor, copy);
});

test("effectiveStat: the effective value when the item has one, else the stored one", () => {
  assert.strictEqual(effectiveStat({ attack: 5, effective: { attack: 7 } }, "attack"), 7);
  assert.strictEqual(effectiveStat({ attack: 5 }, "attack"), 5);
  assert.strictEqual(effectiveStat({ impact: { edged: 2 }, effective: { impact: { edged: 0 } } }, "impact.edged"), 0);
  assert.strictEqual(effectiveStat({ impact: { edged: 2 } }, "impact.edged"), 2);
  assert.strictEqual(effectiveStat({ protection: { blunt: 3 } }, "protection.blunt"), 3);
  assert.strictEqual(effectiveStat({ quality: 8, effective: { quality: 0 } }, "quality"), 0);
});

const piece = (fields = {}) => ({ coverage: [{ type: "chest", side: "", condition: 3 }, { type: "arm", side: "left", condition: 0 }, { type: "arm", side: "right", condition: 7 }], originalQuality: 8, quality: 3, ...fields });

test("repairedArmor: every location goes back to the original durability, nothing else changes", () => {
  const armor = piece();
  const copy = structuredClone(armor);
  const result = repairedArmor(armor);
  assert.deepStrictEqual(result.coverage.map(e => e.condition), [8, 8, 8]);
  assert.deepStrictEqual(result.coverage.map(e => [e.type, e.side]), [["chest", ""], ["arm", "left"], ["arm", "right"]]);
  assert.deepStrictEqual(Object.keys(result), ["coverage"]);
  assert.deepStrictEqual(armor, copy);
});

test("repairedArmor: a piece with no original durability is repaired to its current one, else the default", () => {
  assert.deepStrictEqual(repairedArmor(piece({ originalQuality: 0, quality: 6 })).coverage.map(e => e.condition), [6, 6, 6]);
  assert.deepStrictEqual(repairedArmor(piece({ originalQuality: 0, quality: 0 })).coverage.map(e => e.condition), [10, 10, 10]);
});

test("armorRepairProblem: natural armor and a piece with no coverage cannot be repaired", () => {
  assert.strictEqual(armorRepairProblem(piece()), null);
  assert.strictEqual(armorRepairProblem(piece({ quality: -1 })), "natural");
  assert.strictEqual(armorRepairProblem(piece({ coverage: [] })), "noCoverage");
});

test("isTimedDuration: world time, rounds and turns are timed; no duration is permanent", () => {
  assert.strictEqual(isTimedDuration({ value: 2, units: "hours" }), true);
  assert.strictEqual(isTimedDuration({ rounds: 3 }), true);
  assert.strictEqual(isTimedDuration({ turns: 1 }), true);
  assert.strictEqual(isTimedDuration({}), false);
  assert.strictEqual(isTimedDuration(undefined), false);
  assert.strictEqual(isTimedDuration({ value: 0, units: "hours" }), false);
});

test("effect picker: a weapon and an armor piece have their own stats, the character none of them", () => {
  const stats = (type) => buildEffectTypes({ parent: { documentName: "Actor", items: [] } }, { localize: key => key }).types.find(entry => entry.type === type).groups.flatMap(group => group.options.map(([key]) => key));
  assert.deepStrictEqual(stats("weapon"), ["quality", "attack", "defense", "specialization", "impact.blunt", "impact.edged", "impact.piercing", "impact.fire"].map(stat => `system.itemMods.${stat}`));
  assert.deepStrictEqual(stats("armor"), ["quality", "protection.blunt", "protection.edged", "protection.piercing", "protection.fire"].map(stat => `system.itemMods.${stat}`));
  assert.ok(stats("character").every(key => !key.startsWith("system.itemMods.")));
});
