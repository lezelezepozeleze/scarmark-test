/** The tests the Actions panel offers: every attribute, and every skill of the Skills compendium (the canonical names; the character rolls against its own skill of that name). */
import { ATTRIBUTES } from "../config/index.mjs";
import { PACKS } from "../constants.mjs";

/** The groups of the test roll-down: [{ label, options: [{ value, label }] }]. A value is "attribute:<key>" or "skill:<name>" (rules/actions.mjs parseActionTest). */
export async function listActionTests() {
  const attributes = Object.entries(ATTRIBUTES).map(([key, attribute]) => ({ value: `attribute:${key}`, label: game.i18n.localize(attribute.label) }));
  const groups = [{ label: game.i18n.localize("SCARMARK.Action.testAttributes"), options: attributes }];
  const pack = game.packs?.get?.(PACKS.skills);
  if (pack) {
    const index = await pack.getIndex();
    const names = [...new Set(index.map(entry => entry.name).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    groups.push({ label: game.i18n.localize("SCARMARK.Action.testSkills"), options: names.map(name => ({ value: `skill:${name}`, label: name })) });
  }
  return groups;
}
