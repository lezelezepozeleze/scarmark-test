/**
 * Data model of the "armor" item type (a worn piece). Owns the stored fields, the migration of the old location sets to coverage entries and the derived totalWeight / totalValue.
 */
import { itemTotals, legacyCoverage, splitBothSides, averageCondition } from "../rules/index.mjs";
import { quantityField, weightField, valueField, carriedField, containerField, aspectFields, actionsField } from "./shared-fields.mjs";
import { ARMOR_LAYER_MAX, LOCATION_SIDES, QUALITY_INITIAL, QUALITY_PERMANENT } from "../config/index.mjs";

const fields = foundry.data.fields;

/**
 * Data model for the "armor" Item type: a worn armor piece. It carries the
 * per-aspect protection (B/E/P/F) and the set of hit locations it covers
 * (referenced by Armor Location type and side). On a strike, the Combat tab
 * (helpers/combat/armor.mjs) finds the armor pieces covering the struck location
 * and sums their protection for the relevant aspect (rules/combat.mjs protectionSum).
 *
 * No Material field: protection is entered directly as B/E/P/F, so material is
 * redundant here, and Squeeze/Tear resolve as Blunt/Edge without needing it.
 * No Size / Source / Artifact per the Scarmark armor design.
 */
export default class ScarmarkArmorData extends foundry.abstract.TypeDataModel {

  static defineSchema() {
    return {
      quantity: quantityField(),
      weight: weightField(),
      value: valueField(),
      carried: carriedField(),
      // Id of the Container item this is stored in ("" = On Person / top level).
      container: containerField(),

      // Armor Durability (DUR; formerly AQ, the field stays `quality`). Derived, not edited:
      // prepareDerivedData sets it to the average condition of the coverage entries, so the
      // stored number is only a fallback for a piece with no coverage. -1 (QUALITY_PERMANENT)
      // means "permanent / never decays" (Natural Armor) and is kept as it is.
      // Not the weapon DUR: that one lives on the weapon item and works differently.
      quality: new fields.NumberField({ required: true, integer: true, initial: QUALITY_INITIAL }),

      // The durability the piece started with, shown next to the current one (5/10). Edited
      // by hand (the compendium items carry it); a new coverage entry starts at this
      // condition (rules/locations.mjs startingCondition). 0 = not set.
      originalQuality: new fields.NumberField({ required: true, integer: true, initial: 0 }),

      // Layering order: 0 Natural | 1 Cloth | 2 Padded/Quilted | 3 Fur/Leather/
      // Cuir | 4 Mail | 5 Rigid (Lamellar/Brigandine/Plate). On a hit, only the
      // highest-layer piece still holding at the struck location wears (its condition there).
      layer: new fields.NumberField({ required: true, integer: true, initial: 1, min: 0, max: ARMOR_LAYER_MAX }),

      // Per-aspect protection.
      protection: aspectFields(() => new fields.NumberField({ required: true, integer: true, initial: 0 })),

      // Hit locations this piece covers: one entry per covered location type.
      // side "" covers both sides of a type that has sides (and a location with no
      // known side); "left" or "right" covers only that side. condition is the
      // condition of the piece at that location: a hit that wears the piece lowers it
      // by 1, and at 0 that location no longer protects. A new entry starts at the
      // original durability (sheets/item-armor-sheet.mjs).
      coverage: new fields.ArrayField(new fields.SchemaField({
        type: new fields.StringField({ required: true, blank: false }),
        side: new fields.StringField({ required: true, initial: "", blank: true, choices: ["", ...LOCATION_SIDES] }),
        condition: new fields.NumberField({ required: true, initial: 0 })
      }), { initial: [] }),

      notes: new fields.StringField({ required: true, initial: "", blank: true }),

      // Actions tab: blank actions for now.
      actions: actionsField()
    };
  }

  /**
   * Armor made before the coverage entries stored its locations as a set of keys
   * (system.locations, "arm" for both sides, "leftArm" for one) and a map of
   * conditions (system.locationConditions). Turn them into coverage entries when
   * the data loads. Armor that covers both sides of a type that has sides (an entry
   * with side "") gets a left and a right entry instead. scripts/imports/
   * migrate-armor-coverage.js writes the result back for the world and the compendiums.
   * @override
   */
  static migrateData(source) {
    if (!Array.isArray(source.coverage) && (source.locations || source.locationConditions)) {
      source.coverage = legacyCoverage(source.locations, source.locationConditions);
    }
    if (Array.isArray(source.coverage)) source.coverage = splitBothSides(source.coverage);
    delete source.locations;
    delete source.locationConditions;
    return super.migrateData(source);
  }

  /** @override */
  prepareDerivedData() {
    // weight/value are per-unit; these feed the Actor's Load and Gear totals (rules/inventory.mjs gearSummary).
    Object.assign(this, itemTotals(this.weight, this.value, this.quantity));
    // Durability = the average condition of the locations the piece covers (Natural Armor keeps -1).
    const durability = this.quality === QUALITY_PERMANENT ? null : averageCondition(this.coverage);
    if (durability !== null) this.quality = durability;
  }
}
