/**
 * The item tooltip: hover an item row of a gear list (Gear tab, Containers tab, chest list) for a quarter of a second and a floating box shows every detail of the item. It hides when a button is pressed, a drag starts, the page scrolls or a window renders.
 */
import { SCARMARK } from "../config.mjs";
import { itemTooltip } from "../view/item-tooltip.mjs";
import { coverageLabel } from "../view/armor-coverage.mjs";
import { localizer } from "./i18n.mjs";

const T = localizer("SCARMARK.Tooltip");
const SHOW_DELAY_MS = 250;
const ROW_SELECTOR = [
  ".scarmark.sheet.actor .tab.gear [data-item-id]",
  ".scarmark.sheet.actor .tab.containers [data-item-id]",
  ".scarmark.sheet.actor [data-sm-chest-id]"
].join(",");
const CONTROLS = ".col-actions,.container-actions,[data-sm-container-action],input,select,textarea,[contenteditable]";

/** The actor of the sheet an element is in. */
function sheetActor(element) {
  const root = element.closest(".scarmark.sheet.actor");
  for (const app of foundry.applications.instances.values()) if (app.element === root) return app.document;
  return null;
}

/** Names for the keys the tooltip prints: skills, aspects, velocities and hit locations come from config and lang. */
const LABEL_TABLES = {
  skill: SCARMARK.combatSkills,
  aspect: SCARMARK.damageAspects,
  velocity: SCARMARK.missileVelocities
};

function label(group, key) {
  const entry = LABEL_TABLES[group]?.[key];
  return entry ? game.i18n.localize(entry) : (key ?? "");
}

const i18n = { localize: (key) => game.i18n.localize(key), format: (key, data) => game.i18n.format(key, data) };

const context = {
  t: T,
  typeLabel: (type) => game.i18n.localize(`TYPES.Item.${type}`),
  label,
  coverageLabel: (entry) => coverageLabel(entry, i18n)
};

let tip = null;
let registered = false;

function build(element, row) {
  const actor = sheetActor(row);
  const item = actor?.items.get(row.dataset.smChestId ?? row.dataset.itemId);
  if (!item) return false;
  const model = itemTooltip(item, actor.items.contents, context);

  element.replaceChildren();
  const title = document.createElement("h3");
  title.textContent = model.title;
  element.append(title);
  for (const { label: name, value } of model.lines) {
    const line = document.createElement("div");
    line.className = "detail";
    for (const text of [name, value]) {
      const span = document.createElement("span");
      span.textContent = text;
      line.append(span);
    }
    element.append(line);
  }
  if (model.notes) {
    const notes = document.createElement("div");
    notes.className = "notes";
    notes.textContent = model.notes;
    element.append(notes);
  }
  return true;
}

/** Set up the tooltip once (the ready hook). */
export function registerItemTooltip() {
  if (registered) return;
  registered = true;

  tip = document.createElement("div");
  tip.className = "scarmark sm-item-tooltip";
  document.body.append(tip);

  let current = null;
  let timer = null;
  let pressed = false;
  let dragging = false;
  let x = 0;
  let y = 0;

  const place = (offset = 15) => {
    const { width, height } = tip.getBoundingClientRect();
    tip.style.left = `${Math.max(8, Math.min(x + offset, innerWidth - width - 8))}px`;
    tip.style.top = `${Math.max(8, Math.min(y + offset, innerHeight - height - 8))}px`;
  };

  const hide = () => {
    clearTimeout(timer);
    timer = current = null;
    tip.style.display = "none";
  };

  const show = (row) => {
    if (pressed || dragging || !row.isConnected) return;
    if (build(tip, row) === false) return hide();
    tip.style.display = "block";
    place();
  };

  document.addEventListener("pointermove", (event) => {
    x = event.clientX;
    y = event.clientY;
    if (pressed || dragging || event.buttons || (event.pointerType && event.pointerType !== "mouse")) return hide();

    const target = event.target instanceof Element ? event.target : null;
    const row = target && !target.closest(CONTROLS) ? target.closest(ROW_SELECTOR) : null;
    if (!row) return hide();

    if (row !== current) {
      hide();
      current = row;
      timer = setTimeout(() => { timer = null; if (current === row) show(row); }, SHOW_DELAY_MS);
    } else if (tip.style.display === "block") {
      place();
    }
  }, true);

  const end = () => { dragging = pressed = false; hide(); };
  window.addEventListener("pointerdown", () => { pressed = true; hide(); }, true);
  for (const name of ["pointerup", "pointercancel"]) window.addEventListener(name, () => { pressed = false; }, true);
  window.addEventListener("dragstart", () => { dragging = true; hide(); }, true);
  for (const name of ["dragend", "drop"]) window.addEventListener(name, end, true);
  window.addEventListener("blur", end);
  document.addEventListener("scroll", hide, true);
  Hooks.on("renderApplicationV2", hide);
}
