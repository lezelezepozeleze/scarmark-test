/**
 * The effect sheet: one form for an Active Effect of this system. It replaces Foundry's own window so the choices make sense together: what the effect is about (character, weapon, armor), how it works (ongoing: stays in Effects; immediate: rewrites the value in the sheet once), the changes (stat, add or set, value, priority), how long it lasts, and for a weapon the poison it carries.
 *
 * The form saves on every change, and the choices (about, kind) redraw it, so it needs no script of its own: the view model (view/effect-sheet-view.mjs) decides what is shown, the template (templates/effect/sheet.hbs) prints it.
 */
import { TEMPLATE_DIR, FLAGS, PACKS } from "../constants.mjs";
import { ALTERATION_REPAIR, EFFECT_TARGET_CHARACTER } from "../config/index.mjs";
import { buildEffectTypes, rowsForType } from "../view/effects-view.mjs";
import { buildEffectSheet } from "../view/effect-sheet-view.mjs";
import { listActionTests } from "../helpers/action-tests.mjs";
import { listEffectLibrary, submitEffectToLibrary } from "../helpers/effect-library.mjs";
import { onEditImage } from "./actions/effects.mjs";

const { HandlebarsApplicationMixin, DocumentSheetV2 } = foundry.applications.api;

/** The canonical skill names from the Skills compendium (filled by cacheSkillNames), so a character effect can name any skill. */
let skillNames = [];

/** Cache the canonical skill names. The ready hook. */
export async function cacheSkillNames() {
  const pack = game.packs.get(PACKS.skills);
  if (!pack) return;
  try {
    const index = await pack.getIndex();
    skillNames = [...new Set(index.map(entry => entry.name).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  } catch (e) {
    console.warn("Scarmark | could not cache skill names for the effect sheet", e);
  }
}

/** The changes of the effect as plain data, a blank one added. */
function onAddChange() {
  const changes = this.document.toObject().system.changes ?? [];
  return this.document.update({ "system.changes": [...changes, { key: "", type: "add", value: "", phase: "initial", priority: null }] });
}

/** Delete the change row that was clicked. */
function onDeleteChange(event, target) {
  const index = Number(target.dataset.index);
  const changes = (this.document.toObject().system.changes ?? []).filter((change, i) => i !== index);
  return this.document.update({ "system.changes": changes });
}

/** Send the effect to the effect library (the GM only). */
function onSubmitToLibrary() {
  return submitEffectToLibrary(this.document);
}

export default class ScarmarkEffectSheet extends HandlebarsApplicationMixin(DocumentSheetV2) {

  static DEFAULT_OPTIONS = {
    classes: ["scarmark", "sheet", "effect-sheet"],
    position: { width: 640, height: "auto" },
    window: { resizable: true, icon: "fa-solid fa-wand-magic-sparkles" },
    form: { submitOnChange: true, closeOnSubmit: false },
    actions: { editImage: onEditImage, addChange: onAddChange, deleteChange: onDeleteChange, submitToLibrary: onSubmitToLibrary }
  };

  static PARTS = {
    body: { template: `${TEMPLATE_DIR}effect/sheet.hbs` }
  };

  /** @override */
  get title() {
    return this.document.name || game.i18n.localize("SCARMARK.Effect.new");
  }

  /** The stats per type for this effect (effects-view.mjs). */
  #picker() {
    return buildEffectTypes(this.document, { skillNames, localize: (key) => game.i18n.localize(key) });
  }

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const [tests, library] = await Promise.all([listActionTests(), listEffectLibrary()]);
    return Object.assign(context, buildEffectSheet(this.document.toObject(), {
      picker: this.#picker(),
      localize: (key) => game.i18n.localize(key),
      onItem: this.document.parent?.documentName === "Item",
      tests,
      library
    }));
  }

  /**
   * @override
   * Turn the form into the effect's data: the kind and repair choices become flags, an effect that is immediate or about an item never transfers to the owner, and picking another type drops the change rows its stats do not offer.
   */
  _processFormData(event, form, formData) {
    const data = foundry.utils.expandObject(super._processFormData(event, form, formData) ?? formData.object);
    const scope = data.flags?.[FLAGS.scope] ?? {};
    const type = scope[FLAGS.effectType] ?? EFFECT_TARGET_CHARACTER;
    scope[FLAGS.immediate] = scope.kind === "immediate";
    scope[FLAGS.alteration] = scope[FLAGS.immediate] && type === "armor" && data.repair ? ALTERATION_REPAIR : "";
    delete scope.kind;
    delete data.repair;
    if (scope[FLAGS.immediate] || type !== EFFECT_TARGET_CHARACTER) data.transfer = false;
    if (scope[FLAGS.immediate]) scope[FLAGS.unique] = false;
    if (data.system?.changes) {
      const picker = this.#picker();
      const before = this.document.getFlag(FLAGS.scope, FLAGS.effectType) ?? picker.start;
      data.system.changes = rowsForType(Object.values(data.system.changes), picker, type, before !== type);
    }
    data.flags = { ...(data.flags ?? {}), [FLAGS.scope]: scope };
    return data;
  }
}
