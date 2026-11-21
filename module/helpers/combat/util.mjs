/** Small helpers shared by the combat modules: the DialogV2 class and L(), the localizer for SCARMARK.CombatAuto keys. */

export const { DialogV2 } = foundry.applications.api;

/** Localize a SCARMARK.CombatAuto key. */
export const L = (k) => game.i18n.localize(`SCARMARK.CombatAuto.${k}`);
