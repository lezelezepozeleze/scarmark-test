/** The chat card of an esoteric item's Description (spell, invocation, psionic talent), shared privately from the Esoterics tab. */
import { esc } from "./escape.mjs";

/**
 * Post an esoteric item's Description to chat, privately whispered to every GM
 * plus the actor's owner(s) - so a player's spell/invocation/psionic write-up
 * is shared only between them and the GM.
 *
 * @param {Actor} actor the actor that has the item
 * @param {Item} item the spell, invocation or psionic talent
 */
export async function postEsotericCard(actor, item) {
  const desc = await foundry.applications.ux.TextEditor.implementation.enrichHTML(
    item.system.description ?? "", { relativeTo: item });
  const whisper = game.users.filter(u => u.isGM || actor.testUserPermission(u, "OWNER")).map(u => u.id);
  const name = esc(item.name);
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    whisper,
    content: `<div class="scarmark-card"><header class="card-header"><h3>${name}</h3></header>`
      + `<div class="card-desc">${desc || "&mdash;"}</div></div>`
  });
}
