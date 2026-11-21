/** Sheet of a gear item: details and effects. */
import ScarmarkItemSheetBase from "./item-sheet-base.mjs";
import { itemSheetParts } from "./item-layout.mjs";

/** Sheet of a gear item: details (weight, value, quantity, consumable, rune, artifact) and effects. */
export default class ScarmarkGearSheet extends ScarmarkItemSheetBase {

  static DEFAULT_OPTIONS = {
    classes: ["gear"],
    position: { width: 480, height: 660 }
  };

  static PARTS = itemSheetParts("gear/details", ["container-select", "details-tab", "notes-field", "quantity-weight-value", "artifact-fields"]);

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.containerOptions = this.containerOptions();
    return context;
  }
}
