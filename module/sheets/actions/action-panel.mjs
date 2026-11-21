/**
 * The Actions panel: a reusable, self-contained piece of UI that edits a list of actions ("when <trigger> <do> ...") stored at any data path of a document. It is not tied to item sheets. To put it on a sheet:
 *   1. give the data model the field: `actions: actionsField()` (data/shared-fields.mjs), or any other path;
 *   2. wrap the sheet class: `class MySheet extends ActionsPanelMixin(HandlebarsApplicationMixin(DocumentSheetV2))` (adds the click actions and context.actionsPanel);
 *   3. put `{{> "systems/scarmark-test/templates/common/actions-panel.hbs" panel=actionsPanel}}` in a template (tab, section, dialog) and list ACTIONS_PANEL_TEMPLATES in that part's `templates`.
 * The panel finds its data path from the markup (data-actions-path), so several panels, each with its own path, can live on one sheet (give each its own context key: prepareActionsPanel(document, path, { library, tests, alterations })).
 * The "do" roll-down chooses what the action does:
 *   add effect    an effect (the item's own, or any of the effect library; a library effect that an action picks is copied onto the item, helpers/item-actions.mjs materializeActionEffects, so the Effects tab lists everything the actions use), on self or the selected tokens
 *   roll test     an attribute or skill test of the carrying character (helpers/action-tests.mjs)
 *   alter         an armor piece or weapon of the carrying character, then one alteration from the compendium of that kind of item (helpers/alterations.mjs)
 *   send message  a text posted to the chat
 * The "when" and "on" roll-downs come from config/actions.mjs: an option can require a flag of the document (e.g. "Consumed" needs system.consumable), so the lists follow the item's checkboxes, and "on" is only shown for a trigger that asks for a target.
 */
import { TEMPLATE_DIR } from "../../constants.mjs";
import { ACTION_TARGETS, ACTION_TRIGGERS, ACTION_KINDS, ACTION_KIND_EFFECT, ACTION_KIND_TEST, ACTION_KIND_ALTER, ACTION_KIND_MESSAGE, ALTERABLE_ITEM_TYPES } from "../../config/index.mjs";
import { listEffectLibrary } from "../../helpers/effect-library.mjs";
import { listActionTests } from "../../helpers/action-tests.mjs";
import { listAlterations } from "../../helpers/alterations.mjs";

export const ACTIONS_PANEL_TEMPLATE = `${TEMPLATE_DIR}common/actions-panel.hbs`;

/** Every template the panel needs: list them all in the `templates` of the sheet part that includes the panel. */
export const ACTIONS_PANEL_TEMPLATES = [ACTIONS_PANEL_TEMPLATE, `${TEMPLATE_DIR}common/roll-down.hbs`];

/** Where an action list lives unless a sheet says otherwise. */
const DEFAULT_ACTIONS_PATH = "system.actions";

const readPath = (data, path) => path.split(".").reduce((value, key) => value?.[key], data);

/** A copy of the actions stored at `path` (the stored data, not the prepared one). */
const storedActions = (document, path) => (readPath(document._source ?? document, path) ?? []).map(action => ({ ...action }));

/** The items of the actor that owns the document (the actor's own items when the document is an actor); none for a loose item. */
const inventoryOf = (document) => document.documentName === "Actor" ? document.items : (document.parent?.documentName === "Actor" ? document.parent.items : []);

/** A roll-down: its form field name, and its options with the selected one marked (the blank option first). */
function rollDown(name, value, options) {
  return { name, options: [{ value: "", label: "", selected: !value }, ...options.map(option => ({ ...option, selected: option.value === value }))] };
}

/** A roll-down whose options come in labelled groups (after the blank option). */
function groupedRollDown(name, value, groups) {
  return {
    name,
    grouped: true,
    blankSelected: !value,
    groups: groups.map(group => ({ label: group.label, options: group.options.map(option => ({ ...option, selected: option.value === value })) }))
  };
}

/**
 * The view model of the panel for the actions stored at `path` of `document`: one row per action with its roll-downs, named so the sheet's own form submit saves them (submitOnChange).
 *
 * @param {foundry.abstract.Document} document the item or actor that owns the list
 * @param {string} [path] data path of the list, e.g. "system.actions"
 * @param {object} [lists]
 * @param {{label: string, entries: {uuid: string, name: string}[]}[]} [lists.library] the effect library (listEffectLibrary)
 * @param {{label: string, options: {value: string, label: string}[]}[]} [lists.tests] the test groups (listActionTests)
 * @param {Object<string, {uuid: string, name: string}[]>} [lists.alterations] item type -> its alterations (listAlterations)
 * @returns {{path: string, rows: object[]}}
 */
export function prepareActionsPanel(document, path = DEFAULT_ACTIONS_PATH, { library = [], tests = [], alterations = {} } = {}) {
  const own = Array.from(document.effects ?? []).map(effect => ({ value: effect.id, label: effect.name }));
  const effectGroups = [
    ...(own.length ? [{ label: game.i18n.localize("SCARMARK.Action.thisItem"), options: own }] : []),
    ...library.map(group => ({ label: group.label, options: group.entries.map(entry => ({ value: entry.uuid, label: entry.name })) }))
  ];
  const inventory = Array.from(inventoryOf(document));
  const alterable = inventory.filter(item => ALTERABLE_ITEM_TYPES.includes(item.type)).map(item => ({ value: item.id, label: item.name }));
  const data = document._source ?? document;
  const offered = (table, current) => Object.entries(table)
    .filter(([key, option]) => !option.requires || readPath(data, option.requires) || key === current)
    .map(([value, option]) => ({ value, label: game.i18n.localize(option.label) }));
  const kindOptions = Object.entries(ACTION_KINDS).map(([value, kind]) => ({ value, label: game.i18n.localize(kind.label) }));
  const rows = storedActions(document, path).map((action, index) => {
    const prefix = `${path}.${index}`;
    const kind = action.kind || ACTION_KIND_EFFECT;
    const isTest = kind === ACTION_KIND_TEST;
    const isAlter = kind === ACTION_KIND_ALTER;
    const isMessage = kind === ACTION_KIND_MESSAGE;
    const isEffect = !isTest && !isAlter && !isMessage;
    // The alterations on offer are the ones of the kind of item picked.
    const picked = inventory.find(item => item.id === action.targetItem);
    const alterationOptions = (alterations[picked?.type] ?? []).map(entry => ({ value: entry.uuid, label: entry.name }));
    return {
      prefix,
      id: action.id,
      when: rollDown(`${prefix}.when`, action.when, offered(ACTION_TRIGGERS, action.when)),
      kind: { name: `${prefix}.kind`, options: kindOptions.map(option => ({ ...option, selected: option.value === kind })) },
      isTest,
      isAlter,
      isMessage,
      isEffect,
      test: groupedRollDown(`${prefix}.test`, action.test, tests),
      targetItem: rollDown(`${prefix}.targetItem`, action.targetItem, alterable),
      alteration: rollDown(`${prefix}.alteration`, action.alteration, alterationOptions),
      effect: groupedRollDown(`${prefix}.effect`, action.effect, effectGroups),
      message: { name: `${prefix}.message`, value: action.message ?? "" },
      showOn: isEffect && ACTION_TRIGGERS[action.when]?.target === true,
      on: rollDown(`${prefix}.on`, action.on, offered(ACTION_TARGETS, action.on))
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
  actions.push({ id: foundry.utils.randomID(), kind: ACTION_KIND_EFFECT, test: "", alteration: "", message: "", effect: "", on: "", targetItem: "", when: "" });
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
    context.actionsPanel = prepareActionsPanel(this.document, DEFAULT_ACTIONS_PATH, { library: await listEffectLibrary(), tests: await listActionTests(), alterations: await listAlterations() });
    return context;
  }
};
