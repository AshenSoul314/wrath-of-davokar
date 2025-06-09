import { getCssColor } from './utils.mjs';

/**
 * Wraps the Token prototype's `drawBars` method to replace the second bar (`bar2`)
 * with a custom corruption bar visualization.
 *
 * The bar visually represents:
 * - Permanent corruption (dark tone)
 * - Temporary corruption (lighter tone)
 * - A threshold marker (gold line)
 *
 * Only activates if the token’s `bar2.attribute` is set to `"corruption"`.
 * The appearance is governed by system corruption data: `min`, `temporary`, `max`, and `threshold`.
 *
 * @function
 * @returns {void}
 */
export function wrapDrawBars() {
  const original = Token.prototype.drawBars;
  
  Token.prototype.drawBars = function () {
    // Run original method first
    const bars = original.call(this);

    // Get the actor’s corruption data
    const corruption = this.actor?.system?.corruption;
    if (!corruption) return bars;

    // Ensure bar2 is assigned to system.corruption
    const attr = this.document.bar2?.attribute;
    if (attr !== "corruption") return bars;

    const { min: permanent = 0, temporary = 0, max: max = 0, threshold: threshold = 0 } = corruption;
    if (max <= 0) return bars;

    const bar = this.bars?.bar2;
    if (!bar || typeof bar.clear !== "function") return bars;

    // Clear and redraw corruption segments
    bar.clear();

    const width = this.w;
    const height = 8;

    const permColor =  getCssColor('--wod-color-corruption');
    const tempColor =  getCssColor('--wod-color-corruption-light');
    const thresholdColor =  getCssColor('--wod-color-gold-light');

    const permWidth = (permanent / max) * width;
    const tempWidth = (temporary / max) * width;
    const thresholdX = (threshold / max) * width;

    // Draw BG
    bar.lineStyle(1, 0x000000, 1.0);
    bar.beginFill(0x000000, 0.5)
    bar.drawRoundedRect(0, 0, width, height, 3);

    // Permanent corruption segment
    bar.beginFill(permColor);
    bar.lineStyle(1, 0x000000, 1.0);
    bar.drawRoundedRect(0, 0, permWidth, height, 3);
    bar.endFill();

    // Temporary corruption segment
    bar.beginFill(tempColor);
    bar.lineStyle(1, 0x000000, 1.0);
    bar.drawRoundedRect(permWidth, 0, tempWidth, height, 3);
    bar.endFill();

    // Threshold
    bar.lineStyle(2, thresholdColor, 1.0); // 2px thick, gold color
    bar.moveTo(thresholdX, 0);
    bar.lineTo(thresholdX, height);
    bar.endFill();

    // Tooltip
    bar.name = `Corruption: ${permanent + temporary} (${permanent} perm + ${temporary} temp)`;

    return bars;
  }
}

/**
 * Adds a custom Willpower tracker to the token HUD.
 *
 * - Displays current willpower (`✦` + value) and tooltip with max.
 * - Clicking left increases WP by 1 (up to max).
 * - Right-clicking decreases WP by 1 (down to 0).
 * - Prevents duplicate HUD elements and respects current token context.
 *
 * @hook renderTokenHUD
 * @param {TokenHUD} hud - The rendered HUD instance.
 * @param {jQuery} html - jQuery-wrapped HTML of the HUD.
 * @param {object} tokenData - Data for the token associated with the HUD.
 */
Hooks.on("renderTokenHUD", (hud, html, tokenData) => {
  const token = canvas.tokens.get(tokenData._id);
  const actor = token?.actor;
  if (!actor) return;

  /* ------------------------------------------ */
  /*  Willpower Tracker                         */
  /* ------------------------------------------ */
  const wp = actor.system?.willpower?.value ?? 0;
  const max = actor.system?.willpower?.max ?? 10;

  // Prevent duplicates
  html.find(".wp-hud").remove();

  // Create Willpower display
  const wpDisplay = $(`
    <div class="control-icon wp-hud" title="Willpower: ${wp}/${max}">
      <span>✦</span><span class="wp-count">${wp}</span>
    </div>
  `);

  // Optional: click to reduce by 1 (demo functionality)
  wpDisplay.on("mouseup", async (event) => {

    let newWP = 0
    if (event.button === 0) {
      newWP = Math.min(max, wp + 1);
    } else if (event.button === 2) {
      newWP = Math.max(0, wp - 1);
    } else {
      return;
    }
    await actor.update({ "system.willpower.value": newWP });
  });

  // Append to the right side of the HUD
  html.find(".col.right").append(wpDisplay);
});