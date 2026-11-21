/** The flags of this system on an effect given as plain data or as a document. Pure. */
import { FLAGS } from "../constants.mjs";

/** @returns {object} the effect's flags under the system scope ({} when it has none) */
export const effectFlags = (effect) => effect?.flags?.[FLAGS.scope] ?? {};
