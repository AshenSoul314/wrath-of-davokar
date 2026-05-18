import {chooseAttackerToken, selectSkillRoll} from '../helpers/dialog.mjs'

const OVER_ENCUMBERED_EFFECT_ID = 'over-encumbered';

/**
 * Extend the base Actor document by defining a custom roll data structure which is ideal for the Simple system.
 * @extends {Actor}
 */
export class WoDActorDocument extends Actor {
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

    const actorData = this;
    const systemData = actorData.system;

    systemData.visionPenalty = {
      value: 0,
      bonus: 0,
    };
    systemData.impedingPenalty = {
      value: 0,
      bonus: 0,
      spellcastingBonus: 0,
    };

    systemData.corruption.temporary.bonus = 0;
    systemData.corruption.permanent.bonus = 0;
    systemData.corruption.threshold.bonus = 0;
    systemData.corruption.thresholdMax.bonus = 0;

    systemData.attributes.physique.bonus = 0;
    systemData.attributes.finesse.bonus = 0;
    systemData.attributes.wits.bonus = 0;
    systemData.attributes.empathy.bonus = 0;

    systemData.skills.endurance.bonus = 0;
    systemData.skills.force.bonus = 0;
    systemData.skills.melee.bonus = 0;
    systemData.skills.dexterity.bonus = 0;
    systemData.skills.discreet.bonus = 0;
    systemData.skills.marksmanship.bonus = 0;
    systemData.skills.mobility.bonus = 0;
    systemData.skills.crafting.bonus = 0;
    systemData.skills.medicus.bonus = 0;
    systemData.skills.lore.bonus = 0;
    systemData.skills.survival.bonus = 0;
    systemData.skills.vigilance.bonus = 0;
    systemData.skills.insight.bonus = 0;
    systemData.skills.instinct.bonus = 0;
    systemData.skills.persuasion.bonus = 0;
    systemData.skills.volition.bonus = 0;
    systemData.skills.spellcasting.bonus = 0;

    systemData.movement.bonus = 0;
    systemData.encumbrance.bonus = 0;
    systemData.encumbrance.physMultBonus = 0;
    systemData.visionPenalty.bonus = 0;
    systemData.impedingPenalty.bonus = 0;

    systemData.dodge.bonus = 0;
    systemData.parry.bonus = 0;

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

    // Maximum Encumbrance
    const totalEncPhysMult = systemData.encumbrance.physMult + systemData.encumbrance.physMultBonus
    systemData.encumbrance.max = Math.max(0, Math.ceil(totalEncPhysMult * systemData.attributes.physique.value) +
                                 systemData.encumbrance.bonus);

    // Total Armor Value and Encumbrance
    let totalEnc = 0;
    let totalArmorValue = 0;
    let totalArmorMax = 0;
    let equippedItems = [];
    let equippedArmorBody = [];
    let equippedArmorHead = [];
    let equippedArmorShield = [];

    for (let item of actorData.items) {
      const enc = foundry.utils.getProperty(item.system, "weight") ?? 0;
      const isEquipped = foundry.utils.getProperty(item.system, "equip.isEquipped") ?? false;
      const armorRating = foundry.utils.getProperty(item.system, "armorRating.value") ?? 0;
      const armorMax = foundry.utils.getProperty(item.system, "armorRating.max") ?? 0;

      if (isEquipped) {
        totalArmorValue += armorRating;
        totalArmorMax += armorMax;
        equippedItems.push(item);

        switch (item.type) {
          case 'armorBody':
            equippedArmorBody.push(item);
            totalArmorValue += item.system.rating.value;
            totalArmorMax += item.system.rating.max;
            break;
          case 'armorHead':
            equippedArmorHead.push(item);
            totalArmorValue += item.system.rating.value;
            totalArmorMax += item.system.rating.max;
            break;
          case 'armorShield':
            equippedArmorShield.push(item);
            totalArmorValue += item.system.rating.value;
            totalArmorMax += item.system.rating.max;
            break;
        }
      } else {
        totalEnc += enc;
      }
    }
    systemData.armorRating = { "max": totalArmorMax, "value": totalArmorValue };
    systemData.encumbrance.value = totalEnc;
    actorData.equippedItems = equippedItems;
    actorData.equippedArmorBody = equippedArmorBody;
    actorData.equippedArmorHead = equippedArmorHead;
    actorData.equippedArmorShield = equippedArmorShield;

    // Set Vision penalty
    systemData.visionPenalty.value = 0;
    for (let item of actorData.equippedArmorHead) {
      systemData.visionPenalty.value += item.system.visionPenalty;
    }
    systemData.visionPenalty.total = Math.min(0, systemData.visionPenalty.value + systemData.visionPenalty.bonus);
    systemData.skills.vigilance.bonus -= systemData.visionPenalty.total;
    systemData.skills.marksmanship.bonus -= systemData.visionPenalty.total;

    // Set Impeding penalty
    systemData.impedingPenalty.value = 0;
    for (let item of actorData.equippedArmorBody) {
      systemData.impedingPenalty.value += item.system.impeding;
    }
    systemData.impedingPenalty.total = Math.min(0, systemData.impedingPenalty.value + systemData.impedingPenalty.bonus);
    systemData.skills.mobility.bonus -= systemData.impedingPenalty.total;
    systemData.skills.discreet.bonus -= systemData.impedingPenalty.total;
    systemData.skills.spellcasting.bonus -= Math.min(0, systemData.impedingPenalty.total + systemData.impedingPenalty.spellcastingBonus);

    // Set Parry Bonus
    for (let item of actorData.equippedArmorShield) {
      systemData.parry.bonus += item.system.parryBonus;
    }

    // Make separate methods for each Actor type (character, npc, etc.) to keep
    // things organized.

    if (actorData.type === 'character') this._prepareCharacterData(context);
    if (actorData.type === 'npc')       this._prepareNpcData(context);

    /** ----------------------------------------
     *  SET TOTALS
     *  ----------------------------------------*/

    // Setup corruption
    systemData.corruption.temporary.total = systemData.corruption.temporary.value + systemData.corruption.temporary.bonus;
    systemData.corruption.permanent.total = systemData.corruption.permanent.value + systemData.corruption.permanent.bonus;
    systemData.corruption.value = systemData.corruption.temporary.total + systemData.corruption.permanent.total;
    systemData.corruption.threshold.total = systemData.corruption.threshold.value + systemData.corruption.threshold.bonus
    systemData.corruption.thresholdMax.total = systemData.corruption.thresholdMax.value + systemData.corruption.thresholdMax.bonus;
    systemData.corruption.max = systemData.corruption.thresholdMax.total;

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

    // Set Dodge
    systemData.dodge.total = systemData.skills[systemData.dodge.skill].total +
      systemData.attributes[systemData.dodge.attribute].total+ 
      systemData.dodge.bonus;
    // Set Parry
    systemData.parry.total = systemData.skills[systemData.parry.skill].total +
      systemData.attributes[systemData.parry.attribute].total +
      systemData.parry.bonus;

  }

  /**
   * Prepare Character type specific data
   */
  _prepareCharacterData(actorData) {
    const systemData = actorData.system;
  }

  /**
   * Prepare NPC type specific data.
   */
  _prepareNpcData(actorData) {
    const systemData = actorData.system;
  }

    /**
   * Override getRollData() that's supplied to rolls.
   */
  getRollData() {
    // Starts off by populating the roll data with a shallow copy of `this.system`
    const data = { ...this.system };

    // Attribute Values
    for (let [attributeName, attributeValue] of Object.entries(data.attributes)) {
      const attributeLabel = game.i18n.localize(CONFIG.WRATH_OF_DAVOKAR.attributes[attributeName])
      let formula = `${attributeValue.total}ds[${attributeLabel} (${attributeValue.total})]`
      if (attributeValue.total < 0) {
        formula = `${Math.abs(attributeValue.total)}dn[${attributeLabel} (${attributeValue.total})]`
      }
      data[attributeLabel] = formula;
      data[attributeLabel.toLocaleLowerCase()] = formula
    }

    // Skill Values
    for (let [skillName, skillValue] of Object.entries(data.skills)) {

      if (skillName === 'spellcasting') continue;

      const skillLabel = game.i18n.localize(CONFIG.WRATH_OF_DAVOKAR.skills[skillName])
      let formula = `${skillValue.total}ds[${skillLabel} (${skillValue.total})]`
      if (skillValue.total < 0) {
        formula = `${Math.abs(skillValue.total)}dn[${skillLabel} (${skillValue.total})]`
      }
      data[skillLabel] = formula;
      data[skillLabel.toLocaleLowerCase()] = formula
    }

    // Spellcasting
    const spellLabel = game.i18n.localize('WRATH_OF_DAVOKAR.Skills.Spellcastig.long');
    const spellShortLabel = game.i18n.localize('WRATH_OF_DAVOKAR.Skills.Spellcastig.abbr');

    if (data.skills.spellcasting.total < 0) {
      data[spellLabel] = `${Math.abs(data.skills.spellcasting.total)}dn[${spellLabel} (${data.skills.spellcasting.total})]`;
    } else {
      data[spellLabel] = `${data.skills.spellcasting.total}ds[${spellLabel} (${data.skills.spellcasting.total})]`;
    }

    data[spellLabel.toLocaleLowerCase()] = data[spellLabel];
    data[spellShortLabel] = data[spellLabel];
    data[spellShortLabel.toLocaleLowerCase()] = data[spellLabel];

    // Dodge
    const dodgeLabel = game.i18n.localize('WRATH_OF_DAVOKAR.Combat.Dodge');
    if (data.dodge.total < 0) {
      data[dodgeLabel] = `${Math.abs(data.dodge.total)}dn[${dodgeLabel} (${data.dodge.total})]`;
    } else {
      data[dodgeLabel] = `${data.dodge.total}ds[${dodgeLabel} (${data.dodge.total})]`;
    }
    data[dodgeLabel.toLocaleLowerCase()] = data[dodgeLabel];

    // Parry
    const parryLabel = game.i18n.localize('WRATH_OF_DAVOKAR.Combat.Parry');
    if (data.parry.total < 0) {
      data[parryLabel] = `${Math.abs(data.parry.total)}dn[${parryLabel} (${data.parry.total})]`;
    } else {
      data[parryLabel] = `${data.parry.total}ds[${parryLabel} (${data.parry.total})]`;
    }
    data[parryLabel.toLocaleLowerCase()] = data[parryLabel];

    // Armor
    const armorLabel = game.i18n.localize('WRATH_OF_DAVOKAR.Armor.Rating.long')
    const armorLabelLong = armorLabel.replace(/\s+/g, '');
    const armorLabelShort = game.i18n.localize('WRATH_OF_DAVOKAR.Armor.Rating.short');
    const armorLabelAbbv = game.i18n.localize('WRATH_OF_DAVOKAR.Armor.Rating.abbv');
    const armorFormula =  `${data.armorRating.value}danp[${armorLabel} (${data.armorRating.value}/${data.armorRating.max})]`;
    data[armorLabelLong] = armorFormula;
    data[armorLabelLong.toLocaleLowerCase()] = armorFormula;
    data[`${armorLabelLong.charAt(0).toLocaleLowerCase() + armorLabelLong.slice(1)}`] = armorFormula;
    data[armorLabelShort] = armorFormula;
    data[armorLabelShort.toLocaleLowerCase()] = armorFormula;
    data[armorLabelAbbv] = armorFormula;
    data[armorLabelAbbv.toLocaleLowerCase()] = armorFormula;

    // Temporary Corruption
    const tempCorruptionLabel = game.i18n.localize('WRATH_OF_DAVOKAR.Corruption.Temporary.long');
    const tempCorrLabelLong = tempCorruptionLabel.replace(/\s+/g, '');
    const tempCorrLabelShort = game.i18n.localize('WRATH_OF_DAVOKAR.Corruption.Temporary.short');
    const tempCorrLabelAbbv = game.i18n.localize('WRATH_OF_DAVOKAR.Corruption.Temporary.abbv');
    const tempCorrFormula =  `${data.corruption.temporary.value}ds[${tempCorruptionLabel} (${data.corruption.temporary.value})]`;
    data[tempCorrLabelLong] = tempCorrFormula;
    data[tempCorrLabelLong.toLocaleLowerCase()] = tempCorrFormula;
    data[`${tempCorrLabelLong.charAt(0).toLocaleLowerCase() + tempCorrLabelLong.slice(1)}`] = tempCorrFormula;
    data[tempCorrLabelShort] = tempCorrFormula;
    data[tempCorrLabelShort.toLocaleLowerCase()] = tempCorrFormula;
    data[tempCorrLabelAbbv] = tempCorrFormula;
    data[tempCorrLabelAbbv.toLocaleLowerCase()] = tempCorrFormula;

    // Permanent Corruption
    const permCorruptionLabel = game.i18n.localize('WRATH_OF_DAVOKAR.Corruption.Permanent.long');
    const permCorrLabelLong = permCorruptionLabel.replace(/\s+/g, '');
    const permCorrLabelShort = game.i18n.localize('WRATH_OF_DAVOKAR.Corruption.Permanent.short');
    const permCorrLabelAbbv = game.i18n.localize('WRATH_OF_DAVOKAR.Corruption.Permanent.abbv');
    const permCorrFormula =  `${data.corruption.permanent.value}ds[${permCorruptionLabel} (${data.corruption.permanent.value})]`;
    data[permCorrLabelLong] = permCorrFormula;
    data[permCorrLabelLong.toLocaleLowerCase()] = permCorrFormula;
    data[`${permCorrLabelLong.charAt(0).toLocaleLowerCase() + permCorrLabelLong.slice(1)}`] = permCorrFormula;
    data[permCorrLabelShort] = permCorrFormula;
    data[permCorrLabelShort.toLocaleLowerCase()] = permCorrFormula;
    data[permCorrLabelAbbv] = permCorrFormula;
    data[permCorrLabelAbbv.toLocaleLowerCase()] = permCorrFormula;

    // Total Corruption
    const totalCorruptionLabel = game.i18n.localize('WRATH_OF_DAVOKAR.Corruption.Total.long');
    const totalCorrLabelLong = totalCorruptionLabel.replace(/\s+/g, '');
    const totalCorrLabelShort = game.i18n.localize('WRATH_OF_DAVOKAR.Corruption.Total.short');
    const totalCorrLabelAbbv = game.i18n.localize('WRATH_OF_DAVOKAR.Corruption.Total.abbv');
    const totalCorrFormula =  `${data.corruption.value}ds[${totalCorruptionLabel} (${data.corruption.value})]`;
    data[totalCorrLabelLong] = totalCorrFormula;
    data[totalCorrLabelLong.toLocaleLowerCase()] = totalCorrFormula;
    data[`${totalCorrLabelLong.charAt(0).toLocaleLowerCase() + totalCorrLabelLong.slice(1)}`] = totalCorrFormula;
    data[totalCorrLabelShort] = totalCorrFormula;
    data[totalCorrLabelShort.toLocaleLowerCase()] = totalCorrFormula;
    data[totalCorrLabelAbbv] = totalCorrFormula;
    data[totalCorrLabelAbbv.toLocaleLowerCase()] = totalCorrFormula;

    return data;
  }

  /**
   * Intercept actor updates
   *
   * @param {object} change
   * @param {object} options
   * @param {string} userId
   */
  async _preUpdate(change, options, userId) {
    const superResult = await super._preUpdate(change, options, userId);
    if (superResult === false) return false;

    // Handle armorRating.value change — distribute across items
    // This must be done before the default _preUpdate completes
    const newArmorRating = foundry.utils.getProperty(change, "system.armorRating.value");
    if (typeof newArmorRating === "number") {
      // Always cancel the direct write — armorRating.value is derived
      foundry.utils.deleteProperty(change, "system.armorRating.value");

      const currentArmorRating = this.system.armorRating.value;
      const delta = newArmorRating - currentArmorRating;
      if (delta !== 0) await this.distributeArmorRatingChange(delta, "value");
    }

    return superResult;
  }

  /**
   * Handle any special post-update events
   */
  async _onUpdate(changed, options, userId) {
    await super._onUpdate(changed, options, userId);
    if (game.user.isGM || this.isOwner) {
      await this._syncOverencumberedEffect();
    }
  }

  /**
   * Sync the overencumbered effect after embedded item changes
   * (equip/unequip, add, delete all change encumbrance).
   */
  async _onEmbeddedDocumentOperation(embeddedName, operation, documents, result, options, userId) {
    await super._onEmbeddedDocumentOperation?.(embeddedName, operation, documents, result, options, userId);
    if (embeddedName === 'Item' && (game.user.isGM || this.isOwner)) {
      await this._syncOverencumberedEffect();
    }
  }

  /**
   * Add or remove the overencumbered active effect based on current
   * encumbrance vs. the actor's encumbrance limit.
   */
  async _syncOverencumberedEffect() {
    const isOver = this.system.encumbrance.value > this.system.encumbrance.max;

    // Find an existing overencumbered effect on this actor
    const existing = this.effects.find(e =>
      e.statuses?.has(OVER_ENCUMBERED_EFFECT_ID) ||
      e.flags?.core?.statusId === OVER_ENCUMBERED_EFFECT_ID
    );

    if (isOver && !existing) {
      // Fetch the status effect definition from CONFIG
      const statusDef = CONFIG.statusEffects?.find(s => s.id === OVER_ENCUMBERED_EFFECT_ID);
      const effectData = {
        ...(statusDef ?? {}),
        name: statusDef?.label ?? game.i18n.localize('WRATH_OF_DAVOKAR.Effect.OverEncumbered'),
        statuses: [OVER_ENCUMBERED_EFFECT_ID],
      };
      await ActiveEffect.create(effectData, { parent: this });

    } else if (!isOver && existing) {
      await existing.delete();
    }
  }

  /**
   * Distribute an armor rating change (positive or negative) across equipped
   * armor items one point at a time, re-sorting after each point.
   *
   * The sort order prioritizes items that are cheaper, non-artifact, and most
   * damaged — these are targeted first on a decrease. On an increase the sorted
   * array is searched from the back, so expensive artifacts with the most
   * remaining capacity are restored first.
   *
   * Decreases are floored at 0 per item. Increases are capped at rating.max.
   *
   * @param {number}          delta - Signed change to distribute (negative =
   *                                  damage, positive = repair/increase)
   * @param {"value"|"max"}   field - Which item rating field to modify
   */
  async distributeArmorRatingChange(delta, field) {
    const armorPieces = [
      ...this.equippedArmorBody,
      ...this.equippedArmorHead,
      ...this.equippedArmorShield,
    ];

    if (armorPieces.length === 0) return;

    const isDecrease = delta < 0;
    const points = Math.abs(delta);

    // Working map of id -> current field value, updated in memory before the
    // final batch write so re-sorts reflect in-flight changes correctly.
    const ratingMap = new Map(
      armorPieces.map(item => [item.id, item.system.rating[field]])
    );

    /**
     * Sort by damage priority (ascending — front of array takes changes first
     * on a decrease; back of array takes changes first on an increase):
     *   1. Non-artifact first — artifacts are spared until last
     *   2. Cost ascending — cheap pieces absorb changes first
     *   3. Highest current value last — most-remaining capacity changes last
     */
    const sortPieces = () => [...armorPieces].sort((a, b) => {
      const artifactA = a.system.isArtifact ? 1 : 0;
      const artifactB = b.system.isArtifact ? 1 : 0;
      if (artifactA !== artifactB) return artifactA - artifactB;

      const costA = (a.system.cost?.thaler ?? 0) + (a.system.cost?.shilling ?? 0) / 10 + (a.system.cost?.orteg ?? 0) / 100;
      const costB = (b.system.cost?.thaler ?? 0) + (b.system.cost?.shilling ?? 0) / 10 + (b.system.cost?.orteg ?? 0) / 100;
      if (costA !== costB) return costA - costB;

      // Highest current value last
      return (ratingMap.get(b.id) ?? 0) - (ratingMap.get(a.id) ?? 0);
    });

    let remaining = points;
    while (remaining > 0) {
      const sorted = sortPieces();

      if (isDecrease) {
        // Front of sorted array — cheapest, non-artifact, most damaged first
        const target = sorted.find(item => (ratingMap.get(item.id) ?? 0) > 0);
        if (!target) break;
        ratingMap.set(target.id, ratingMap.get(target.id) - 1);
      } else {
        // Back of sorted array — most expensive, artifact, least damaged first
        const target = sorted.findLast(item => {
          const current = ratingMap.get(item.id) ?? 0;
          return current < item.system.rating.max;
        });
        if (!target) break;
        ratingMap.set(target.id, ratingMap.get(target.id) + 1);
      }
      remaining--;
    }

    // Batch write only items whose value actually changed
    const updates = armorPieces
      .filter(item => ratingMap.get(item.id) !== item.system.rating[field])
      .map(item => ({
        _id: item.id,
        [`system.rating.${field}`]: ratingMap.get(item.id),
      }));

    if (updates.length > 0) {
      await this.updateEmbeddedDocuments("Item", updates);
    }
  }

  async buildRoll(rollTerms) {
    let formulaParts = [];
    let dieRolled = false;

    console.warn(rollTerms);

    if (this.system.attributes[rollTerms.attribute].total > 0) {
      formulaParts.push(`${this.system.attributes[rollTerms.attribute].total}ds[${game.i18n.localize(CONFIG.WRATH_OF_DAVOKAR.attributes[rollTerms.attribute])}]`);
      dieRolled = true;
    } else {
      rollTerms.mod += this.system.attributes[rollTerms.attribute].total;
    }

    if (rollTerms.skill === 'corruption') {
      if (this.system.corruption.value > 0) {
        formulaParts.push(`${this.system.corruption.value}ds[${game.i18n.localize("WRATH_OF_DAVOKAR.Corruption.Total.long")}]`);
        dieRolled = true;
      }
    } else if (this.system.skills[rollTerms.skill].total > 0) {
      formulaParts.push(`${this.system.skills[rollTerms.skill].total}ds[${game.i18n.localize(CONFIG.WRATH_OF_DAVOKAR.skills[rollTerms.skill])}]`);
      dieRolled = true;
    } else {
      rollTerms.mod += this.system.skills[rollTerms.skill].total;
    }

    if (rollTerms.spellcasting) {
      //Handle Special Spellcasting Logic Here
    }

    if (rollTerms.d8 > 0) {
      formulaParts.push(`${rollTerms.d8}d8`);
      dieRolled = true;
    }
    if (rollTerms.d10 > 0) {
      formulaParts.push(`${rollTerms.d10}d10`);
      dieRolled = true;
    }
    if (rollTerms.d12 > 0) {
      formulaParts.push(`${rollTerms.d12}d12`);
      dieRolled = true;
    }

    if (!dieRolled) {
      formulaParts.push(`1ds[${game.i18n.localize(CONFIG.WRATH_OF_DAVOKAR.attributes[rollTerms.attribute])}]`);
    }

    const formula = formulaParts.join(' + ');
    console.log(formula);

    const yzeRoll = Roll.create(formula, { yzur: true}, {name: rollTerms.title});
    if (rollTerms.mod !== 0) await yzeRoll.modify(rollTerms.mod);

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