/**
 * Shared chat formatting for any success test. Standard layout:
 *
 *   Test Name            (bold title)
 *   Target: <n>
 *   Roll:   <n>
 *   ------------------
 *   <Outcome>            (CS bold green / MS green / MF red / CF bold red)
 */

/** Localized name of a success level (cs, ms, mf, cf). */
export const outcomeLabel = (level) => game.i18n.localize(`SCARMARK.CombatAuto.level.${level}`);

/**
 * One test block (title + Target/Roll + coloured outcome). Pass `level`
 * (cs/ms/mf/cf) for a standard test, or `label`+`cls` for a custom pass/fail.
 * `title` goes into the HTML as it is: it must already be HTML-safe (escape names with esc()).
 * `label` is HTML too.
 */
export function testBlock({ title, target, roll, level, label, cls }) {
  const outLabel = label ?? outcomeLabel(level);
  const outClass = cls ?? `outcome-${level}`;
  return `
    <div class="test-block">
      <div class="card-title">${title}</div>
      <div class="card-line">${game.i18n.localize("SCARMARK.Target")}: ${target}</div>
      <div class="card-line">${game.i18n.localize("SCARMARK.Roll")}: ${roll}</div>
      <hr class="card-sep">
      <div class="test-outcome ${outClass}">${outLabel}</div>
    </div>`;
}

/** A standalone test card (one block wrapped in a Scarmark chat card). Takes the testBlock arguments; `title` must already be HTML-safe. */
export function testCard(args) {
  return `<div class="scarmark-card test-card">${testBlock(args)}</div>`;
}
