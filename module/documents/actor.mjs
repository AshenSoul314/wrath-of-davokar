/**
 * Extend the base Actor document by defining a custom roll data structure which is ideal for the Simple system.
 * @extends {Actor}
 */
export class WrathOfDavokarActor extends Actor {
  /** @override */
  prepareData() {
    // Prepare data for the actor. Calling the super version of this executes
    // the following, in order: data reset (to clear active effects),
    // prepareBaseData(), prepareEmbeddedDocuments() (including active effects),
    // prepareDerivedData().
    super.prepareData();
  }

  /** @override */
  prepareBaseData() {
    // Data modifications in this step occur before processing embedded
    // documents or derived data.
  }

  /**
   * @override
   * Augment the actor source data with additional dynamic data. Typically,
   * you'll want to handle most of your calculated/derived data in this step.
   * Data calculated in this step should generally not exist in template.json
   * (such as ability modifiers rather than ability scores) and should be
   * available both inside and outside of character sheets (such as if an actor
   * is queried and has a roll executed directly from it).
   */
  prepareDerivedData() {
    const actorData = this;
    const systemData = actorData.system;
    const flags = actorData.flags.wrathofdavokar || {};

    // Make separate methods for each Actor type (character, npc, etc.) to keep
    // things organized.
    this._prepareCharacterData(actorData);
    this._prepareNpcData(actorData);
  }

  /**
   * Prepare Character type specific data
   */
  _prepareCharacterData(actorData) {
    if (actorData.type !== 'character') return;
    const systemData = actorData.system;

    // Set temp corruption
    systemData.corruption.temporary = systemData.corruption.value - systemData.corruption.min

    // Set Attribute Totals
    for (let [key, attribute] of Object.entries(systemData.attributes)) {
      attribute.total = attribute.value + attribute.bonus;
    }

    // Set Skill Totals
    for (let [key, skill] of Object.entries(systemData.skills)) {
      if (key !== 'spellcasting') {
        skill.total = skill.value + skill.bonus;
      }
    }
  
    // Set Spellcasting Total
    if (systemData.skills.spellcasting.skill == 'corruption') {
      systemData.skills.spellcasting.total = systemData.corruption.value + 
        systemData.attributes[systemData.skills.spellcasting.attribute].total;
    } else {
      systemData.skills.spellcasting.total = systemData.skills[systemData.skills.spellcasting.skill].total + 
        systemData.attributes[systemData.skills.spellcasting.attribute].total;
    }
  }

  /**
   * Prepare NPC type specific data.
   */
  _prepareNpcData(actorData) {
    if (actorData.type !== 'npc') return;
    const systemData = actorData.system;

    // Set Corruption Value
    systemData.corruption.value = systemData.corruption.permanent + systemData.corruption.temporary

    // Set Attribute Totals
    for (let [key, attribute] of Object.entries(systemData.attributes)) {
      // Calculate the modifier using d20 rules.
      if (key !== 'spellcasting') {
        attribute.total = attribute.value + attribute.bonus;
      } else {
        if (attribute.attribute === 'corruption') {
          attribute.total = systemData.corruption.value + systemData.skills[attribute.skill].total;
        } else {
          attribute.total = systemData.attributes[attribute.attribute].total + systemData.skills[attribute.skill].total;
        }
      }
    }
  }

  /**
   * Override getRollData() that's supplied to rolls.
   */
  getRollData() {
    // Starts off by populating the roll data with a shallow copy of `this.system`
    const data = { ...this.system };

    // Prepare character roll data.
    this._getCharacterRollData(data);

    return data;
  }

  /**
   * Prepare character roll data.
   */
  _getCharacterRollData(data) {
    if (this.type !== 'character') return;

    // Copy the ability scores to the top level, so that rolls can use
    // formulas like `@str.mod + 4`.

    // Attributes
    if (data.attributes) {
      for (let [k, v] of Object.entries(data.attributes)) {
        let label = game.i18n.localize(CONFIG.WRATH_OF_DAVOKAR.attributes[k])
        data[k] = `${foundry.utils.deepClone(v.total)}ds[${label}]`;
      }
    }

    // Skills
    if (data.skills) {
      for (let [k, v] of Object.entries(data.skills)) {
        let label = game.i18n.localize(CONFIG.WRATH_OF_DAVOKAR.skills[k])
        data[k] = `${foundry.utils.deepClone(v.total)}ds[${label}]`;
      }
    }
  }

}
