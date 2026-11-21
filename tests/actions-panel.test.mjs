// The Actions panel is not tied to items: it edits the list at any data path of any document, and the partial renders from the view model alone. Also: which actions a trigger sets off.
import "./support/foundry-stub.mjs";
import { test } from "node:test";
import assert from "node:assert";
import { createRenderer } from "./support/render.mjs";
import { prepareActionsPanel, ACTIONS_PANEL_TEMPLATE } from "../module/sheets/actions/action-panel.mjs";
import { actionsFor } from "../module/rules/index.mjs";

const { render } = createRenderer();
const effects = [{ uuid: "Item.i.ActiveEffect.e1", name: "Bless" }, { uuid: "Item.i.ActiveEffect.e2", name: "Curse <x>" }];
const library = [{ label: "Effects", entries: [{ uuid: "Compendium.scarmark-test.effects.ActiveEffect.shaved", name: "Freshly shaved" }] }];
const action = (fields) => ({ id: "a", effect: "", on: "", targetItem: "", when: "", ...fields });
const values = (rollDown) => rollDown.options.map(o => o.value);

test("prepareActionsPanel: one row per action, roll-downs named by the data path, the stored effect selected", () => {
  const document = { effects, _source: { system: { actions: [action({ effect: "Item.i.ActiveEffect.e2" }), action({ id: "b" })] } } };
  const panel = prepareActionsPanel(document, "system.actions", library);
  assert.strictEqual(panel.path, "system.actions");
  assert.deepStrictEqual(panel.rows.map(row => row.effect.name), ["system.actions.0.effect", "system.actions.1.effect"]);
  assert.deepStrictEqual(panel.rows[0].effect.groups.map(group => group.options.map(o => [o.label, o.selected])), [[["Bless", false], ["Curse <x>", true]], [["Freshly shaved", false]]]);
  assert.strictEqual(panel.rows[0].effect.blankSelected, false);
  assert.strictEqual(panel.rows[1].effect.blankSelected, true);
});

test("prepareActionsPanel: on offers self, selected token and item; when follows the Usable flag; a stored option stays", () => {
  const rows = (system, fields) => prepareActionsPanel({ _source: { system: { actions: [action(fields)], ...system } } }).rows[0];
  assert.deepStrictEqual(values(rows({}, {}).on), ["", "self", "selectedToken", "item"]);
  assert.deepStrictEqual(values(rows({}, {}).when), [""]);
  assert.deepStrictEqual(values(rows({ usable: true }, {}).when), ["", "used"]);
  assert.deepStrictEqual(values(rows({}, { when: "used" }).when), ["", "used"]);
  assert.deepStrictEqual(rows({}, { on: "self", when: "used" }).on.options.map(o => [o.value, o.selected]), [["", false], ["self", true], ["selectedToken", false], ["item", false]]);
});

test("prepareActionsPanel: the item roll-down shows only for target item, and lists the items of the owning actor", () => {
  const owner = { documentName: "Actor", items: [{ id: "i1", name: "Razor" }, { id: "i2", name: "Soap" }] };
  const make = (on, targetItem) => prepareActionsPanel({ parent: owner, _source: { system: { actions: [action({ on, targetItem })] } } }).rows[0];
  assert.strictEqual(make("self", "").showItem, false);
  const row = make("item", "i2");
  assert.strictEqual(row.showItem, true);
  assert.strictEqual(row.targetItem.name, "system.actions.0.targetItem");
  assert.deepStrictEqual(row.targetItem.options.map(o => [o.value, o.label, o.selected]), [["", "", false], ["i1", "Razor", false], ["i2", "Soap", true]]);
  const loose = prepareActionsPanel({ _source: { system: { actions: [action({ on: "item" })] } } }).rows[0];
  assert.deepStrictEqual(values(loose.targetItem), [""]);
});

test("prepareActionsPanel: works at any path of any document (here a flag, no effects)", () => {
  const panel = prepareActionsPanel({ _source: { flags: { mod: { acts: [action({ id: "x" })] } } } }, "flags.mod.acts");
  assert.strictEqual(panel.path, "flags.mod.acts");
  assert.strictEqual(panel.rows[0].when.name, "flags.mod.acts.0.when");
  assert.deepStrictEqual(panel.rows[0].effect.groups, []);
});

test("actions-panel partial: add / on / when roll-downs, hidden id, grouped and escaped effect names, the empty line", () => {
  const document = { effects, _source: { system: { actions: [action({ id: "a1", effect: "Item.i.ActiveEffect.e2" })] } } };
  const html = render(ACTIONS_PANEL_TEMPLATE, { panel: prepareActionsPanel(document, "system.actions", library) });
  assert.ok(html.includes('data-actions-path="system.actions"'));
  assert.ok(html.includes('name="system.actions.0.id" value="a1"'));
  assert.ok(html.includes('<optgroup label="Effects">'));
  assert.ok(html.includes('<option value="Item.i.ActiveEffect.e2" selected>Curse &lt;x&gt;</option>'));
  for (const field of ["effect", "on", "when"]) assert.ok(html.includes(`name="system.actions.0.${field}"`), field);
  assert.ok(!html.includes('name="system.actions.0.targetItem"'));
  assert.ok(html.includes('data-action="deleteAction"') && html.includes('data-action="createAction"'));
  assert.ok(render(ACTIONS_PANEL_TEMPLATE, { panel: { path: "system.actions", rows: [] } }).includes("{SCARMARK.Action.none}"));
});

test("actions-panel partial: the item roll-down is rendered for target item, with the stored item selected", () => {
  const owner = { documentName: "Actor", items: [{ id: "i1", name: "Razor <b>" }] };
  const html = render(ACTIONS_PANEL_TEMPLATE, { panel: prepareActionsPanel({ parent: owner, _source: { system: { actions: [action({ on: "item", targetItem: "i1" })] } } }) });
  assert.ok(html.includes('name="system.actions.0.targetItem"'));
  assert.ok(html.includes('<option value="i1" selected>Razor &lt;b&gt;</option>'));
});

test("actionsFor: only the actions of that trigger that name an effect", () => {
  const list = [action({ effect: "u1", when: "used" }), action({ effect: "", when: "used" }), action({ effect: "u2", when: "" }), action({ effect: "u3", when: "used", on: "selectedToken" })];
  assert.deepStrictEqual(actionsFor(list, "used").map(a => a.effect), ["u1", "u3"]);
  assert.deepStrictEqual(actionsFor(undefined, "used"), []);
});
