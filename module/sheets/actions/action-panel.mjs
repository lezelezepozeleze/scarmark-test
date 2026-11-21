/**
 * The Actions panel: a reusable, self-contained piece of UI that edits a list of actions ("add <effect> on <target> when <trigger>") stored at any data path of a document. It is not tied to item sheets. To put it on a sheet:
 *   1. give the data model the field: `actions: actionsField()` (data/shared-fields.mjs), or any other path;
 *   2. wrap the sheet class: `class MySheet extends ActionsPanelMixin(HandlebarsApplicationMixin(DocumentSheetV2))` (adds the click actions and context.actionsPanel);
 *   3. put `{{> "systems/scarmark-test/templates/common/actions-panel.hbs" panel=actionsPanel}}` in a template (tab, section, dialog) and list ACTIONS_PANEL_TEMPLATE in that part's `templates`.
 * The panel finds its data path from the markup (data-actions-path), so several panels, each with its own path, can live on one sheet (give each its own context key: prepareActionsPanel(document, path, library)).
 * The effect roll-down offers the effects of the document itself and every effect of the effect library (the Active Effect compendia); the stored value is the effect's uuid. The "on" and "when" roll-downs come from config/actions.mjs.
 */
import { TEMPLATE_DIR } from "../../constants.mjs";
import { ACTION_TARGETS, ACTION_TRIGGERS } from "../../config/index.mjs";
import { listEffectLibrary } from "../../helpers/effect-library.mjs";

export const ACTIONS_PANEL_TEMPLATE = `${TEMPLATE_DIR}common/actions-panel.hbs`;

/** Where an action list lives unless a sheet says otherwise. */
export const DEFAULT_ACTIONS_PATH = "system.actions";

/** A copy of the actions stored at `path` (the stored data, not the prepared one). */
const storedActions = (document, path) => (path.split(".").reduce((data, key) => data?.[key], document._source ?? document) ?? []).map(action => ({ ...action }));

/** A roll-down of plain options: its form field name, and its options with the selected one marked (the blank option first). */
function rollDown(name, value, options) {
  return { name, options: [{ value: "", label: "", selected: !value }, ...options.map(option => ({ ...option, selected: option.value === value }))] };
}

/** The effect roll-down: grouped options (the document's own effects, then each effect compendium) after the blank one. */
function effectRollDown(name, value, groups) {
  return {
    name,
    blankSelected: !value,
    groups: groups.map(group => ({ label: group.label, options: group.options.map(option => ({ ...option, selected: option.value === value })) }))
  };
}

/**
 * The view model of the panel for the actions stored at `path` of `document`: one row per action with its three roll-downs, named so the sheet's own form submit saves them (submitOnChange).
 *
 * @param {foundry.abstract.Document} document the item or actor that owns the list
 * @param {string} [path] data path of the list, e.g. "system.actions"
 * @param {{label: string, entries: {uuid: string, name: string}[]}[]} [library] the effect library (listEffectLibrary)
 * @returns {{path: string, rows: object[]}}
 */
export function prepareActionsPanel(document, path = DEFAULT_ACTIONS_PATH, library = []) {
  const own = Array.from(document.effects ?? []).map(effect => ({ value: effect.uuid, label: effect.name }));
  const groups = [
    ...(own.length ? [{ label: game.i18n.localize("SCARMARK.Action.thisItem"), options: own }] : []),
    ...library.map(group => ({ label: group.label, options: group.entries.map(entry => ({ value: entry.uuid, label: entry.name })) }))
  ];
  const fromTable = (table) => Object.entries(table).map(([value, key]) => ({ value, label: game.i18n.localize(key) }));
  const targetOptions = fromTable(ACTION_TARGETS);
  const triggerOptions = fromTable(ACTION_TRIGGERS);
  const rows = storedActions(document, path).map((action, index) => {
    const prefix = `${path}.${index}`;
    return {
      prefix,
      id: action.id,
      effect: effectRollDown(`${prefix}.effect`, action.effect, groups),
      on: rollDown(`${prefix}.on`, action.on, targetOptions),
      when: rollDown(`${prefix}.when`, action.when, triggerOptions)
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
  actions.push({ id: foundry.utils.randomID(), effect: "", on: "", when: "" });
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
    context.actionsPanel = prepareActionsPanel(this.document, DEFAULT_ACTIONS_PATH, await listEffectLibrary());
    return context;
  }
};
