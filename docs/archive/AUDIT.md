# Audit

> Snapshot of 1.0.49-beta. Sections 1, 4, 5 and 9 are superseded by docs/archive/AUDIT-1.0.51.md (tooling, templates, packs, escaping and the structure have changed since). The rest is still the reference for the public interface, persisted data, duplications and hardcoded values.

## 1. Tooling

**package.json**: none

**lint/format config**: none

**tests**: none

**build scripts**: none

**CI workflows**: none

**.gitignore**: none

**templates/**: missing entirely - no .hbs files in this snapshot

**packs/**: missing - declared in system.json but not present in this export

**Note**: This is a snapshot from a Foundry browser export, not the author's GitHub repository. The system ships from the main branch zip (system.json:280-281), but this snapshot lacks templates, packs, package.json, .gitignore and CI infrastructure.

## 2. Public interface

### 2a. game.scarmark members

module/scarmark.mjs:47
```
game.scarmark = { config: SCARMARK, artifactRuneUse, rechargeCapacity, initiateAttack, declareMeleeAttack, initiateRangeAttack, declareRangeAttack, initiatePsionicTalent, skillTest, attributeTest, stunTest: rollStunTest, defaultArmorLocationItems };
```

- **config**: SCARMARK (the game configuration object)
- **artifactRuneUse**: function (from helpers/artifact-use.mjs)
- **rechargeCapacity**: function (from helpers/artifact-use.mjs)
- **initiateAttack**: function (from helpers/combat.mjs)
- **declareMeleeAttack**: function (from helpers/combat.mjs)
- **initiateRangeAttack**: function (from helpers/combat.mjs)
- **declareRangeAttack**: function (from helpers/combat.mjs)
- **initiatePsionicTalent**: function (from helpers/dice.mjs)
- **skillTest**: function (from helpers/dice.mjs)
- **attributeTest**: function (from helpers/dice.mjs)
- **stunTest**: rollStunTest function (from helpers/combat.mjs)
- **defaultArmorLocationItems**: function (from helpers/actor-setup.mjs)

### 2b. SCARMARK top-level keys

module/config.mjs:3: `export const SCARMARK = {};`

- **attributes** (object, line 10): 9 attributes (str/sta/dex/agl/wil/per/pre/int/spi) with label and row
- **characterOnlyAttributes** (array, line 23): `["pre"]`
- **characterAttributeKeys** (array, line 25): Object.keys(SCARMARK.attributes)
- **creatureAttributeKeys** (array, line 26): characterAttributeKeys filtered to exclude characterOnlyAttributes
- **legacyAttributeMap** (object, line 35): maps pre-1.0.36 attribute keys (eye/hrg/sml/voi/com/aur) to current keys (per/per/per/pre/pre/spi)
- **weightUnitsPerKg** (function, line 43): returns 1 if metricUnits setting is true, else 2
- **FATIGUE_STEP** (scalar, line 60): 2
- **LOAD_STEP** (scalar, line 61): 0.2
- **LOAD_MAX_STEPS** (scalar, line 62): 5
- **LOAD_MAX_FACTOR** (scalar, line 63): 2
- **WOUND_ATTRIBUTES** (array, line 64): `["dex", "agl"]`
- **CONDITION_BANDS** (array, line 65): array of {max, penalty, key} objects for wounded/critical conditions
- **SHOCK_THRESHOLD** (scalar, line 71): 0.25
- **vitalWounds** (object, line 80): maps location types (head/neck/chest/belly) to {4: "out", 5: "dying"}
- **vitalWoundFor** (function, line 87): returns "" | "out" | "dying" for a Wound Level at a location type
- **vitalStates** (object, line 92): maps "out" and "dying" to localization keys
- **personalities** (object, line 98): 5 personality options (lawAbiding/practical/opportunistic/corruptible/vicious) with localization keys
- **ESL_CAP** (scalar, line 113): 95
- **spellLevelPenalty** (function, line 120): returns (level - 1) * 5 for spell level penalty
- **sunsigns** (object, line 125): 12 zodiac signs with localization keys
- **months** (object, line 144): 12 months with label and sunsign mapping
- **traitCategories** (object, line 159): physical and psyche with localization keys
- **damageAspects** (object, line 169): blunt/edged/piercing/fire with localization keys
- **combatSkills** (object, line 180): close/ranged/unarmed/arcane with localization keys
- **weaponSkills** (object, line 188): close and unarmed (subset of combatSkills)
- **missileSkills** (object, line 194): all combatSkills
- **effectKeys** (object, line 209): maps Active Effect key paths to human-readable descriptions
- **missileVelocities** (object, line 240): low and high with localization keys
- **rangedBlockShields** (function, line 249): returns array of shield names that can block missiles at given velocity
- **woundLevels** (array, line 259): `[0, 1, 2, 3, 4, 5]`
- **mendRateMax** (scalar, line 267): 6
- **mendRates** (array, line 268): `[0, 1, 2, 3, 4, 5, 6]`
- **mendLabel** (function, line 269): returns "MRN" for 0, else stringified number
- **injurySeverities** (object, line 272): maps severity keys (light/heavy/severe/dire/mortal) to localization keys
- **severityKey** (function, line 281): returns severity key for a Wound Level (1: light, 2: heavy, 3: severe, 4: dire, 5+: mortal)
- **injuryTypes** (object, line 297): maps aspect x Wound Level (1-5) to {name, heavyBleeding, amputation}
- **injuryFor** (function, line 329): returns injury type entry for aspect + Wound Level (clamped 1-5)
- **armorLocations** (object, line 381): canonical location definitions (19 types) with aim weights, injury thresholds, risk flags
- **legacyLocationMap** (object, line 405): maps pre-1.0.39/1.0.40 location keys to current keys
- **locationKey** (function, line 416): returns current key of a location type (old key maps to new)
- **covers** (function, line 418): checks if a set of location types covers a given type (including legacy keys)
- **fumbleTestLocations** (object, line 428): maps hand and arm to minimum Wound Level for forced fumble test (hand: 1, arm: 3)
- **stumbleTestLocations** (object, line 429): maps thigh and shin to minimum Wound Level for forced stumble test (both: 1)
- **STUN_WOUND_LEVELS** (array, line 438): `[2, 3]`
- **STUN_TARGET** (scalar, line 439): 50
- **stunProtectionBonus** (function, line 440): returns armor bonus for stun test (layer >= 5: +20, >= 2: +10, else 0)
- **STUNNED_DURATION** (object, line 441): `{value: 1, units: "rounds", expiry: "turnStart"}`
- **armorPiercingNames** (RegExp scalar, line 449): `/bodkin/i`

### 2c. constants.mjs exports

module/constants.mjs:7: `export const SYSTEM_ID = "scarmark";`

module/constants.mjs:10: `export const FLAGS = { scope: SYSTEM_ID, ... }`
- **scope**: "scarmark"
- **shockGrit**: "shockGrit"
- **lastFatigueRound**: "lastFatigueRound"
- **expireWorldTime**: "expireWorldTime"

module/constants.mjs:21: `export const SETTINGS = { metricUnits: "metricUnits" };`
- **metricUnits**: "metricUnits"

module/constants.mjs:27: `export const PACKS = { skills: `${SYSTEM_ID}.skills` };`
- **skills**: "scarmark.skills"

module/constants.mjs:32: `export const QUERIES = { updateCombatItem: `${SYSTEM_ID}.updateCombatItem` };`
- **updateCombatItem**: "scarmark.updateCombatItem"

### 2d. game.settings.register calls

module/scarmark.mjs:54-59
```
game.settings.register(SYSTEM_ID, SETTINGS.metricUnits, {
  scope: "world",
  config: false,
  type: Boolean,
  default: false
});
```

- **key**: "metricUnits"
- **scope**: "world"
- **config**: false
- **type**: Boolean
- **default**: false

### 2e. Hooks registrations

module/scarmark.mjs:44: `Hooks.once("init", () => { ... })`

module/scarmark.mjs:202: `Hooks.once("ready", async () => { ... })`

module/scarmark.mjs:220: `if (scHook) Hooks.on(scHook, debouncedSweep);` - registered inside the ready callback, only when Simple Calendar is active (`globalThis.SimpleCalendar?.Hooks?.DateTimeChange`)

module/scarmark.mjs:227: `Hooks.on("renderChatMessageHTML", (message, html) => { ... })`

module/scarmark.mjs:232: `Hooks.on("updateCombat", (combat, changed) => { ... })`

module/scarmark.mjs:281: `Hooks.on("updateWorldTime", debouncedSweep);`

module/scarmark.mjs:288: `Hooks.on("renderActiveEffectConfig", (app, html) => { ... })`

module/scarmark.mjs:322: `Hooks.on("preUpdateActor", (actor, changes) => { ... })`

module/scarmark.mjs:334: `Hooks.on("preCreateActor", (actor, data, options, userId) => { ... })`

module/scarmark.mjs:346: `Hooks.on("createActor", async (actor, options, userId) => { ... })`

### 2f. CONFIG.queries and socket use

module/helpers/combat/gm-update.mjs:47: `CONFIG.queries[QUERIES.updateCombatItem] = handleUpdateCombatItem;`

- **CONFIG.queries["scarmark.updateCombatItem"]**: registered in registerScarmarkQueries() function, handles GM-side relay for updating weapon/armor items during combat (system.broken, system.quality fields only)

**Socket use**: none found.

## 3. Persisted data

### Actor types

#### character

module/data/actor-character.mjs:13-34

**Schema fields**:
- **attributes**: SchemaField of 9 attributes (str/sta/dex/agl/wil/per/pre/int/spi), each with `base: NumberField(integer, initial 8, min 0)`
- **attributes[key].effective**: (derived, not in schema) effective attribute value after penalties
- **resources**: SchemaField
  - **fatigue**: NumberField(integer, initial 0, min 0)
  - **condition**: SchemaField
    - **value**: NumberField(integer, initial 100, min 0)
    - **max**: NumberField(integer, initial 100, min 1)
  - **move**: SchemaField
    - **value**: NumberField(integer, initial 0)
    - **max**: NumberField(integer, initial 0)
  - **spiritCapacity**: NumberField(integer, initial 0, min 0)
  - **willCapacity**: NumberField(integer, initial 0, min 0)
- **race**: StringField(initial "", blank true)
- **dob**: SchemaField
  - **month**: StringField(initial "", blank true, choices: Object.keys(SCARMARK.months))
  - **day**: StringField(initial "", blank true)
  - **year**: StringField(initial "", blank true)
- **birthplace**: StringField(initial "", blank true)
- **personality**: StringField(initial "", blank true, choices: ["", ...Object.keys(SCARMARK.personalities)])
- **journal**: HTMLField(initial "", blank true)
- **sunsign**: (derived) derived from dob.month via SCARMARK.months
- **mods**: (derived, prepared in prepareBaseData) zeroed modifier accumulators (meleeAttack/meleeDefense/missileAttack/incomingMelee/incomingMissile/injury/endurance/outnumbered/defense/impact/skills.{physical/communication/combat/craft/religion/magic/psionic}/skill[name])
- **fatiguePenalty**: (derived) Math.floor(fatigue / SCARMARK.FATIGUE_STEP)
- **endurance**: (derived) round((str + sta + wil) / 3) after fatigue penalty, plus mods.endurance
- **wl**: (derived) sum of injury items' woundLevel + mods.injury
- **heavyBleed**: (derived) count of injury items with heavyBleeding true
- **condition**: (derived) {value, max: endurance, pct, band: "ok"|"wounded"|"critical"|"out"|"dying", vital: ""|"out"|"dying", penalty}
- **load**: (derived) {kg, capacity, max, pct, steps, overMax}
- **burden**: (derived) same as load.steps (overload steps)
- **move**: (derived) effective AGL
- **gearSummary**: (derived) {weapon, missile, armor, miscGear, total, capacity, endurance} weight totals in stored units

module/data/actor-character.mjs:37-39: `static migrateData(source)`
```
migrateLegacyAttributes(source.attributes, SCARMARK.characterAttributeKeys);
```

**Migration**: Converts pre-1.0.36 attributes (EYE/HRG/SML, VOI/COM, AUR) into PER/PRE/SPI using migrateLegacyAttributes() from base-actor-schema.mjs - PER = average of EYE/HRG/SML, PRE = average of VOI/COM, SPI = AUR. Only fills missing keys, never touches already-migrated data.

#### creature

module/data/actor-creature.mjs:13-26

**Schema fields**:
- **attributes**: SchemaField of 8 attributes (str/sta/dex/agl/wil/per/int/spi - no pre), each with `base: NumberField(integer, initial 8, min 0)`
- **attributes[key].effective**: (derived) effective attribute value after penalties
- **resources**: SchemaField (same structure as character)
  - **fatigue**: NumberField(integer, initial 0, min 0)
  - **condition**: SchemaField (value, max)
  - **move**: SchemaField (value, max)
  - **spiritCapacity**: NumberField(integer, initial 0, min 0)
  - **willCapacity**: NumberField(integer, initial 0, min 0)
- **species**: StringField(initial "", blank true)
- **specialAbilities**: HTMLField(initial "", blank true)
- **mods**: (derived) same as character
- **fatiguePenalty**: (derived) same as character
- **endurance**: (derived) same as character
- **wl**: (derived) same as character
- **heavyBleed**: (derived) same as character
- **condition**: (derived) same as character
- **load**: (derived) same as character
- **burden**: (derived) same as character
- **move**: (derived) same as character
- **gearSummary**: (derived) same as character

module/data/actor-creature.mjs:30-32: `static migrateData(source)`
```
migrateLegacyAttributes(source.attributes, SCARMARK.creatureAttributeKeys);
```

**Migration**: Converts pre-1.0.36 attributes into PER/SPI (no Presence) using same migrateLegacyAttributes() helper as character.

#### npc

module/data/actor-npc.mjs:14-26

**Schema fields**:
- **attributes**: SchemaField of 9 attributes (str/sta/dex/agl/wil/per/pre/int/spi), each with `base: NumberField(integer, initial 8, min 0)`
- **attributes[key].effective**: (derived) effective attribute value after penalties
- **resources**: SchemaField (same structure as character)
  - **fatigue**: NumberField(integer, initial 0, min 0)
  - **condition**: SchemaField (value, max)
  - **move**: SchemaField (value, max)
  - **spiritCapacity**: NumberField(integer, initial 0, min 0)
  - **willCapacity**: NumberField(integer, initial 0, min 0)
- **race**: StringField(initial "", blank true)
- **mods**: (derived) same as character
- **fatiguePenalty**: (derived) same as character
- **endurance**: (derived) same as character
- **wl**: (derived) same as character
- **heavyBleed**: (derived) same as character
- **condition**: (derived) same as character
- **load**: (derived) same as character
- **burden**: (derived) same as character
- **move**: (derived) same as character
- **gearSummary**: (derived) same as character

module/data/actor-npc.mjs:30-32: `static migrateData(source)`
```
migrateLegacyAttributes(source.attributes, SCARMARK.characterAttributeKeys);
```

**Migration**: Converts pre-1.0.36 attributes into PER/PRE/SPI using migrateLegacyAttributes().

#### animal

module/data/actor-animal.mjs:9: `export default class ScarmarkAnimalData extends ScarmarkCreatureData {}`

**Schema fields**: identical to creature type (extends ScarmarkCreatureData)

**Migration**: inherited from creature (converts pre-1.0.36 attributes into PER/SPI).

#### container

module/data/actor-container.mjs:11-19

**Schema fields**:
- **maxCapacity**: NumberField(initial 1, min 0)
- **description**: HTMLField(initial "", blank true)
- **gearSummary**: (derived) {weapon, missile, armor, miscGear, total, capacity: maxCapacity} weight totals

**Migration**: none (no migrateData override).

### Item types

#### trait

module/data/item-trait.mjs:7-19

**Schema fields**:
- **category**: StringField(initial "physical", choices: ["physical", "psyche"])
- **description**: HTMLField(initial "", blank true)
- **notes**: StringField(initial "", blank true)

**Migration**: none.

#### skill

module/data/item-skill.mjs:14-41

**Schema fields**:
- **category**: StringField(initial "physical", choices: ["physical", "communication", "combat", "craft", "religion", "magic"])
- **attribute1**: StringField(initial "str", choices: Object.keys(SCARMARK.attributes))
- **attribute2**: StringField(initial "str", choices: Object.keys(SCARMARK.attributes))
- **attribute3**: StringField(initial "str", choices: Object.keys(SCARMARK.attributes))
- **sunsignBonuses**: ArrayField of SchemaField
  - **sunsign**: StringField(initial "", blank true, choices: [...Object.keys(SCARMARK.sunsigns), ""])
  - **bonus**: NumberField(integer, initial 1)
- **level**: NumberField(integer, initial 0, min 0)
- **faithPoints**: NumberField(integer, initial 0, min 0)
- **notes**: StringField(initial "", blank true)
- **description**: HTMLField(initial "", blank true)
- **sb**: (derived) Skill Base = round(average of 3 attributes)
- **sunsignBonus**: (derived) matching sunsign bonus from actor
- **esl**: (derived) Effective Skill Level = level + sunsignBonus + category mod + skill mod + SB-delta (finished by actor's applyDerivedCombat)

module/data/item-skill.mjs:48-54: `static migrateData(source)`
```
for (const key of ["attribute1", "attribute2", "attribute3"]) {
  const v = source[key];
  if (v in SCARMARK.legacyAttributeMap) source[key] = SCARMARK.legacyAttributeMap[v];
  else if (v === "mor") source[key] = "wil";
}
```

**Migration**: Converts pre-1.0.36 Skill Base attributes (EYE/HRG/SML/VOI/COM/AUR) to current keys (per/per/per/pre/pre/spi) using SCARMARK.legacyAttributeMap, and MOR to wil.

#### gear

module/data/item-gear.mjs:8-34

**Schema fields**:
- **weight**: NumberField(initial 0, min 0)
- **value**: NumberField(initial 0, min 0)
- **quantity**: NumberField(integer, initial 1, min 0)
- **description**: HTMLField(initial "", blank true)
- **notes**: StringField(initial "", blank true)
- **carried**: BooleanField(initial true)
- **container**: StringField(initial "", blank true) - id of container item this is stored in
- **consumable**: BooleanField(initial false) - shows Consume button, copies Active Effects to actor on use
- **rune**: BooleanField(initial false) - lists under Runes section, uses Spirit Capacity
- **artifact**: SchemaField
  - **active**: BooleanField(initial false)
  - **attuned**: BooleanField(initial false)
  - **class**: NumberField(integer, initial 1, min 1, max 5)
- **totalWeight**: (derived) weight * quantity
- **totalValue**: (derived) value * quantity

**Migration**: none.

#### weapon

module/data/item-weapon.mjs:13-72

**Schema fields**:
- **quantity**: NumberField(integer, initial 1, min 0)
- **weight**: NumberField(initial 0, min 0)
- **value**: NumberField(initial 0, min 0)
- **carried**: BooleanField(initial true)
- **container**: StringField(initial "", blank true)
- **quality**: NumberField(integer, initial 10, min 0, max 16) - weapon DUR (0 = not breakable sentinel)
- **isShield**: BooleanField(initial false)
- **broken**: BooleanField(initial false)
- **attack**: NumberField(integer, initial 0) - weapon's contribution to AML
- **defense**: NumberField(integer, initial 0) - weapon's contribution to DML
- **specialization**: NumberField(integer, initial 0) - character's specialization bonus
- **impact**: SchemaField
  - **blunt**: NumberField(integer, initial 0, min -1) - -1 means aspect not available
  - **edged**: NumberField(integer, initial 0, min -1)
  - **piercing**: NumberField(integer, initial 0, min -1)
  - **fire**: NumberField(integer, initial 0, min -1)
- **associatedSkill**: StringField(initial "close", choices: ["close", "unarmed", "ranged", "arcane"])
- **notes**: StringField(initial "", blank true)
- **rune**: BooleanField(initial false)
- **artifact**: SchemaField
  - **active**: BooleanField(initial false)
  - **attuned**: BooleanField(initial false)
  - **class**: NumberField(integer, initial 1, min 1, max 5)
- **totalWeight**: (derived) weight * quantity
- **totalValue**: (derived) value * quantity

**Migration**: none.

#### missile

module/data/item-missile.mjs:14-69

**Schema fields**:
- **quantity**: NumberField(integer, initial 1, min 0)
- **weight**: NumberField(initial 0, min 0)
- **value**: NumberField(initial 0, min 0)
- **carried**: BooleanField(initial true)
- **container**: StringField(initial "", blank true)
- **quality**: NumberField(integer, initial 10, min 0, max 16)
- **velocity**: StringField(initial "high", choices: ["low", "high"]) - Low vs High Velocity Missile
- **aspect**: StringField(initial "piercing", choices: ["blunt", "edged", "piercing", "fire"]) - single damage aspect for whole missile
- **associatedSkill**: StringField(initial "ranged", choices: ["close", "ranged", "unarmed", "arcane"])
- **specialization**: NumberField(integer, initial 0)
- **range**: SchemaField - thresholds in scene distance units (metres)
  - **short**: NumberField(integer, initial 0, min 0)
  - **medium**: NumberField(integer, initial 0, min 0)
  - **long**: NumberField(integer, initial 0, min 0)
  - **extreme**: NumberField(integer, initial 0, min 0)
- **impact**: SchemaField - impact per range band
  - **short**: NumberField(integer, initial 0)
  - **medium**: NumberField(integer, initial 0)
  - **long**: NumberField(integer, initial 0)
  - **extreme**: NumberField(integer, initial 0)
- **magic**: BooleanField(initial false) - Magic Missile flag
- **spellClass**: NumberField(integer, initial 1, min 1, max 6) - Spirit Capacity cost per shot
- **notes**: StringField(initial "", blank true)
- **totalWeight**: (derived) weight * quantity
- **totalValue**: (derived) value * quantity

**Migration**: none.

#### armorLocation

module/data/item-armor-location.mjs:22-51

**Schema fields**:
- **locationType**: StringField(initial "head")
- **aim**: SchemaField - hit probability weights per aim zone
  - **high**: NumberField(integer, initial 300, min 0)
  - **medium**: NumberField(integer, initial 100, min 0)
  - **low**: NumberField(integer, initial 0, min 0)
- **injury**: SchemaField - Wound Level at each effective-impact threshold
  - **t1**: NumberField(integer, initial 1, min 0, max 5)
  - **t5**: NumberField(integer, initial 2, min 0, max 5)
  - **t9**: NumberField(integer, initial 3, min 0, max 5)
  - **t13**: NumberField(integer, initial 4, min 0, max 5)
  - **t17**: NumberField(integer, initial 5, min 0, max 5)
- **risk**: SchemaField
  - **fumble**: BooleanField(initial false)
  - **stumble**: BooleanField(initial false)
  - **amputate**: BooleanField(initial false)
- **notes**: StringField(initial "", blank true)

module/data/item-armor-location.mjs:56-63: `static migrateData(source)`
```
if ( source.injury && (typeof source.injury === "object") ) {
  for ( const key of ["t1", "t5", "t9", "t13", "t17"] ) {
    const value = source.injury[key];
    if ( typeof value === "string" ) source.injury[key] = Number(value.replace(/\D/g, "")) || 0;
  }
}
```

**Migration**: Converts pre-1.0.39 wound threshold letter codes (e.g. "K4") to plain Wound Level numbers (4), strips non-digits and converts to number, empty string becomes 0.

#### armor

module/data/item-armor.mjs:14-49

**Schema fields**:
- **quantity**: NumberField(integer, initial 1, min 0)
- **weight**: NumberField(initial 0, min 0)
- **value**: NumberField(initial 0, min 0)
- **carried**: BooleanField(initial true)
- **container**: StringField(initial "", blank true)
- **quality**: NumberField(integer, initial 0) - armor DUR (-1 = permanent/never decays, 0 = destroyed)
- **layer**: NumberField(integer, initial 1, min 0, max 5) - layering order (0 Natural | 1 Cloth | 2 Padded/Quilted | 3 Fur/Leather/Cuir | 4 Mail | 5 Rigid)
- **protection**: SchemaField - per-aspect protection
  - **blunt**: NumberField(integer, initial 0)
  - **edged**: NumberField(integer, initial 0)
  - **piercing**: NumberField(integer, initial 0)
  - **fire**: NumberField(integer, initial 0)
- **locations**: SetField of StringField(blank false, initial []) - set of location type keys this piece covers
- **notes**: StringField(initial "", blank true)
- **totalWeight**: (derived) weight * quantity
- **totalValue**: (derived) value * quantity

**Migration**: none.

#### container

module/data/item-container.mjs:14-25

**Schema fields**:
- **quantity**: NumberField(integer, initial 1, min 0)
- **weight**: NumberField(initial 0, min 0)
- **value**: NumberField(initial 0, min 0)
- **maxCapacity**: NumberField(initial 1, min 0) - max stored weight
- **carried**: BooleanField(initial true)
- **notes**: StringField(initial "", blank true)
- **totalWeight**: (derived) weight * quantity (own weight only, contents summed on actor side)
- **totalValue**: (derived) value * quantity

**Migration**: none.

#### injury

module/data/item-injury.mjs:18-38

**Schema fields**:
- **woundLevel**: NumberField(integer, initial 1, min 0) - severity is derived from this
- **mend**: NumberField(integer, initial 0, min 0, max 6) - Mend Rate/Healing Rate (0 = MRN narrative, 1-6 = H1-H6)
- **heavyBleeding**: BooleanField(initial false) - mechanically tracked bleeding
- **vital**: StringField(initial "", blank true, choices: ["", "out", "dying"]) - vital wound state
- **notes**: StringField(initial "", blank true)
- **severityKey**: (derived) SCARMARK.severityKey(woundLevel) - "light"|"heavy"|"severe"|"dire"|"mortal"
- **mendLabel**: (derived) SCARMARK.mendLabel(mend) - "MRN" for 0, else stringified number

**Migration**: none.

#### invocation

module/data/item-invocation.mjs:9-19

**Schema fields**:
- **religion**: StringField(initial "", blank true) - name of Religion skill this invocation draws on
- **circle**: NumberField(integer, initial 1, min 1, max 5) - FP Cost
- **notes**: StringField(initial "", blank true)
- **description**: HTMLField(initial "", blank true)

**Migration**: none.

#### spell

module/data/item-spell.mjs:11-21

**Schema fields**:
- **magicType**: StringField(initial "", blank true) - name of Magic skill this spell draws on (the "Convocation")
- **level**: NumberField(integer, initial 1, min 1, max 6) - each level above 1 lowers target by 5 (L1 -0 ... L6 -25)
- **notes**: StringField(initial "", blank true)
- **description**: HTMLField(initial "", blank true)

**Migration**: none.

#### psionic

module/data/item-psionic.mjs:13-36

**Schema fields**:
- **attribute1**: StringField(initial "spi", choices: Object.keys(SCARMARK.attributes))
- **attribute2**: StringField(initial "spi", choices: Object.keys(SCARMARK.attributes))
- **attribute3**: StringField(initial "wil", choices: Object.keys(SCARMARK.attributes))
- **sunsignBonuses**: ArrayField of SchemaField
  - **sunsign**: StringField(initial "", blank true, choices: [...Object.keys(SCARMARK.sunsigns), ""])
  - **bonus**: NumberField(integer, initial 1)
- **level**: NumberField(integer, initial 0, min 0)
- **fatigue**: NumberField(integer, initial 0, min 0) - Fatigue Levels accrued per use
- **notes**: StringField(initial "", blank true)
- **description**: HTMLField(initial "", blank true)
- **misfire**: HTMLField(initial "", blank true) - Backlash text posted on Critical Failure
- **sb**: (derived) Skill Base = round(average of 3 attributes)
- **esl**: (derived) Effective Skill Level = level + sunsignBonus + category mod + skill mod + SB-delta (finished by actor's applyDerivedCombat)

module/data/item-psionic.mjs:45-51: `static migrateData(source)`
```
for (const key of ["attribute1", "attribute2", "attribute3"]) {
  const v = source[key];
  if (v in SCARMARK.legacyAttributeMap) source[key] = SCARMARK.legacyAttributeMap[v];
  else if (v === "mor") source[key] = "wil";
}
```

**Migration**: Converts pre-1.0.36 Skill Base attributes (EYE/HRG/SML/VOI/COM/AUR) to current keys (per/per/per/pre/pre/spi) using SCARMARK.legacyAttributeMap, and MOR to wil (same as skill item).

## 4. Templates

**templates/**: templates not available. The snapshot has no templates/ folder and no .hbs files, so no template could be searched for game numbers, formulas, arithmetic helpers or uses of SCARMARK.weaponSkills / SCARMARK.traitCategories.

Consequence: sheet/template consumers could not be checked. Every statement below about "consumers" covers .mjs files only. In particular the dropdown sources in 6h (which context key or schema field each weapon/missile template actually renders) and any template use of weaponSkills / traitCategories are unverified.

Handlebars helpers registered in .mjs (the only template arithmetic visible from code), module/scarmark.mjs:351-359:
- `eq`, `concat` (no game numbers)
- `round1`: `Math.round((Number(v) || 0) * 10) / 10` (display rounding)
- `percent`: `return Math.round((value / max) * 100);`

Search of all .mjs files for the two keys (`grep -rn -E 'weaponSkills|traitCategories' --include='*.mjs'`):

| Key | Hit | Snippet | Kind |
|---|---|---|---|
| SCARMARK.traitCategories | module/config.mjs:159 | `SCARMARK.traitCategories = {` | definition only |
| SCARMARK.weaponSkills | module/config.mjs:188 | `SCARMARK.weaponSkills = {` | definition only |
| (context key, not the config key) | module/sheets/item-weapon-sheet.mjs:32 | `context.weaponSkills = CONFIG.SCARMARK.combatSkills;` | the weapon sheet's `weaponSkills` context entry is filled from combatSkills, NOT from SCARMARK.weaponSkills |
| (comment) | module/data/item-weapon.mjs:59 | `// Which combat skill this weapon rolls against (see SCARMARK.weaponSkills).` | comment only |

Result: neither SCARMARK.weaponSkills nor SCARMARK.traitCategories is read by any .mjs code. Trait categories are instead hardcoded in module/data/item-trait.mjs:14 (`choices: ["physical", "psyche"]`) and module/sheets/actor-sheet-base.mjs:183-184 (`i.system.category === "physical"` / `"psyche"`). The exported compendium data (export/compendiums/**, including macros) also contains no reference to either key (grep, no hits). Template use remains unknown.

## 5. Compendium data

Pack path from system.json:125-129: `"name": "armor-locations"`, `"path": "packs/armor-locations"`. packs/ is not in the repo.

**Source used**: a Foundry document API export, not the pack file: /Users/<user>/scarmark-refactor/export/compendiums/scarmark.armor-locations/documents.json (32 documents) plus index.json (32 entries, same ids). The export's manifest.json lists `{"id":"scarmark.armor-locations","title":"Armor Locations","status":"full","documents":32}`. The export was read as data with jq and a read-only Node script kept outside the export folder; the script imported module/config.mjs to get SCARMARK.armorLocations and compared each document's `system.aim`, `system.injury`, `system.risk` field by field (after SCARMARK.locationKey) against the canonical entry built at module/config.mjs:381-392 (`SCARMARK.armorLocations[key] = {`).

**Result: all 32 documents match the canonical values exactly** (0 mismatches in aim high/medium/low, t1-t17, fumble/stumble/amputate). No document uses a legacy location key (SCARMARK.legacyLocationMap), no document has extra fields in aim/injury/risk, all `notes` are empty and no document has effects. All 19 canonical types appear at least once.

| Type | Docs (name) | aim high/medium/low | injury t1..t17 | risk F/S/A |
|---|---|---|---|---|
| head | Head | 300/100/0 | 1,2,3,4,5 | 0/0/0 |
| neck | Neck | 120/40/0 | 1,2,3,4,5 | 0/0/1 |
| shoulder | Left / Right Shoulder | 300/100/0 | 1,2,3,4,5 | 1/0/0 |
| arm | Left / Right Arm | 360/120/0 | 1,1,2,3,4 | 1/0/1 |
| hand | Left / Right Hand | 180/60/0 | 1,1,2,3,4 | 1/0/1 |
| chest | Chest | 160/160/160 | 1,2,3,4,5 | 0/0/0 |
| belly | Belly | 120/120/120 | 1,2,3,4,5 | 0/0/0 |
| hip | Left / Right Hip | 0/60/180 | 1,2,3,4,5 | 0/1/0 |
| thigh | Left / Right Thigh | 0/120/360 | 1,1,2,3,4 | 0/1/1 |
| shin | Left / Right Shin | 0/120/360 | 1,1,2,3,4 | 0/1/1 |
| wing | Left Wing x2, Right Wing x2 | 60/20/0 | 1,1,2,3,4 | 1/0/1 |
| tentacle | Tentacle x2 | 60/20/0 | 1,1,2,3,4 | 1/0/1 |
| tail | Tail x2 | 0/20/60 | 1,1,2,3,4 | 0/1/1 |
| creatureHead | Creature Head | 390/130/0 | 1,2,3,4,5 | 0/0/0 |
| creatureNeck | Creature Neck | 270/90/0 | 1,2,3,4,5 | 0/0/1 |
| creatureForeLeg | Creature Left / Right Fore Leg | 0/80/240 | 1,1,2,3,4 | 0/1/1 |
| creatureHindLeg | Creature Left / Right Hind Leg | 0/80/240 | 1,1,2,3,4 | 0/1/1 |
| creatureChest | Creature Chest | 250/250/250 | 1,2,3,4,5 | 0/0/0 |
| creatureBelly | Creature Belly | 250/250/250 | 1,2,3,4,5 | 0/0/0 |

Observations (no value drift, data hygiene only):
- The documents sit in two folders (`17PckwGC6BUW0hb0` with the 1.0.39 humanoid set, `MRZoOGDyHug8UPEQ` with the creature set). Left Wing, Right Wing, Tentacle and Tail exist once in each folder (8 documents, 4 duplicate names), e.g. `G9ueGAdd1gKlpAmu | Left Wing` and `SX9HQdksxRT4aGY7 | Left Wing`. Identical values, so harmless for rules.
- `_stats.systemVersion` ranges from `0.1.0` to `1.0.40-beta` (the 0.1.0 documents are creature/wing/tail types whose values did not change in 1.0.39/1.0.40).
- The pack values equal the config, so prompt 3c item 3 (schema defaults from config) and any config split cannot be cross-checked against stale pack data: there is none for this pack. The binary LevelDB pack itself was not read; if it differs from this export, the export wins only as of its export time.

## 6. Duplications

### 6a. Skill Base in item-skill and item-psionic - CONFIRMED (identical results)

- module/data/item-skill.mjs:58-68: `const values = [this.attribute1, this.attribute2, this.attribute3]` / `.map(key => attrs[key]?.base ?? 0);` / `this.sb = Math.round(values.reduce((sum, v) => sum + v, 0) / values.length);`
- module/data/item-psionic.mjs:55-62: `const values = [this.attribute1, this.attribute2, this.attribute3].map(k => attrs[k]?.base ?? 0);` / `this.sb = Math.round(values.reduce((s, v) => s + v, 0) / values.length);`

Differences checked: skill reads `this.parent?.actor` into a local then `actor?.system?.attributes`; psionic reads `this.parent?.actor?.system?.attributes` in one expression - same value. Both fall back to `this.sb = 0` when not embedded and both set `this.esl = Math.max(0, this.level);` (item-skill.mjs:74, item-psionic.mjs:64). Divisor is always 3 (`values.length`), missing attributes count as 0, Math.round. No behavioral difference.

Related copies: the identical migrateData bodies (item-skill.mjs:48-55 and item-psionic.mjs:45-52, `if (v in SCARMARK.legacyAttributeMap) source[key] = ...` / `else if (v === "mor") source[key] = "wil";`), and the same three-attribute walk in module/data/base-actor-schema.mjs:290-299 (`for (const k of [item.system.attribute1, item.system.attribute2, item.system.attribute3])`, SB-delta, different formula).

### 6b. Invocation target "esl - circle * 5" - CONFIRMED, with a cap difference

- module/helpers/dice.mjs:212: `const target = capTarget(Math.max(0, skill.system.esl - circle * 5));`
- module/sheets/actor-sheet-base.mjs:249: `esl: skill ? Math.max(0, skill.system.esl - inv.system.circle * 5) : 0,`

Precise difference: the roll applies capTarget (min 95), the sheet does not. For ESL 110, circle 1: sheet shows 105, the roll uses 95. For any value <= 95 they agree. With no matching skill the sheet shows 0 while the roll warns and returns (dice.mjs:199, `SCARMARK.Invocation.noReligion`). The 5 per circle exists nowhere in config.

Same pattern for spells (shared penalty function, but the `Math.max(0, esl - penalty)` and the cap difference are duplicated): dice.mjs:247 `capTarget(Math.max(0, skill.system.esl - SCARMARK.spellLevelPenalty(spell.system.level)))` vs actor-sheet-base.mjs:238 `esl: skill ? Math.max(0, skill.system.esl - SCARMARK.spellLevelPenalty(s.system.level)) : 0,`.

### 6c. Shock target "2 * pct" - CONFIRMED (numerically identical for every reachable input)

- module/helpers/dice.mjs:342-343: `const pct = actor.system.condition?.pct ?? 100;` / `const target = capTarget(Math.max(0, 2 * pct));`
- module/helpers/combat/wounds.mjs:59: `target: Math.min(SCARMARK.ESL_CAP, 2 * cond.pct)`

capTarget, module/helpers/chat.mjs:20-22: `return Math.min(SCARMARK.ESL_CAP, target);` - it does nothing beyond min(ESL_CAP): no max(0), no rounding, no NaN/number coercion. So dice.mjs = `min(95, max(0, 2*pct))`, wounds.mjs = `min(95, 2*pct)`.

Mental run: pct is `Math.round(conditionShare * 100)` (base-actor-schema.mjs:260) with `condition = ... Math.max(0, endurance - wl)` and `conditionShare = endurance > 0 ? condition / endurance : 0` (lines 236-237), so pct >= 0 always and the extra max(0) never changes the result. wounds.mjs only reaches line 59 when `cond.value > 0` (the `cond.value <= 0` branch returns at line 38-55) and `cond.pct <= SCARMARK.SHOCK_THRESHOLD * 100` (line 57), i.e. pct 0-25, target 0-50. Differences that remain: (1) wounds.mjs value is display text only (`SCARMARK.CombatAuto.shockRequest`); the real roll happens later via the card button -> rollShock, which recomputes from the then-current pct; (2) rollShock defaults to pct 100 (target 95) when `condition` is missing, wounds.mjs returns early (`if (!cond) return;`, line 35).

Stale comments contradicting the code: chat.mjs:18 `Only for d100-vs-ESL tests; Nd6 tests (Shock) do not use it.` and config.mjs:111 `does NOT touch non-d100 tests (Shock).` - but Shock is now a d100 test (dice.mjs:329 `d100 against 2 x Condition % (capped at 95)`) and does use capTarget.

### 6d. Worn-armor protection sum - CONFIRMED (identical sums)

- module/helpers/combat/armor.mjs:16-18: `.filter(a => isWornArmor(actor, a) && SCARMARK.covers(a.system.locations, SCARMARK.locationKey(locType)) && a.system.quality !== 0)` / `.reduce((s, a) => s + (a.system.protection?.[aspect] ?? 0), 0);`
- module/sheets/actor-sheet-base.mjs:317-321: `const armorItems = items.filter(i => isWornArmor(this.document, i) && i.system.quality !== 0);` / `const covering = armorItems.filter(a => SCARMARK.covers(a.system.locations, SCARMARK.locationKey(type)));` / `const sum = (aspect) => covering.reduce((s, a) => s + (a.system.protection?.[aspect] ?? 0), 0);`

Same filter set (isWornArmor already checks `item.type === "armor"`, armor.mjs:10), same exclusion of quality 0 only (AQ -1 natural is included in both), same `?? 0`. The sheet iterates the sort-ordered list (actor-sheet-base.mjs:182), the helper `actor.items` - integer addition, so the order does not matter. The sheet hardcodes the four aspects: `b: sum("blunt"), e: sum("edged"), p: sum("piercing"), f: sum("fire"),` (line 326). `layers: covering.length` (line 325) counts only covering pieces that are worn AND not destroyed (quality 0 is filtered out before) - relevant for prompt 4c item 3.

The same worn+covers filter is repeated twice more: armor.mjs:21-23 headArmorLayer (`SCARMARK.covers(a.system.locations, "head") && (a.system.quality !== 0)`) and strike.mjs:66-67 wearArmor (`... && (a.system.quality ?? 0) >= 1)` - deliberately different: natural armor excluded).

### 6e. Outnumbered 20/30 - CONFIRMED

- module/data/base-actor-schema.mjs:141-146: `if (n >= 3) return 30;` / `if (n === 2) return 20;` / `return 0;`
- module/helpers/effects.mjs:32: picker label `Outnumbered (# attackers: 2 = -20, 3+ = -30)` (source uses U+2212 minus signs)
- module/config.mjs:224: effectKeys label `Outnumbered (# of attackers; 2 = defense -20, 3+ = -30)` (U+2212 in source)
- comments repeating it: base-actor-schema.mjs:112 `penalty, fixed: 2 = -20, 3 or more = -30`, lookup.mjs:25 `minus the fixed Outnumbered penalty (2 = -20, 3+ = -30)`.

The numbers live only in the function; the two labels are hand-written copies. Edge: `n === 2` is strict, so a non-integer count (e.g. 2.5 from an effect) gives 0, and n >= 3 gives 30. Consumer: lookup.mjs:26 `defenseSituational = (actor) => (actor.system.mods?.defense ?? 0) - outnumberedPenalty(actor);`.

### 6f. Effect picker options written by hand - CONFIRMED

module/helpers/effects.mjs:25-50 builds the static options as literal arrays (`["system.mods.meleeAttack", "Melee Attack"],` ...) and never reads SCARMARK.effectKeys. The doc comment effects.mjs:19 (`Combines the static mod keys (SCARMARK.effectKeys)`) is wrong. SCARMARK.effectKeys (config.mjs:209-228) has **no runtime consumer** at all (grep: only its definition and that comment).

Key set: identical, 18 keys in each; no key is present in one but missing in the other. Order differs:

| # | SCARMARK.effectKeys (config.mjs:210-227) | buildEffectKeyOptions (effects.mjs:27-48) |
|---|---|---|
| 1-5 | meleeAttack, meleeDefense, missileAttack, incomingMelee, incomingMissile | same |
| 6-8 | skills.physical, skills.communication, skills.combat | outnumbered, defense, impact |
| 9-15 | skills.craft, skills.religion, skills.magic, skills.psionic, injury, endurance, outnumbered | skills.physical ... skills.psionic (7) |
| 16-17 | defense, impact | injury, endurance |
| 18 | system.resources.fatigue | system.resources.fatigue |

The picker also groups them ("Combat", "Skills - category" (em dash in source), "Penalties / Resources") and uses different, shorter English labels (e.g. effects.mjs:47 `"Endurance (and max Condition)"` vs config.mjs:223 `"Endurance"`). Dynamic entries are generated correctly: attributes from `Object.keys(SCARMARK.attributes)` (effects.mjs:55), skills from `SCARMARK.skillNames` plus actor items (lines 68-71). All 18 static keys also exist in buildMods (base-actor-schema.mjs:121-134) except `system.resources.fatigue`, which is a stored field.

### 6g. Damage aspects list - CONFIRMED as duplication, REFUTED as drift

Reference: `Object.keys(SCARMARK.damageAspects)` = `["blunt","edged","piercing","fire"]` (config.mjs:169-174).

| Copy | Snippet | Set | Order |
|---|---|---|---|
| helpers/combat/constants.mjs:5 | `export const ALL_ASPECTS = ["blunt", "edged", "piercing", "fire"];` | equal | equal |
| data/item-missile.mjs:36 | `required: true, initial: "piercing", choices: ["blunt", "edged", "piercing", "fire"]` | equal | equal |
| data/item-weapon.mjs:53-56 | `impact: new fields.SchemaField({ blunt: ..., edged: ..., piercing: ..., fire: ...` | equal | equal |
| data/item-armor.mjs:37-41 | `protection: new fields.SchemaField({ blunt ... edged ... piercing ... fire` | equal | equal |
| sheets/actor-sheet-base.mjs:290-291 | `b: asp(w.system.impact.blunt), e: asp(w.system.impact.edged),` / `p: ..., f: ...` | equal | equal |
| sheets/actor-sheet-base.mjs:326 | `b: sum("blunt"), e: sum("edged"), p: sum("piercing"), f: sum("fire"),` | equal | equal |
| config.mjs:297-325 | `SCARMARK.injuryTypes = { blunt: {...}, edged: {...}, piercing: {...}, fire: {...} }` | equal | equal |

ALL_ASPECTS consumers: dialogs.mjs:17 (`const keys = weapon ? availableAspects(weapon) : ALL_ASPECTS;`) and lookup.mjs:29 (`availableAspects = (weapon) => ALL_ASPECTS.filter(...)`). dice.mjs:427 already uses `Object.entries(SCARMARK.damageAspects)`. Deriving ALL_ASPECTS and the missile choices from config is order-safe.

### 6h. Combat skill choices - CONFIRMED, weapon ORDER differs

Reference: `Object.keys(SCARMARK.combatSkills)` = `["close","ranged","unarmed","arcane"]` (config.mjs:180-185).

| Field | Snippet | Set vs combatSkills | Order |
|---|---|---|---|
| data/item-weapon.mjs:60-62 associatedSkill | `required: true, initial: "close", choices: ["close", "unarmed", "ranged", "arcane"]` | equal | DIFFERENT (unarmed and ranged swapped) |
| data/item-missile.mjs:39-41 associatedSkill | `required: true, initial: "ranged", choices: ["close", "ranged", "unarmed", "arcane"]` | equal | equal |
| config.mjs:188-191 SCARMARK.weaponSkills | `close: SCARMARK.combatSkills.close,` / `unarmed: SCARMARK.combatSkills.unarmed` | subset (2 of 4) | - |
| config.mjs:194 SCARMARK.missileSkills | `SCARMARK.missileSkills = SCARMARK.combatSkills;` | same object | equal |

Dropdown sources from .mjs:
- Weapon sheet: module/sheets/item-weapon-sheet.mjs:32 `context.weaponSkills = CONFIG.SCARMARK.combatSkills;` - the context key is named weaponSkills but holds all 4 combatSkills in combatSkills order, not SCARMARK.weaponSkills. The schema comment item-weapon.mjs:59 points to SCARMARK.weaponSkills (2 entries) although the schema accepts 4.
- Missile sheet: module/sheets/item-missile-sheet.mjs:33 `context.missileSkills = CONFIG.SCARMARK.missileSkills;` (= combatSkills).
- Unverified: whether templates/item/weapon/properties.hbs and templates/item/missile/properties.hbs actually render these context keys, or render the schema field (e.g. a formField/selectOptions on `associatedSkill` choices, which for the weapon would use the schema order). Templates are missing, so prompt 3c item 2 cannot confirm that reordering the weapon choices is display-safe.

Other combat skill key copies: helpers/combat/constants.mjs:8 `export const IMPACT_SKILLS = new Set(["close", "unarmed"]);` (same pair as weaponSkills, separate rule meaning).

### 6i. Armor-location schema defaults vs canonical Head - CONFIRMED as duplication, REFUTED as drift

module/data/item-armor-location.mjs:26-47: `locationType ... initial: "head"`, `high ... initial: 300`, `medium ... initial: 100`, `low ... initial: 0`, `t1: woundLevel(1), t5: woundLevel(2), t9: woundLevel(3), t13: woundLevel(4), t17: woundLevel(5)`, `fumble/stumble/amputate ... initial: false`.

Canonical head from config.mjs:361 `["head", 100, _UPPER, "core", false, false, false],` through the builder (lines 382-391): high = 100 * 3 = 300, medium = 100, low = 0, injury from `_WOUND_SCALES.core` = `[1, 2, 3, 4, 5]`, risk all false. Every literal matches. The literals are typed by hand; the comment item-armor-location.mjs:15-16 (`Schema initials below mirror the canonical "head"`) is the only link.

### 6j. Strike dice "level === 'cs' ? 3 : 2" - CONFIRMED (5 copies)

module/helpers/combat/outcome.mjs:
- line 15: `out.strikeDice = aLevel === "cs" ? 3 : 2;` (ignore)
- line 31: `out.strikeDice = aLevel === "cs" ? 3 : 2;` (riposte, attacker)
- line 32: `out.defStrikeDice = dLevel === "cs" ? 3 : 2;` (riposte, defender)
- line 38: `out.strikeDice = aLevel === "cs" ? 3 : 2;` (block/dodge/counterstrike, attacker)
- line 40: `out.defStrikeDice = dLevel === "cs" ? 3 : 2;` (counterstrike, defender)

All five are only reached when the level is a success (`isSuccess`), so the effective table is cs -> 3, ms -> 2. A sixth, separate strike-dice literal: clash.mjs:55 `postStrike(striker, victim, "blunt", 0, 2, {` (body-part clash, always 2 dice).

### 6k. Repeated schema fields and calculations - CONFIRMED

Three-attribute / skill-like fields:
- module/data/item-skill.mjs:24-26 `attribute1: new fields.StringField({ required: true, initial: "str", choices: Object.keys(SCARMARK.attributes) }),` (x3, initials str/str/str)
- module/data/item-psionic.mjs:17-19 same definition, initials `"spi"`, `"spi"`, `"wil"`
- sunsignBonuses ArrayField identical: item-skill.mjs:28-34 and item-psionic.mjs:21-27 (`sunsign: new fields.StringField({ required: true, initial: "", blank: true, choices: [...Object.keys(SCARMARK.sunsigns), ""] }),`)
- level / notes / description identical (item-skill.mjs:36-39, item-psionic.mjs:29-34).

Skill categories are listed five times: item-skill.mjs:21 `choices: ["physical", "communication", "combat", "craft", "religion", "magic"]`, base-actor-schema.mjs:132 `skills: { physical: 0, communication: 0, combat: 0, craft: 0, religion: 0, magic: 0, psionic: 0 },`, actor-sheet-base.mjs:135-140 (`{ key: "physical", label: "SCARMARK.Skill.categoryPhysical", ...`), effects.mjs:37-43, config.mjs:215-221 (effectKeys). No config key holds the category list.

Weight/value/quantity/carried/container fields (identical NumberField/BooleanField/StringField definitions):
- item-weapon.mjs:17-22, item-missile.mjs:18-23, item-armor.mjs:18-23 (`quantity: new fields.NumberField({ required: true, integer: true, initial: 1, min: 0 }),` / `weight: new fields.NumberField({ required: true, initial: 0, min: 0 }),` ...)
- item-gear.mjs:12-19 same fields in another order (weight, value, quantity, description, notes, carried, container)
- item-container.mjs:18-23 quantity/weight/value/carried, no `container` field, plus `maxCapacity`.

prepareDerivedData repeated five times, identical: item-weapon.mjs:78-79, item-missile.mjs:75-76, item-armor.mjs:55-56, item-gear.mjs:41-42, item-container.mjs:31-32: `this.totalWeight = this.weight * this.quantity;` / `this.totalValue = this.value * this.quantity;`.

artifact SchemaField identical in item-weapon.mjs:67-71 and item-gear.mjs:29-33 (`class: new fields.NumberField({ required: true, integer: true, initial: 1, min: 1, max: 5 })`).

### 6l. Other duplicated calculations found

- Container content weight: actor-sheet-base.mjs:203-213 `contents.reduce((sum, i) => sum + (i.system.totalWeight ?? 0), 0);` / `overCapacity: contentWeight > c.system.maxCapacity,` and item-container-sheet.mjs:40-41 `context.contentWeight = contents.reduce((sum, i) => sum + (i.system.totalWeight ?? 0), 0);` / `context.overCapacity = context.contentWeight > this.document.system.maxCapacity;`.
- Time unit table: actor-sheet-base.mjs:698 `const UNIT_SECONDS = { seconds: 1, minutes: 60, hours: 3600, days: 86400, weeks: 604800 };` and scarmark.mjs:245 `const SCARMARK_UNIT_SECONDS = { seconds: 1, minutes: 60, hours: 3600, days: 86400, weeks: 604800 };`, both with the same `start + dur.value * UNIT[dur.units]` expiry formula (actor-sheet-base.mjs:715, scarmark.mjs:254).
- Skill and attribute test rolls written twice: dice.mjs:78-86 (skillTest) and dice.mjs:492-500 (rollSkillTest) `const target = capTarget(skill.system.esl + ...modifier);` + same testCard; dice.mjs:44-52 (rollAttributeTest) and dice.mjs:120-128 (attributeTest) `capTarget((attr.effective * multiplier) + modifier)`.
- Attribute x5 tests: forced-tests.mjs:98 `capTarget((victim.system.attributes?.[attrKey]?.effective ?? 0) * 5)` repeats the attribute-test formula with a fixed multiplier.
- Skill lookup by name: lookup.mjs:7-8 findSkillByName and combatant.mjs:12-14 `i.type === "skill" && i.name.toLowerCase() === "initiative"` (same case-insensitive find, written again).
- Location display name: strike.mjs:98, 174, 236 `location.name || game.i18n.localize(SCARMARK.armorLocations[locType]?.label ?? locType)`.
- "No locations" card: strike.mjs:156-159 and 227-230 (`<div class="scarmark-card"><div class="card-line"><i>${L("noLocations")}</i></div></div>`).
- Attack card notes: attack.mjs:66-68 and 166-169 (`aimNote`, `vsNote` with `vsMelee > 0 ? "+" : "&minus;"`).
- Controlled-actor resolution, four variants with different rules: dice.mjs:55 `canvas.tokens?.controlled?.[0]?.actor ?? game.user.character`, dice.mjs:296 `(controlled.length === 1 ? controlled[0].actor : null) ?? game.user.character`, attack.mjs:14 `if (controlled.length !== 1 || !controlled[0].actor) return ...`, artifact-use.mjs:66-68 (`if (controlled.length > 1) throw ...`).
- Arm-chain filter: clash.mjs:52 reads the CANONICAL flag `SCARMARK.armorLocations[SCARMARK.locationKey(loc.system.locationType)]?.risk?.fumble === true` instead of the location item's own editable `loc.system.risk.fumble` - a second source of truth for the same flag.

## 7. Hardcoded rule values outside config

Known candidates (all confirmed at the quoted site):

| Value | File:line | Snippet |
|---|---|---|
| Armor wear chance 0.5 | helpers/combat/strike.mjs:70 | `if (Math.random() >= 0.5) return L("armorSpared");` (>= 0.5 means spared, so wear when < 0.5) |
| Hit-location weighting (Math.random) | helpers/combat/strike.mjs:31 | `let r = Math.random() * total;` (weights split per type count, line 28 `/ (counts[l.system.locationType] || 1)`) |
| High-velocity Dodge /2 | helpers/combat/resolve.mjs:24 | `if (data.velocity === "high") dodge = Math.floor(dodge / 2);` |
| Armor-piercing /2 | helpers/combat/strike.mjs:167 | `if (ap) armorProt = Math.floor(armorProt / 2);` |
| Status penalties | helpers/statuses.mjs:43-45, 53, 61-63, 71, 82 | `...skillPenalty(-20),` / `ch("system.mods.incomingMelee", 20),` / `ch("system.mods.incomingMissile", -20)` (prone), `changes: skillPenalty(-20)` (grappled), `-30`/`30`/`-30` (pinnedDown), `skillPenalty(-30)` (entangled), `ch("system.mods.defense", -30)` (stun) |
| Invocation 5 per circle | helpers/dice.mjs:212, sheets/actor-sheet-base.mjs:249 | `skill.system.esl - circle * 5` / `skill.system.esl - inv.system.circle * 5` |
| Combat constants | helpers/combat/constants.mjs:3-24 | `RANK = { cf: 0, mf: 1, ms: 2, cs: 3 }`, `ALL_ASPECTS`, `IMPACT_SKILLS = new Set(["close", "unarmed"])`, `WQ_BREAK_MARGIN = 4`, `AIM` (`high/low ... penalty: -10`, `disarm ... penalty: -20`), `RANGE_PENALTY = { short: 0, medium: -10, long: -20, extreme: -40 }`, `FATIGUE_ROUND_INTERVAL = 5` |

Further hardcoded rule values found:

| Value | File:line | Snippet |
|---|---|---|
| Outnumbered 20/30 | data/base-actor-schema.mjs:143-144 | `if (n >= 3) return 30;` / `if (n === 2) return 20;` |
| Strike dice cs 3 / ms 2 | helpers/combat/outcome.mjs:15, 31, 32, 38, 40 | `aLevel === "cs" ? 3 : 2` (see 6j) |
| Impact thresholds 1/5/9/13/17 | helpers/combat/strike.mjs:39-43 | `if (effImpact >= 17) return inj.t17 ?? 0;` ... `if (effImpact >= 1) return inj.t1 ?? 0;` (config only names them in a comment, config.mjs:346) |
| Amputation sets WL 5 | helpers/combat/strike.mjs:105 | `finalWL = amputates ? 5 : woundLevel;` |
| Body-part clash strike: 2 dice, impact 0, blunt | helpers/combat/clash.mjs:55 | `postStrike(striker, victim, "blunt", 0, 2, {` |
| WQ test 3d6 | helpers/combat/clash.mjs:18 | `new Roll("3d6").evaluate()` |
| Shield wear -1, floor 1 | helpers/combat/clash.mjs:79 | `const worn = Math.max(1, t.wq - 1);` |
| Range block clash only at impact >= 5 | helpers/combat/resolve.mjs:56 | `(data.impact ?? 0) >= 5` |
| Default riposte/counter aspect | helpers/combat/resolve.mjs:112 | `const a = defParams.aspect \|\| "edged";` |
| Attribute test default multiplier 5 | helpers/dice.mjs:19, 106, 112 | `const defaultMultiplier = 5;` / `name="mult" value="5"` / `Number(b.form.elements.mult.value) \|\| 5` |
| Fumble/Stumble = attribute x5 | helpers/combat/forced-tests.mjs:98 | `?.effective ?? 0) * 5)` |
| Critical = multiple of 5 | helpers/chat.mjs:26 | `const crit = roll % 5 === 0;` |
| Invocation FP cost by outcome | helpers/dice.mjs:216 | `const fp = { cs: 0, ms: circle, mf: 0, cf: circle }[level];` |
| Spell fatigue by outcome | helpers/dice.mjs:251 | `const fatigue = { cs: 0, ms: 0, mf: 1, cf: 2 }[level];` |
| Mend WL delta by outcome | helpers/dice.mjs:402 | `const delta = { cs: -2, ms: -1, mf: 0, cf: 1 }[level];` |
| Shock fallback pct 100 | helpers/dice.mjs:342 | `actor.system.condition?.pct ?? 100` |
| Shock multiplier 2 | helpers/dice.mjs:343, helpers/combat/wounds.mjs:59 | `2 * pct` / `2 * cond.pct` |
| Endurance = (STR+STA+WIL)/3 | data/base-actor-schema.mjs:217 | `Math.round((tired("str") + tired("sta") + tired("wil")) / 3)` |
| Load capacity = STR+STA | data/base-actor-schema.mjs:223 | `const capacityKg = Math.max(0, base("str") + base("sta"));` |
| SB-delta 5 ESL per point | data/base-actor-schema.mjs:298 | `return Math.round((delta / 3) * 5);` |
| Load pct sentinel 999 | data/base-actor-schema.mjs:265 | `Math.round(loadShare * 100) : 999,` |
| Combat round +1 Fatigue, bleeding +1 WL | helpers/combat/round.mjs:42, 47 | `await addFatigue(actor, 1);` / `"system.woundLevel": (i.system.woundLevel ?? 0) + 1` |
| Magic missile shots | sheets/actor-sheet-base.mjs:301 | `Math.floor((... spiritCapacity ?? 0) / Math.max(1, m.system.spellClass ?? 1))` |
| Armor layer range 0-5 | data/item-armor.mjs:34, sheets/item-armor-sheet.mjs:37 | `initial: 1, min: 0, max: 5` / `[0, 1, 2, 3, 4, 5].map(v => ...)` |
| Weapon/missile DUR initial 10, max 16 | data/item-weapon.mjs:30, data/item-missile.mjs:25 | `initial: 10, min: 0, max: 16` |
| Artifact class 1-5 | data/item-weapon.mjs:70, data/item-gear.mjs:32, helpers/artifact-use.mjs:40 | `min: 1, max: 5` / `cost < 1 \|\| cost > 5` |
| Spell level 1-6, spell class 1-6, circle 1-5 | data/item-spell.mjs:17, data/item-missile.mjs:66, data/item-invocation.mjs:16 | `min: 1, max: 6` / `min: 1, max: 6` / `min: 1, max: 5` |
| Wound level 0-5 on locations | data/item-armor-location.mjs:4 | `initial, min: 0, max: 5` (config has SCARMARK.woundLevels) |
| Attribute base initial 8 | data/base-actor-schema.mjs:13 | `initial: 8, min: 0` |
| Condition field initial 100 | data/base-actor-schema.mjs:29-30 | `initial: 100, min: 0` / `initial: 100, min: 1` |
| Effect priority default 50 | data/base-actor-schema.mjs:166 | `priority: change.priority ?? 50` (Foundry default, not a game rule) |
| Name-based rules | helpers/combat/resolve.mjs:23, 78; sheets/actor-sheet-base.mjs:270; helpers/combat/combatant.mjs:13 | `findSkillByName(target, "Dodge")` / `i.name.toLowerCase() === "initiative"` |

Not rule values (UI only, listed for completeness): dialog `step="5"` in forced-tests.mjs:41 and dice.mjs:314; display rounding actor-sheet-base.mjs:277 `Math.round(system.load.kg * 10) / 10`.

## 8. Foundry calls inside module/config.mjs

Search: `grep -n -E 'game\.|CONFIG\.|foundry\.|ui\.|canvas|Hooks' module/config.mjs` - one hit.

- module/config.mjs:43-46 SCARMARK.weightUnitsPerKg: `try { return game.settings.get(SYSTEM_ID, SETTINGS.metricUnits) ? 1 : 2; }` / `catch { return 2; }`. Any exception (setting not registered yet, no `game`, e.g. in Node tests) silently returns 2 (legacy half-kg units).

Consumers:
- module/data/base-actor-schema.mjs:221 `const unitsPerKg = SCARMARK.weightUnitsPerKg();` inside applyDerivedCombat, used for `loadKg` (line 222) and `system.gearSummary = { ...gear, capacity: capacityKg * unitsPerKg, endurance };` (line 282).
- Indirectly: every actor prepareDerivedData that calls applyDerivedCombat: actor-character.mjs:52, actor-creature.mjs:42, actor-npc.mjs:42, and actor-animal.mjs (`extends ScarmarkCreatureData {}`).
- Exposed publicly through `game.scarmark.config` and `CONFIG.SCARMARK` (scarmark.mjs:47-48), so macros could call it; the exported compendiums (macros included) contain no reference (grep). Templates could not be checked (and cannot call it directly).
- scarmark.mjs:53 mentions it in a comment only.

All other function members of SCARMARK (vitalWoundFor, spellLevelPenalty, rangedBlockShields, mendLabel, severityKey, injuryFor, locationKey, covers, stunProtectionBonus) are pure. config.mjs imports only module/constants.mjs (line 1), which has no Foundry calls.

## 9. HTML escaping

### Escape helpers

| Helper | File:line | Snippet | Notes |
|---|---|---|---|
| esc (local) | module/scarmark.mjs:293 | `const esc = (s) => Handlebars.escapeExpression(s);` | effect key picker |
| esc (local) | module/helpers/combat/wounds.mjs:36 | `const esc = (t) => Handlebars.escapeExpression(t);` | Condition cards |
| esc (local) | module/helpers/combat/round.mjs:54 | `const esc = (t) => Handlebars.escapeExpression(t);` | fatigue round card |
| escape (local) | module/helpers/artifact-use.mjs:7-9 | `const escape = value => String(value).replace(/[&<>"']/g, c => ({` | own map: & < > " '. Handlebars.escapeExpression also escapes backtick and =, and returns "" for null/undefined, while this one turns null into "null" |
| attrEscape (local) | module/helpers/combat/card-buttons.mjs:24 | `const attrEscape = (s) => s.replace(/&/g, "&amp;").replace(/'/g, "&#39;");` | only for the single-quoted JSON attribute |
| inline | dice.mjs:67, 161, 303; dialogs.mjs:11, 46, 72; actor-sheet-base.mjs:651, 851 | `Handlebars.escapeExpression(s.name)` etc. | option labels, post-esoteric name |

### Shared builders that insert arguments raw

- helpers/chat.mjs:38-49 testBlock: `<div class="card-title">${title}</div>`, `${target}`, `${roll}`, `<div class="test-outcome ${outClass}">${outLabel}</div>` - title, target, roll, label and cls all raw.
- helpers/chat.mjs:52-54 testCard: `<div class="scarmark-card test-card">${testBlock(args)}</div>` - raw via testBlock.
- helpers/combat/card-buttons.mjs:27-29 cardButton: payload is attribute-escaped, `label` raw: `'>${label}</button>`. All current callers pass localized labels (strike.mjs:133, 139, 144; wounds.mjs:60).
- game.i18n.format does not escape its data; results are inserted as HTML at the sites below.

### Build sites and user/document values

Escaped = yes / NO.

| File:line | Context | Value from document/user | Escaped |
|---|---|---|---|
| helpers/dice.mjs:22-31 | attribute test dialog | none (localized labels, numbers) | n/a |
| helpers/dice.mjs:50 | attribute test card title | none (localized attribute label) | n/a |
| helpers/dice.mjs:67 | skill test dialog options | `s.name` | yes |
| helpers/dice.mjs:84 | skill test card | `title: \`${skill.name} ${...}\`` | NO |
| helpers/dice.mjs:101 | attribute test dialog options | none (localized) | n/a |
| helpers/dice.mjs:161 | esoteric skill picker | `s.name` | yes |
| helpers/dice.mjs:174 | esoteric roll card (postEsotericRoll) | title = `inv.name` / `spell.name` / `psi.name` (callers dice.mjs:224, 258, 285) | NO |
| helpers/dice.mjs:206 | invocation "not enough FP" dialog | `skill: skill.name` via format into `<p>` | NO |
| helpers/dice.mjs:222 | invocation piety line | `(${skill.name}: ${newFp})` | NO |
| helpers/dice.mjs:254 | spell capacity line | `paid.label` (static English), numbers | n/a |
| helpers/dice.mjs:282-283 | psionic misfire line | `psi.system.misfire` through enrichHTML (HTMLField, rich text by design) | intentionally HTML |
| helpers/dice.mjs:303 | psionic picker options | `p.name` | yes |
| helpers/dice.mjs:351 | shock card title | `${actor.name}` | NO |
| helpers/dice.mjs:387, 417 | mend dialog window title and mend card title | `injury.name` | NO (card); window title (see note) |
| helpers/dice.mjs:428-465 | other damage dialog/flavor | none (localized aspect labels) | n/a |
| helpers/dice.mjs:477, 498 | rollSkillTest window title and card title | `skill.name` | NO (card); window title (see note) |
| helpers/combat/attack.mjs:70 | attack card attribute | `data-combat='${JSON.stringify(data)}'` - uuids, ids, aspect/aim keys (form values), numbers; no names | NOT attribute-escaped (unlike cardButton) |
| helpers/combat/attack.mjs:71 | melee attack card title | `${actor.name} &rarr; ${targetActor.name}` | NO |
| helpers/combat/attack.mjs:72 | melee attack card line | `${weapon.name}` | NO |
| helpers/combat/attack.mjs:144 | magic missile payment line | `${missile.name}: ${paid.label}` | NO |
| helpers/combat/attack.mjs:171-173 | range attack card | `actor.name`, `targetActor.name`, `missile.name` | NO |
| helpers/combat/dialogs.mjs:11, 46, 72 | weapon/missile options | `w.name` / `m.name` | yes |
| helpers/combat/dialogs.mjs:19, 38 | aspect/aim options | none (localized) | n/a |
| helpers/combat/resolve.mjs:38, 90 | result card attacker block | `title: attacker.name` | NO |
| helpers/combat/resolve.mjs:41, 93 | result card ignore block | `${target.name}` | NO |
| helpers/combat/resolve.mjs:42, 94 | result card defense block | `title: \`${target.name} (${L(defense)})\`` | NO |
| helpers/combat/outcome.mjs:75, 79 | opportunity lines | `${attacker.name}` / `${target.name}` | NO |
| helpers/combat/outcome.mjs:90 | riposte tie line | numbers only | n/a |
| helpers/combat/strike.mjs:76 | armor wear line (format) | `name: piece.name` | NO |
| helpers/combat/strike.mjs:104, 116 | wound line | `injName` = `Severed ${locName}` / `${locName} ${entry.name}` (locName = `location.name`) | NO |
| helpers/combat/strike.mjs:128 | strike card title | `title` = `${attacker.name} &rarr; ${target.name}` (line 183) or `${L("injuryTitle")} &rarr; ${actor.name}` (line 242) | NO |
| helpers/combat/strike.mjs:129 | strike card detail | `detail` containing `@ ${locName}` (lines 178, 237) | NO |
| helpers/combat/strike.mjs:133 | Add Wound button payload | woundData (names, notes) as JSON | yes (attrEscape) |
| helpers/combat/clash.mjs:48 | paw strike line (format) | `name: victim.name` | NO |
| helpers/combat/clash.mjs:70, 73, 81, 83 | WQ lines (format) | `name: p.weapon.name` | NO |
| helpers/combat/clash.mjs:88 | broken weapon opportunity (format) | `name: who.name` | NO |
| helpers/combat/forced-tests.mjs:40 | stun dialog window title | `victim.name` | window title (see note) |
| helpers/combat/forced-tests.mjs:77 | stun card title | `${L("stunTest")} - ${victim.name}` (em dash in source) | NO |
| helpers/combat/forced-tests.mjs:110 | fumble/stumble card title | `${victim.name}` | NO |
| helpers/combat/wounds.mjs:52-53, 58 | Condition 0 / shock request cards | `esc(actor.name)` | yes |
| helpers/combat/wounds.mjs:15 | notification | `${woundData.name}`, `target.name` | notification (see note) |
| helpers/combat/round.mjs:59-60 | fatigue round card | `names.map(esc)`, `bled.map(esc)` | yes |
| helpers/artifact-use.mjs:55 | spend capacity confirm | `escape(actor.name)` | yes |
| helpers/artifact-use.mjs:101, 105, 119 | artifact dialog/card | `escape(item.id)`, `escape(item.name)`, `escape(actor.name)` | yes |
| helpers/artifact-use.mjs:128, 143 | recharge dialog/card | `escape(actor.name)`, static labels | yes |
| sheets/actor-sheet-base.mjs:407-408 | delete transferred effect confirm | window title `effect.name`; content `game.i18n.format("SCARMARK.Effect.deleteFromItem", { effect: effect.name, item: effect.parent.name })` (lang string wraps them in `<b>`) | NO |
| sheets/actor-sheet-base.mjs:651 | store-in-container options | `c.name` | yes |
| sheets/actor-sheet-base.mjs:855-856 | post esoteric description | `name` = escaped item.name; `desc` = enrichHTML(description) | yes / intentionally HTML |
| module/scarmark.mjs:294-304 | effect key picker | `esc(g.label)`, `esc(key)`, `esc(label)` (skill names from compendium and actor) | yes |

Note on window titles and notifications: DialogV2 `window.title` and `ui.notifications.*` messages are rendered by Foundry core, not by this code; whether core escapes them was not verified in this snapshot (they are not inserted into chat/dialog HTML by Scarmark).

Values stored, not rendered here: strike.mjs:114 `notes: \`Aspect: ${...}\`` becomes injury notes (StringField) shown by templates (not available).

## 10. Hardcoded English UI text not going through game.i18n

| File:line | Snippet | Where shown |
|---|---|---|
| module/config.mjs:210-227 | `"system.mods.meleeAttack": "Melee Attack (all melee ASL)",` ... | SCARMARK.effectKeys labels (no runtime consumer, see 6f) |
| module/helpers/effects.mjs:26-49 | `{ label: "Combat", options: [` / `["system.mods.meleeAttack", "Melee Attack"],` / `{ label: "Penalties / Resources", options: [` | effect key picker groups and options |
| module/helpers/effects.mjs:54, 74 | `label: "Attributes",` / `label: "Individual skills (Add = bonus, Override = set ESL)",` | effect key picker groups |
| module/scarmark.mjs:304 | `<option value="">&mdash; pick a key &mdash;</option>` | effect key picker placeholder |
| module/helpers/artifact-use.mjs:4-5 | `label: "Will Capacity"` / `label: "Spirit Capacity"` | dialogs, chat, also returned as `paid.label` and shown by dice.mjs:254 and attack.mjs:144 |
| module/helpers/artifact-use.mjs:16, 40, 67, 69, 70, 71, 81, 98, 112, 115, 133, 134 | `"Select exactly one token."`, `"Set the item's Class to an integer from 1 to 5."`, `"No carried, attuned artifacts or runes are available."`, `` `Not enough ${pools[pool].label}: ...` `` ... | notifications/errors |
| module/helpers/artifact-use.mjs:55 | `this needs ${cost}. Go ahead anyway (${label} drops to 0)?` | confirm dialog |
| module/helpers/artifact-use.mjs:101, 104-106 | `Class ${cost}, ${cost} ${pools[pool].label}` (preceded by an em dash in source), `title: "Artifact/Rune Use"`, `<label>Artifact / Rune</label>`, `label: "OK"` | dialog |
| module/helpers/artifact-use.mjs:119 | `<strong>Artifact/Rune Use: ${escape(item.name)}</strong><p>Class ${cost}; ...` | chat card |
| module/helpers/artifact-use.mjs:127-129, 143 | `title: "Recharge"`, `Will Capacity is restored after eight hours of rest. ...`, `<option value="will">Recharge Will</option>` ..., `label: "OK"`, `<strong>Recharge</strong>` | dialog and chat card |
| module/helpers/combat/strike.mjs:104 | `` `Severed ${locName}` `` | injury name and strike card |
| module/helpers/combat/strike.mjs:114 | `` notes: `Aspect: ${...}${amputates ? " (Amputation)" : ""}` `` | stored injury notes |
| module/helpers/combat/strike.mjs:116 | `&middot; WL ${woundData.woundLevel}` | strike card ("WL" abbreviation) |
| module/helpers/combat/round.mjs:48 | `` `${actor.name} (+${bleeding.length} WL)` `` | fatigue round card |
| module/helpers/dice.mjs:161, 303 | `(ESL ${s.system.esl})` | picker options |
| module/helpers/dice.mjs:411 | `` resultText = `WL ${oldWL} ... ${newWL}`; `` | mend card |
| module/config.mjs:269 | `SCARMARK.mendLabel = (n) => (Number(n) > 0 ? String(n) : "MRN");` | injury sheet/list |
| module/sheets/actor-sheet-base.mjs:277 | `` `${...} / ${system.load.capacity} kg (${system.load.pct} %)` `` | combat tab load ("kg") |
| module/sheets/actor-sheet-base.mjs:743 | `` ui.notifications.error(`Consume failed: ${err.message}`); `` | notification |
| module/helpers/actor-setup.mjs:13-29 | `["Head", "head"], ["Neck", "neck"],` / `["Right Shoulder", "shoulder"]` ... | default armor location item names created on new actors |

Related name-matching that assumes English data (risk if the UI or data is localized): lookup.mjs:14 `findSkillByName(actor, game.i18n.localize(label))` matches a skill item name against the localized combat skill label (en.json:371 `"close": "Close Combat"`); resolve.mjs:23, 78 and actor-sheet-base.mjs:270 `"Dodge"`; combatant.mjs:13 `"initiative"`; config.mjs:250-251 shield names `["Round Shield", "Kite Shield", "Heater Shield", "Pavise"]` / `"Buckler"`; actor-setup.mjs:78-97 base skill names.

## Summary

| Finding | Severity | Prompt |
|---|---|---|
| 4: templates missing - template numbers, weaponSkills/traitCategories template use and dropdown sources unverified | risk | none |
| 4: SCARMARK.weaponSkills and SCARMARK.traitCategories have no .mjs consumer (removal candidates, keep as public API) | risk | 3c |
| 4: trait categories hardcoded in item-trait.mjs:14 and actor-sheet-base.mjs:183-184 instead of SCARMARK.traitCategories | duplication | none |
| 5: armor-locations export matches config exactly; 4 duplicate document names across two folders | risk | none |
| 6a: Skill Base duplicated in item-skill / item-psionic (identical) | duplication | 4a |
| 6a/6k: identical migrateData in skill and psionic | duplication | 4a |
| 6b: invocation target duplicated; sheet uncapped vs roll capped at 95 | duplication | 4b |
| 6b: spell target `max(0, esl - penalty)` duplicated with same cap difference | duplication | 4b |
| 6c: shock target duplicated (numerically identical; capTarget = min only) | duplication | 4b |
| 6c: stale comments chat.mjs:18 and config.mjs:111 say Shock does not use capTarget | risk | none |
| 6d: worn-armor protection sum duplicated in armor.mjs and actor sheet; sheet hardcodes 4 aspects | duplication | 4c |
| 6d: worn+covers filter repeated in headArmorLayer and wearArmor | duplication | 4c |
| 6e: outnumbered 20/30 in function, hand-written in two labels | duplication | 3b, 3c, 4d2 |
| 6f: effect picker static options hand-written; same 18 keys as SCARMARK.effectKeys, different order and labels; effectKeys unused; effects.mjs:19 comment wrong | duplication | 3c |
| 6g: damage aspect list copied (ALL_ASPECTS, missile choices, schema fields, sheet); all equal incl. order | duplication | 3c |
| 6h: weapon associatedSkill choices order differs from combatSkills (same set); template use unverified | risk | 3c |
| 6h: weapon schema comment points to SCARMARK.weaponSkills (2 skills) but schema/sheet allow 4 | risk | 3c |
| 6i: armor-location schema defaults hand-typed, equal to canonical Head | duplication | 3c |
| 6j: strike dice `cs ? 3 : 2` repeated 5 times | duplication | 4e |
| 6k: three-attribute fields and sunsignBonuses repeated in skill/psionic schemas | duplication | 4a |
| 6k: skill category list repeated 5 times | duplication | none |
| 6k: quantity/weight/value/carried/container fields and totalWeight/totalValue repeated in 5 item types | duplication | none |
| 6l: container content weight, UNIT_SECONDS, skill/attribute test rolls, location name, no-location card, attack notes, controlled-actor lookup duplicated | duplication | none |
| 6l: clash arm chain reads canonical risk.fumble, not the location item's own flag | risk | none |
| 7: armor wear 0.5 with Math.random | hardcoded value | 3b, 4e, 5c |
| 7: hit-location Math.random weighting | hardcoded value | 4e, 5c |
| 7: high-velocity Dodge /2 | hardcoded value | 3b, 4e |
| 7: armor-piercing /2 | hardcoded value | 3b, 4e |
| 7: status penalties -20/-30 (prone, grappled, pinnedDown, entangled, stun) | hardcoded value | 3b, 3c |
| 7: invocation 5 per circle | hardcoded value | 3b |
| 7: combat constants (RANK, AIM, RANGE_PENALTY, WQ_BREAK_MARGIN, FATIGUE_ROUND_INTERVAL, IMPACT_SKILLS) | hardcoded value | 3a |
| 7: outnumbered 20/30 | hardcoded value | 3b |
| 7: impact thresholds 1/5/9/13/17 in strike.mjs | hardcoded value | 3b, 4e |
| 7: amputation WL 5 | hardcoded value | 3b |
| 7: body-part clash strike (2 dice, impact 0), WQ 3d6, shield wear floor 1, range block clash impact >= 5 | hardcoded value | 3b |
| 7: attribute test multiplier 5 (3 sites) and fumble/stumble x5 | hardcoded value | 3b |
| 7: outcome tables (invocation FP, spell fatigue, mend WL delta) | hardcoded value | 3b |
| 7: shock multiplier 2 and fallback pct 100 | hardcoded value | 3b |
| 7: combat round +1 fatigue and +1 WL bleeding | hardcoded value | 3b |
| 7: Endurance /3, load capacity STR+STA, SB-delta 5 per point | hardcoded value | 3b |
| 7: critical = multiple of 5 in outcomeLevel | hardcoded value | 4b |
| 7: schema limits (DUR 10/16, layer 0-5, class 1-5, level/spellClass 1-6, circle 1-5, WL 0-5, attribute 8) | hardcoded value | none |
| 7: name-based rules ("Dodge", "initiative", shield names) | risk | none |
| 8: weightUnitsPerKg calls game.settings inside config; catch-all returns 2 | risk | 3b, 4d1 |
| 9: names inserted raw into chat cards and dialogs (dice, attack, resolve, outcome, strike, clash, forced-tests, actor sheet effect confirm) | bug | 5b |
| 9: four local escape helpers (scarmark.mjs, wounds.mjs, round.mjs, artifact-use.mjs) with differing behavior | duplication | 5b |
| 9: attack.mjs data-combat JSON attribute not attribute-escaped | risk | 5b |
| 10: effect picker labels and placeholder in English | hardcoded value | 3c |
| 10: artifact-use dialogs, cards, notifications in English | hardcoded value | none |
| 10: strike "Severed", "Aspect:", "(Amputation)", "WL", "ESL", "MRN", "kg", "Consume failed", default location names | hardcoded value | none |
