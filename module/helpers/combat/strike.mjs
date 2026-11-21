/** Strike to wound: the hit location roll, armor, Wound Level and the strike card, plus the Injury Roll for damage that does not come from combat. */

import { coveringArmor, armorProtection } from "./armor.mjs";
import { L, DialogV2, locationName } from "./util.mjs";
import { updateCombatItem } from "./gm-update.mjs";
import { cardButton } from "./card-buttons.mjs";
import { onHitButtons } from "./poison.mjs";
import { aimFilter, aspectOptions } from "./dialogs.mjs";
import { esc } from "../escape.mjs";
import {
  aimKey, injuryLevelFor, armorWears, armorAfterPiercing, locationSide, locationKey, injuryFor, vitalWoundFor,
  strikeLocationIndex, fumbleStumbleKind, impactBonusFor, wearIndexAt
} from "../../rules/index.mjs";
import { QUALITY_PERMANENT } from "../../config/index.mjs";
import {
  AIM, AMPUTATION_WOUND_LEVEL, DEFAULT_AIM_ZONE, DAMAGE_ASPECTS, VITAL_STATES, STUN_WOUND_LEVELS
} from "../../config/index.mjs";

/**
 * Pick a struck Armor Location, weighted by its aim value in the given zone
 * ("high"/"medium"/"low"; combat strikes use "medium", the Injury roll lets the
 * GM pick High/Mid/Low). `filter` narrows the candidate set (e.g. the arm chain).
 * The weighting is rules/strike-helpers.mjs; only the random number is drawn here.
 */
function rollStrikeLocation(target, filter = null, zone = DEFAULT_AIM_ZONE) {
  let locs = target.items.filter(i => i.type === "armorLocation");
  if (filter) {
    const narrowed = locs.filter(filter);
    if (narrowed.length) locs = narrowed; // keep the full set if nothing matches
  }
  if (!locs.length) return null;
  return locs[strikeLocationIndex(locs.map(l => ({ type: l.system.locationType, aim: l.system.aim })), zone, Math.random)];
}

/**
 * Armor wear (Scarmark AQ). On a strike to a covered location a **50/50 system
 * roll** decides whether the armor takes a point of wear; if it does, the
 * HIGHEST-layer covering piece that still holds at that location loses 1 of its
 * condition there (min 0 = that location no longer protects; the rest of the
 * piece keeps working). Natural pieces (QUALITY_PERMANENT) and locations already
 * at condition 0 never wear. Returns a short card line (or "" when nothing is at
 * risk / the wear couldn't be applied). Not every hit ruins armor, so players
 * aren't stuck repairing after every fight. Another side's armor is worn via the GM.
 */
async function wearArmor(victim, locType, side = "", locName = "") {
  if (!victim) return "";
  const wearable = coveringArmor(victim, locType, side)
    .filter(a => a.system.quality !== QUALITY_PERMANENT)
    .sort((a, b) => (b.system.layer ?? 0) - (a.system.layer ?? 0));
  if (!wearable.length) return "";                       // bare / natural / all destroyed here
  if (!armorWears(Math.random())) return L("armorSpared"); // not every hit wears armor
  const piece = wearable[0];
  const coverage = Array.from(piece.system.coverage ?? [], entry => ({ type: entry.type, side: entry.side ?? "", condition: entry.condition ?? 0 }));
  const index = wearIndexAt(coverage, locType, side);
  if (index < 0) return "";
  const before = coverage[index].condition;
  const after = Math.max(0, before - 1);
  coverage[index].condition = after;
  if (!(await updateCombatItem(piece, { "system.coverage": coverage }))) return "";
  const key = after <= 0 ? "armorDestroyed" : "armorWorn";
  return game.i18n.format(`SCARMARK.CombatAuto.${key}`, { name: esc(piece.name), location: esc(locName), from: before, to: after });
}

/**
 * What a strike does to the victim at the struck location: the wound to add (null when armor stopped it), its card line and its final Wound Level.
 * An amputation (a location with the amputate risk, an amputating wound type) becomes "Severed <location>" at AMPUTATION_WOUND_LEVEL; a Dire or Mortal wound to a vital location sets out / dying at once.
 *
 * @returns {{woundData: object|null, woundLine: string, finalWL: number}} woundData is the payload of the Add Wound button
 */
function describeWound({ victim, aspect, effImpact, location }) {
  const locType = location.system.locationType;
  const woundLevel = injuryLevelFor(location.system.injury, effImpact);
  if (woundLevel <= 0) return { woundData: null, woundLine: `<i>${L("armorStopped")}</i>`, finalWL: 0 };

  // Use the struck item's own name (e.g. "Left Shoulder") so sides show up.
  const locName = locationName(location, locType);
  const entry = injuryFor(aspect, woundLevel) ?? { name: "", heavyBleeding: false, amputation: false };
  const amputates = entry.amputation && location.system.risk?.amputate;
  const injName = amputates ? `Severed ${locName}` : `${locName} ${entry.name}`;
  const finalWL = amputates ? AMPUTATION_WOUND_LEVEL : woundLevel;
  const vital = vitalWoundFor(locType, finalWL);
  const woundData = {
    target: victim.uuid,
    name: injName,
    woundLevel: finalWL,
    heavyBleeding: entry.heavyBleeding || amputates,
    vital,
    notes: `Aspect: ${game.i18n.localize(DAMAGE_ASPECTS[aspect])}${amputates ? " (Amputation)" : ""}`
  };
  let woundLine = `<b>${esc(injName)}</b> &middot; ${game.i18n.localize("SCARMARK.Combat.wl")} ${woundData.woundLevel}${woundData.heavyBleeding ? " &middot; 🩸" : ""}`;
  if (vital) woundLine += `<div class="card-line broken"><b>${game.i18n.localize(VITAL_STATES[vital])}</b></div>`;
  return { woundData, woundLine, finalWL };
}

/** The buttons of a strike card: Add Wound, and the forced Fumble/Stumble or Stun test the wound calls for ("" when there are none). */
function strikeButtons({ victim, locType, woundData, finalWL }) {
  let buttons = "";
  if (woundData) buttons += cardButton("addWound", woundData, L("addWound"));
  // A WOUND (not an armour-stopped hit) to the weapon hand / arm or to a leg forces the
  // victim to test: Fumble (Hand, any wound; Arm, from Severe) or Stumble (Thigh, Shin).
  const testKind = finalWL > 0 ? fumbleStumbleKind(locType, finalWL) : null;
  if (testKind) {
    const testData = { victim: victim.uuid, kind: testKind };
    buttons += cardButton("fumbleStumble", testData, L(testKind === "fumble" ? "fumbleTest" : "stumbleTest"));
  }
  // A Heavy or Severe wound to the Head (WL 2-3) calls for a Stun Test (Dire and Mortal
  // already knock the victim out).
  if ((locationKey(locType) === "head") && STUN_WOUND_LEVELS.includes(finalWL)) {
    buttons += cardButton("stun", { victim: victim.uuid }, L("stunTest"));
  }
  return buttons;
}

/**
 * Turn an already-computed effective impact at a struck location into a wound
 * plus the strike card (Add Wound, and any forced Fumble/Stumble test). Shared
 * by postStrike (weapon/missile) and rollInjury (traps / additional damage).
 *
 * @param {object} o
 * @param {Actor}  o.speaker    Actor the card is spoken by.
 * @param {Actor}  o.victim     Actor that takes the wound (Add Wound / test target).
 * @param {string} o.title      Card title line.
 * @param {string} o.aspect     Damage aspect key.
 * @param {number} o.effImpact  Final impact after armor (>= 0).
 * @param {Item}   o.location   The struck armorLocation item.
 * @param {Item|null} [o.weapon] The weapon or missile that struck; its on-hit effects (a poisoned blade) add their buttons when the wound got through the armor.
 * @param {string} o.detail     Pre-formatted "math" line.
 * @param {Roll[]} [o.rolls]    Rolls to attach to the message.
 */
async function resolveWound({ speaker, victim, title, aspect, effImpact, location, detail, rolls = [], weapon = null }) {
  const locType = location.system.locationType;
  const { woundData, woundLine, finalWL } = describeWound({ victim, aspect, effImpact, location });

  // Armor wear: a strike that lands on a covered location may wear the armor's
  // condition at that location (50/50), whether or not it wounded.
  const wearLine = await wearArmor(victim, locType, locationSide(location), locationName(location, locType));

  let content = `
    <div class="scarmark-card strike-card">
      <div class="card-title">${title}</div>
      <div class="card-line">${detail}</div>
      <div class="card-line">${woundLine}</div>
      ${wearLine ? `<div class="card-line armor-wear">${wearLine}</div>` : ""}`;
  let buttons = strikeButtons({ victim, locType, woundData, finalWL });
  // Only a wound that got through the armor lets the weapon's poison in.
  if (woundData && weapon) buttons += await onHitButtons(weapon, victim);
  if (buttons) content += `<div class="card-buttons">${buttons}</div>`;
  content += `</div>`;

  await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor: speaker }), content, rolls });
}

/** Chat card for a victim that has no armor location items to strike. */
const postNoLocations = (actor) => ChatMessage.create({
  speaker: ChatMessage.getSpeaker({ actor }),
  content: `<div class="scarmark-card"><div class="card-line"><i>${L("noLocations")}</i></div></div>`
});

/**
 * A successful hit: roll the location (narrowed by the aim or the called part), the strike dice, subtract the worn armor and resolve the wound (strike card with Add Wound and any forced test).
 *
 * @param {Actor}  attacker
 * @param {Actor}  target
 * @param {string} aspect       Damage aspect key.
 * @param {number} impact       The weapon's or missile's Impact in that aspect.
 * @param {number} strikeDice   d6 to roll (rules/strike.mjs strikeDice).
 * @param {object} [o]
 * @param {Function|null} [o.locationFilter]  Narrows the candidate locations (the clash uses it for the arm chain); overrides the aim filter.
 * @param {boolean} [o.armorPiercing]         Halves Point armor on a piercing strike.
 * @param {string|null} [o.skill]             Combat skill key; Close and Unarmed take the attacker's Impact modifier.
 * @param {string} [o.aim]                    "mid" | "high" | "low" | "disarm".
 * @param {string} [o.part]                   Called part of the aim zone ("general" = none).
 * @param {Item|null} [o.weapon]              The weapon or missile that struck (its on-hit effects fire on a wound).
 */
export async function postStrike(attacker, target, aspect, impact, strikeDice, { locationFilter = null, armorPiercing = false, skill = null, aim = "mid", part = "general", weapon = null } = {}) {
  const aimDef = AIM[aimKey(aim)];
  const location = rollStrikeLocation(target, locationFilter ?? aimFilter(aim, part), aimDef.zone);
  if (!location) {
    return postNoLocations(target);
  }

  const roll = await new Roll(`${strikeDice}d6`).evaluate();
  const locType = location.system.locationType;
  // Armor Piercing (Bodkin): halve the Point armor on a piercing strike.
  const ap = armorPiercing && aspect === "piercing";
  const side = locationSide(location);
  let armorProt = armorProtection(target, locType, aspect, side);
  if (ap) armorProt = armorAfterPiercing(armorProt);

  // Attacker's Impact modifier (Active Effects: race traits, potions, invocations, magic); Close / Unarmed only (rules/strike-helpers.mjs).
  const impactBonus = impactBonusFor(skill, attacker?.system?.mods?.impact ?? 0);
  const effImpact = Math.max(0, impact + impactBonus + roll.total - armorProt);
  const locName = locationName(location, locType);

  const impStr = impactBonus ? `${impact}${impactBonus > 0 ? "+" : "&minus;"}${Math.abs(impactBonus)}` : `${impact}`;
  const apNote = ap ? ` (${L("apTag")})` : "";
  const detail = `${game.i18n.localize(DAMAGE_ASPECTS[aspect])} ${impStr} + ${roll.total} (${strikeDice}d6) &minus; ${armorProt}${apNote} = <b>${effImpact}</b> @ ${esc(locName)}`;

  await resolveWound({
    speaker: attacker,
    victim: target,
    title: `${esc(attacker.name)} &rarr; ${esc(target.name)}`,
    aspect,
    effImpact,
    location,
    detail,
    rolls: [roll],
    weapon
  });
}

/**
 * Injury Roll: resolve damage from a NON-combat source (a trap, a fall, extra
 * damage a GM rules) straight into a wound. Ask for Aspect + Total Damage + aim
 * zone (High / Mid / Low), roll a location in that zone, subtract that location's
 * armor for the aspect, then resolve the wound exactly like a strike (Add Wound
 * button, plus any forced Fumble/Stumble). Fired from the Combat tab's Injury.
 */
export async function rollInjury(actor) {
  if (!actor) return;

  const opts = await DialogV2.prompt({
    window: { title: L("injuryTitle") },
    content: `
      <div class="form-group"><label>${L("aspect")}</label><select name="aspect">${aspectOptions("blunt")}</select></div>
      <div class="form-group"><label>${L("injuryTotalDmg")}</label><input type="number" name="total" value="0" min="0" step="1" autofocus /></div>
      <div class="form-group"><label>${L("injuryZone")}</label>
        <select name="zone">
          <option value="high">${L("zoneHigh")}</option>
          <option value="medium" selected>${L("zoneMid")}</option>
          <option value="low">${L("zoneLow")}</option>
        </select></div>`,
    ok: {
      label: L("injuryTitle"),
      callback: (e, b) => ({
        aspect: b.form.elements.aspect.value,
        total: Number(b.form.elements.total.value) || 0,
        zone: b.form.elements.zone.value
      })
    },
    rejectClose: false
  });
  if (!opts) return;

  const location = rollStrikeLocation(actor, null, opts.zone);
  if (!location) {
    return postNoLocations(actor);
  }

  const locType = location.system.locationType;
  const armorProt = armorProtection(actor, locType, opts.aspect, locationSide(location));
  const effImpact = Math.max(0, opts.total - armorProt);
  const locName = locationName(location, locType);
  const detail = `${game.i18n.localize(DAMAGE_ASPECTS[opts.aspect])} ${opts.total} &minus; ${armorProt} = <b>${effImpact}</b> @ ${esc(locName)}`;

  await resolveWound({
    speaker: actor,
    victim: actor,
    title: `${L("injuryTitle")} &rarr; ${esc(actor.name)}`,
    aspect: opts.aspect,
    effImpact,
    location,
    detail
  });
}
