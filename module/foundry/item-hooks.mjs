/** Hooks on items: a library effect that an action picks is copied onto the item, an "owned" action makes its effect transfer to the owner (helpers/item-actions.mjs). */
import { materializeActionEffects, syncOwnedEffects } from "../helpers/item-actions.mjs";

/** Register the item hooks (called when the module loads). */
export function registerItemHooks() {
  // Only the client that made the change syncs the effects (it is the one with permission and the others would repeat it).
  Hooks.on("updateItem", (item, changes, options, userId) => {
    if (userId !== game.user.id) return;
    if (!foundry.utils.hasProperty(changes, "system.actions")) return;
    materializeActionEffects(item).then(() => syncOwnedEffects(item)).catch(err => console.error("Scarmark | syncing the actions of an item failed", err));
  });
}
