// The Actions panel is not tied to items: it edits the list at any data path of any document, and the partial renders from the view model alone. Also: which actions a trigger sets off, and which effects an "owned" action makes passive.
import "./support/foundry-stub.mjs";
import { test } from "node:test";
import assert from "node:assert";
import { createRenderer } from "./support/render.mjs";
import { prepareActionsPanel, ACTIONS_PANEL_TEMPLATE } from "../module/sheets/actions/action-panel.mjs";
import { actionsFor, isTestAction, parseActionTest, ownedEffectChanges } from "../module/rules/index.mjs";

const { render } = createRenderer();
const effects = [{ id: "e1", name: "Bless" }, { id: "e2", name: "Curse <x>" }];
const action = (fields) => ({ id: "a", effect: "", on: "", targetItem: "", when: "", ...fields });
const values = (rollDown) => rollDown.options.map(o => o.value);
const panelOf = (fields, system = {}, extra = {}) => prepareActionsPanel({ _source: { system: { actions: [action(fields)], ...system } }, ...extra }).rows[0];

test("prepareActionsPanel: one row per action, roll-downs named by the data path, the stored effect selected", () => {
  const document = { effects, _source: { system: { actions: [action({ effect: "e2" }), action({ id: "b" })] } } };
  const panel = prepareActionsPanel(document);
  assert.strictEqual(panel.path, "system.actions");
  assert.deepStrictEqual(panel.rows.map(row => row.effect.name), ["system.actions.0.effect", "system.actions.1.effect"]);
  assert.deepStrictEqual(panel.rows[0].effect.groups.map(g => g.options.map(o => [o.value, o.label, o.selected])), [[["e1", "Bless", false], ["e2", "Curse <x>", true]]]);
  assert.deepStrictEqual([panel.rows[0].effect.blankSelected, panel.rows[1].effect.blankSelected], [false, true]);
  assert.deepStrictEqual(panel.rows[1].effect.groups[0].options.map(o => o.selected), [false, false]);
});

test("prepareActionsPanel: the when roll-down follows the Usable and Consumable flags; a stored trigger stays", () => {
  assert.deepStrictEqual(values(panelOf({}).when), ["", "owned", "inspected"]);
  assert.deepStrictEqual(values(panelOf({}, { usable: true }).when), ["", "owned", "inspected", "used"]);
  assert.deepStrictEqual(values(panelOf({}, { consumable: true }).when), ["", "owned", "inspected", "consumed"]);
  assert.deepStrictEqual(values(panelOf({}, { usable: true, consumable: true }).when), ["", "owned", "inspected", "used", "consumed"]);
  assert.deepStrictEqual(panelOf({ when: "consumed" }).when.options.map(o => [o.value, o.selected]), [["", false], ["owned", false], ["inspected", false], ["consumed", true]]);
});

test("prepareActionsPanel: the on roll-down shows only for a trigger that asks for a target", () => {
  assert.strictEqual(panelOf({ when: "" }).showOn, false);
  assert.strictEqual(panelOf({ when: "owned" }).showOn, false);
  assert.strictEqual(panelOf({ when: "consumed" }).showOn, false);
  assert.strictEqual(panelOf({ when: "inspected" }).showOn, true);
  assert.strictEqual(panelOf({ when: "used", kind: "test", test: "vitality" }, { usable: true }).showOn, false);
  const used = panelOf({ when: "used", on: "self" }, { usable: true });
  assert.strictEqual(used.showOn, true);
  assert.deepStrictEqual(used.on.options.map(o => [o.value, o.selected]), [["", false], ["self", true], ["selectedToken", false], ["item", false]]);
});

test("prepareActionsPanel: the do roll-down defaults to add effect; a test action lists the tests instead of the effects", () => {
  const effectRow = panelOf({ effect: "e1" }, {}, { effects });
  assert.strictEqual(effectRow.isTest, false);
  assert.deepStrictEqual(effectRow.kind.options.map(o => [o.value, o.selected]), [["effect", true], ["test", false]]);
  const tests = [{ label: "Attributes", options: [{ value: "attribute:str", label: "Strength" }] }, { label: "Skills", options: [{ value: "skill:Vitality", label: "Vitality" }] }];
  const testRow = prepareActionsPanel({ effects, _source: { system: { consumable: true, actions: [action({ kind: "test", test: "skill:Vitality", when: "consumed" })] } } }, "system.actions", { tests }).rows[0];
  assert.strictEqual(testRow.isTest, true);
  assert.deepStrictEqual(testRow.kind.options.map(o => [o.value, o.selected]), [["effect", false], ["test", true]]);
  assert.deepStrictEqual(testRow.test.groups.map(g => [g.label, g.options.map(o => [o.value, o.selected])]), [["Attributes", [["attribute:str", false]]], ["Skills", [["skill:Vitality", true]]]]);
  assert.strictEqual(testRow.test.blankSelected, false);
});

test("prepareActionsPanel: the item roll-down shows for target item and lists the items of the owning actor", () => {
  const owner = { documentName: "Actor", items: [{ id: "i1", name: "Razor" }, { id: "i2", name: "Soap" }] };
  assert.strictEqual(panelOf({ when: "used", on: "self" }, {}, { parent: owner }).showItem, false);
  const row = panelOf({ when: "used", on: "item", targetItem: "i2" }, {}, { parent: owner });
  assert.strictEqual(row.showItem, true);
  assert.strictEqual(row.targetItem.name, "system.actions.0.targetItem");
  assert.deepStrictEqual(row.targetItem.options.map(o => [o.value, o.label, o.selected]), [["", "", false], ["i1", "Razor", false], ["i2", "Soap", true]]);
  assert.deepStrictEqual(values(panelOf({ when: "used", on: "item" }).targetItem), [""]);
});

test("prepareActionsPanel: works at any path of any document (here a flag, no effects)", () => {
  const panel = prepareActionsPanel({ _source: { flags: { mod: { acts: [action({ id: "x" })] } } } }, "flags.mod.acts");
  assert.strictEqual(panel.path, "flags.mod.acts");
  assert.strictEqual(panel.rows[0].when.name, "flags.mod.acts.0.when");
  assert.deepStrictEqual(panel.rows[0].effect.groups, []);
});

test("actions-panel partial: when / add / on, hidden id, escaped effect names, delete and add links, the empty line", () => {
  const document = { effects, _source: { system: { usable: true, actions: [action({ id: "a1", when: "used", effect: "e2", on: "selectedToken" })] } } };
  const html = render(ACTIONS_PANEL_TEMPLATE, { panel: prepareActionsPanel(document) });
  assert.ok(html.includes('data-actions-path="system.actions"'));
  assert.ok(html.includes('name="system.actions.0.id" value="a1"'));
  assert.ok(html.includes('<option value="e2" selected>Curse &lt;x&gt;</option>'));
  for (const field of ["when", "effect", "on"]) assert.ok(html.includes(`name="system.actions.0.${field}"`), field);
  assert.ok(html.indexOf('name="system.actions.0.when"') < html.indexOf('name="system.actions.0.effect"'));
  assert.ok(!html.includes('name="system.actions.0.targetItem"'));
  assert.ok(html.includes('data-action="deleteAction"') && html.includes('data-action="createAction"'));
  assert.ok(render(ACTIONS_PANEL_TEMPLATE, { panel: { path: "system.actions", rows: [] } }).includes("{SCARMARK.Action.none}"));
});

test("actions-panel partial: no on roll-down for consumed, the item roll-down for target item", () => {
  const consumed = render(ACTIONS_PANEL_TEMPLATE, { panel: prepareActionsPanel({ effects, _source: { system: { consumable: true, actions: [action({ when: "consumed", effect: "e1" })] } } }) });
  assert.ok(!consumed.includes('name="system.actions.0.on"'));
  const owner = { documentName: "Actor", items: [{ id: "i1", name: "Razor <b>" }] };
  const item = render(ACTIONS_PANEL_TEMPLATE, { panel: prepareActionsPanel({ parent: owner, _source: { system: { actions: [action({ when: "used", on: "item", targetItem: "i1" })] } } }) });
  assert.ok(item.includes('name="system.actions.0.targetItem"'));
  assert.ok(item.includes('<option value="i1" selected>Razor &lt;b&gt;</option>'));
});

test("prepareActionsPanel: the effect roll-down also offers the effect library, the stored library uuid selected", () => {
  const library = [{ label: "Effects", entries: [{ uuid: "Compendium.scarmark-test.effects.ActiveEffect.shaved", name: "Freshly shaved" }] }];
  const row = prepareActionsPanel({ effects, _source: { system: { actions: [action({ effect: "Compendium.scarmark-test.effects.ActiveEffect.shaved" })] } } }, "system.actions", { library }).rows[0];
  assert.deepStrictEqual(row.effect.groups.map(g => [g.label, g.options.map(o => [o.label, o.selected])]), [["SCARMARK.Action.thisItem", [["Bless", false], ["Curse <x>", false]]], ["Effects", [["Freshly shaved", true]]]]);
  assert.strictEqual(row.effect.blankSelected, false);
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

test("actions-panel partial: a test action shows the test roll-down and no effect or on roll-down", () => {
  const html = render(ACTIONS_PANEL_TEMPLATE, { panel: prepareActionsPanel({ effects, _source: { system: { consumable: true, actions: [action({ when: "consumed", kind: "test", test: "vitality" })] } } }) });
  assert.ok(html.includes('name="system.actions.0.kind"'));
  assert.ok(html.includes('name="system.actions.0.test"'));
  assert.ok(!html.includes('name="system.actions.0.effect"'));
  assert.ok(!html.includes('name="system.actions.0.on"'));
});

test("actionsFor: only the actions of that trigger that name an effect", () => {
  const list = [action({ effect: "u1", when: "used" }), action({ effect: "", when: "used" }), action({ effect: "u2", when: "" }), action({ effect: "u3", when: "used", on: "selectedToken" })];
  assert.deepStrictEqual(actionsFor(list, "used").map(a => a.effect), ["u1", "u3"]);
  assert.deepStrictEqual(actionsFor(undefined, "used"), []);
  // A test action names a test, not an effect; an older action with no kind is an add-effect action.
  const mixed = [action({ kind: "test", test: "vitality", when: "consumed" }), action({ kind: "test", test: "", when: "consumed" }), action({ kind: "effect", effect: "e1", when: "consumed" }), action({ kind: "test", effect: "e9", when: "consumed" })];
  assert.deepStrictEqual(actionsFor(mixed, "consumed").map(a => a.test || a.effect), ["vitality", "e1"]);
  assert.deepStrictEqual(mixed.map(isTestAction), [true, true, false, true]);
});

test("ownedEffectChanges: an owned action makes its effect transfer; removing it undoes only what it did", () => {
  const list = [{ id: "e1", transfer: false, managed: false }, { id: "e2", transfer: true, managed: true }, { id: "e3", transfer: true, managed: false }, { id: "e4", transfer: false, managed: false }];
  const owned = (effect) => action({ when: "owned", effect });
  // e1 gets made passive, e2 stays (still named), e3 transfers on its own and is never touched, e4 is only used.
  assert.deepStrictEqual(ownedEffectChanges(list, [owned("e1"), owned("e2"), action({ when: "used", effect: "e4" })]), [{ id: "e1", transfer: true, managed: true }]);
  // Without any owned action: e2 goes back to not transferring; e3 stays passive.
  assert.deepStrictEqual(ownedEffectChanges(list, []), [{ id: "e2", transfer: false, managed: false }]);
  assert.deepStrictEqual(ownedEffectChanges(list, undefined), [{ id: "e2", transfer: false, managed: false }]);
  assert.deepStrictEqual(ownedEffectChanges(list, [action({ when: "owned", kind: "test", test: "vitality", effect: "e1" })]), [{ id: "e2", transfer: false, managed: false }]);
});
