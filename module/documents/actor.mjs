import {chooseAttackerToken, selectSkillRoll} from '../helpers/dialog.mjs'


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

  async buildRoll(rollTerms, modify=0) {
    let formulaParts = [];
    console.log(rollTerms)
    for (const term of rollTerms) {
      switch (term) {
        case 'physique':
        case 'finesse':
        case 'wits':
        case 'empathy':
          formulaParts.push(`${this.system.attributes[term].total}ds[${game.i18n.localize(CONFIG.WRATH_OF_DAVOKAR.attributes[term])}]`);
          break;
        case "endurance":
        case "force":
        case "melee":
        case "dexterity":
        case "discreet":
        case "marksmanship":
        case "mobility":
        case "crafting":
        case "lore":
        case "medicus":
        case "survival":
        case "vigilance":
        case "insight":
        case "instinct":
        case "persuasion":
        case "volition":
          formulaParts.push(`${this.system.skills[term].total}ds[${game.i18n.localize(CONFIG.WRATH_OF_DAVOKAR.skills[term])}]`);
          break;
        case "spellcasting":
          let total = this.system.attributes[this.system.skills.spellcasting.attribute].total;
          if (this.system.skills.spellcasting.skill === 'corruption') {
            total += this.system.corruption.total;
          } else {
            total += this.system.skills[this.system.skills.spellcasting.skill].total;
          }
          
          formulaParts.push(`${total}ds[${game.i18n.localize("WRATH_OF_DAVOKAR.Skills.Spellcasting.long")}]`);
          break;
        case "corruption":
          formulaParts.push(`${this.system.corruption.total}ds[${game.i18n.localize("WRATH_OF_DAVOKAR.Corruption.Total")}]`);
          break;
        default:
          const message = game.i18n.format("WRATH_OF_DAVOKAR.Roll.Error.UnknownTerm", {term: term});
          console.warn(message);
          ui.notifications.warn(message);
      }
    }
    const formula = formulaParts.join(' + ')
    const yzeRoll = Roll.create(formula, { yzur: true });
    if (modify !== 0) await yzeRoll.modify(modify);

    await yzeRoll.toMessage()
    return yzeRoll;
  }

  async attack(weapon) {
    const user = game.user;
    const targets = Array.from(user.targets);
    const attacker = chooseAttackerToken(this);

    if (targets.length === 0) {
      const message = game.il8.format("WRATH_OF_DAVOKAR.Attack.Error.NoTargets");
      console.warn(message);
      ui.notifications.warn(message);
      return;
    }

    if (attacker === null) {
       const message = game.il8.format("WRATH_OF_DAVOKAR.Attack.Error.NoAttacker");
      console.warn(message);
      ui.notifications.warn(message);
      return;
    }


    for (const token of targets) {
      const target = token.actor;
      const roll = this.getAttackRoll(weapon, attacker, target)

    }
  }

  async getAttackRoll(weapon) {
    const movementAction = game.settings.get("wrath-of-davokar", "movement-action-length");
    const isMeleeWeapon = !(weapon.system.weaponType.bow || weapon.system.weaponType.crossbow || weapon.system.weaponType.throwing);
    const delta =canvas.grid.measureDistance(token.center, target.center);
    const deltaMA =  Math.ceil(delta / movementAction);

    // Check if this is a ranged attack
    if (delta > movementAction * 1.9) {

      // Double check the player really wants to throw their weapon (do not bother is the weapon has the Returning quality)
      if (isMeleeWeapon && !weapon.system.qualities.retuning.value) {
        const proceed = await foundry.applications.api.DialogV2.confirm({
          content: game.il8.format("WRATH_OF_DAVOKAR.Attack.Dialog.ConfirmThrow"),
          rejectClose: false,
          modal: true
        });

        if (!proceed) {
          return null;
        }
      }

      const outOfRangePenalty = Math.abs(Math.min(0, deltaMA - weapon.system.range)) * 2;

    }
    
    

    if (weapon.system.qualities.short.value || weapon.system.weaponType.throwing.value) {

    }
  }
}