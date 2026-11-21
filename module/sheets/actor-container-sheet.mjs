/** The sheet of the container actor (chest, stash, merchant): one Contents tab. */
import ScarmarkActorSheetBase from "./actor-sheet-base.mjs";
import { tabsConfig, partsConfig } from "./sheet-layout.mjs";

/**
 * Sheet for the "container" ACTOR type (loot chest / stash / merchant). A single
 * Contents tab that reuses the Character Gear tab (gear.hbs) plus a Max Capacity
 * field in the header. Inherits all the gear actions (add/edit/delete/store/...)
 * from the base sheet; being stat-less, the attribute/combat/skill blocks are
 * simply empty (attributeKeys/skillCategories return [], prepareCombat in actor-context.mjs returns early).
 */
export default class ScarmarkContainerActorSheet extends ScarmarkActorSheetBase {

  static DEFAULT_OPTIONS = {
    classes: ["container-actor"],
    position: { width: 720, height: 620 }
  };

  // Reuse the "gear" tab id so gear.hbs renders unchanged; label it Contents.
  static TABS = tabsConfig(["gear"], { initial: "gear", labels: { gear: "SCARMARK.Tabs.contents" } });

  static PARTS = partsConfig(["gear"], { header: "container-header" });

  /** @override - a container has no attributes. */
  get attributeKeys() {
    return [];
  }

  /** @override - a container has no skills. */
  get skillCategories() {
    return [];
  }
}
