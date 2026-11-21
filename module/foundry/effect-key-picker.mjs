/**
 * Add the Scarmark box to the Active Effect config (what the effect is about, ongoing or immediate, only one at a time) and a "pick a key" dropdown before each change-key text input that lists the stats of the chosen type, so the GM chooses instead of typing. The text input stays editable for custom keys.
 */
import { PACKS, FLAGS } from "../constants.mjs";
import { buildEffectTypes } from "../view/effects-view.mjs";
import { esc } from "../helpers/escape.mjs";
import { listActionTests } from "../helpers/action-tests.mjs";
import { listEffectLibrary } from "../helpers/effect-library.mjs";
import { ON_HIT_ITEM_TYPES } from "../config/index.mjs";

/** The canonical skill names from the Skills compendium (filled by cacheSkillNames). */
let skillNames = [];

/** Cache the canonical skill names (from the Skills compendium) so the picker can offer per-skill keys even on an Item that isn't on an actor yet (the key pairs by name once the effect lands on an actor). The ready hook. */
export async function cacheSkillNames() {
  const pack = game.packs.get(PACKS.skills);
  if (!pack) return;
  try {
    const index = await pack.getIndex();
    skillNames = [...new Set(index.map(e => e.name).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  } catch (e) {
    console.warn("Scarmark | could not cache skill names for the effect picker", e);
  }
}

/** The lang key of each one-shot operation (config/actions.mjs IMMEDIATE_OPERATIONS). */
const OPERATION_LABELS = { repair: "SCARMARK.EffectPicker.opRepair" };

/** The name of a form field that stores a flag of this system on the effect. */
const flagName = (key) => `flags.${FLAGS.scope}.${key}`;

/** The options of a roll-down: `<optgroup>`s of `{ label, options: [[value, label], ...] }`, after an empty first option. */
const groupsHtml = (groups, empty = "") => `<option value="">${esc(empty)}</option>` + groups.map(g =>
  `<optgroup label="${esc(g.label)}">` + g.options.map(([value, label]) => `<option value="${esc(value)}">${esc(label)}</option>`).join("") + "</optgroup>"
).join("");

/** The "Scarmark" box of the effect sheet: what the effect is about, ongoing or immediate (with what it does and how much), and the only-one-at-a-time box. The fields carry flag names, so the sheet saves them with the effect. */
function kindBoxHtml(effectDoc, { start, types }) {
  const t = (key) => esc(game.i18n.localize(key));
  const flag = (key) => effectDoc?.getFlag?.(FLAGS.scope, key);
  const type = flag(FLAGS.effectType) || start;
  const operation = flag(FLAGS.alteration) ?? "";
  const typeOptions = types.map(entry => `<option value="${esc(entry.type)}"${entry.type === type ? " selected" : ""}>${esc(entry.label)}</option>`).join("");
  return `<fieldset class="scarmark-effect-kind">
    <legend>Scarmark</legend>
    <div class="form-group"><label>${t("SCARMARK.EffectPicker.about")}</label><select name="${flagName(FLAGS.effectType)}" class="scarmark-effect-type">${typeOptions}</select></div>
    <div class="form-group"><label>${t("SCARMARK.EffectPicker.kind")}</label><select class="scarmark-effect-kind-select"><option value="ongoing">${t("SCARMARK.EffectPicker.kindOngoing")}</option><option value="immediate"${operation ? " selected" : ""}>${t("SCARMARK.EffectPicker.kindImmediate")}</option></select></div>
    <div class="form-group scarmark-immediate-row"><label>${t("SCARMARK.EffectPicker.operation")}</label><select name="${flagName(FLAGS.alteration)}" class="scarmark-effect-operation" data-value="${esc(operation)}"></select></div>
    <div class="form-group scarmark-onhit-row"><label><input type="checkbox" name="${flagName(FLAGS.onHit)}"${flag(FLAGS.onHit) ? " checked" : ""}> ${t("SCARMARK.EffectPicker.onHit")}</label>
      <label>${t("SCARMARK.EffectPicker.onHitTest")}</label><select name="${flagName(FLAGS.onHitTest)}" class="scarmark-onhit-test" data-value="${esc(flag(FLAGS.onHitTest) ?? "")}"></select>
      <label>${t("SCARMARK.EffectPicker.onHitEffect")}</label><select name="${flagName(FLAGS.onHitEffect)}" class="scarmark-onhit-effect" data-value="${esc(flag(FLAGS.onHitEffect) ?? "")}"></select>
      <label>${t("SCARMARK.EffectPicker.charges")}</label><input type="number" min="1" step="1" name="${flagName(FLAGS.charges)}" value="${esc(flag(FLAGS.charges) ?? "")}" placeholder="${t("SCARMARK.EffectPicker.chargesNone")}"></div>
    <div class="form-group"><label><input type="checkbox" name="${flagName(FLAGS.unique)}"${flag(FLAGS.unique) ? " checked" : ""}> ${t("SCARMARK.EffectPicker.unique")}</label></div>
  </fieldset>`;
}

/** Fill the two roll-downs of the on-hit row: the tests the target can be asked for (attributes and skills) and the effects it can get (the effect library), keeping the stored choice. The lists come from compendia, so this finishes after the sheet is shown. */
async function fillOnHitChoices(box) {
  const fill = (select, groups) => {
    select.innerHTML = groupsHtml(groups);
    select.value = select.dataset.value;
  };
  const tests = await listActionTests();
  fill(box.querySelector(".scarmark-onhit-test"), tests.map(group => ({ label: group.label, options: group.options.map(o => [o.value, o.label]) })));
  const library = await listEffectLibrary();
  fill(box.querySelector(".scarmark-onhit-effect"), library.map(group => ({ label: group.label, options: group.entries.map(e => [e.uuid, e.name]) })));
}

/** renderActiveEffectConfig: add the Scarmark box (what it is about, ongoing or immediate, unique) and, before every change-key input, a stat picker that lists only the stats of the chosen type. */
function addPickers(app, html) {
  const root = html instanceof HTMLElement ? html : html?.[0];
  if (!root || root.querySelector(".scarmark-effect-kind")) return;

  const effectDoc = app.document ?? app.object;
  const picker = buildEffectTypes(effectDoc, { skillNames, localize: (key) => game.i18n.localize(key) });
  const form = root.matches?.("form") ? root : (root.querySelector("form") ?? root);
  const footer = form.querySelector("footer, .form-footer");
  form.insertAdjacentHTML("beforeend", kindBoxHtml(effectDoc, picker));
  const box = form.querySelector(".scarmark-effect-kind");
  if (footer) form.append(footer);

  const typeSelect = box.querySelector(".scarmark-effect-type");
  const kindSelect = box.querySelector(".scarmark-effect-kind-select");
  const operationSelect = box.querySelector(".scarmark-effect-operation");
  const immediateRow = box.querySelector(".scarmark-immediate-row");
  const onHitRow = box.querySelector(".scarmark-onhit-row");
  const current = () => picker.types.find(entry => entry.type === typeSelect.value) ?? picker.types[0];

  const selects = [];
  for (const input of root.querySelectorAll('input[name$=".key"]')) {
    if (input.previousElementSibling?.classList?.contains("scarmark-key-picker")) continue;
    const select = document.createElement("select");
    select.className = "scarmark-key-picker";
    select.addEventListener("change", () => {
      if (!select.value) return;
      input.value = select.value;
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
    input.parentElement.insertBefore(select, input);
    selects.push({ select, input });
  }

  /** Fill the stat roll-downs for the chosen type, and make the rest of the box agree with it. `changed` is true when the user just picked the type (only then is Transfer touched, so opening a sheet never changes the effect). */
  const refresh = (changed = false) => {
    const type = current();
    for (const { select, input } of selects) {
      select.innerHTML = groupsHtml(type.groups, game.i18n.localize("SCARMARK.EffectPicker.pickKey"));
      select.value = input.value || "";
    }
    // The immediate kind is for the items that have an operation (a weapon, an armor piece); the others are always ongoing.
    const immediateAllowed = type.operations.length > 0;
    kindSelect.querySelector('option[value="immediate"]').disabled = !immediateAllowed;
    if (!immediateAllowed) kindSelect.value = "ongoing";
    operationSelect.innerHTML = `<option value=""></option>` + type.operations.map(op => `<option value="${esc(op)}">${esc(game.i18n.localize(OPERATION_LABELS[op] ?? op))}</option>`).join("");
    // An ongoing effect has no operation: the empty option is saved, which clears the flag (a disabled field would not be saved and an old repair marker would stay).
    const wanted = operationSelect.dataset.value;
    operationSelect.value = kindSelect.value === "immediate" ? (type.operations.includes(wanted) ? wanted : (type.operations[0] ?? "")) : "";
    immediateRow.hidden = kindSelect.value !== "immediate";
    // Firing when the item wounds only makes sense on a weapon or a missile.
    onHitRow.hidden = !ON_HIT_ITEM_TYPES.includes(type.type);
    // An item effect must not transfer to the owner or its stats would not count.
    if (changed && type.type !== "character") {
      const transfer = form.querySelector('input[name="transfer"]');
      if (transfer) transfer.checked = false;
    }
  };
  fillOnHitChoices(box);
  typeSelect.addEventListener("change", () => refresh(true));
  kindSelect.addEventListener("change", () => refresh());
  operationSelect.addEventListener("change", () => { operationSelect.dataset.value = operationSelect.value; });
  refresh();
}

/** Hook the picker into the Active Effect config (called when the module loads). */
export function registerEffectKeyPicker() {
  Hooks.on("renderActiveEffectConfig", addPickers);
}
