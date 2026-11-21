// The Actions panel is not tied to items: it edits the list at any data path of any document, and the partial renders from the view model alone. Also: which actions a trigger sets off, and which effects an "owned" action makes passive.
import "./support/foundry-stub.mjs";
import { test } from "node:test";
import assert from "node:assert";
import { createRenderer } from "./support/render.mjs";
import { prepareActionsPanel, ACTIONS_PANEL_TEMPLATE } from "../module/sheets/actions/action-panel.mjs";
import { actionsFor, isTestAction, isAlterAction, isMessageAction, isEffectAction, parseActionTest, ownedEffectChanges } from "../module/rules/index.mjs";

const { render } = createRenderer();
const effects = [{ id: "e1", name: "Bless" }, { id: "e2", name: "Curse <x>" }];
const action = (fields) => ({ id: "a", effect: "", on: "", targetItem: "", when: "", ...fields });
const values = (rollDown) => rollDown.options.map(o => o.value);
const panelOf = (fields, system = {}, extra = {}) => prepareActionsPanel({ _source: { system: { actions: [action(fields)], ...system } }, ...extra }).rows[0];
const owner = { documentName: "Actor", items: [{ id: "a1", name: "Chainmail", type: "armor" }, { id: "w1", name: "Sword", type: "weapon" }, { id: "a2", name: "Helm", type: "armor" }, { id: "g1", name: "Rope", type: "gear" }] };

test("prepareActionsPanel: one row per action, roll-downs named by the data path, the stored effect selected", () => {
  const document = { effects, _source: { system: { actions: [action({ effect: "e2" }), action({ id: "b" })] } } };
  const panel = prepareActionsPanel(document);
  assert.strictEqual(panel.path, "system.actions");
  assert.deepStrictEqual(panel.rows.map(row => row.effect.name), ["system.actions.0.effect", "system.actions.1.effect"]);
  assert.deepStrictEqual(panel.rows[0].effect.groups.map(g => g.options.map(o => [o.value, o.label, o.selected])), [[["e1", "Bless", false], ["e2", "Curse <x>", true]]]);
  assert.deepStrictEqual([panel.rows[0].effect.blankSelected, panel.rows[1].effect.blankSelected], [false, true]);
});

test("prepareActionsPanel: the when roll-down follows the Usable and Consumable flags; a stored trigger stays", () => {
  assert.deepStrictEqual(values(panelOf({}).when), ["", "owned", "inspected"]);
  assert.deepStrictEqual(values(panelOf({}, { usable: true }).when), ["", "owned", "inspected", "used"]);
  assert.deepStrictEqual(values(panelOf({}, { consumable: true }).when), ["", "owned", "inspected", "consumed"]);
  assert.deepStrictEqual(values(panelOf({}, { usable: true, consumable: true }).when), ["", "owned", "inspected", "used", "consumed"]);
  assert.deepStrictEqual(panelOf({ when: "consumed" }).when.options.map(o => [o.value, o.selected]), [["", false], ["owned", false], ["inspected", false], ["consumed", true]]);
});

test("prepareActionsPanel: the on roll-down (self, selected token) shows only for an add-effect action of a trigger that asks for a target", () => {
  assert.strictEqual(panelOf({ when: "" }).showOn, false);
  assert.strictEqual(panelOf({ when: "owned" }).showOn, false);
  assert.strictEqual(panelOf({ when: "consumed" }).showOn, false);
  assert.strictEqual(panelOf({ when: "inspected" }).showOn, true);
  assert.strictEqual(panelOf({ when: "used", kind: "test", test: "skill:Vitality" }, { usable: true }).showOn, false);
  const used = panelOf({ when: "used", on: "self" }, { usable: true });
  assert.strictEqual(used.showOn, true);
  assert.deepStrictEqual(used.on.options.map(o => [o.value, o.selected]), [["", false], ["self", true], ["selectedToken", false]]);
});

test("prepareActionsPanel: the do roll-down has four kinds and defaults to add effect", () => {
  const row = panelOf({ effect: "e1" }, {}, { effects });
  assert.deepStrictEqual(row.kind.options.map(o => [o.value, o.selected]), [["effect", true], ["test", false], ["alter", false], ["message", false]]);
  assert.deepStrictEqual([row.isEffect, row.isTest, row.isAlter, row.isMessage], [true, false, false, false]);
  const message = panelOf({ kind: "message", message: "It smells of lavender." });
  assert.deepStrictEqual([message.isMessage, message.isEffect, message.showOn], [true, false, false]);
  assert.deepStrictEqual(message.message, { name: "system.actions.0.message", value: "It smells of lavender." });
});

test("prepareActionsPanel: a test action lists the tests instead of the effects", () => {
  const tests = [{ label: "Attributes", options: [{ value: "attribute:str", label: "Strength" }] }, { label: "Skills", options: [{ value: "skill:Vitality", label: "Vitality" }] }];
  const row = prepareActionsPanel({ effects, _source: { system: { consumable: true, actions: [action({ kind: "test", test: "skill:Vitality", when: "consumed" })] } } }, "system.actions", { tests }).rows[0];
  assert.deepStrictEqual([row.isTest, row.isEffect], [true, false]);
  assert.deepStrictEqual(row.test.groups.map(g => [g.label, g.options.map(o => [o.value, o.selected])]), [["Attributes", [["attribute:str", false]]], ["Skills", [["skill:Vitality", true]]]]);
  assert.strictEqual(row.test.blankSelected, false);
});

test("prepareActionsPanel: an alter row lists the armor and weapons of the carrying character, then the alterations of the kind of item picked", () => {
  const alterations = { armor: [{ uuid: "Compendium.x.armor.ActiveEffect.r", name: "Repair" }, { uuid: "Compendium.x.armor.ActiveEffect.p", name: "Reinforced" }], weapon: [{ uuid: "Compendium.x.weapon.ActiveEffect.s", name: "Sharpened" }] };
  const make = (fields) => prepareActionsPanel({ parent: owner, _source: { system: { usable: true, actions: [action({ kind: "alter", when: "used", ...fields })] } } }, "system.actions", { alterations }).rows[0];
  const none = make({});
  assert.deepStrictEqual([none.isAlter, none.showOn, none.isEffect], [true, false, false]);
  assert.deepStrictEqual(values(none.targetItem), ["", "a1", "w1", "a2"]);
  assert.deepStrictEqual(values(none.alteration), [""]);
  const armor = make({ targetItem: "a2", alteration: "Compendium.x.armor.ActiveEffect.p" });
  assert.deepStrictEqual(armor.alteration.options.map(o => [o.label, o.selected]), [["", false], ["Repair", false], ["Reinforced", true]]);
  assert.deepStrictEqual(armor.targetItem.options.map(o => [o.value, o.selected]), [["", false], ["a1", false], ["w1", false], ["a2", true]]);
  assert.deepStrictEqual(values(make({ targetItem: "w1" }).alteration), ["", "Compendium.x.weapon.ActiveEffect.s"]);
});

test("prepareActionsPanel: works at any path of any document (here a flag, no effects)", () => {
  const panel = prepareActionsPanel({ _source: { flags: { mod: { acts: [action({ id: "x" })] } } } }, "flags.mod.acts");
  assert.strictEqual(panel.path, "flags.mod.acts");
  assert.strictEqual(panel.rows[0].when.name, "flags.mod.acts.0.when");
  assert.deepStrictEqual(panel.rows[0].effect.groups, []);
});

test("prepareActionsPanel: the effect roll-down also offers the effect library, the stored library uuid selected", () => {
  const library = [{ label: "Effects", entries: [{ uuid: "Compendium.scarmark-test.effects.ActiveEffect.shaved", name: "Freshly shaved" }] }];
  const row = prepareActionsPanel({ effects, _source: { system: { actions: [action({ effect: "Compendium.scarmark-test.effects.ActiveEffect.shaved" })] } } }, "system.actions", { library }).rows[0];
  assert.deepStrictEqual(row.effect.groups.map(g => [g.label, g.options.map(o => [o.label, o.selected])]), [["SCARMARK.Action.thisItem", [["Bless", false], ["Curse <x>", false]]], ["Effects", [["Freshly shaved", true]]]]);
  const html = render(ACTIONS_PANEL_TEMPLATE, { panel: { path: "system.actions", rows: [row] } });
  assert.ok(html.includes('<optgroup label="Effects">') && html.includes('<optgroup label="SCARMARK.Action.thisItem">'));
  assert.ok(html.includes('<option value="Compendium.scarmark-test.effects.ActiveEffect.shaved" selected>Freshly shaved</option>'));
});

test("parseActionTest: skill and attribute tests, an older bare skill name, no test", () => {
  assert.deepStrictEqual(parseActionTest("skill:Close Combat"), { type: "skill", name: "Close Combat" });
  assert.deepStrictEqual(parseActionTest("attribute:str"), { type: "attribute", name: "str" });
  assert.deepStrictEqual(parseActionTest("vitality"), { type: "skill", name: "vitality" });
  assert.strictEqual(parseActionTest(""), null);
  assert.strictEqual(parseActionTest(undefined), null);
});

test("actions-panel partial: when / do / effect / on, hidden id, escaped effect names, delete and add links, the empty line", () => {
  const document = { effects, _source: { system: { usable: true, actions: [action({ id: "a1", when: "used", effect: "e2", on: "selectedToken" })] } } };
  const html = render(ACTIONS_PANEL_TEMPLATE, { panel: prepareActionsPanel(document) });
  assert.ok(html.includes('data-actions-path="system.actions"'));
  assert.ok(html.includes('name="system.actions.0.id" value="a1"'));
  assert.ok(html.includes('<option value="e2" selected>Curse &lt;x&gt;</option>'));
  for (const field of ["when", "kind", "effect", "on"]) assert.ok(html.includes(`name="system.actions.0.${field}"`), field);
  assert.ok(html.indexOf('name="system.actions.0.when"') < html.indexOf('name="system.actions.0.kind"') && html.indexOf('name="system.actions.0.kind"') < html.indexOf('name="system.actions.0.effect"'));
  for (const field of ["test", "alteration", "message", "targetItem"]) assert.ok(!html.includes(`name="system.actions.0.${field}"`), field);
  assert.ok(html.includes('data-action="deleteAction"') && html.includes('data-action="createAction"'));
  assert.ok(render(ACTIONS_PANEL_TEMPLATE, { panel: { path: "system.actions", rows: [] } }).includes("{SCARMARK.Action.none}"));
});

test("actions-panel partial: a test row shows the test roll-down only", () => {
  const html = render(ACTIONS_PANEL_TEMPLATE, { panel: prepareActionsPanel({ effects, _source: { system: { consumable: true, actions: [action({ when: "consumed", kind: "test", test: "skill:Vitality" })] } } }) });
  assert.ok(html.includes('name="system.actions.0.test"'));
  for (const field of ["effect", "on", "alteration", "message", "targetItem"]) assert.ok(!html.includes(`name="system.actions.0.${field}"`), field);
});

test("actions-panel partial: an alter row shows the item and its alteration; a message row shows the text", () => {
  const alterations = { armor: [{ uuid: "Compendium.x.armor.ActiveEffect.r", name: "Repair" }] };
  const alter = render(ACTIONS_PANEL_TEMPLATE, { panel: prepareActionsPanel({ parent: owner, effects, _source: { system: { usable: true, actions: [action({ kind: "alter", when: "used", targetItem: "a1", alteration: "Compendium.x.armor.ActiveEffect.r" })] } } }, "system.actions", { alterations }) });
  for (const field of ["targetItem", "alteration"]) assert.ok(alter.includes(`name="system.actions.0.${field}"`), field);
  assert.ok(alter.includes('<option value="a1" selected>Chainmail</option>') && alter.includes('<option value="Compendium.x.armor.ActiveEffect.r" selected>Repair</option>'));
  assert.ok(alter.indexOf('name="system.actions.0.targetItem"') < alter.indexOf('name="system.actions.0.alteration"'));
  for (const field of ["effect", "on", "test", "message"]) assert.ok(!alter.includes(`name="system.actions.0.${field}"`), field);
  const message = render(ACTIONS_PANEL_TEMPLATE, { panel: prepareActionsPanel({ _source: { system: { actions: [action({ kind: "message", when: "inspected", message: 'It "glows" <b>' })] } } }) });
  assert.ok(message.includes('name="system.actions.0.message" value="It &quot;glows&quot; &lt;b&gt;"'));
  for (const field of ["effect", "on", "targetItem", "alteration"]) assert.ok(!message.includes(`name="system.actions.0.${field}"`), field);
});

test("actionsFor: only the actions of that trigger that name what they do", () => {
  const list = [action({ effect: "u1", when: "used" }), action({ effect: "", when: "used" }), action({ effect: "u2", when: "" }), action({ effect: "u3", when: "used", on: "selectedToken" })];
  assert.deepStrictEqual(actionsFor(list, "used").map(a => a.effect), ["u1", "u3"]);
  assert.deepStrictEqual(actionsFor(undefined, "used"), []);
  const mixed = [action({ kind: "test", test: "skill:Vitality", when: "consumed" }), action({ kind: "test", test: "", when: "consumed" }), action({ kind: "effect", effect: "e1", when: "consumed" }), action({ kind: "test", effect: "e9", when: "consumed" })];
  assert.deepStrictEqual(actionsFor(mixed, "consumed").map(a => a.test || a.effect), ["skill:Vitality", "e1"]);
  assert.deepStrictEqual(mixed.map(isTestAction), [true, true, false, true]);
  const altered = [action({ kind: "alter", alteration: "repair", when: "used" }), action({ kind: "alter", alteration: "", when: "used", effect: "e1" })];
  assert.deepStrictEqual(actionsFor(altered, "used").map(a => a.alteration), ["repair"]);
  assert.deepStrictEqual(altered.map(isAlterAction), [true, true]);
  const messages = [action({ kind: "message", message: "Hello", when: "used" }), action({ kind: "message", message: "   ", when: "used" }), action({ kind: "message", message: "", when: "used" })];
  assert.deepStrictEqual(actionsFor(messages, "used").map(a => a.message), ["Hello"]);
  assert.deepStrictEqual(messages.map(isMessageAction), [true, true, true]);
});

test("isEffectAction: an older action with no kind adds an effect", () => {
  assert.strictEqual(isEffectAction(action({})), true);
  assert.deepStrictEqual([action({ kind: "test" }), action({ kind: "alter" }), action({ kind: "message" })].map(isEffectAction), [false, false, false]);
});

test("ownedEffectChanges: an owned action makes its effect transfer; removing it undoes only what it did", () => {
  const list = [{ id: "e1", transfer: false, managed: false }, { id: "e2", transfer: true, managed: true }, { id: "e3", transfer: true, managed: false }, { id: "e4", transfer: false, managed: false }];
  const owned = (effect) => action({ when: "owned", effect });
  assert.deepStrictEqual(ownedEffectChanges(list, [owned("e1"), owned("e2"), action({ when: "used", effect: "e4" })]), [{ id: "e1", transfer: true, managed: true }]);
  assert.deepStrictEqual(ownedEffectChanges(list, []), [{ id: "e2", transfer: false, managed: false }]);
  assert.deepStrictEqual(ownedEffectChanges(list, undefined), [{ id: "e2", transfer: false, managed: false }]);
  assert.deepStrictEqual(ownedEffectChanges(list, [action({ when: "owned", kind: "test", test: "skill:Vitality", effect: "e1" })]), [{ id: "e2", transfer: false, managed: false }]);
});
