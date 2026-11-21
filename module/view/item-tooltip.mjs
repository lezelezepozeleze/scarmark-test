/**
 * What the item tooltip shows: every detail of an inventory item, as a title, label and value lines and the notes. Pure: no Foundry globals; the text comes through the `context` functions, so the Node tests can check it.
 */
import { ownWeight, itemWeight, contentsWeight, containerFill, directChildren } from "../rules/index.mjs";
import { ASPECT_LETTERS, RANGE_PENALTY } from "../config/index.mjs";
import { formatNumber, durabilityText } from "./format.mjs";
import { fillText } from "./inventory-view.mjs";

const ASPECTS = Object.keys(ASPECT_LETTERS);
const BANDS = Object.keys(RANGE_PENALTY);
const LETTERS = Object.values(ASPECT_LETTERS).join("/");
const BAND_LETTERS = BANDS.map(band => band[0].toUpperCase()).join("/");
const NOTES_LIMIT = 400;

/** Text of a rich-text (HTML) description: tags removed, block ends become line breaks, the common entities decoded. */
export function plainText(html) {
  return String(html ?? "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6])>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** The values of an aspect or range band table, "a / b / c / d", "-" for a missing value and for -1 (not available). */
const stats = (table, keys) => keys.map(key => (table?.[key] === -1 ? "-" : (table?.[key] ?? "-"))).join(" / ");

/**
 * @param {object} item the inventory item ({id, type, name, system})
 * @param {object[]} items every item of the same actor (for the container and its contents)
 * @param {{t: (key: string, data?: object) => string, typeLabel?: (type: string) => string, label?: (group: string, key: string) => string, coverageLabel?: (entry: object) => string}} context
 *        t looks up SCARMARK.Tooltip.<key>; typeLabel names an item type; label names a skill, aspect or velocity key; coverageLabel names an armor coverage entry
 * @returns {{title: string, lines: {label: string, value: string}[], notes: string}}
 */
export function itemTooltip(item, items, { t, typeLabel = (type) => type, label = (group, key) => key, coverageLabel = (entry) => entry.type }) {
  const sys = item.system ?? {};
  const lines = [];
  const add = (name, value, data) => {
    if (value == null || value === "") return;
    lines.push({ label: t(name, data), value: String(value) });
  };
  const aspects = { letters: LETTERS };
  const bands = { letters: BAND_LETTERS };
  const yesNo = (flag) => (flag ? t("yes") : t("no"));
  const kg = (value) => `${formatNumber(value)} kg`;

  add("type", sys.rune ? t("rune") : typeLabel(item.type));
  add("quantity", sys.quantity);
  if (sys.weight !== undefined) add("weightEach", kg(sys.weight));
  add("weightTotal", kg(item.type === "container" ? ownWeight(item) + contentsWeight(items, item.id) : itemWeight(item)));
  add("valueEach", sys.value);
  add("valueTotal", sys.totalValue);
  if (sys.carried !== undefined) add("carried", yesNo(sys.carried));
  if (sys.container) add("storedIn", items.find(i => i.id === sys.container)?.name ?? t("unknown"));
  if (item.type === "armor") add("durability", durabilityText(sys.quality, sys.originalQuality));
  else if (["weapon", "missile"].includes(item.type)) add("durability", sys.quality);

  switch (item.type) {
    case "weapon":
      add("attackDefense", `${sys.attack} / ${sys.defense}`);
      add("impact", stats(sys.impact, ASPECTS), aspects);
      add("skill", label("skill", sys.associatedSkill));
      add("specialization", sys.specialization);
      add("shield", yesNo(sys.isShield));
      add("broken", yesNo(sys.broken));
      break;
    case "armor":
      add("layer", sys.layer);
      add("protection", stats(sys.protection, ASPECTS), aspects);
      add("locations", [...(sys.coverage ?? [])].map(entry => coverageLabel(entry)).join(", "));
      break;
    case "missile":
      add("velocity", label("velocity", sys.velocity));
      add("aspect", label("aspect", sys.aspect));
      add("skill", label("skill", sys.associatedSkill));
      add("specialization", sys.specialization);
      add("range", stats(sys.range, BANDS), bands);
      add("impactBands", stats(sys.impact, BANDS), bands);
      if (sys.magic) add("magicClass", sys.spellClass);
      break;
    case "container": {
      const fill = containerFill(items, item);
      add("contents", `${fillText(fill)} kg`);
      add("items", directChildren(items, item.id).map(i => `${i.name} ×${i.system?.quantity ?? 1}`).join(", ") || t("empty"));
      break;
    }
  }

  if (sys.rune || sys.artifact?.active) {
    add("artifactClass", sys.artifact?.class);
    add("attuned", yesNo(sys.artifact?.attuned));
  }

  const text = [sys.notes, plainText(sys.description)].filter(Boolean).join("\n\n");
  return { title: item.name, lines, notes: text.length > NOTES_LIMIT ? `${text.slice(0, NOTES_LIMIT)}…` : text };
}
