/** The Add menu of the actor Effects tab: a drop-down with a blank effect and the effect library (the effect compendiums), grouped by compendium. */
import { listEffectLibrary, applyLibraryEffect } from "../helpers/effect-library.mjs";
import { esc } from "../helpers/escape.mjs";
import { blankEffectData } from "./actions/effects.mjs";

/**
 * Open the menu under the Add button, or close it when it is open already. A pick creates a blank effect or puts a library effect on the sheet's actor.
 *
 * @param {ApplicationV2} sheet the actor sheet
 * @param {HTMLElement} target the Add button
 * @param {(document: Document, uuid: string) => Promise<object|null>} [addLibraryEffect] what picking a library effect does: put a started copy on an actor (the default) or a plain copy on an item
 */
export async function openEffectMenu(sheet, target, addLibraryEffect = applyLibraryEffect) {
  const open = sheet.element.querySelector(".effect-add-menu");
  if ( open ) return open.remove();

  const groups = await listEffectLibrary();
  const menu = document.createElement("div");
  menu.className = "effect-add-menu";
  menu.innerHTML = `<a class="effect-add-item" role="button" tabindex="0" data-blank="true"><i class="fa-solid fa-file"></i> ${esc(game.i18n.localize("SCARMARK.Effect.blank"))}</a>`
    + groups.map(g => `<div class="effect-add-group">${esc(g.label)}</div>`
      + g.entries.map(e => `<a class="effect-add-item" role="button" tabindex="0" data-uuid="${esc(e.uuid)}"><img src="${esc(e.img ?? "icons/svg/aura.svg")}" alt="" /> ${esc(e.name)}</a>`).join("")).join("");
  // On the sheet root, not inside the tab: the tab scrolls and clips, so a menu inside it was cut off and dragged the tab along. It is fixed to the window and placed under the button (or above it when there is no room below).
  sheet.element.append(menu);
  placeMenu(menu, target);

  // One controller removes all three document listeners, however the menu closes (also when the sheet is closed under it).
  const listeners = new AbortController();
  const close = () => { menu.remove(); listeners.abort(); };
  const on = (type, handler) => document.addEventListener(type, handler, { capture: true, signal: listeners.signal });
  on("pointerdown", (ev) => { if ( !menu.contains(ev.target) && !target.contains(ev.target) ) close(); });
  on("keydown", (ev) => { if ( ev.key === "Escape" ) { ev.stopPropagation(); close(); } });
  on("scroll", (ev) => { if ( !menu.contains(ev.target) ) close(); });   // the button moved away from the menu

  menu.addEventListener("click", async (ev) => {
    const entry = ev.target.closest(".effect-add-item");
    if ( !entry ) return;
    close();
    if ( entry.dataset.blank ) {
      sheet.document.createEmbeddedDocuments("ActiveEffect", [blankEffectData()]);
    } else if ( !await addLibraryEffect(sheet.document, entry.dataset.uuid) ) {
      ui.notifications.warn(game.i18n.localize("SCARMARK.Effect.libraryMissing"));
    }
  });
}

/** Place a fixed menu under the button, right-aligned to it, with a height that fits the window; above the button when there is more room there. */
function placeMenu(menu, button) {
  const margin = 8;
  const rect = button.getBoundingClientRect();
  const below = window.innerHeight - rect.bottom - margin;
  const above = rect.top - margin;
  const up = below < 200 && above > below;
  menu.style.maxHeight = `${Math.max(120, Math.min(up ? above : below, 420))}px`;
  // A transformed ancestor would shift "fixed" coordinates: measure where 0,0 really lands and correct for it.
  menu.style.left = "0px";
  menu.style.top = "0px";
  const origin = menu.getBoundingClientRect();
  const left = Math.max(margin, Math.min(rect.right, window.innerWidth - margin) - menu.offsetWidth);
  const top = up ? rect.top - 4 - menu.offsetHeight : rect.bottom + 4;
  menu.style.left = `${left - origin.left}px`;
  menu.style.top = `${top - origin.top}px`;
}
