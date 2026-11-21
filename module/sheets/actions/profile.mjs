/** Sheet actions of the profile, skills, traits and effects. Called by ApplicationV2 with the sheet as `this`. */
import { rollAttributeTest, rollSkillTest } from "../../helpers/dice.mjs";
import { openEffectMenu } from "../effect-menu.mjs";
import { effectIdOf, onEditImage, openEffect } from "./effects.mjs";
import { addItem, openItem, deleteItem, rowItemId } from "./item-rows.mjs";

/** Roll an attribute test from the attribute of this box (data-attribute). */
export function onRollAttribute(event, target) {
  const attributeKey = target.dataset.attribute;
  rollAttributeTest(this.document, attributeKey);
}

/** The Add button of the actor Effects tab: opens the effect menu (see sheets/effect-menu.mjs). */
export function onCreateEffect(event, target) {
  return openEffectMenu(this, target);
}

/** Open the effect of this row: the actor's own or one transferred from an owned item (e.g. a racial trait). */
export function onEditEffect(event, target) {
  openEffect(this._findEffect(effectIdOf(target)));
}

/** Add a blank trait of the category of this button. */
export function onAddTrait(event, target) {
  const category = target.dataset.category;
  addItem(category === "psyche" ? "SCARMARK.Trait.newPsyche" : "SCARMARK.Trait.newPhysical", { type: "trait", system: { category } }).call(this);
}

/** Add a blank skill of the category of this button. */
export function onAddSkill(event, target) {
  addItem("SCARMARK.Skill.new", { type: "skill", system: { category: target.dataset.category } }).call(this);
}

/** Roll the skill of this row. */
export function onRollSkill(event, target) {
  const itemId = rowItemId(target);
  if (itemId) rollSkillTest(this.document, itemId);
}

/** The data-action handlers of the Profile, Skills and Effects tabs, by action name. */
export const PROFILE_ACTIONS = {
  rollAttribute: onRollAttribute,
  editImage: onEditImage,
  createEffect: onCreateEffect,
  editEffect: onEditEffect,
  addTrait: onAddTrait,
  editTrait: openItem,
  deleteTrait: deleteItem,
  addSkill: onAddSkill,
  editSkill: openItem,
  deleteSkill: deleteItem,
  rollSkill: onRollSkill
};
