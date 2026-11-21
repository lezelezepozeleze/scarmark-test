// What the effect library keeps of an effect added on an item's Effects tab (helpers/effect-library.mjs).
import "./support/foundry-stub.mjs";
import { test } from "node:test";
import assert from "node:assert";
import { libraryEntryData } from "../module/helpers/effect-library.mjs";

test("libraryEntryData: the content stays, the ties to the item and the countdown go, it is enabled and does not transfer", () => {
  const source = {
    _id: "abc", name: "Freshly shaved", img: "icons/svg/aura.svg", origin: "Actor.x.Item.y", disabled: true, transfer: true,
    start: { time: 100 }, duration: { value: 2, units: "hours" }, system: { changes: [{ key: "system.itemMods.attack", type: "add", value: 1 }] },
    flags: { "scarmark-test": { librarySource: "Compendium.x", savedToLibrary: true, expireWorldTime: 7300 }, other: { keep: true } }
  };
  const copy = structuredClone(source);
  const data = libraryEntryData(source);
  assert.deepStrictEqual(source, copy);
  assert.deepStrictEqual(data, {
    name: "Freshly shaved", img: "icons/svg/aura.svg", disabled: false, transfer: false,
    duration: { value: 2, units: "hours" }, system: { changes: [{ key: "system.itemMods.attack", type: "add", value: 1 }] }, flags: { other: { keep: true } }
  });
  assert.deepStrictEqual(libraryEntryData({ name: "Plain" }), { name: "Plain", disabled: false, transfer: false });
});
