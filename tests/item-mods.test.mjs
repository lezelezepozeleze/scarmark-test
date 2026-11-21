// Modifiers on weapon and armor stats (rules/item-mods.mjs) and repairing armor (rules/armor-care.mjs). All pure.
import "./support/foundry-stub.mjs";
import { test } from "node:test";
import assert from "node:assert";
import { itemModsOf, weaponEffective, armorEffective, effectiveStat, repairedArmor, armorRepairProblem, isTimedDuration } from "../module/rules/index.mjs";
import { buildEffectKeyOptions } from "../module/view/effects-view.mjs";

const change = (key, value, extra = {}) => ({ key: `system.itemMods.${key}`, type: "add", value, ...extra });
const effect = (changes, extra = {}) => ({ disabled: false, transfer: false, system: { changes }, ...extra });

test("itemModsOf: sums the item-stat changes of the effects that count", () => {
  const mods = itemModsOf([
    effect([change("impact.edged", 2), change("attack", -1)]),
    effect([change("impact.edged", "1"), { key: "system.mods.skill.Vitality", type: "add", value: 5 }]),
    effect([change("attack", 9)], { disabled: true }),
    effect([change("attack", 9)], { transfer: true })
  ]);
  assert.deepStrictEqual(mods, { "impact.edged": 3, attack: -1 });
});

test("itemModsOf: only add changes, a number value, the older mode 2, no effects", () => {
  assert.deepStrictEqual(itemModsOf([effect([change("attack", 4, { type: "override" }), change("defense", "x"), { key: "system.itemMods.defense", mode: 2, value: 3 }])]), { defense: 3 });
  assert.deepStrictEqual(itemModsOf([{ changes: [change("attack", 2)] }]), { attack: 2 });
  assert.deepStrictEqual(itemModsOf(undefined), {});
  assert.deepStrictEqual(itemModsOf([]), {});
});

test("weaponEffective: stored values plus modifiers, an aspect the weapon lacks (-1) stays -1", () => {
  const weapon = { attack: 5, defense: 3, impact: { blunt: 1, edged: 4, piercing: -1, fire: 0 } };
  assert.deepStrictEqual(weaponEffective(weapon, { attack: 2, "impact.edged": 1, "impact.piercing": 3, "impact.fire": -1 }), { attack: 7, defense: 3, impact: { blunt: 1, edged: 5, piercing: -1, fire: -1 } });
  assert.deepStrictEqual(weaponEffective(weapon, {}).impact, weapon.impact);
});

test("armorEffective: the protection plus the modifiers", () => {
  assert.deepStrictEqual(armorEffective({ protection: { blunt: 1, edged: 2, piercing: 0, fire: 0 } }, { "protection.edged": 2, "protection.fire": 1 }), { protection: { blunt: 1, edged: 4, piercing: 0, fire: 1 } });
});

test("effectiveStat: the effective value when the item has one, else the stored one", () => {
  assert.strictEqual(effectiveStat({ attack: 5, effective: { attack: 7 } }, "attack"), 7);
  assert.strictEqual(effectiveStat({ attack: 5 }, "attack"), 5);
  assert.strictEqual(effectiveStat({ impact: { edged: 2 }, effective: { impact: { edged: 0 } } }, "impact.edged"), 0);
  assert.strictEqual(effectiveStat({ impact: { edged: 2 } }, "impact.edged"), 2);
  assert.strictEqual(effectiveStat({ protection: { blunt: 3 } }, "protection.blunt"), 3);
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

test("effect key picker: a weapon effect lists the weapon stats, an armor effect the armor stats, other effects neither", () => {
  const options = (parent) => buildEffectKeyOptions({ parent }, { localize: key => key }).filter(group => group.label.includes("groupItem")).flatMap(group => group.options.map(([key]) => key));
  assert.deepStrictEqual(options({ documentName: "Item", type: "weapon" }), ["system.itemMods.attack", "system.itemMods.defense", "system.itemMods.impact.blunt", "system.itemMods.impact.edged", "system.itemMods.impact.piercing", "system.itemMods.impact.fire"]);
  assert.deepStrictEqual(options({ documentName: "Item", type: "armor" }), ["system.itemMods.protection.blunt", "system.itemMods.protection.edged", "system.itemMods.protection.piercing", "system.itemMods.protection.fire"]);
  assert.deepStrictEqual(options({ documentName: "Item", type: "gear" }), []);
  assert.deepStrictEqual(options({ documentName: "Actor", items: [] }), []);
});
