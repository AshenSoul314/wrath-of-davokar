/**
 * Custom TokenDocument subclass for Wrath of Davokar.
 * Intercepts bar attribute resolution for composite resources.
 */
export class WoDTokenDocument extends TokenDocument {

  /**
   * Override bar attribute resolution to handle composite resources.
   * Corruption and willpower have nested structures incompatible with
   * Foundry's default single-value assumption.
   *
   * @param {string} barName - "bar1" or "bar2"
   * @param {object} [options]
   * @param {string} [options.alternative] - Override the bar's configured attribute
   * @returns {TokenBarData|null}
   */
  getBarAttribute(barName, { alternative } = {}) {
    const attr = alternative ?? this[barName]?.attribute;

    if (attr === "corruption") {
      return this.#getCorruptionBar();
    }

    return super.getBarAttribute(barName, { alternative });
  }

  /**
   * Resolve corruption bar data. Value reflects only temporary.value
   * so the HUD input edits only that field.
   *
   * @returns {TokenBarData|null}
   */
  #getCorruptionBar() {
    const corruption = this.actor?.system?.corruption;
    if (!corruption) return null;

    return {
      type: "bar",
      attribute: "corruption",
      value: corruption.temporary.value,
      max: corruption.max,
      editable: true,
    };
  }

  /**
   * Intercept bar attribute updates to redirect composite resource writes
   * to their correct nested paths.
   *
   * @param {object} data
   * @param {object} options
   * @param {string} userId
   */
  async _preUpdate(data, options, userId) {
    const barUpdate = data.actorData?.system;
    console.warn(barUpdate);
    if (barUpdate?.corruption !== undefined) {
      // Redirect write to corruption to the correct nested field
      const newVal = barUpdate.corruption;
      if (typeof newVal === "number") {
        data.actorData.system = {
          "corruption.temporary.value": Math.max(newVal, 0),
        };
      }
    }

    return super._preUpdate(data, options, userId);
  }
}
