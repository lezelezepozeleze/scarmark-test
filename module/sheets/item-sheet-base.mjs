/** The base of every item sheet: the Details tab (subclass-provided), the common Effects tab and the portrait picker. */
import { FORM_LIMITS } from "../config/index.mjs";
import { enhanceAccessibility, wireButtonKeys } from "./a11y.mjs";
import { onEditImage, effectIdOf, blankEffectData, toggleEffect, openEffect } from "./actions/effects.mjs";
import { ActionsPanelMixin } from "./actions/action-panel.mjs";
import { itemTabs, headerPart, tabsPart, effectsPart, actionsPart } from "./item-layout.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ItemSheetV2 } = foundry.applications.sheets;

/** Add a blank Active Effect to the item. */
function onCreateEffect() {
  this.document.createEmbeddedDocuments("ActiveEffect", [blankEffectData()]);
}

/** Open the effect of this row. */
function onEditEffect(event, target) {
  openEffect(this.document.effects.get(effectIdOf(target)));
}

/** Delete the effect of this row. */
function onDeleteEffect(event, target) {
  const effectId = effectIdOf(target);
  if (effectId) this.document.deleteEmbeddedDocuments("ActiveEffect", [effectId]);
}

/** Switch the effect of this row on or off. */
function onToggleEffect(event, target) {
  toggleEffect(this.document.effects.get(effectIdOf(target)));
}

/**
 * Shared behavior for every Item type: the Details tab (subclass-provided)
 * plus a common Effects tab (create/edit/delete/toggle). This is the one
 * thing every Item type has in common, regardless of what else it holds.
 */
export default class ScarmarkItemSheetBase extends ActionsPanelMixin(HandlebarsApplicationMixin(ItemSheetV2)) {

  static DEFAULT_OPTIONS = {
    classes: ["scarmark", "sheet", "item"],
    position: { width: 480, height: 460 },
    window: { resizable: true },
    form: {
      submitOnChange: true,
      closeOnSubmit: false
    },
    actions: {
      editImage: onEditImage,
      createEffect: onCreateEffect,
      editEffect: onEditEffect,
      deleteEffect: onDeleteEffect,
      toggleEffect: onToggleEffect
    }
  };

  static TABS = itemTabs("details");

  static PARTS = {
    header: headerPart(),
    tabs: tabsPart(),
    effects: effectsPart(),
    actions: actionsPart()
  };

  /** @override Wire the key handling on the root once. */
  _onFirstRender(context, options) {
    super._onFirstRender(context, options);
    wireButtonKeys(this.element);
  }

  /** @override Label links and button roles for the rendered HTML (sheets/a11y.mjs). */
  _onRender(context, options) {
    super._onRender(context, options);
    enhanceAccessibility(this.element);
  }

  /** @override */
  get title() {
    return this.document.name;
  }

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.system = this.document.system;
    context.limits = FORM_LIMITS;
    if (this.constructor.TABS?.primary) {
      context.tabs = this._prepareTabs("primary");
    }
    context.effects = Array.from(this.document.effects);
    return context;
  }

  /**
   * The containers on the owning actor, for the "In Container" selector of the storable item types (empty when the item isn't embedded on an actor). Those sheets put it in their context as containerOptions.
   * @returns {{id: string, name: string}[]}
   */
  containerOptions() {
    const actor = this.document.parent;
    return (actor?.items ?? [])
      .filter(i => i.type === "container" && i.id !== this.document.id)
      .map(i => ({ id: i.id, name: i.name }));
  }

  /** @override */
  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options);
    if (context.tabs?.[partId]) context.tab = context.tabs[partId];
    return context;
  }
}
