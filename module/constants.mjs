/**
 * The string ids Scarmark stores or looks up by name: flags, settings, compendium
 * packs and user queries. They are saved in worlds (flags, settings) or called by
 * world macros (scripts/macros), so change a value only together with a migration.
 */

export const SYSTEM_ID = "scarmark-test";

/** Where the system's Handlebars templates are served from (Foundry paths start at `systems/<id>/`). */
export const TEMPLATE_DIR = `systems/${SYSTEM_ID}/templates/`;

/** Document flags, all under the `scarmark-test` scope (macro request-roll.js uses its own world-scope flags). */
export const FLAGS = {
  scope: SYSTEM_ID,
  /** Actor: id of the combat in which the actor rolled a critical Shock Roll (Grit). */
  shockGrit: "shockGrit",
  /** ChatMessage: the maneuver card payload ({maneuver, actorUuid, targetUuid}); older cards used flags.world.smManeuver. */
  maneuver: "maneuver",
  /** ActiveEffect on an item: true when an "owned" action made the effect transfer to the owner (helpers/item-actions.mjs syncOwnedEffects). */
  ownedByAction: "ownedByAction",
  /** ActiveEffect on an item: the uuid of the library effect it was copied from when an action picked it (helpers/item-actions.mjs materializeActionEffects). */
  librarySource: "librarySource",
  /** ActiveEffect on an item: set when an "improve" action put the effect there; the value is the source it came from (the alteration compendium entry), so one source cannot improve an item twice (helpers/item-actions.mjs). */
  improvedBy: "improvedBy",
  /** ActiveEffect in an alteration compendium: "repair" marks the entry that repairs the item instead of modifying it (config/actions.mjs ALTERATION_REPAIR). */
  alteration: "alteration",
  /** Combat: last round for which combat Fatigue and bleeding were applied. */
  lastFatigueRound: "lastFatigueRound",
  /** ActiveEffect: world time at which a consumed item's effect expires (see foundry/effect-expiry.mjs). */
  expireWorldTime: "expireWorldTime"
};

/** World settings registered in the init hook. */
export const SETTINGS = {
  /** Hidden: true once convert-to-metric.js has converted weights and distances. */
  metricUnits: "metricUnits"
};

/** Compendium pack ids (`scarmark-test.<name>`, as declared in system.json). */
export const PACKS = {
  skills: `${SYSTEM_ID}.skills`,
  effects: `${SYSTEM_ID}.effects`
};

/** The compendia of the alterations of an item: the Active Effects an alter action offers for an item of that type (config/actions.mjs ALTERABLE_ITEM_TYPES). They are not part of the effect library. */
export const ALTERATION_PACKS = {
  armor: `${SYSTEM_ID}.armor-alterations`,
  weapon: `${SYSTEM_ID}.weapon-alterations`
};

/** User queries run on the active GM's client. */
export const QUERIES = {
  updateCombatItem: `${SYSTEM_ID}.updateCombatItem`
};
