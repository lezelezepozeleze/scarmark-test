/**
 * Combat maneuvers (Grapple, Pin, Push, Ram, Trip, Entangle): a column in the combat helper dialog. Choosing one posts a chat card ("X attempted to Grapple Y") with buttons for the target's answers, and rolls the maneuver itself when it has a roll.
 * The maneuvers and their actions are data in config/maneuvers.mjs; this file turns the action descriptors into rolls and statuses.
 */
import { MANEUVERS, POLEARM_NOTES, DODGE_SKILL, COMBAT_SKILLS } from "../config/index.mjs";
import { FLAGS } from "../constants.mjs";
import { rollSkillTest, rollAttributeTest } from "./dice.mjs";
import { rollFumbleStumble } from "./combat/forced-tests.mjs";
import { promptDefense } from "./combat/dialogs.mjs";
import { weaponDsl, findSkillByName, defenseSituational } from "./combat/lookup.mjs";
import { testCard } from "./chat.mjs";
import { rollD100 } from "./dice/shared.mjs";
import { declareMeleeAttack } from "./combat.mjs";
import { L } from "./combat/util.mjs";
import { registerCombatColumn } from "./combat-helper.mjs";
import { esc } from "./escape.mjs";
import { DIALOG_SELECTOR } from "./dialog-keyboard.mjs";
import { maneuverTextValues, capTarget } from "../rules/index.mjs";
import { localizer, collator, normalize } from "./i18n.mjs";

const T = localizer("SCARMARK.Maneuver");
const t = (key) => game.i18n.localize(key);
const sorted = () => [...MANEUVERS].sort((a, b) => collator().compare(t(a.name), t(b.name)));
const byId = (id) => MANEUVERS.find(m => m.id === id);

/** The flag of a maneuver chat card: the system's, or the one the old world macro wrote. */
const cardFlag = (message) => message.getFlag(FLAGS.scope, FLAGS.maneuver) ?? message.getFlag("world", "smManeuver");

// ---------- Prefilling the next dialog ----------

const pendingPrefills = new Set();

/** When the dialog a roll opens renders, set its named fields (a modifier, an aim) before the user sees it. */
function prefillDialog(app) {
  const root = app?.element;
  if (!(root instanceof HTMLElement) || !root.matches(DIALOG_SELECTOR)) return;
  const prefill = [...pendingPrefills].reverse().find(entry => !entry.existing.has(root));
  if (!prefill) return;
  const fields = Object.entries(prefill.fields).map(([name, value]) => [root.querySelector(`[name="${name}"]`), value]);
  if (!fields.every(([element]) => element)) return;
  pendingPrefills.delete(prefill);
  for (const [element, value] of fields) {
    element.value = value;
    element.dispatchEvent(new Event("change", { bubbles: true }));
  }
}

/** Run `open` (a roll that opens a dialog) and fill the named fields of the dialog it renders. */
async function withPrefilledFields(fields, open) {
  if (!Object.keys(fields).length) return open();
  const pending = { fields, existing: new Set(document.querySelectorAll(DIALOG_SELECTOR)) };
  pendingPrefills.add(pending);
  try {
    return await open();
  } finally {
    pendingPrefills.delete(pending);
  }
}

const modifierFields = (modifier) => (modifier ? { modifier } : {});

// ---------- Actions ----------

/** Action: roll the actor's skill (by name; the combat skill key is localized first) with the modifier prefilled. Not the skillTest macro of dice/tests.mjs. */
const skillTest = (skillKey, modifier = 0) => async (actor) => {
  const skillName = game.i18n.localize(COMBAT_SKILLS[skillKey] ?? skillKey);
  const skill = actor.items.find(item => item.type === "skill" && normalize(item.name) === normalize(skillName));
  if (!skill) throw new Error(T("noSkill", { actor: actor.name, skill: skillName }));
  return withPrefilledFields(modifierFields(modifier), () => rollSkillTest(actor, skill.id));
};

const strengthTest = (modifier = 0) => (actor) => withPrefilledFields(modifierFields(modifier), () => rollAttributeTest(actor, "str"));

const stumbleTest = (actor) => rollFumbleStumble(actor, "stumble");

const defenseTest = (kind, modifier = 0) => async (actor) => {
  const result = await withPrefilledFields(modifierFields(modifier), () => promptDefense(kind, actor, null));
  if (!result) return;
  const weapon = actor.items.get(result.weaponId);
  if (kind === "block" && !weapon) throw new Error(T("noBlocker", { actor: actor.name }));
  const base = kind === "block" ? weaponDsl(actor, weapon) : (findSkillByName(actor, DODGE_SKILL)?.system.esl ?? 0);
  const target = capTarget(base + result.modifier + defenseSituational(actor));
  const { roll, level } = await rollD100(target);
  return ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: testCard({ title: `${esc(actor.name)} (${L(kind)})`, target, roll: roll.total, level }),
    rolls: [roll]
  });
};

/** The best polearm the actor has: not broken, notes mention "polearm", carried ones first, then by name. */
function findPolearm(actor) {
  return actor.items
    .filter(item => item.type === "weapon" && !item.system?.broken && POLEARM_NOTES.test(item.system?.notes ?? ""))
    .sort((a, b) => (b.system?.carried !== false) - (a.system?.carried !== false) || collator().compare(a.name, b.name))[0];
}

const meleeAttack = (aim) => async (actor) => {
  const weapon = findPolearm(actor);
  if (!weapon) throw new Error(T("noWeapon", { actor: actor.name }));
  return withPrefilledFields({ aim }, () => declareMeleeAttack(actor, weapon.id));
};

const applyStatus = (id) => async (actor) => {
  if (actor.statuses?.has(id)) return ui.notifications.info(T("alreadyHas", { actor: actor.name, status: id }));
  await actor.toggleStatusEffect(id, { active: true });
};

/** Turn an action descriptor from config/maneuvers.mjs into a function of an actor. */
function actionFor(spec) {
  if (spec.test === "skill") return skillTest(spec.skill, spec.modifier ?? 0);
  if (spec.test === "strength") return strengthTest(spec.modifier ?? 0);
  if (spec.defense) return defenseTest(spec.defense, spec.modifier ?? 0);
  if (spec.status) return applyStatus(spec.status);
  if (spec.stumble) return stumbleTest;
  if (spec.melee) return meleeAttack(spec.aim);
  throw new Error(`Unknown maneuver action ${JSON.stringify(spec)}`);
}

/** Is the maneuver offered to this attacker against this target? */
function isOffered(maneuver, actor, target) {
  const need = maneuver.requires;
  if (!need) return true;
  if (need.weapon === "polearm") return !!findPolearm(actor);
  if (need.targetStatus) {
    const targetActor = target.actor;
    return !!targetActor?.statuses?.has(need.targetStatus) && (targetActor.system?.attributes?.str?.base ?? 0) <= need.targetStrMax;
  }
  return true;
}

// ---------- The chat card ----------

/** Post the chat card of an attempted maneuver, with a button per answer of the target; the flag lets wireManeuverCard find the maneuver again. */
function postManeuverCard(actor, target, maneuver) {
  const buttons = maneuver.buttons
    .map((button, index) => `<button type="button" data-sm-maneuver="${index}">${esc(t(button.label))}</button>`)
    .join("");
  return ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `
      <div class="scarmark-card sm-maneuver-card">
        <div class="card-title">${esc(T("attempted", { actor: actor.name, maneuver: t(maneuver.name), target: target.name }))}</div>
        ${buttons && `<div class="card-buttons">${buttons}</div>`}
      </div>`,
    flags: {
      [FLAGS.scope]: {
        [FLAGS.maneuver]: { maneuver: maneuver.id, actorUuid: actor.uuid, targetUuid: target.actor?.uuid ?? null }
      }
    }
  });
}

/** The actor the maneuver was aimed at, if the user may act for it. */
function maneuverTarget(flag) {
  if (!flag?.targetUuid) throw new Error(T("noTargetSaved"));
  const actor = fromUuidSync(flag.targetUuid);
  if (!actor || actor.documentName !== "Actor") throw new Error(T("targetGone"));
  if (!actor.isOwner) throw new Error(T("notPermitted", { name: actor.name }));
  return actor;
}

const wired = new WeakSet();

/** Wire the buttons of a maneuver chat card (call from renderChatMessageHTML). */
export function wireManeuverCard(message, element) {
  const flag = element instanceof HTMLElement && cardFlag(message);
  if (!flag || wired.has(element)) return;
  wired.add(element);

  element.addEventListener("click", (event) => {
    const button = event.target.closest?.("[data-sm-maneuver]");
    if (!button) return;
    event.preventDefault();
    const spec = byId(flag.maneuver)?.buttons[Number(button.dataset.smManeuver)]?.action;
    if (!spec) return ui.notifications.warn(T("buttonGone"));
    Promise.resolve()
      .then(() => actionFor(spec)(maneuverTarget(flag)))
      .catch((error) => {
        console.error("Scarmark | maneuver", { error, actorUuid: flag.actorUuid, targetUuid: flag.targetUuid });
        ui.notifications.error(error?.message || T("failed"));
      });
  });
}

// ---------- The combat helper column ----------

/** Register the maneuvers as a column of the combat helper dialog, and the hook that prefills the roll dialogs they open (call once, at ready). */
export function registerManeuvers() {
  Hooks.on("renderApplicationV2", prefillDialog);
  registerCombatColumn("maneuvers", {
    title: T("columnTitle"),
    order: 100,
    entries: (actor, target) => sorted()
      .filter(maneuver => isOffered(maneuver, actor, target))
      .map(maneuver => ({
        id: maneuver.id,
        name: t(maneuver.name),
        img: maneuver.img ?? "icons/svg/combat.svg",
        tooltip: game.i18n.format(maneuver.description, maneuverTextValues(maneuver.id))
      })),
    async run(actor, target, id) {
      const maneuver = byId(id);
      if (!maneuver) throw new Error(T("notFound"));
      await postManeuverCard(actor, target, maneuver);
      if (maneuver.use) await actionFor(maneuver.use)(actor);
    }
  });
}
