/** Two buttons on the Active Effect config window: "Save" saves the changes made in the window to this effect (and keeps the window open), "Submit to the library" saves them and then sends the effect to the effect library (helpers/effect-library.mjs submitEffectToLibrary). They work for any effect, on an item or an actor. */
import { esc } from "../helpers/escape.mjs";
import { submitEffectToLibrary } from "../helpers/effect-library.mjs";

/** Save the changes made in the window to the effect, as the window's own save does, but keep the window open. */
async function saveChanges(app, root) {
  if (typeof app.submit === "function") await app.submit({ preventClose: true });
  else root.querySelector("form")?.requestSubmit();
}

/** renderActiveEffectConfig: put the buttons above the footer of the window. */
function addButtons(app, html) {
  const root = html instanceof HTMLElement ? html : html?.[0];
  const effect = app.document ?? app.object;
  if (!root || !effect || root.querySelector(".scarmark-library-buttons")) return;
  const t = (key) => game.i18n.localize(key);
  const bar = document.createElement("div");
  bar.className = "scarmark-library-buttons";
  bar.innerHTML = `<button type="button" data-library="save" title="${esc(t("SCARMARK.Effect.saveHint"))}"><i class="fa-solid fa-floppy-disk"></i> ${esc(t("SCARMARK.Effect.save"))}</button>`
    + `<button type="button" data-library="submit" title="${esc(t("SCARMARK.Effect.submitHint"))}"><i class="fa-solid fa-book-medical"></i> ${esc(t("SCARMARK.Effect.submitToLibrary"))}</button>`;
  const footer = root.querySelector("footer, .form-footer");
  if (footer) footer.before(bar);
  else root.append(bar);
  bar.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-library]");
    if (!button) return;
    event.preventDefault();
    await saveChanges(app, root);
    if (button.dataset.library === "submit") await submitEffectToLibrary(effect);
  });
}

/** Hook the buttons into the Active Effect config (called when the module loads). */
export function registerEffectLibraryButtons() {
  Hooks.on("renderActiveEffectConfig", addButtons);
}
