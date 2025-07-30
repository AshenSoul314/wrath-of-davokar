import { WRATH_OF_DAVOKAR } from "../config.mjs";

export const MacroRegistry = {};

/**
 * Register a lazy macro loader.
 * @param {string} id
 * @param {string} localName
 * @param {Function} loaderFunc
 */
export function registerMacroLoader(id, localName, loaderFunc) {
    if (id in MacroRegistry) {
        ui.notifications.warn(game.il8.format(WRATH_OF_DAVOKAR.Item.Macro.Error.DuplicateError, {macroName: localName, id: id}));
    } else {
      MacroRegistry[id] = {
        'localize': localName,
        'loader': loaderFunc
      }
    }
}

export async function executeMacro(id, ...args) {
  if (!(id in MacroRegistry)) {
    ui.notifications.error(game.il8.format(WRATH_OF_DAVOKAR.Item.Macro.Error.KeyError, {id: id}));
    return;
  }
  const loaderFunc = MacroRegistry[id]['loader'];
  const macro = await loaderFunc(); 

  if (typeof macro !== 'function') {
    localName = MacroRegistry[id]['localize']
    ui.notifications.error(game.il8.format(WRATH_OF_DAVOKAR.Item.Macro.Error.ValueError, {macroName: localName, id: id}));
    return;
  }

  return macro(...args);
}
