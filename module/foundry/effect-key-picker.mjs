/**
 * Add a "pick a key" dropdown before each change-key text input in the Active Effect config, so the GM chooses from the Scarmark mod keys / attributes / skills instead of typing them. The text input stays editable for custom keys.
 */
import { PACKS } from "../constants.mjs";
import { buildEffectKeyOptions } from "../view/effects-view.mjs";
import { esc } from "../helpers/escape.mjs";

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

/** renderActiveEffectConfig: put a key picker before every change-key input of the sheet. */
function addPickers(app, html) {
  const root = html instanceof HTMLElement ? html : html?.[0];
  if (!root) return;

  const groups = buildEffectKeyOptions(app.document ?? app.object, { skillNames, localize: (key) => game.i18n.localize(key) });
  const optionsHtml = groups.map(g =>
    `<optgroup label="${esc(g.label)}">`
    + g.options.map(([key, label]) => `<option value="${esc(key)}">${esc(label)}</option>`).join("")
    + "</optgroup>"
  ).join("");

  for (const input of root.querySelectorAll('input[name$=".key"]')) {
    if (input.previousElementSibling?.classList?.contains("scarmark-key-picker")) continue;
    const select = document.createElement("select");
    select.className = "scarmark-key-picker";
    select.innerHTML = `<option value="">${esc(game.i18n.localize("SCARMARK.EffectPicker.pickKey"))}</option>${optionsHtml}`;
    select.value = input.value || "";
    select.addEventListener("change", () => {
      if (!select.value) return;
      input.value = select.value;
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
    input.parentElement.insertBefore(select, input);
  }
}

/** Hook the picker into the Active Effect config (called when the module loads). */
export function registerEffectKeyPicker() {
  Hooks.on("renderActiveEffectConfig", addPickers);
}
