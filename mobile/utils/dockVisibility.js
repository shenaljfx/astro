/**
 * Dock visibility bus — screens that need a full-bleed, chrome-free view
 * (e.g. the chat room) ask the observatory dock to step aside, and restore
 * it on the way out. Mirrors the dock's existing keyboard-hide pattern:
 * a plain signal, the dock owns its own rendering.
 */
var hidden = false;
var listeners = new Set();

export function setDockHidden(next) {
  next = !!next;
  if (next === hidden) return;
  hidden = next;
  listeners.forEach(function (fn) { fn(hidden); });
}

export function getDockHidden() {
  return hidden;
}

export function subscribeDockHidden(fn) {
  listeners.add(fn);
  return function () { listeners.delete(fn); };
}
