import {
  onManageActiveEffect,
  prepareActiveEffectCategories,
} from '../helpers/effects.mjs';

/**
 * Extend the basic ItemSheet with some very simple modifications
 * @extends {ItemSheet}
 */
export class WrathOfDavokarItemSheet extends foundry.appv1.sheets.ItemSheet {
  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ['wrath-of-davokar', 'sheet', 'item'],
      width: 520,
      height: 480,
      tabs: [
        {
          navSelector: '.sheet-tabs',
          contentSelector: '.sheet-body',
          initial: 'main',
        },
      ],
    });
  }

  /** @override */
  get template() {
    const path = 'systems/wrath-of-davokar/templates/item';
    return `${path}/item-${this.item.type}-sheet.hbs`;
  }

  /* -------------------------------------------- */

  /** @override */
  async getData() {
    // Retrieve base data structure.
    const context = super.getData();

    // Use a safe clone of the item data for further operations.
    const itemData = this.document.toObject(false);


    // Add the item's data to context.data for easier access, as well as flags.
    context.system = itemData.system;
    context.flags = itemData.flags;

    // Adding a pointer to CONFIG.WRATH_OF_DAVOKAR
    context.config = CONFIG.WRATH_OF_DAVOKAR;

    
    // Enrich description info for display
    // Enrichment turns text like `[[/r 1d20]]` into buttons
    context.enrichedDescription = await TextEditor.enrichHTML(
      this.item.system.description,
      {
        // Whether to show secret blocks in the finished html
        secrets: this.document.isOwner,
        // Necessary in v11, can be removed in v12
        async: true,
        // Data to fill in for inline rolls
        rollData: this.item.getRollData(),
        // Relative UUID resolution
        relativeTo: this.item,
      }
    );

    // Enrich Artifact Power Descriptions
    if ('isArtifact' in context.system) {
      if (context.system.isArtifact) {
        for (let [k, v] of Object.entries(context.system.powers)) {
          v.enrichedDescription = await TextEditor.enrichHTML(
            v.description,
            {
              // Whether to show secret blocks in the finished html
              secrets: this.document.isOwner,
              // Necessary in v11, can be removed in v12
              async: true,
              // Data to fill in for inline rolls
              rollData: this.item.getRollData(),
              // Relative UUID resolution
              relativeTo: this.item,
            }
          );
        }
      }
    }

    // Enrich Item Effect Descriptions
    if ('effectData' in context.system) {
      if (context.system.effectData) {
        for (let [k, v] of Object.entries(context.system.effectData)) {
          v.enrichedDescription = await TextEditor.enrichHTML(
            v.description,
            {
              // Whether to show secret blocks in the finished html
              secrets: this.document.isOwner,
              // Necessary in v11, can be removed in v12
              async: true,
              // Data to fill in for inline rolls
              rollData: this.item.getRollData(),
              // Relative UUID resolution
              relativeTo: this.item,
            }
          );
        }
      }
    }

    // Localize Qualities
    if ('qualities' in context.system) {
      let noQuality = true;
      for (let [k, v] of Object.entries(context.system.qualities)) {
        v.label = game.i18n.localize(CONFIG.WRATH_OF_DAVOKAR.qualities[k]) ?? k;
        noQuality = noQuality && !(v.value);
      }
      context.system.qualities.noQuality = noQuality;
    }

    // Localize Traditions
    if ('tradition' in context.system) {
      for (let [k, v] of Object.entries(context.system.tradition)) {
        v.label = game.i18n.localize(CONFIG.WRATH_OF_DAVOKAR.tradition[k]) ?? k;
      }
    }

    // Localize Rank
    if ('rank' in context.system) {
      if (context.system.rank.value == 1) {
        context.system.rank.labelTalent = game.i18n.localize(CONFIG.WRATH_OF_DAVOKAR.rank.one.talent);
        context.system.rank.labelAbbv = game.i18n.localize(CONFIG.WRATH_OF_DAVOKAR.rank.one.abbv);
        context.system.rank.labelTrait = game.i18n.localize(CONFIG.WRATH_OF_DAVOKAR.rank.one.trait);
      }
      else if (context.system.rank.value == 2) {
        context.system.rank.labelTalent = game.i18n.localize(CONFIG.WRATH_OF_DAVOKAR.rank.two.talent);
        context.system.rank.labelAbbv = game.i18n.localize(CONFIG.WRATH_OF_DAVOKAR.rank.two.abbv);
        context.system.rank.labelTrait = game.i18n.localize(CONFIG.WRATH_OF_DAVOKAR.rank.two.trait);
      }
      else if (context.system.rank.value == 3) {
        context.system.rank.labelTalent = game.i18n.localize(CONFIG.WRATH_OF_DAVOKAR.rank.three.talent);
        context.system.rank.labelAbbv = game.i18n.localize(CONFIG.WRATH_OF_DAVOKAR.rank.three.abbv);
        context.system.rank.labelTrait = game.i18n.localize(CONFIG.WRATH_OF_DAVOKAR.rank.three.trait);
      }
    }

    // Add AOE Radio Button Data for Weapons
    if (itemData.type == 'weapon') {
      context.system.area.radio = {
        'none': 'WRATH_OF_DAVOKAR.Weapon.AreaEffect.None', 
        'cone':  'WRATH_OF_DAVOKAR.Weapon.AreaEffect.Cone', 
        'radius':'WRATH_OF_DAVOKAR.Weapon.AreaEffect.Radius'
      };
    }

    // Prepare active effects for easier access
    context.effects = prepareActiveEffectCategories(this.item.effects);

    return context;
  }

  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Everything below here is only needed if the sheet is editable
    if (!this.isEditable) return;

    // Roll handlers, click handlers, etc. would go here.
    html.on('click', '.rollable-corruption', this._onRollCorruption.bind(this));

    // Active Effect management
    html.on('click', '.effect-control', (event) =>
      onManageActiveEffect(event, this.item)
    );

    // Artifact Powers management
    html.on('click', '.artifact-power-create', (event) =>
      this._onArtifactPowerCreate(event)
    );

    html.on('click', '.artifact-power-edit', (event) =>
      this._onArtifactPowerEdit(event)
    );

    html.on('click', '.artifact-power-delete', (event) =>
      this._onArtifactPowerDelete(event)
    );

    // Item Applicable Effects Management
    html.on('click', '.item-effect-create', (event) =>
      this._onItemEffectCreate(event)
    );

    html.on('click', '.item-effect-delete', (event) =>
      this._onItemEffectDelete(event)
    );

    // Send to Chat
    html.on('click', '.item-send-to-chat', (event) =>
      this.item.buildChatCard()
    );
  }

  /**
   * Handle clickable rolls for Corruption.
   * @param {Event} event   The originating click event
   * @private
   */
  _onRollCorruption(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const dataset = element.dataset;

    // Handle rolls that supply the formula directly.
    if (dataset.roll) {
      let label = dataset.label ? dataset.label : '';
      let roll = new Roll(dataset.roll, this.item.getRollData());
      roll.toMessage({
        speaker: ChatMessage.getSpeaker({ item: this.item }),
        flavor: label,
        rollMode: game.settings.get('core', 'rollMode'),
      });
      return roll;
    }
  }

  /**
   * Handle creation of artifact powers.
   * @param {Event} event   The originating click event
   * @private
   */
  async _onArtifactPowerCreate(event) {
    event.preventDefault();
    let powers = this.item.system.powers;

    // Add a new power at the end of the powers section
    let powerId = Object.keys(powers).length
    powers[powerId] = {
      name: "", 
      img: "systems/wrath-of-davokar/assets/icons/artifact-power.svg", 
      description: "", 
      action: "", 
      corruption: "",
      macro: "",
    };
    
    await this.item.update({ 
      _id:this.item.id,
      "system.powers": powers
    });
  }
  
  /**
   * Handle deletion of artifact powers.
   * @param {Event} event   The originating click event
   * @private
   */
  async _onArtifactPowerDelete(event) {
    event.preventDefault();

    // Get the ID of the power being removed
    const div = $(event.currentTarget).parents('.artifact-power');
    let powerId = parseInt(div.data("artifact-power-id"));        
    if( isNaN(powerId) ) { 
      return;
    }

    // delete the power from the internal list of powers
    let powers = this.item.system.power;
    delete powers[powerId];

    // Refill the power list
    let oldPowersArray = Object.values(powers);
    let newPowers = {};
    for(let i = 0; i < oldPowersArray.length - 1; i++) {
      newPowers[i] = oldPowersArray[i];
    }

    // Update the database and remove the last power entry
    let update = { _id:this.item.id};
    update['system.powers'] = newPowers;
    update[`system.powers.-=${Object.keys(newPowers).length}`] = null;
    await this.item.update(update);
  }

  /**
   * Handle creation of Item Effects.
   * @param {Event} event   The originating click event
   * @private
   */
  async _onItemEffectCreate(event) {
    event.preventDefault();
    let itemEffects = this.item.system.effectData;

    // Add a new effect at the end of the effects section
    let effectID = Object.keys(itemEffects).length
    itemEffects[effectID] = {
      name:  game.i18n.localize("EFFECT.Name"),
      duration: {
        rounds: null,
        turns: null
      },
      img: "icons/svg/aura.svg",
      changes: [],
      description: "",
      tint: "#ffffff"
    };
    
    await this.item.update({ 
      _id:this.item.id,
      "system.effectData": itemEffects
    });
  }
  
  /**
   * Handle deletion of item effects.
   * @param {Event} event   The originating click event
   * @private
   */
  async _onItemEffectDelete(event) {
    event.preventDefault();

    // Get the ID of the power being removed
    const div = $(event.currentTarget).parents('.item-effect');
    let effectID = parseInt(div.data("item-effect-id"));        
    if( isNaN(effectID) ) { 
      return;
    }

    // delete the power from the internal list of powers
    let itemEffects = this.item.system.effectData;
    delete itemEffects[effectID];

    // Refill the power list
    let oldEffectsArray = Object.values(itemEffects);
    let newEffects = {};
    for(let i = 0; i < oldEffectsArray.length - 1; i++) {
      newEffects[i] = oldEffectsArray[i];
    }

    // Update the database and remove the last power entry
    let update = { _id:this.item.id};
    update['system.effectData'] = newEffects;
    update[`system.effectData.-=${Object.keys(newEffects).length}`] = null;
    await this.item.update(update);
  }
}

