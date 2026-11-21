# Audit 1.0.51-beta (2026-11-20)

A full pass over the code at commit a4dbde3 (main). It follows docs/AUDIT-2026-11.md, whose open items are listed in section 9 with their current state. Method: greps and small scripts over module/, templates/, css/, lang/, scripts/ and tests/, plus reading the new code. Everything below was checked in the files; "not verified" marks what could not be checked without running Foundry. Nothing has been changed by this audit.

## 1. Are the maneuvers and tactics in config?

Yes: `MANEUVERS` and `TACTICS` are data in `module/config/maneuvers.mjs`, and `helpers/maneuvers.mjs` turns their action descriptors into rolls. What is still in the wrong place:

- The rule text (descriptions) is Czech, inside config, while every other player-facing string is English and in `lang/en.json`. It cannot be localized. It belongs in lang (`SCARMARK.Maneuver.<id>.description`, `SCARMARK.Tactic.<id>`) with the config keeping only ids, images and action descriptors.
- Maneuver names, tactic names and the button labels ("Dodge", "Break free", "Pinned down"...) are English literals in config, also not in lang.
- The rule text repeats numbers that are real values elsewhere: "-30" for Pinned Down and Prone (`STATUS_PENALTIES`), Stun "-30" (`STATUS_PENALTIES.stun`), "STR x 5" (`ATTRIBUTE_TEST_MULTIPLIER`). If a value changes, the text does not.
- The tactics are text only; none of their numbers (Rapid attack -10, Two-weapon -20, Aimed attack -15, Aimed fire +20, Cover -10 to -30) is a value anyone can use. That is fine while they are reminders. If the system should ever apply them, they need to become config values first.
- `findPolearm` (helpers/maneuvers.mjs) finds a polearm by the word "polearm" in an item's notes. That is a rule that depends on free text; it belongs in config (a weapon flag or a named pattern, like `ARMOR_PIERCING_NAMES`).
- The Dodge test looks the skill up by the name "Dodge" (see section 4).

## 2. Values and tables in the wrong layer

| Where now | What | Where it belongs |
|---|---|---|
| `rules/time.mjs` | `UNIT_SECONDS` (seconds per time unit) | `config/` (a value table, not a calculation) |
| `rules/wounds.mjs` severityKey | the level to severity mapping as `if` literals (1, 2, 3, 4) | a `SEVERITY_BY_LEVEL` table in `config/wounds.mjs`; `INJURY_SEVERITIES` already holds the labels |
| `rules/combat-helper.mjs` | `ASPECT_LETTERS` (B, E, F, P) and the skill to group mapping ("unarmed" goes to Unarmed, "close" to Close) | `config/combat.mjs`. The letters repeat `DAMAGE_ASPECTS`, and their order (B E F P) differs from the order the Combat tab uses (B E P F, hardcoded in `templates/actor/parts/combat.hbs` lines 50 and 133) |
| `helpers/statuses.mjs` | the five skill categories a status penalty applies to (combat, physical, religion, magic, psionic) | `config/statuses.mjs` next to `STATUS_PENALTIES` |
| `sheets/item-armor-sheet.mjs:37` | layer options `[0, 1, 2, 3, 4, 5]` | derive from `ARMOR_LAYER_MAX` |
| `data/item-armor-location.mjs` | initial aim weights (300/100/0) and thresholds (1 to 5) typed by hand, equal to the canonical head | `ARMOR_LOCATIONS.head` (AUDIT 6i, still open) |
| `data/base-actor-schema.mjs:32-33` | Condition initial and max 100 | a named default in `config/items.mjs` |
| templates | `min`/`max` attributes: `max="5"` x4, `max="6"` x3, `max="16"` x2, `min="1"` x7 (circle, spell level, spell class, durability) | pass the limits from the sheet context so templates and data models share `SPELL_LEVEL_MAX`, `INVOCATION_CIRCLE_MAX`, `QUALITY_MAX` |
| `helpers/actor-setup.mjs` | the default skill names and hit location names created on a new actor | `config/` (or a compendium) |
| `helpers/*`, `sheets/row-clicks.mjs`, `scroll-keeper.mjs` | UI timings: 350, 400, 450 ms click delays, 6 px, 100 ms scroll restore, 50 ms dialog focus, 7000 ms artifact preselect, dialog width 163 | one `config/ui.mjs` so they are named and findable (they are not game rules, so low priority) |
| `config.mjs` | `weightUnitsPerKg()` still reads `game.settings`; it is the only Foundry call left in the config assembler | needs `module/foundry/` (see section 5) |

## 3. Text that is not in lang (the UI is not localizable)

- `helpers/artifact-use.mjs`: all of it. Pool labels, dialog titles ("Artifact/Rune Use", "Recharge"), about a dozen notification and error texts, the dialog and chat card HTML.
- `helpers/effects.mjs` (group labels "Attributes", "Individual skills ...") and `EFFECT_PICKER_GROUPS` in `config/vocab.mjs` (every option label is English), plus `EFFECT_KEYS` labels.
- `helpers/combat/strike.mjs`: "Severed", "Aspect:", "(Amputation)", "WL"; `helpers/combat/gm-update.mjs` error texts; `sheets/actor-sheet-base.mjs:846` "Consume failed"; `helpers/combat/round.mjs` "(+n WL)".
- `config/maneuvers.mjs` names, labels and the Czech descriptions (section 1).
- Not verified: window titles and `ui.notifications` text are rendered by Foundry core; whether core escapes names put into them was never checked.
- `lang/cs.json` is not registered in `system.json` (only `en` is) and has 57 of 524 keys, so Czech is not available at all. Either register it and translate, or delete it.
- Genuinely dead lang keys (no reader found): `Container.stored`, `Artifact.properties`, `Artifact.charges`, `Artifact.egoWill`, `NotBuiltYet`, `Result`, `CriticalSuccess`, `CriticalFailure`, `Success`, `Failure`, `Skill.automatic`. No key used in code is missing from `en.json`.

## 4. Name-based rules (they break when a skill or item is renamed or translated)

- Skills found by name: "Dodge" (`combat/resolve.mjs` x2, `sheets/actor-sheet-base.mjs:295`, `helpers/maneuvers.mjs`), "initiative" (`combat/combatant.mjs`), and the combat skills through their localized label (`lookup.mjs combatSkillEsl`).
- Shields found by name: `RANGED_BLOCK_SHIELDS` in `config/combat.mjs` ("Round Shield", "Kite Shield", ...), and `ARMOR_PIERCING_NAMES` (/bodkin/i).
- A polearm found by the word "polearm" in notes (section 1).
- `helpers/combat-helper.mjs` preselects the artifact by waiting for a dialog whose title equals the English string "Artifact/Rune Use". If artifact-use.mjs is localized, that match silently stops working. `artifactRuneUse()` should take the item id as a parameter instead.
- Suggested fix for all of them: a key on the item or skill (a `system.role` such as "dodge", "initiative", "shield", "polearm"), set by the compendium data and a migration, with the name lookup kept as a fallback.

## 5. Structure

- `module/foundry/` (lifecycle, hooks, settings) does not exist, although `docs/AGENTS.md` describes it. `scarmark.mjs` (361 lines) mixes setup, the effect expiry sweep and calendar glue, the effect key picker, and four actor hooks. The effect expiry (`scarmarkEffectExpired`, `sweepScarmarkEffects`) and the picker rendering are the obvious pieces to move out.
- `sheets/actor-sheet-base.mjs` is 962 lines: gear actions, roll actions, effects, drag and drop, consume. It can be split by area (the way `row-clicks.mjs`, `inventory-drop.mjs` and `scroll-keeper.mjs` were).
- `helpers/dice.mjs` (491 lines) holds the dialogs and rolls of skills, attributes, esoterics, shock, mend and damage.
- Inline HTML for dialogs and cards is built in JS in 9 files (`dice.mjs` 9 places, `artifact-use.mjs` 5, `attack.mjs` 3, `strike.mjs` 2, `actor-sheet-base.mjs` 2, and one each in combat-helper, maneuvers, tactics and forced-tests). A `templates/dialogs/` folder would put them next to the other templates and make them testable with the snapshot harness.
- Small helpers repeated: a localizer `T(key, data)` with a different prefix in 4 files (combat-helper, inventory, maneuvers, tactics) plus `L` in `combat/util.mjs`; `collator()` in 3 files; `norm()` in 3. One `helpers/i18n.mjs` (`localizer(prefix)`, `collator`, `normalize`) replaces them.
- Item sheets were not consolidated: 17 item templates repeat the same lines (the notes input and label 12 times, the details tab wrapper 7 times, the portrait and name header 6 times). The same partial approach as the actor templates fits.
- `helpers/` mixes pure view code (`format.mjs`, `inventory-view.mjs`, `handlebars.mjs`) with Foundry-facing code. A `module/view/` folder (pure, testable) would match the folder ownership rules.

## 6. Features that exist only as world macros

The stylesheets already contain rules for things the system code does not produce: `.sm-item-tooltip` and `.sm-injury-tip` (hover tooltips for items and token injuries) and `.sm-delete-option` (a delete confirmation with a "do not ask again" row). The patch registry in the pasted lib also names patches 2, 4, 6, 17 and 18 as dependants; patch 4 (container actions, which I replaced with the existing sheet actions) and the tooltip and delete-confirmation patches were not pasted. If those macros still run in the world, they will keep working next to the system; if you want them in the system, send them.

World macros that live in `scripts/macros` and duplicate rules or each other:
- `awareness.js` and `passive-awareness.js` repeat the multipliers 5 and 3 and the cap 95 as literals (the cap is `ESL_CAP`).
- `drop-a-torch.js`, `drop-a-lantern.js`, `drop-a-candle.js` are three copies of one 63-line macro that differ only in the item name.
- `request-roll.js` (252 lines) has its own world-scope flags (noted in `constants.mjs`).

## 7. Tests, CI, docs

- No CI (`.github/` does not exist): lint, tests, golden, cycle check and the render snapshots only run by hand.
- 32 module files have no test that mentions them. The pure logic is covered (rules, inventory, combat-helper grouping, maneuver data, containerTransfer). Not covered: every Foundry-facing UI module (`combat-helper`, `dialog-keyboard`, `row-clicks`, `scroll-keeper`, `inventory-drop`, `tactics`, `combat-columns`), `artifact-use`, most of `helpers/combat/*` (dialogs, clash, forced-tests, chat-wiring, gm-update, combatant), and all item sheet classes (12 plus the base). The render snapshots cover the four actor sheets only, not the 17 item templates.
- `docs/SMOKE_TEST.md` is out of date: it says system version 1.0.49-beta, lists a Macro tab (removed), uses pack id "scarmark.skills" (it is "scarmark-test.skills"), and has no steps for containers, stack split and merge, drag and drop, the combat helper, maneuvers, the dialog keyboard or the weight and DUR display.
- `README.md` says "verified against Foundry v14 Build 366"; `system.json` and the changelog say 14.369.
- Three audit files now overlap (`AUDIT.md`, `AUDIT-2026-11.md`, this one). Keep `AUDIT.md` as the 1.0.49 reference for the persisted contract, and archive the middle one into this file once the open items are decided.
- Lint: 49 warnings, all unused variables, unchanged for several releases.

## 8. Hygiene

- `packs/` has 108 tracked LevelDB runtime files (`LOCK`, `LOG`, `LOG.old`, `*.log`) that change whenever Foundry opens the world. Correction made while fixing this: the `*.log` files are LevelDB's write-ahead log and can hold the newest records, so they must stay tracked (as must `*.ldb`, `CURRENT` and `MANIFEST`); only the 81 `LOCK`, `LOG` and `LOG.old` files are runtime noise.
- Unused exports (no importer, not even a test): `artifactCost`, `attackerFor`, `launchCombatHelper` (exported for use from outside; only the registration is used), `combatSkillEsl`, `searchText`, `endDrag`. `compendiumSources` and `SCARMARK_STATUSES` are used only by tests.
- Config with no reader outside config and tests: `traitCategories`, `weaponSkills` (the weapon sheet fills its context from `combatSkills`), `effectKeys` (the picker uses `EFFECT_PICKER_GROUPS`). They are part of the persisted contract, so removing them needs a decision.
- CSS rules with no user: `.sm-new-drop` (replaced by `.sm-drop-target`), plus the styles of the unported tooltips and delete confirmation (section 6). The rest of the 36 unmatched classes are built dynamically (`condition--<band>`, `fill--<band>`, `outcome-<level>`) or are Foundry's own.

## 9. Risks in the new code (not verified in Foundry)

- `combat-helper.mjs` wraps `MouseInteractionManager.prototype.can` and `.callback` directly. A Foundry update that changes those methods breaks token double click for every client; a wrapper library or a token hook would be safer.
- `dialog-keyboard.mjs` listens for arrow keys on the whole document in the capture phase and stops propagation for any dialog; text fields and menus are excluded by a selector list that may miss some Foundry widgets.
- Partials are loaded through the `templates` key of each part. If a part is rendered without it (a custom sheet extending these), the partial call fails with "partial not found".
- `containerTransfer` was tested with in-memory actors only. The check that the copies exist right after `createEmbeddedDocuments` assumes Foundry has updated the collection by then.
- `row-clicks.mjs` delays opening a stackable item's sheet by 350 ms for owners; that is a visible behavior change from before the patches.

## 10. State of the open items of AUDIT-2026-11

| Item | State |
|---|---|
| 6h, 6i weapon skill choices, armor-location defaults | open (section 2) |
| 8 `weightUnitsPerKg` reads `game.settings` | open (section 2) |
| Name-based rules | open (section 4) |
| English text | open, and larger now (section 3) |
| Numeric literals in templates | open (section 2) |
| `module/foundry/` | open (section 5) |
| CI, `.gitignore` for LevelDB files, Czech parity | open (sections 7 and 8) |
| 6b spell and invocation targets duplicated | closed in 1.0.51 (one calculation each) |
| 6f effect picker duplicate | closed (picker built from `EFFECT_PICKER_GROUPS`, tested) |
| 9 HTML escaping | closed for chat cards and dialogs |

## 11. Suggested order

1. Move the maneuver and tactic text and labels, the effect picker labels and `artifact-use.mjs` into lang (one change; decide Czech or English for the rule text).
2. Fix the small layer mistakes in section 2 (time table, severity table, aspect letters and order, status categories, armor layer options).
3. CI, `.gitignore` for the pack runtime files, update `docs/SMOKE_TEST.md`.
4. Item sheet partials and snapshots for the 17 item templates.
5. `module/foundry/`, `weightUnitsPerKg`, and the split of `scarmark.mjs`, `actor-sheet-base.mjs` and `dice.mjs`.
6. Item roles instead of name lookups, with a migration (needs your decision on the data model).

## 12. State after the fixes (branch fix/audit-1.0.51)

Everything below was checked with lint (no warnings, undefined names are errors), 143 tests, the 558 golden cases and the cycle check. Nothing was run in Foundry.

Done:
- Section 1: the maneuver and tactic names, descriptions and button labels are lang keys (English translation in `en.json`, the Czech original in `cs.json`, which is registered); the numbers in the Grapple and Pin texts come from config; the polearm pattern is config.
- Section 2: the time table, the severity table, the aspect letters (order B E P F), the status skill categories, the armor layer options, the armor location defaults, the Condition default, the default skills and hit locations, the form limits used by the templates, the UI timings, and `weightUnitsPerKg` (now in `module/foundry/settings.mjs`).
- Section 3: the Artifact/Rune Use and Recharge dialogs and messages (dialogs are templates), the effect picker labels, the bleeding, mend, load, picker option and combat item lines. Dead keys removed; `tests/lang.test.mjs` keeps code, `en.json` and `cs.json` consistent.
- Section 4: Dodge and Initiative are named once in config; the combat helper passes the artifact to preselect instead of matching a dialog title.
- Section 5: `module/foundry/` exists and `scarmark.mjs` is 65 lines; `dice.mjs` is split into `helpers/dice/`; the 41 sheet actions are in `sheets/actions/` (`actor-sheet-base.mjs` 962 to 644 lines); one localizer, collator and normalizer in `helpers/i18n.mjs`; the item templates share partials and all 12 item sheets are snapshot-tested; pure view code is in `module/view/`.
- Section 6: the item tooltip was ported on request (the other macro-only features and `scripts/macros` were left as they are, as asked).
- Section 7: CI workflow, `docs/SMOKE_TEST.md`, README build number.
- Section 8: unused exports and the dead CSS rule removed; `LOCK`, `LOG` and `LOG.old` untracked; 49 lint warnings cleared.
- Section 9: the token double click wrap checks that Foundry still has the methods.

Not done:
- Item roles (`system.role`) for the name lookups: it needs the compendium packs edited (binary LevelDB) and a migration, so the names are only centralized in `config/actors.mjs`.
- Dialog and chat card HTML that is still built in code (about 40 places in `dice/`, `combat/`, `sheets/actions/`, `combat-helper`, `maneuvers`, `tactics`). The cards are assembled from shared builders and pinned by the golden cases; moving them needs a decision on the card markup.
- Text pinned by the golden cases stays in English by design: the names and notes written onto injury items by a strike ("Severed", "Aspect:", "(Amputation)", the injury type names).
- The config keys with no reader (`traitCategories`, `weaponSkills`, `effectKeys`) stay: they are part of the persisted contract.
- Tests for the UI modules that need Foundry (`combat-helper`, `dialog-keyboard`, `row-clicks`, `scroll-keeper`, `inventory-drop`, `tactics`, `item-tooltip` DOM part); their pure parts are tested.
- The world macro for the delete confirmation and `scripts/macros`.
- `.github/workflows/test.yml` is committed, but the GitHub token on this machine has no `workflow` scope, so pushing it can be refused; add it from the web UI or with a token that has that scope.
