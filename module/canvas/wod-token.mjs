import {getCssColor} from '../helpers/utils.mjs'

const BAR_GAP = 0.1;  // The gap between bars as expresses as a percentage of the height of any one bar.

/**
 * Custom Token placeable for Wrath of Davokar.
 * Renders composite corruption bar and always-on character bars.
 */
export class WoDToken extends foundry.canvas.placeables.Token {

  /**
   * Draw all token bars. Handles corruption specially when assigned,
   * and draws always-on character bars below standard bars.
   */
  async drawBars() {
    // Let Foundry draw bar1 and bar2 normally first
    await super.drawBars();

    // Redraw any bar assigned to corruption using our composite renderer
    for (const barName of ["bar1", "bar2"]) {
      const attr = this.document[barName]?.attribute;
      console.warn(attr);
      if (attr === "corruption") {
        this.#drawCorruptionBar(barName);
      }
    }

    // Always draw character-only bars
    if (this.actor?.type === "character") {
      this.#drawCharacterBars();
    }
  }

  /**
   * Replace a standard bar with the composite corruption bar.
   * Renders permanent corruption, temporary corruption, and a threshold marker.
   *
   * @param {string} barName - "bar1" or "bar2"
   */
  #drawCorruptionBar(barName) {
    const bar = this.bars?.[barName];
    if (!bar) return;

    const corruption = this.actor?.system?.corruption;
    if (!corruption) return;

    const {width, height} = this.document.getSize();
    const scale = canvas.dimensions.uiScale;
    const barWidth = width;
    const barHeight = 8 * (this.document.height >= 2 ? 1.5 : 1) * scale;

    const corMax = corruption.max || 1;
    const corTotal = corruption.value;
    const permTotal = corruption.permanent.total;
    const tempTotal = corruption.temporary.total;
    const threshold = corruption.threshold.total;
    const barMax = Math.max(corMax, corTotal);

    const permPercent = Math.max(0, permTotal / barMax);
    const tempPercent = Math.max(0, tempTotal / barMax);
    const thresholdPercent = Math.max(0, threshold / barMax);
    const maxPercent = corMax >= corTotal ? null : Math.max(0, corMax / barMax);

    const permWidth = Math.round( permPercent * barWidth);
    const tempWidth = Math.round( tempPercent * barWidth);
    const thresholdX = Math.round(thresholdPercent * barWidth);
    const maxX = maxPercent === null ? null : Math.round(maxPercent * barWidth);

    const permColor =  getCssColor('--wod-color-corruption');
    const tempColor =  getCssColor('--wod-color-corruption-light');
    const thresholdColor = getCssColor('--wod-color-gold-bright');

    // Clear and redraw using the existing bar Graphics object
    bar.clear();

    // Background
    bar.lineStyle(scale, 0x000000, 1.0);
    bar.beginFill(0x000000, 0.5).drawRoundedRect(0, 0, barWidth, barHeight, 3 * scale);

    // Permanent corruption
    if (permWidth > 0) {
      bar.beginFill(permColor, 1.0).drawRoundedRect(0, 0, permWidth, barHeight, 2 * scale);
    }

    // Temporary corruption, offset past permanent
    if (tempWidth > 0) {
      bar.beginFill(tempColor, 1.0).drawRoundedRect(permWidth, 0, tempWidth, barHeight, 2 * scale);
    }

    // Threshold marker
    if (threshold > 0 && thresholdX <= width) {
      bar.beginFill(thresholdColor, 1.0).drawRect(thresholdX, 0, 2 * scale, barHeight, 2 * scale);
    }

    // Max marker
    if (maxX !== null) {
      bar.beginFill(thresholdColor, 1.0).drawRect(maxX, 0, 2 * scale, barHeight, 2 * scale);
    }
  }

  /**
   * Draw always-on bars for character actors below the standard token bars.
   * Currently renders willpower. Extend here for additional bars.
   */
  #drawCharacterBars() {
    if (!this.bars) return;

    // Only draw willpower if it isn't already occupying a standard bar slot
    const bar1Attr = this.document.bar1?.attribute;
    const bar2Attr = this.document.bar2?.attribute;
    if (bar1Attr === "system.willpower" || bar2Attr === "system.willpower") return;

    this.#drawWillpowerBar();
  }

  /**
   * Draw the extra bar below the standard bars.
   */
  #drawWillpowerBar() {
    const key = 'willpower';
    const willpower = this.actor?.system?.willpower;
    if (!willpower) return;

    const {width, height} = this.document.getSize();
    const scale = canvas.dimensions.uiScale;
    const barWidth = width;
    const barHeight = 8 * (this.document.height >= 2 ? 1.5 : 1) * scale;
    const segmentGap = 2 * scale;

    const wpColor = getCssColor('--wod-color-willpower');
    const value = willpower.value ?? 0;
    const max = willpower.max || 1;

    const segmentWidth = (barWidth - ((max - 1) * segmentGap)) / max

    // Reuse or create a Graphics object for this bar
    if (!this.bars[key]) {
      this.bars[key] = this.bars.addChild(new PIXI.Graphics());
    }

    const bar = this.bars[key];
    const yOffset = height + BAR_GAP * barHeight;

    bar.clear();

    // Background
    bar.lineStyle(scale, 0x000000, 1.0);
    bar.beginFill(0x000000, 0.5).drawRoundedRect(0, 0, barWidth, barHeight, 3 * scale);

    // Fill in one segment for each WP point
    for (let i = 0; i < max; i++) {
      const xOffset = i * (segmentGap + segmentWidth);
      if (i < value ) {
        bar.beginFill(wpColor, 1).drawRoundedRect(xOffset, 0, segmentWidth, barHeight, 2 * scale);
      } else {
        break;
      }
    }

    bar.position.set(0, yOffset);
  }
}