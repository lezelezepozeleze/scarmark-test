/**
 * Data model of the "skill" item type. Owns the stored fields and the standalone derived values (sb, esl); the actor's applyDerivedCombat (base-actor-schema.mjs) finishes esl and sets sunsignBonus.
 */
import { SKILL_CATEGORIES, ATTRIBUTES, SUNSIGNS } from "../config/index.mjs";
import { skillBase, standaloneEslOf } from "../rules/index.mjs";
import { migrateSkillAttributeKeys } from "./migrations.mjs";
import { sunsignBonusesField, skillAttributeField } from "./shared-fields.mjs";

const fields = foundry.data.fields;

/**
 * Data model for the "skill" Item type.
 * Tracks SB (Skill Base), SL (the stored level) and ESL (effective skill level); SL is set directly.
 *
 * SB is derived from the owning Actor's attributes (the rounded average of the
 * 3 chosen attributes' base values, rules/derived.mjs skillBase) and does NOT
 * include the Zodiac Sign bonus: that bonus goes into ESL. If this Item isn't
 * embedded on an Actor (e.g. sitting in a compendium), SB is simply 0.
 */
export default class ScarmarkSkillData extends foundry.abstract.TypeDataModel {

  static defineSchema() {
    return {
      category: new fields.StringField({
        required: true,
        initial: "physical",
        choices: [...SKILL_CATEGORIES]
      }),

      attribute1: skillAttributeField(ATTRIBUTES, "str"),
      attribute2: skillAttributeField(ATTRIBUTES, "str"),
      attribute3: skillAttributeField(ATTRIBUTES, "str"),

      sunsignBonuses: sunsignBonusesField(SUNSIGNS),

      level: new fields.NumberField({ required: true, integer: true, initial: 0, min: 0 }),
      faithPoints: new fields.NumberField({ required: true, integer: true, initial: 0, min: 0 }),
      notes: new fields.StringField({ required: true, initial: "", blank: true }),
      description: new fields.HTMLField({ required: true, initial: "", blank: true })
    };
  }

  /** @override - Skill Base attributes from before 1.0.36 (see migrations.mjs). */
  static migrateData(source) {
    migrateSkillAttributeKeys(source);
    return super.migrateData(source);
  }

  /** @override */
  prepareDerivedData() {
    this.sb = skillBase(this.parent?.actor?.system?.attributes, [this.attribute1, this.attribute2, this.attribute3]);

    // ESL = SL + Zodiac Sign bonus + mods + SB-delta, finished by the Actor's
    // applyDerivedCombat pass (it needs the Actor's zodiac sign, effects and
    // penalties). Standalone (compendium) = SL only.
    this.esl = standaloneEslOf(this.level);
  }
}
