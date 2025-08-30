import {
  onManageActiveEffect,
  prepareActiveEffectCategories,
} from '../helpers/effects.mjs';

import {selectSkillRoll, selectEquipSlot} from '../helpers/dialog.mjs'
const TextEditor = foundry.applications.ux.TextEditor.implementation;

/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */
export class WrathOfDavokarActorSheet extends foundry.appv1.sheets.ActorSheet {
  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ['wrath-of-davokar', 'sheet', 'actor'],
      width: 750,
      height: 600,
      tabs: [
        {
          navSelector: '.primary-tabs',
          contentSelector: '.primary-body',
          initial: 'main',
        },
        {
          navSelector: '.power-tabs',
          contentSelector: '.power-body',
          initial: 'powers',
        },
        {
          navSelector: '.talents-tabs',
          contentSelector: '.talents-body',
          initial: 'talents',
        },
      ],
    });
  }

  /** @override */
  get template() {
    return `systems/wrath-of-davokar/templates/actor/actor-${this.actor.type}-sheet.hbs`;
  }

  /* -------------------------------------------- */

  /** @override */
  async getData() {
    // Retrieve the data structure from the base sheet. You can inspect or log
    // the context variable to see the structure, but some key properties for
    // sheets are the actor object, the data object, whether or not it's
    // editable, the items array, and the effects array.
    const context = super.getData();

    // Use a safe clone of the actor data for further operations.
    const actorData = this.document.toObject(false);

    // Add the actor's data to context.data for easier access, as well as flags.
    context.system = actorData.system;
    context.flags = actorData.flags;
    context.actorId = actorData._id;

    // Adding a pointer to CONFIG.WRATH_OF_DAVOKAR
    context.config = CONFIG.WRATH_OF_DAVOKAR;

    // Prepare character data and items.
    if (actorData.type == 'character') {
      this._prepareItems(context);
      this._prepareCharacterData(context);
    }

    // Prepare NPC data and items.
    if (actorData.type == 'npc') {
      this._prepareItems(context);
      this._prepareNPCData(context);
    }

    // Enrich biography info for display
    // Enrichment turns text like `[[/r 1d20]]` into buttons
    context.enrichedDescription = await TextEditor.enrichHTML(
      this.actor.system.bio.description,
      {
        // Whether to show secret blocks in the finished html
        secrets: this.document.isOwner,
        // Necessary in v11, can be removed in v12
        async: true,
        // Data to fill in for inline rolls
        rollData: this.actor.getRollData(),
        // Relative UUID resolution
        relativeTo: this.actor,
      }
    );

    for (let item of context.items) {
      item.enrichedDescription = await TextEditor.enrichHTML(
        item.system.description,
        {
          // Whether to show secret blocks in the finished html
          secrets: this.document.isOwner,
          // Necessary in v11, can be removed in v12
          async: true,
          // Data to fill in for inline rolls
          rollData: this.actor.getRollData(),
          // Relative UUID resolution
          relativeTo: item,
        }
      );

      if (item.system.isArtifact) {
        for (let [key, value] of Object.entries(item.system.powers)) {
          value.enrichedDescription = await TextEditor.enrichHTML(
            value.description,
            {
              // Whether to show secret blocks in the finished html
              secrets: this.document.isOwner,
              // Necessary in v11, can be removed in v12
              async: true,
              // Data to fill in for inline rolls
              rollData: this.actor.getRollData(),
              // Relative UUID resolution
              relativeTo: item,
            }
          );
        }
      }
    }

    // Prepare active effects
    context.effects = prepareActiveEffectCategories(
      // A generator that returns all effects stored on the actor
      // as well as any items
      this.actor.allApplicableEffects()
    );

    return context;
  }

  /**
   * Character-specific context modifications
   *
   * @param {object} context The context object to mutate
   */
  _prepareCharacterData(context) {
    // This is where you can enrich character-specific editor fields
    // or setup anything else that's specific to this type

    // Toughness
    context.system.toughness.percent = context.system.toughness.value / context.system.toughness.max * 100.0

    // Corruption
    context.system.corruption.permanentPercent = context.system.corruption.min / context.system.corruption.max * 100.0
    context.system.corruption.temporaryPercent = context.system.corruption.temporary / context.system.corruption.max * 100.0
    context.system.corruption.thresholdPercent = context.system.corruption.threshold / context.system.corruption.max * 100.0

    // Experience
    context.system.experience.unspent = context.system.experience.total


    for (let talent of context.talents) {
      context.system.experience.unspent -= talent.system.xpCost;
    }

    for (let trait of context.traits) {
      context.system.experience.unspent -= trait.system.xpCost;
    }

    for (let power of context.mysticalPowers) {
      context.system.experience.unspent -= power.system.xpCost;
    }

    for (let ritual of context.rituals) {
      context.system.experience.unspent -= ritual.system.xpCost;
    }

    for (let boon of context.boons) {
      context.system.experience.unspent -= boon.system.xpCost;
    }

    for (let burden of context.burdens) {
      context.system.experience.unspent -= burden.system.xpCost;
    }

    // Localize Attributes
    for (let [k, v] of Object.entries(context.system.attributes)) {
      v.label = game.i18n.localize(CONFIG.WRATH_OF_DAVOKAR.attributes[k].long) ?? k;
    }
    // Localize Skills
    for (let [k, v] of Object.entries(context.system.skills)) {
      v.label = game.i18n.localize(CONFIG.WRATH_OF_DAVOKAR.skills[k].long) ?? k;
    }
  }

  /**
   * NPC-specific context modifications
   *
   * @param {object} context The context object to mutate
   */
  _prepareNPCData(context) {
    // This is where you can enrich character-specific editor fields
    // or setup anything else that's specific to this type

    // Toughness
    context.system.toughness.percent = context.system.toughness.value / context.system.toughness.max * 100.0

    // Corruption
    context.system.corruption.permanentPercent = context.system.corruption.min / context.system.corruption.max * 100.0
    context.system.corruption.temporaryPercent = context.system.corruption.temporary / context.system.corruption.max * 100.0
    context.system.corruption.thresholdPercent = context.system.corruption.threshold / context.system.corruption.max * 100.0

    // Localize Attributes
    for (let [k, v] of Object.entries(context.system.attributes)) {
      v.label = game.i18n.localize(CONFIG.WRATH_OF_DAVOKAR.attributes[k]) ?? k;
    }
    // Localize Skills
    for (let [k, v] of Object.entries(context.system.skills)) {
      v.label = game.i18n.localize(CONFIG.WRATH_OF_DAVOKAR.skills[k]) ?? k;
    }

     // Total Armor Value
    context.system.armorRating = {
      "max": 0,
      "value": 0
    };

    for (let armorBody of context.armorBody) {
      if (armorBody.system.equip.isEquipped) {
        context.system.armorRating.max += armorBody.system.rating.max;
        context.system.armorRating.value += armorBody.system.rating.value;
      }
    }
    for (let armorHead of context.armorHead) {
      if (armorHead.system.equip.isEquipped) {
        context.system.armorRating.max += armorHead.system.rating.max;
        context.system.armorRating.value += armorHead.system.rating.value;
      }
    }
    for (let armorShield of context.armorShield) {
      if (armorShield.system.equip.isEquipped) {
        context.system.armorRating.max += armorShield.system.rating.max;
        context.system.armorRating.value += armorShield.system.rating.value;
      }
    }
  }

  /**
   * Organize and classify Items for Actor sheets and calculate encumbrance
   *
   * @param {object} context The context object to mutate
   */
  _prepareItems(context) {
    // Initialize containers.
    const equipment = [];
    const armorHead = [];
    const armorBody = [];
    const armorShield = [];
    const weapons = [];
    const mysticalPowers = [];
    const rituals = [];
    const talents = [];
    const traits = []
    const boons = [];
    const burdens = [];
    const conditions = [];
    const criticalInjuries = [];
    const artifacts = [];
    let encumbranceValue = 0;

    // Iterate through items, allocating to containers
    for (let item of context.items) {
      item.img = item.img || Item.DEFAULT_ICON;

      if ('isArtifact' in item.system) {
        if (item.system.isArtifact) {
          artifacts.push(item);
        }
      }

      if (['equipment', 'trap', 'alchemicalItem', 'container'].includes(item.type)) {
        equipment.push(item);
        encumbranceValue += item.system.equip.isEquipped ? 0 : item.system.weight;
      }
      else if (item.type === 'armorHead') {
        armorHead.push(item);
        encumbranceValue += item.system.equip.isEquipped ? 0 : item.system.weight;
      }
      else if (item.type === 'armorBody') {
        armorBody.push(item);
        encumbranceValue += item.system.equip.isEquipped ? 0 : item.system.weight;
      }
      else if (item.type === 'armorShield') {
        armorShield.push(item);
        encumbranceValue += item.system.equip.isEquipped ? 0 : item.system.weight;
      }
      else if (item.type === 'weapon') {
        weapons.push(item);
        encumbranceValue += item.system.equip.isEquipped ? 0 : item.system.weight;
      }
      else if (item.type === 'mysticalPower') {
        mysticalPowers.push(item);
      }
      else if (item.type === 'ritual') {
        rituals.push(item);
      }
      else if (item.type === 'talent') {
        talents.push(item);
      }
      else if (item.type === 'monsterTrait') {
        traits.push(item);
      }
      else if (item.type === 'boon') {
        boons.push(item);
      }
      else if (item.type === 'burden') {
        burdens.push(item);
      }
      else if (item.type === 'condition') {
        conditions.push(item);
      }
      else if (item.type === 'criticalInjury') {
        criticalInjuries.push(item);
      }
    }

    // Sort Items By Name
    equipment.sort((a, b) => a.name.localeCompare(b.name));
    armorHead.sort((a, b) => a.name.localeCompare(b.name));
    armorBody.sort((a, b) => a.name.localeCompare(b.name));
    armorShield.sort((a, b) => a.name.localeCompare(b.name));
    weapons.sort((a, b) => a.name.localeCompare(b.name));
    mysticalPowers.sort((a, b) => a.name.localeCompare(b.name));
    rituals.sort((a, b) => a.name.localeCompare(b.name));
    talents.sort((a, b) => a.name.localeCompare(b.name));
    traits.sort((a, b) => a.name.localeCompare(b.name));
    boons.sort((a, b) => a.name.localeCompare(b.name));
    burdens.sort((a, b) => a.name.localeCompare(b.name));
    conditions.sort((a, b) => a.name.localeCompare(b.name));
    criticalInjuries.sort((a, b) => a.name.localeCompare(b.name));
    artifacts.sort((a, b) => a.name.localeCompare(b.name));

    // Sort Ranked Items By Rank
    mysticalPowers.sort((a, b) => a.system.rank.value - b.system.rank.value);
    rituals.sort((a, b) => a.system.rank.value - b.system.rank.value);
    talents.sort((a, b) => a.system.rank.value - b.system.rank.value);
    traits.sort((a, b) => a.system.rank.value - b.system.rank.value);
    boons.sort((a, b) => a.system.rank.value - b.system.rank.value);

    // Assign and return
    context.equipment = equipment;
    context.armorHead = armorHead;
    context.armorBody = armorBody;
    context.armorShield = armorShield;
    context.weapons = weapons;
    context.mysticalPowers = mysticalPowers;
    context.rituals = rituals;
    context.talents = talents;
    context.traits = traits;
    context.boons = boons;
    context.burdens = burdens;
    context.conditions = conditions;
    context.criticalInjuries = criticalInjuries;
    context.artifacts = artifacts;
  }

  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Render the item sheet for viewing/editing prior to the editable check.
    html.on('click', '.item-edit', (ev) => {
      const itemDiv = $(ev.currentTarget).parents('.item');
      const item = this.actor.items.get(itemDiv.data('itemId'));
      item.sheet.render(true);
    });

    // -------------------------------------------------------------
    // Everything below here is only needed if the sheet is editable
    if (!this.isEditable) return;

    // Roll Skill and/or Attribute
    html.on('click', '.text-attribute, .text-skill, .spellcasting-title', async (event) => {
      const element = event.currentTarget;
      let attribute = element.dataset.attribute || null
      let skill = element.dataset.skill || null;
      let spellcasting = false;

      if (skill === 'spellcasting') {
        attribute = this.actor.system.skills.spellcasting.attribute;
        skill = this.actor.system.skills.spellcasting.skill;
        spellcasting = true;
      }

      if (attribute === null) {
        switch (skill) {
          case "endurance":
          case "force":
          case "melee":
            attribute = 'physique';
            break;
          case "dexterity":
          case "discreet":
          case "marksmanship":
          case "mobility":
            attribute = 'finesse';
            break;
          case "crafting":
          case "lore":
          case "medicus":
          case "survival":
          case "vigilance":
            attribute = 'wits';
            break;
          case "insight":
          case "instinct":
          case "persuasion":
          case "volition":
            attribute = 'empathy';
            break;
          default:
            attribute = 'physique'
        }
      }

      if (skill === null) {
        switch (attribute) {
          case "physique":
            skill = "force";
            break;
          case "finesse":
            skill = "dexterity";
            break;
          case "wits":
            skill = "crafting";
            break;
          case "empathy":
            skill = "insight";
            break;
          default:
            "physique"
        }
      }

      const result = await selectSkillRoll(this.actor, [attribute, skill], spellcasting);
      if (result === null) {
        return;
      }
      this.actor.buildRoll(result);

    });

    // Add Inventory Item
    html.on('click', '.item-create', this._onItemCreate.bind(this));

    // Delete Inventory Item
    html.on('click', '.item-delete', (ev) => {
      console.log('Request to Delete Item')
      const itemDiv = $(ev.currentTarget).parents('.item');
      const item = this.actor.items.get(itemDiv.data('itemId'));

      if (item.system.equip.isEquipped) {
        console.log('Unequipping Item')
        this._unequipItem(item).then(() => {
          item.delete();
          itemDiv.slideUp(200, () => this.render(false));
        });
      } else {
        item.delete();
        itemDiv.slideUp(200, () => this.render(false));
      }
    });

    // Equip/Unequip Inventory Item
    html.on('click', '.item-equip', (event) => {
      this._onToggleEquip(event);
    });

    // Armor Rating Changes
    html.on('change', '.item-armor-rating', (event) =>
      this._onArmorRatingChange(event)
    );

    // Active Effect management
    html.on('click', '.effect-control', (ev) => {
      const row = ev.currentTarget.closest('li');
      const document =
        row.dataset.parentId === this.actor.id
          ? this.actor
          : this.actor.items.get(row.dataset.parentId);
      onManageActiveEffect(ev, document);
    });

    // Rollable abilities.
    html.on('click', '.rollable', this._onRoll.bind(this));
    html.on('click', '.showArtifactCard', (ev) => {
      const card = ev.currentTarget.closest(".talent-card");
      if (!card) return;

      const itemId = card.dataset.itemId;
      const powerId = card.dataset.powerId;

      // Get the item from the actor
      const actor = this.actor ?? this.document; // depends on context (sheet vs app)
      const item = actor?.items.get(itemId) ?? game.items.get(itemId);

      if (!item) {
        ui.notifications.warn("Item not found.");
        return;
      }

      if (!powerId) {
        ui.notifications.warn("No power ID found.");
        return;
      }

      item.buildChatCardArtifactPower(powerId);
    });

    // Drag events for macros.
    if (this.actor.isOwner) {
      let handler = (ev) => this._onDragStart(ev);
      html.find('li.item').each((i, li) => {
        if (li.classList.contains('inventory-header')) return;
        li.setAttribute('draggable', true);
        li.addEventListener('dragstart', handler, false);
      });
      html.find('div.item').each((i, li) => {
        if (li.classList.contains('inventory-header')) return;
        li.setAttribute('draggable', true);
        li.addEventListener('dragstart', handler, false);
      });
    }

    // Corruption management
    html.on('change', '.corruption-temporary', (event) =>
      this._onTempCorruptionChange(event)
    );
    html.on('change', '.corruption-permanent', (event) =>
      this._onPermCorruptionChange(event)
    );

  }

  /**
   * Handle creating a new Owned Item for the actor using initial data defined in the HTML dataset
   * @param {Event} event   The originating click event
   * @private
   */
  async _onItemCreate(event) {
    event.preventDefault();
    const header = event.currentTarget;
    // Get the type of item to create.
    const type = header.dataset.type;
    // Grab any data associated with this control.
    const data = duplicate(header.dataset);
    // Initialize a default name.
    const name = `New ${type.capitalize()}`;
    // Prepare the item object.
    const itemData = {
      name: name,
      type: type,
      system: data,
    };
    // Remove the type from the dataset since it's in the itemData.type prop.
    delete itemData.system['type'];

    // Finally, create the item!
    return await Item.create(itemData, { parent: this.actor });
  }

  /**
   * Handle clickable rolls.
   * @param {Event} event   The originating click event
   * @private
   */
  _onRoll(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const dataset = element.dataset;

    // Handle item rolls.
    if (dataset.rollType) {
      if (dataset.rollType == 'item') {
        const itemId = element.closest('.item').dataset.itemId;
        const item = this.actor.items.get(itemId);
        if (item) return item.roll();
      }
    }

    // Handle rolls that supply the formula directly.
    if (dataset.roll) {
      let label = dataset.label ? `${dataset.label}` : '';
      let roll = new Roll(dataset.roll, this.actor.getRollData());
      roll.toMessage({
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        flavor: label,
        rollMode: game.settings.get('core', 'rollMode'),
      });
      return roll;
    }
  }

  /**
  * Handle equipping/unequipping a character's item
  * @param {Event} event   The originating click event
  * @private
  */
  async _onToggleEquip(event) {
    console.log('Here');
    event.preventDefault();
    const itemDiv = $(event.currentTarget).parents('.item');
    const item = this.actor.items.get(itemDiv.data('itemId'));
    const isEquipped = item.system.equip.isEquipped;

    if (isEquipped == true) {
      this._unequipItem(item);
    } else {
      this._equipItem(item)
    }
  }

  async _unequipItem(item) {
    console.log(`attempting to unequip item ${item.id}`);
    let itemSlotKey = null;
    let orignalSlotData = {};
    const slots = this.actor.system.encumbrance.equipSlots;
    console.log(item.system);

    if (item?.system.equip.requiresEquipSlot) {
      console.log("Requires Equip Slot - finding slot...");

      // Iterate over the four major slots
      for (let key in slots) {

        console.log(`Slot ${key}: itemId = ${slots[key].itemId}`);
        if (slots[key].itemId === item.id) {
          console.log('MATCH');
          itemSlotKey = `system.encumbrance.equipSlots.${key}`;
          orignalSlotData = slots[key];
          break;
        }

        // Iterate over the slot's subslots (if any exist)
        let subItemMatch = false;
        for (let subKey in slots[key].subslots) {
          console.log(`Slot ${key}.subslots.${subKey}: itemId = ${slots[key].subslots[subKey].itemId}`);
          if (slots[key].subslots[subKey].itemId === item.id) {
            console.log('MATCH');
            itemSlotKey = `system.encumbrance.equipSlots.${key}.subslots.${subKey}`;
            orignalSlotData = slots[key].subslots[subKey];
            subItemMatch = true;
            break;
          }
        }

        if (subItemMatch === true) break;
      }

      // update the slot to be empty if one was found
      console.log(`Matching Key = ${itemSlotKey}`);
      if (itemSlotKey !== null) {
        console.log('Removing item from slot')
        let updatedItemSlot = {itemId: null, maxItemWeight: orignalSlotData.maxItemWeight};
        if (orignalSlotData.hasOwnProperty('subslots')) {
          updatedItemSlot.subslots = {};
        }

        let actorUpdate = { _id: this.actor.id};
        actorUpdate[itemSlotKey] = updatedItemSlot;
        console.log(actorUpdate);
        await this.actor.update(actorUpdate);
      }
    }

    // Update Item Effects that are not auto applied
    if (item.system.hasOwnProperty('equip') && !item.system.equip.alwaysTransferEffects) {
      for (const effect of item.effects) {
        effect.update({ transfer: false });
      }
    }

    // Unequip the item
    let itemUpdate = { _id: item.id};
    itemUpdate["system.equip.isEquipped"] = false;
    await item.update(itemUpdate);
  }

  async _equipItem(item) {

    if (item?.system.equip.requiresEquipSlot) {
      const slots = this.actor.system.encumbrance.equipSlots;
      let updatedItemSlot = {itemId: item.id};
      const selection = await selectEquipSlot(this.actor, item);

      // No slot was selected by the user. Return
      if (!selection) return;

      // Get a reference to the slot being edited
      const [equipSlot, equipSubslot] = selection;
      let selectedSlot = slots[equipSlot];
      if (equipSubslot) {
        selectedSlot = slots[equipSlot].subslots[equipSubslot];
      }

      // Free up the slot
      // Slot has subslots (possible subitems need to be removed first)
      if (selectedSlot.hasOwnProperty('subslots')) {
        for (let subKey in selectedSlot.subslots) {
          const subitem = this.actor.items.get(selectedSlot.subslots[subKey].itemId);
          this._unequipItem(subitem);
        }
        updatedItemSlot.subslots = {};
      }

      // Slot has an item in it, remove it
      if (selectedSlot.itemId) {
        equippedItem = this.actor.items.get(selectedSlot.itemId);
        this._unequipItem(equippedItem)
      }

      // This item is a container, setup subslots
      if (item.type === 'container') {
        updatedItemSlot.subslots = {};
        for (let i = 0; i < item.system.numSubSlots; i++) {
          updatedItemSlot.subslots[`subslot_${i}`] = {itemId: null, maxItemWeight: item.system.maxItemWeight};
        }
      }

      // update the slot
      let actorUpdate = { _id: this.actor.id};
      let selectedSlotKey  = `system.encumbrance.equipSlots.${equipSlot}`;
      if (equipSubslot) {
        selectedSlotKey += `.subslots.${equipSubslot}`
      }
      actorUpdate[selectedSlotKey] = updatedItemSlot;
      await this.actor.update(actorUpdate);

    } else if (['armorBody', 'armorHead', 'armorShield'].includes(item?.type)) {

      switch (item.type) {
        case 'armorBody':
          equippedItem = this.equippedArmorBody;
          break;
        case 'armorHead':
          equippedItem = this.equippedArmorHead;
          break;
        case 'armorShield':
          equippedItem = this.equippedArmorShield;
          break;
      }
      if (this.equippedItem !== null) {
        this._unequipItem(equippedItem);
      }
    }

    // Update Item Effects that are not auto applied
    if (item.system.hasOwnProperty('equip') && !item.system.equip.alwaysTransferEffects) {
      for (const effect of item.effects) {
        effect.update({ transfer: true });
      }
    }

    // Equip the item
    let itemUpdate = { _id: item.id};
    itemUpdate["system.equip.isEquipped"] = true;
    await item.update(itemUpdate);
  }

  /**
   * Handle updating the Armor Rating of an item
   * @param {Event} event   The originating click event
   * @private
   */
  async _onArmorRatingChange(event) {
    event.preventDefault();
    let newAR = parseInt(event.target.value, 10)
    const item = this.actor.items.get(event.target.dataset.itemId);

    let update = { _id: item.id};
    update["system.rating.value"] = newAR;
    await item.update(update);
  }

  /**
   * Handle updating a character's temporary corruption
   * @param {Event} event   The originating click event
   * @private
   */
  async _onTempCorruptionChange(event) {
    event.preventDefault();
    let newTempCorruption = parseInt(event.target.value, 10);
    newTempCorruption = newTempCorruption >=0 ? newTempCorruption : 0;

    let update = { _id:this.actor.id};
    update["system.corruption.value"] = newTempCorruption + this.actor.system.corruption.min;
    await this.actor.update(update);
  }

  /**
   * Handle updating a character's temporary corruption
   * @param {Event} event   The originating click event
   * @private
   */
  async _onPermCorruptionChange(event) {
    event.preventDefault();
    let newPermCorruption = parseInt(event.target.value, 10)
    newPermCorruption = newPermCorruption >=0 ? newPermCorruption : 0;
    let delta = newPermCorruption - this.actor.system.corruption.min;
    let update = { _id:this.actor.id};
    update["system.corruption.value"] = delta + this.actor.system.corruption.value;
    update["system.corruption.min"] = newPermCorruption;
    await this.actor.update(update);
  }

}
