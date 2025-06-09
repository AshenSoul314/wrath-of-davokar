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