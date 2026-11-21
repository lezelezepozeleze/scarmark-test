/** The alterations an "alter" action offers: the entries of the armor and weapon alteration compendia (constants.mjs ALTERATION_PACKS). */
import { ALTERATION_PACKS } from "../constants.mjs";

/** @returns {Promise<Object<string, {uuid: string, name: string}[]>>} item type -> its alterations, sorted by name (empty when the compendium is missing) */
export async function listAlterations() {
  const lists = {};
  for (const [type, collection] of Object.entries(ALTERATION_PACKS)) {
    const pack = game.packs?.get?.(collection);
    const index = pack ? await pack.getIndex() : [];
    lists[type] = index.map(entry => ({ uuid: entry.uuid ?? `Compendium.${collection}.ActiveEffect.${entry._id}`, name: entry.name })).sort((a, b) => a.name.localeCompare(b.name));
  }
  return lists;
}
