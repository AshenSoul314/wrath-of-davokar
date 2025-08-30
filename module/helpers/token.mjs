import { getCssColor } from './utils.mjs';
const Token = foundry.canvas.placeables.Token;
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
    const scale = canvas.dimensions.uiScale;
    const barThickness = 8 * (this.document.height >= 2 ? 1.5 : 1) * scale;
    const wpGap = 3 * scale;

    // ----------------------------------------
    //            CORRUPTION BAR
    // ----------------------------------------
    // Get the actor’s corruption data
    const corruption = this.actor?.system?.corruption;
    if (!corruption) return bars;

    // Ensure bar2 is assigned to system.corruption
    const attr = this.document.bar2?.attribute;
    if (attr !== "corruption") return bars;

    const { min: permanent = 0, temporary = 0, max: maxCorruption = 0, threshold: threshold = 0 } = corruption;
    if (maxCorruption <= 0) return bars;

    const bar2 = this.bars?.bar2;
    if (!bar2 || typeof bar2.clear !== "function") return bars;

    // Clear and redraw corruption segments
    bar2.clear();

    const corrBarwidth = this.w;

    const permColor =  getCssColor('--wod-color-corruption');
    const tempColor =  getCssColor('--wod-color-corruption-light');
    const thresholdColor = getCssColor('--wod-color-gold-bright');

    const permWidth = (permanent / maxCorruption) * corrBarwidth;
    const tempWidth = (temporary / maxCorruption) * corrBarwidth;
    const thresholdX = (threshold / maxCorruption) * corrBarwidth;

    // Draw BG
    bar2.lineStyle(1, 0x000000, 1.0);
    bar2.beginFill(0x000000, 0.5)
    bar2.drawRoundedRect(0, 0, corrBarwidth, barThickness, 3);
    bar2.endFill();

    // Permanent corruption segment
    bar2.beginFill(permColor);
    bar2.lineStyle(1, 0x000000, 1.0);
    bar2.drawRoundedRect(0, 0, permWidth, barThickness, 3);
    bar2.endFill();

    // Temporary corruption segment
    bar2.beginFill(tempColor);
    bar2.lineStyle(1, 0x000000, 1.0);
    bar2.drawRoundedRect(permWidth, 0, tempWidth, barThickness, 3);
    bar2.endFill();

    // Threshold
    bar2.lineStyle(2, thresholdColor, 1.0); // 2px thick, gold color
    bar2.moveTo(thresholdX, 0);
    bar2.lineTo(thresholdX, barThickness);
    bar2.endFill();

    // Tooltip
    bar2.name = `Corruption: ${permanent + temporary} (${permanent} perm + ${temporary} temp)`;
    
    // ----------------------------------------
    //            WILLPOWER BAR
    // ----------------------------------------
    const wp = this.actor.system?.willpower?.value ?? 0;
    const maxWP = this.actor.system?.willpower?.max ?? 0;
    const wpColor = getCssColor('--wod-color-willpower');

    // Skip tokens with no WP (NPCS)
    if (maxWP === 0) {
      return bars
    }
    const wpBarHeight = this.h - (2 * barThickness) - wpGap;
    const segmentHeight = wpBarHeight / maxWP;

    const x = this.w - barThickness;
    for (let i = 0; i < maxWP; i++) {
      const y = wpBarHeight - (i * segmentHeight) + wpGap;
      bar2.lineStyle(1, 0x000000, 1.0);

      if (i < wp) {
        bar2.beginFill(wpColor);
      } else {
        bar2.beginFill(0x000000, 0.5)
      }
      bar2.drawRect(x, y, barThickness, segmentHeight - wpGap);
      bar2.endFill();
    }

    return bars
  }

  // Force redraw of all tokens once canvas is ready
  const redrawAllTokens = () => {
    for (const token of canvas.tokens.placeables) {
      token.drawBars();
    }
  };

  if (canvas.ready) {
    redrawAllTokens();
  } else {
    Hooks.once("canvasReady", redrawAllTokens);
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
 * @param {HTMLElement} element - HTML of the HUD.
 * @param {object} tokenData - Data for the token associated with the HUD.
 */
Hooks.on("renderTokenHUD", (hud, element, tokenData) => {
  const token = hud.object;
  const actor = token?.actor;
  if (!actor) return;

  /* ------------------------------------------ */
  /*  Willpower Tracker                         */
  /* ------------------------------------------ */
  const wp = actor.system?.willpower?.value ?? 0;
  const maxWP = actor.system?.willpower?.max ?? 10;

  // Prevent duplicates
  element.querySelector(".wp-hud")?.remove(); // pick your container
  

  // Create Willpower display
  const wpDisplayHTML = `
    <div class="wrath-of-davokar control-icon wp-hud" title="Willpower: ${wp}/${maxWP}">
      <span class="wp-count">✦${wp}</span>
    </div>
  `;

  // Append to the right side of the HUD
  const target = element.querySelector(".col.right");
  if (!target) return;

  target.insertAdjacentHTML("beforeend", wpDisplayHTML);
  const wpDisplay = element.querySelector(".wp-hud");

  // click to reduce by 1 (demo functionality)
  wpDisplay.addEventListener("mouseup", async (event) => {
    let newWP = wp;
    if (event.button === 0) {
      newWP = Math.min(maxWP, wp + 1);
    } else if (event.button === 2) {
      newWP = Math.max(0, wp - 1);
    } else return;
    await actor.update({ "system.willpower.value": newWP });
  });

});