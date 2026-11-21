// The item tooltip: which lines each kind of item shows, and the plain text of a description.
import { test } from "node:test";
import assert from "node:assert";
import { itemTooltip, plainText } from "../module/view/item-tooltip.mjs";

const t = (key, data) => (data ? `${key}(${data.letters})` : key);
const context = { t, typeLabel: (type) => `<${type}>`, label: (group, key) => `${group}:${key}` };
const item = (id, type, system = {}, name = id) => ({ id, type, name, system });
const lines = (model) => Object.fromEntries(model.lines.map(l => [l.label, l.value]));

test("plainText: tags removed, block ends become line breaks, entities decoded", () => {
  assert.strictEqual(plainText("<p>One &amp; two</p><p>Three<br>four &lt;5&gt;</p>"), "One & two\nThree\nfour <5>");
  assert.strictEqual(plainText(null), "");
  assert.strictEqual(plainText("<p></p><p></p><p></p><p>x</p>"), "x");
});

test("a gear item: type, quantity, weights, value, carried", () => {
  const model = itemTooltip(item("g", "gear", { quantity: 3, weight: 0.5, totalWeight: 1.5, value: 2, totalValue: 6, carried: true }, "Rope"), [], context);
  assert.strictEqual(model.title, "Rope");
  assert.deepStrictEqual(lines(model), { type: "<gear>", quantity: "3", weightEach: "0.5 kg", weightTotal: "1.5 kg", valueEach: "2", valueTotal: "6", carried: "yes" });
  assert.strictEqual(model.notes, "");
});

test("a rune is a Rune and shows its artifact class and attunement", () => {
  const model = itemTooltip(item("r", "gear", { rune: true, artifact: { active: false, class: 3, attuned: true } }), [], context);
  assert.deepStrictEqual([lines(model).type, lines(model).artifactClass, lines(model).attuned], ["rune", "3", "yes"]);
});

test("a weapon: durability, attack and defense, impact in the order of the aspect letters, -1 is a dash", () => {
  const sword = item("w", "weapon", { quality: 12, attack: 2, defense: 1, impact: { blunt: 0, edged: 6, piercing: -1, fire: 2 }, associatedSkill: "close", specialization: 0, isShield: false, broken: true });
  const l = lines(itemTooltip(sword, [], context));
  assert.deepStrictEqual([l.durability, l.attackDefense, l.skill, l.specialization, l.shield, l.broken], ["12", "2 / 1", "skill:close", "0", "no", "yes"]);
  assert.strictEqual(l["impact(B/E/P/F)"], "0 / 6 / - / 2");
});

test("armor and missile lines; the letters label the tables", () => {
  const armor = itemTooltip(item("a", "armor", { quality: 5, originalQuality: 10, layer: 4, protection: { blunt: 2, edged: 3, piercing: 1, fire: 0 }, coverage: [{ type: "head", side: "" }, { type: "arm", side: "left" }] }), [], { ...context, coverageLabel: (e) => `${e.side || "both"} ${e.type}` });
  assert.deepStrictEqual([lines(armor).layer, lines(armor)["protection(B/E/P/F)"], lines(armor).locations, lines(armor).durability], ["4", "2 / 3 / 1 / 0", "both head, left arm", "5/10"]);
  assert.ok(armor.lines.some(line => line.label === "protection(B/E/P/F)"));
  const bow = itemTooltip(item("m", "missile", { velocity: "high", aspect: "piercing", range: { short: 10, medium: 20, long: 40, extreme: 80 }, impact: { short: 5, medium: 4, long: 3, extreme: -1 }, magic: true, spellClass: 2 }), [], context);
  assert.deepStrictEqual([lines(bow).velocity, lines(bow).aspect, lines(bow).magicClass], ["velocity:high", "aspect:piercing", "2"]);
  assert.ok(bow.lines.some(line => line.label === "range(S/M/L/E)" && line.value === "10 / 20 / 40 / 80"));
  assert.ok(bow.lines.some(line => line.label === "impactBands(S/M/L/E)" && line.value === "5 / 4 / 3 / -"));
});

test("a container: total weight includes the contents, fill, and the items stored in it", () => {
  const bag = item("bag", "container", { quantity: 1, weight: 1, totalWeight: 1, maxCapacity: 10 }, "Bag");
  const items = [bag, item("c1", "gear", { container: "bag", quantity: 2, weight: 1.5 }, "Coin"), item("c2", "gear", { container: "bag", weight: 0.5 }, "Gem")];
  const l = lines(itemTooltip(bag, items, context));
  assert.strictEqual(l.weightTotal, "4.5 kg");
  assert.strictEqual(l.contents, "3.5 / 10 kg");
  assert.strictEqual(l.items, "Coin ×2, Gem ×1");
  assert.strictEqual(lines(itemTooltip(item("e", "container", { maxCapacity: 5 }), [], context)).items, "empty");
});

test("an item in a container says which, notes and description are joined and cut at 400 characters", () => {
  const items = [item("bag", "container", {}, "Bag")];
  const stored = itemTooltip(item("x", "gear", { container: "bag", notes: "red", description: "<p>Long</p>" }), items, context);
  assert.strictEqual(lines(stored).storedIn, "Bag");
  assert.strictEqual(stored.notes, "red\n\nLong");
  assert.strictEqual(lines(itemTooltip(item("y", "gear", { container: "gone" }), items, context)).storedIn, "unknown");
  const long = itemTooltip(item("z", "gear", { notes: "n".repeat(500) }), [], context);
  assert.strictEqual(long.notes.length, 401);
  assert.ok(long.notes.endsWith("…"));
});
