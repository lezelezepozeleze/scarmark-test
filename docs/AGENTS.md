# Instructions for AI coding assistants

Read this file before changing anything. Follow it exactly. Other docs: README.md (overview, documentation index, development commands), docs/RULES_INDEX.md (where each mechanic lives), docs/SMOKE_TEST.md (manual checks in Foundry), docs/OPEN-FINDINGS.md (what is still open), tests/golden/README.md (the golden fixtures: committed, local, capture, import), docs/archive/ (old audits, history only), CHANGELOG.md (what changed per version).

## Repository map

| Path | What |
|---|---|
| system.json | manifest: version, packs, languages, the `styles` list (its order is the CSS cascade) |
| module/scarmark.mjs | entry: calls the register functions of foundry/ and helpers/ in order |
| module/config/, rules/, view/ | pure: rule values, calculations, view models (lint-enforced, see below); view/ holds actor-view.mjs, effects-view.mjs, inventory-view.mjs, esoterics-stats.mjs, armor-coverage.mjs, item-tooltip.mjs, format.mjs |
| module/data/ | data models (schemas, shared-fields.mjs, migrations.mjs, derived stats via rules/) |
| module/helpers/ | workflows: rolls (dice/: shared.mjs, tests.mjs, esoterics.mjs, wounds.mjs), combat (combat/), modifier-prompt.mjs (the Modifier field of the roll dialogs), esoteric-card.mjs, consume.mjs, item-actions.mjs (the actions of items: effects, tests, alterations, messages) with action-tests.mjs, effect-library.mjs, inventory.mjs, chat.mjs |
| module/sheets/ | ApplicationV2 sheets: actor-sheet-base.mjs with actor-context.mjs (template context), actor-listeners.mjs (DOM listeners) and effect-menu.mjs (the effect Add menu); item-sheet-base.mjs with item-layout.mjs (tabs and parts) and item-esoteric-sheet.mjs; actions/ holds the data-action handlers and action-panel.mjs (the reusable Actions panel, see its header); a11y.mjs makes labels and action links accessible |
| module/foundry/ | lifecycle: settings, document registration, effect expiry, effect key picker, hooks |
| templates/, css/, lang/ | Handlebars (templates/actor/parts and partials, templates/item/<type> and partials, templates/dialogs), stylesheets (see css/README.md), en.json and cs.json (a partial fallback, see below) |
| packs/ | compendiums (LevelDB; read them with a LevelDB reader, not as text; see Packs below) |
| scripts/imports/, scripts/macros/ | scripts/imports/ holds the migration macros that are still needed (migrate-armor-coverage.js, migrate-armor-conditions.js, migrate-toxicity.js, migrate-consumable-actions.js; Report only / Apply); finished import macros live in git history. scripts/macros/ holds the world macros. scripts/ is not linted |
| tests/ | `npm test` (unit, schema, render, golden), `npm run golden`, `npm run lint`, `npm run check:cycles`; tests/tools/ holds the snapshot capture and maintainer tools, tests/support/ the Foundry stub |

## Folder ownership

- module/config/ - authoritative game-rule VALUES. Pure data. No Foundry globals.
- module/rules/ - authoritative CALCULATIONS. Pure functions: inputs in, result out. No Foundry globals, no Math.random (random numbers are parameters), no document reads or writes.
- module/data/ - Foundry data models: schemas and preparation. Call rules for calculations.
- module/helpers/ - workflows: rolls, dialogs, document updates, chat. Call rules for calculations.
- module/sheets/ and templates/ - display only. Never compute a game value. Get values from data models or rules. Markup that repeats goes into a partial in templates/actor/partials/, listed for its part in module/sheets/sheet-layout.mjs (PART_PARTIALS) so Foundry loads it before the part renders; sheets build their TABS and PARTS with tabsConfig and partsConfig from the same file. Item sheets do the same with templates/item/partials/ through module/sheets/item-layout.mjs (itemPartials, itemSheetParts).
- module/foundry/ - Foundry lifecycle: init, hooks, settings.
- module/view/ - pure view models and formatting for the sheets (no Foundry globals); the sheets and templates read what it builds.
- module/constants.mjs - persisted identifiers only.

Current state: module/config/ holds the rule values (see module/config/README.md), module/rules/ the pure calculations (see module/rules/index.mjs), module/view/ the pure view models and number formatting, and module/foundry/ the lifecycle (settings, document registration, effect expiry, the effect key picker, actor hooks); module/scarmark.mjs only calls them in order and module/config.mjs only assembles CONFIG.SCARMARK. Rule numbers that are still literals outside module/config/ (rules/ and data/ hold none) are marked "hardcoded" in their row of docs/RULES_INDEX.md and listed in its last section, "Literals outside config"; when you move one into config/, remove it there. docs/RULES_INDEX.md says where each mechanic lives now.

Lint (eslint.config.mjs) enforces the module/rules/**, module/config/** and module/view/** boundaries: no Foundry globals (game, foundry, ui, canvas, CONFIG, Hooks, Roll, ChatMessage, Actor, Item, ActiveEffect, fromUuid, fromUuidSync, Handlebars), no Math.random, no imports from ../data/, ../helpers/, ../sheets/, ../foundry/. Do not weaken or disable these rules. `npm run lint` covers only module/ and tests/; scripts/ is not linted.

## Before any mechanic change

1. Read docs/RULES_INDEX.md.
2. Find the authoritative function for the mechanic.
3. Check all consumers, including sheets and templates.
4. Preserve behavior unless the task explicitly asks to change it. Same inputs must give the same numbers, chat output and sheet display.

## Rules

- Never duplicate a formula or a rule value. Search for an existing implementation and reuse it.
- Never hardcode a rule number outside module/config/.
- Never rename or remove anything in the persisted contract below. Adding new keys is allowed only when the task says so.
- Update docs/RULES_INDEX.md in the same change as any move or new mechanic.
- Update the persisted contract below in the same change as any addition to it.
- Text that a player reads goes in lang/en.json (the Czech original, where there is one, in lang/cs.json); tests/lang.test.mjs fails on a key that is used and missing, or present and unused. Stored data (the names and notes written onto injury items by a strike) stays as it is.
- Lint treats an undefined name as an error, so a forgotten import fails npm run lint and not Foundry.
- Escape every document or user string (names, notes) with `esc()` from module/helpers/escape.mjs before it goes into HTML (chat cards, dialog content). Never add another local escape helper. Do not escape text that is stored in a document.
- Do not add runtime dependencies.
- Do not create an import cycle (npm run check:cycles).

## Tests

- "npm test" (includes tests/schema.test.mjs: every data model must build the same schema as tests/schema/schemas.json), "npm run lint" and "npm run golden" must pass before you finish. Never regenerate tests/schema/schemas.json (npm run schema:capture) to make a failing comparison pass; only a deliberate, approved schema addition may change it. Lint warnings that already exist are fine; errors are not.
- tests/render.test.mjs renders every part of the actor sheets and compares the HTML with tests/render/snapshots. A change to a template or partial must leave that HTML the same. Never regenerate the snapshots (npm run render:capture) to make a failing comparison pass; only a deliberate, approved markup change may.
- Never edit the "expected" or "input" values in tests/golden/*.json. If a golden comparison fails, stop and report the mismatch. Only tests/golden/adapters.mjs may change, to point at moved code.
- docs/SMOKE_TEST.md is the manual check in Foundry for what Node tests cannot cover.
- Run one test file: `node --import ./tests/support/foundry-stub.mjs --test tests/helper-rules.test.mjs` (the stub provides the Foundry globals the modules need; the same flag runs any tests/*.test.mjs). `npm run golden` runs the golden fixtures alone; see tests/golden/README.md for capture, the local real-data sets and the sample selection.
- tests/tools/mutation-check.mjs, select-compendium-sample.mjs and import-compendium-fixtures.mjs are maintainer-only tools. They need the gitignored tests/golden/local/ (the full real-data set from a Foundry compendium export) and are not part of npm test. The mutation list is partly stale (docs/OPEN-FINDINGS.md).

## Glossary

Abbreviations used in code, comments and docs:

- WQ, DUR, AQ: the same thing, the Durability of a weapon, missile or armor piece (Weapon Quality, Durability, formerly Armor Quality). The stored field is always `quality`. Armor also has `originalQuality` (the durability it started with) and a `condition` per coverage entry (the condition of the piece at that location); the armor `quality` is derived from the conditions (their rounded average), not edited. Use "Durability" in new text.
- SL: the stored skill level. ESL: Effective Skill Level, the SL plus the Zodiac Sign bonus, mods and the Skill Base delta (rules/derived.mjs skillEslOf). ASL and DSL: Attack and Defense Skill Level of a weapon (helpers/combat/lookup.mjs weaponAsl, weaponDsl, missileAsl).
- SB: Skill Base, the rounded average of the three attribute bases a skill is built on (rules/derived.mjs skillBase); the SB delta is the change of those attributes caused by effects and penalties.
- WL: Wound Level, per injury and as a total (system.wl).
- cs, ms, mf, cf: the four d100 outcome levels from rules/d100.mjs outcomeLevel: critical success, (ordinary) success, (ordinary) failure, critical failure; a roll that is a multiple of 5 is critical. The sheet labels say "Success" and "Failure" for ms and mf.
- Opportunity: the opening a good result gives one side for an extra Long Action (the result card lines in helpers/combat/result-lines.mjs).

## Release

1. Pick the version `X.Y.Z` and bump it in system.json `version` (`X.Y.Z-beta` while it is a pre-release), package.json `version` and both `version` fields at the top of package-lock.json (those two carry `X.Y.Z` without the suffix). docs/SMOKE_TEST.md has no version to change.
2. Add a CHANGELOG.md section `## X.Y.Z-beta - YYYY-MM-DD` at the top (older headings use an em dash; leave them).
3. Run npm test, npm run lint and npm run check:cycles.
4. The `-beta` suffix means a pre-release for testing; drop it only when the owner says the version is stable.
5. system.json `download` points to the branch zip of main, not to a release zip, so Foundry cannot install the system from the manifest alone (docs/OPEN-FINDINGS.md). Until a release zip is published there, install through a symlink or a manual copy. The repo has no CI workflow.

## Packs

packs/ holds LevelDB compendiums, stored byte-for-byte (.gitattributes marks the data files binary). Edit them in Foundry: unlock the compendium, change the documents, lock it again, then close the world so Foundry writes the files, and commit the changed files of packs/<name>/ (the .log, .ldb, CURRENT and MANIFEST-* files hold the data and stay tracked; LOCK, LOG and LOG.old are gitignored and rewritten whenever Foundry opens the world). Never edit the files as text. To read a pack in a script use a LevelDB reader or a Foundry compendium export (tests/golden/README.md describes the export used for the local fixtures). The pack ids are declared in system.json; the pack "poisonings" lives in packs/poisons.

## Fork identity, compatibility, translations

- This repository is the test fork `scarmark-test` (system id and title "scarmark-test"); upstream Ermine09/Scarmark uses the id "scarmark". Everything derived from SYSTEM_ID follows the fork id (see the persisted contract).
- Foundry compatibility: minimum 14, verified 14.369 (system.json `compatibility`).
- lang/cs.json is a partial fallback with about 33 keys against about 670 in lang/en.json; Foundry shows English for a missing Czech key. Add every new text to en.json first.

## Report format

End every change with: what changed, where (files, commits), how it was verified (commands run and their results).

## Persisted contract (never rename or remove)

This is the single maintained copy of this list (first written from docs/archive/AUDIT.md sections 2-3). Saved worlds, modules and macros depend on every entry.

Templates: templates/ and packs/ are in the repo. Templates only display values, but they read context keys, field paths and helper names from this contract. Check templates/ before touching anything a template could read.

### game.scarmark members

module/scarmark.mjs (init hook): config (the SCARMARK object), artifactRuneUse, rechargeCapacity, initiateAttack, declareMeleeAttack, initiateRangeAttack, declareRangeAttack, initiatePsionicTalent, skillTest, attributeTest, stunTest (rollStunTest), defaultArmorLocationItems.

### CONFIG.SCARMARK / SCARMARK keys

CONFIG.SCARMARK and game.scarmark.config are the same object. Keys, values and function results must stay the same:

- attributes (str, sta, dex, agl, wil, per, pre, int, spi with label and row), characterOnlyAttributes (["pre"]), characterAttributeKeys, creatureAttributeKeys, legacyAttributeMap (eye/hrg/sml -> per, voi/com -> pre, aur -> spi)
- weightUnitsPerKg() (1 when metricUnits is true, else 2)
- FATIGUE_STEP (2), LOAD_STEP (0.2), LOAD_MAX_STEPS (5), LOAD_MAX_FACTOR (2), WOUND_ATTRIBUTES (["dex", "agl"]), CONDITION_BANDS, SHOCK_THRESHOLD (0.25)
- vitalWounds (head/neck/chest/belly: {4: "out", 5: "dying"}), vitalWoundFor(), vitalStates
- personalities (lawAbiding, practical, opportunistic, corruptible, vicious)
- skillCategories (physical, communication, combat, craft, religion, magic; added by refactor 6k, additive)
- ESL_CAP (95), spellLevelPenalty() ((level - 1) * 5)
- sunsigns (12), months (12, with sunsign), traitCategories (physical, psyche)
- damageAspects (blunt, edged, piercing, fire), combatSkills (close, ranged, unarmed, arcane), weaponSkills (close, unarmed), missileSkills (= combatSkills)
- effectKeys, missileVelocities (low, high), rangedBlockShields()
- woundLevels ([0..5]), mendRateMax (6), mendRates ([0..6]), mendLabel() ("MRN" for 0)
- injurySeverities (light, heavy, severe, dire, mortal), severityKey(), injuryTypes (aspect x Wound Level 1-5: name, heavyBleeding, amputation), injuryFor()
- armorLocations (19 canonical types: aim weights, injury thresholds, risk flags), legacyLocationMap, locationKey(), covers()
- fumbleTestLocations ({hand: 1, arm: 3}), stumbleTestLocations ({thigh: 1, shin: 1})
- STUN_WOUND_LEVELS ([2, 3]), STUN_TARGET (50), stunProtectionBonus() (layer >= 5: 20, >= 2: 10, else 0), STUNNED_DURATION ({value: 1, units: "rounds", expiry: "turnStart"})
- armorPiercingNames (/bodkin/i)

### Identifiers (module/constants.mjs)

- SYSTEM_ID: "scarmark-test" (this repository is the test fork with its own system id and title "scarmark-test"; upstream Ermine09/Scarmark uses "scarmark". Everything below that is derived from SYSTEM_ID follows it: flags scope, pack ids, query id, settings scope, sheet registration scope, template paths systems/scarmark-test/...)
- FLAGS: scope "scarmark-test"; shockGrit "shockGrit" (actor), lastFatigueRound "lastFatigueRound" (combat), expireWorldTime "expireWorldTime", maneuver "maneuver" (chat message: {maneuver, actorUuid, targetUuid}; cards of the old world macro carry flags.world.smManeuver and still work)
- SETTINGS: metricUnits "metricUnits" (world, config false, Boolean, default false)
- PACKS: skills "scarmark-test.skills"
- QUERIES: updateCombatItem "scarmark-test.updateCombatItem" (CONFIG.queries handler in helpers/combat/gm-update.mjs; GM relay that updates system.broken, system.quality and, on armor, the system.coverage conditions only)
- Sockets: none.

### Hooks registered

init (once, scarmark.mjs), ready (once, scarmark.mjs), and registered when the module loads: preUpdateActor, preCreateActor, createActor, preCreateItem (clearStaleContainer) in foundry/actor-hooks.mjs; renderChatMessageHTML and updateCombat in foundry/chat-hooks.mjs; renderActiveEffectConfig in foundry/effect-key-picker.mjs; updateWorldTime in foundry/effect-expiry.mjs, plus Simple Calendar's DateTimeChange added by startEffectExpiry in the ready hook when Simple Calendar is active. From the ready hook on: controlToken (helpers/combat-helper.mjs), renderApplicationV2 (maneuver dialog prefill in helpers/maneuvers.mjs, dialog keyboard in helpers/dialog-keyboard.mjs, hiding the item tooltip in helpers/item-tooltip.mjs), renderDialogV2 and closeApplicationV2 (helpers/tactics.mjs, the tactics window). Document listeners: helpers/combat-helper.mjs adds a keyup (T) listener on the window and wraps MouseInteractionManager.prototype.can and .callback (token double click); helpers/dialog-keyboard.mjs adds keydown and pointermove listeners and helpers/item-tooltip.mjs a pointermove listener on the document.

### Stored data paths (system.*)

Never rename or remove a stored field, change its type, or narrow its choices. Derived values (prepared each load, not stored) are listed too because sheets, templates and macros read them.

Actor types: character, creature, npc, animal, container.

- character: attributes.<str|sta|dex|agl|wil|per|pre|int|spi>.base; resources.fatigue, resources.condition.value, resources.condition.max, resources.move.value, resources.move.max, resources.spiritCapacity, resources.willCapacity; race; dob.month, dob.day, dob.year; birthplace; personality; journal
- creature: as character without pre and without race/dob/birthplace/personality/journal; plus species, specialAbilities
- npc: attributes (all 9, with pre), resources (as character), race
- animal: identical to creature (extends it)
- container (actor): maxCapacity, description
- Derived on character/creature/npc/animal: attributes.<key>.effective, sunsign (character), mods.* (meleeAttack, meleeDefense, missileAttack, incomingMelee, incomingMissile, injury, endurance, outnumbered, defense, impact, skills.<physical|communication|combat|craft|religion|magic|psionic>, skill.<name>), fatiguePenalty, endurance, wl, heavyBleed, condition {value, max, pct, band, vital, penalty}, load {kg, capacity, max, pct, steps, overMax}, burden, move, gearSummary {weapon, missile, armor, miscGear, total, capacity, endurance}
- Derived on container actor: gearSummary {weapon, missile, armor, miscGear, total, capacity}

Item types: trait, skill, gear, weapon, missile, armorLocation, armor, container, injury, invocation, spell, psionic.

- trait: category ("physical" | "psyche"), description, notes
- skill: category (physical, communication, combat, craft, religion, magic), attribute1, attribute2, attribute3, sunsignBonuses[].sunsign, sunsignBonuses[].bonus, level, faithPoints, notes, description; derived sb, sunsignBonus, esl
- gear: weight, value, quantity, description, notes, carried, container, consumable, toxicity, rune, artifact.active, artifact.attuned, artifact.class; derived totalWeight, totalValue
- weapon: quantity, weight, value, carried, container, quality (0 = not breakable), isShield, broken, attack, defense, specialization, impact.<blunt|edged|piercing|fire> (-1 = aspect not available), associatedSkill (close, unarmed, ranged, arcane), notes, rune, artifact.active, artifact.attuned, artifact.class; derived totalWeight, totalValue
- missile: quantity, weight, value, carried, container, quality, velocity (low, high), aspect (blunt, edged, piercing, fire), associatedSkill (close, ranged, unarmed, arcane), specialization, range.<short|medium|long|extreme>, impact.<short|medium|long|extreme>, magic, spellClass, notes; derived totalWeight, totalValue
- armorLocation: locationType, side ("", "left" or "right"), aim.<high|medium|low>, injury.<t1|t5|t9|t13|t17>, risk.<fumble|stumble|amputate>, notes
- armor: quantity, weight, value, carried, container, quality (-1 = permanent, 0 = destroyed), originalQuality (the durability it started with, shown as 5/10; 0 = not set), layer (0-5), protection.<blunt|edged|piercing|fire>, coverage (list of { type, side, condition }: type is a location type key, side "" for both sides or "left" or "right", condition a number that starts at 0 and is informational), notes; derived totalWeight, totalValue
- container (item): quantity, weight, value, maxCapacity, carried, notes; derived totalWeight, totalValue
- injury: woundLevel, mend (0 = MRN, 1-6), heavyBleeding, vital ("", "out", "dying"), notes; derived severityKey, mendLabel
- invocation: religion, circle, notes, description
- spell: magicType, level, notes, description
- psionic: attribute1, attribute2, attribute3, sunsignBonuses[].sunsign, sunsignBonuses[].bonus, level, fatigue, notes, description, misfire; derived sb, esl

### Migrations (keep working for old data)

- armor: system.locations (set of keys, "arm" for both sides, "leftArm" for one) and system.locationConditions -> system.coverage (migrateData in data/item-armor.mjs, in memory on load; a both-sides entry of a type with sides, such as "arm" with side "", is split into a left and a right entry by splitBothSides in rules/locations.mjs; scripts/imports/migrate-armor-coverage.js writes it to the world and the compendiums and deletes the old fields)
- character, npc: migrateLegacyAttributes (data/migrations.mjs; pre-1.0.36 EYE/HRG/SML -> PER average, VOI/COM -> PRE average, AUR -> SPI; only fills missing keys)
- creature, animal: same, without PRE
- skill, psionic: migrateSkillAttributeKeys (data/migrations.mjs): attribute1-3 through legacyAttributeMap, "mor" -> "wil"
- armorLocation: pre-1.0.39 letter codes in injury.t1-t17 (e.g. "K4") -> numbers, empty -> 0 (migrateData in data/item-armor-location.mjs)
- Location type keys: legacyLocationMap / locationKey() (pre-1.0.39/1.0.40 keys)

### Also persisted (not in the old audit's sections 2-3, found while writing this file)

- Active Effect change keys: the 18 keys of SCARMARK.effectKeys (17 system.mods.* and system.resources.fatigue), plus system.attributes.<key>.base and system.mods.skill.<Skill Name> (Add = bonus, Override = sets ESL; matched by lower-cased name). See docs/archive/AUDIT.md 6f.
- Status effect ids (helpers/statuses.mjs): prone, grappled, pinnedDown, entangled, stun.
- Handlebars helper names (module/helpers/handlebars.mjs): eq, concat, round1, num, percent. Templates call them.
