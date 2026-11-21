/**
 * The Actions panel: a reusable, self-contained piece of UI that edits a list of actions ("when <trigger> add effect / roll test, on <target>") stored at any data path of a document. It is not tied to item sheets. To put it on a sheet:
 *   1. give the data model the field: `actions: actionsField()` (data/shared-fields.mjs), or any other path;
 *   2. wrap the sheet class: `class MySheet extends ActionsPanelMixin(HandlebarsApplicationMixin(DocumentSheetV2))` (adds the click actions and context.actionsPanel);
 *   3. put `{{> "systems/scarmark-test/templates/common/actions-panel.hbs" panel=actionsPanel}}` in a template (tab, section, dialog) and list ACTIONS_PANEL_TEMPLATE in that part's `templates`.
 * The panel finds its data path from the markup (data-actions-path), so several panels, each with its own path, can live on one sheet (give each its own context key: prepareActionsPanel(document, path)).
 * The "do" roll-down chooses between adding an effect and rolling a test; the next roll-down then lists the effects of the document itself (an item's Effects tab is the list of what it can do; the stored value is the effect id) or the tests of ACTION_TESTS. The "when" and "on" roll-downs come from config/actions.mjs: an option can require a flag of the document (e.g. "Consumed" needs system.consumable), so the lists follow the item's checkboxes, and "on" is only shown for a trigger that asks for a target.
 */
import { TEMPLATE_DIR } from "../../constants.mjs";
import { ACTION_TARGETS, ACTION_TRIGGERS, ACTION_TARGET_ITEM, ACTION_KINDS, ACTION_KIND_EFFECT, ACTION_KIND_TEST, ACTION_TESTS } from "../../config/index.mjs";

export const ACTIONS_PANEL_TEMPLATE = `${TEMPLATE_DIR}common/actions-panel.hbs`;

/** Where an action list lives unless a sheet says otherwise. */
export const DEFAULT_ACTIONS_PATH = "system.actions";

const readPath = (data, path) => path.split(".").reduce((value, key) => value?.[key], data);

/** A copy of the actions stored at `path` (the stored data, not the prepared one). */
const storedActions = (document, path) => (readPath(document._source ?? document, path) ?? []).map(action => ({ ...action }));

/** The items of the actor that owns the document (the actor's own items when the document is an actor); none for a loose item. */
const inventoryOf = (document) => document.documentName === "Actor" ? document.items : (document.parent?.documentName === "Actor" ? document.parent.items : []);

/** A roll-down: its form field name, and its options with the selected one marked (the blank option first). */
function rollDown(name, value, options) {
  return { name, options: [{ value: "", label: "", selected: !value }, ...options.map(option => ({ ...option, selected: option.value === value }))] };
}

/**
 * The view model of the panel for the actions stored at `path` of `document`: one row per action with its roll-downs, named so the sheet's own form submit saves them (submitOnChange).
 *
 * @param {foundry.abstract.Document} document the item or actor that owns the list
 * @param {string} [path] data path of the list, e.g. "system.actions"
 * @returns {{path: string, rows: object[]}}
 */
export function prepareActionsPanel(document, path = DEFAULT_ACTIONS_PATH) {
  const effectOptions = Array.from(document.effects ?? []).map(effect => ({ value: effect.id, label: effect.name }));
  const itemOptions = Array.from(inventoryOf(document)).map(item => ({ value: item.id, label: item.name }));
  const data = document._source ?? document;
  const offered = (table, current) => Object.entries(table)
    .filter(([key, option]) => !option.requires || readPath(data, option.requires) || key === current)
    .map(([value, option]) => ({ value, label: game.i18n.localize(option.label) }));
  const kindOptions = Object.entries(ACTION_KINDS).map(([value, kind]) => ({ value, label: game.i18n.localize(kind.label) }));
  const testOptions = Object.entries(ACTION_TESTS).map(([value, test]) => ({ value, label: game.i18n.localize(test.label) }));
  const rows = storedActions(document, path).map((action, index) => {
    const prefix = `${path}.${index}`;
    const kind = action.kind || ACTION_KIND_EFFECT;
    const isTest = kind === ACTION_KIND_TEST;
    const showOn = !isTest && ACTION_TRIGGERS[action.when]?.target === true;
    return {
      prefix,
      id: action.id,
      when: rollDown(`${prefix}.when`, action.when, offered(ACTION_TRIGGERS, action.when)),
      kind: { name: `${prefix}.kind`, options: kindOptions.map(option => ({ ...option, selected: option.value === kind })) },
      isTest,
      effect: rollDown(`${prefix}.effect`, action.effect, effectOptions),
      test: rollDown(`${prefix}.test`, action.test, testOptions),
      showOn,
      on: rollDown(`${prefix}.on`, action.on, offered(ACTION_TARGETS, action.on)),
      showItem: showOn && action.on === ACTION_TARGET_ITEM,
      targetItem: rollDown(`${prefix}.targetItem`, action.targetItem, itemOptions)
    };
  });
  return { path, rows };
}

/** The data path of the panel a clicked element sits in. */
const pathOf = (target) => target.closest("[data-actions-path]")?.dataset.actionsPath;

/** Add a blank action to the list of this panel. */
function onCreateAction(event, target) {
  const path = pathOf(target);
  if (!path) return;
  const actions = storedActions(this.document, path);
  actions.push({ id: foundry.utils.randomID(), kind: ACTION_KIND_EFFECT, test: "", effect: "", on: "", targetItem: "", when: "" });
  this.document.update({ [path]: actions });
}

/** Delete the action of this row. */
function onDeleteAction(event, target) {
  const path = pathOf(target);
  const index = Number(target.closest("[data-index]")?.dataset.index);
  if (!path || !Number.isInteger(index)) return;
  this.document.update({ [path]: storedActions(this.document, path).filter((action, i) => i !== index) });
}

/** Give a document sheet class the Actions panel: its click actions and context.actionsPanel (the panel at DEFAULT_ACTIONS_PATH). Handlers are called by ApplicationV2 with the sheet as `this`; DEFAULT_OPTIONS merge down the class chain. */
export const ActionsPanelMixin = (Base) => class extends Base {
  static DEFAULT_OPTIONS = {
    actions: { createAction: onCreateAction, deleteAction: onDeleteAction }
  };

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.actionsPanel = prepareActionsPanel(this.document);
    return context;
  }
};
