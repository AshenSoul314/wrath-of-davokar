/**
 * Retrieves a CSS custom property (variable) from the root document styles
 * and converts it to a hexadecimal integer suitable for use in PixiJS.
 *
 * This allows you to define colors in SCSS/CSS (e.g., `--wod-color-*`) and
 * use them directly in canvas-based drawing methods like `beginFill()`.
 *
 * @param {string} varName - The name of the CSS variable to retrieve (e.g., "--wod-color-corruption-permanent").
 * @returns {number} A 24-bit hexadecimal color integer (e.g., 0xA44F88) for use with PixiJS fill and stroke styles.
 */

export function getCssColor(varName) {
  const hex = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  if (!hex) return 0x000000;
  return parseInt(hex.replace(/^#/, '0x'), 16);
}

export function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Sorts items by their base name and then by their system.rank.value
 *
 * @param {Array<Item>} items - Array of Foundry Items
 * @returns {Array<Item>} - A sorted array of items
 */
export function sortRankedItems(items) {
  return items.sort((a, b) => {
    // Base name = everything before ":" or full name if no colon
    const baseA = a.name.split(":")[0].trim();
    const baseB = b.name.split(":")[0].trim();

    if (baseA < baseB) return -1;
    if (baseA > baseB) return 1;

    // Get rank values safely
    const getRank = (item) => {
      return foundry.utils.getProperty(item, "system.rank.value") ?? 0;
    };
    return getRank(a) - getRank(b);
  });
}