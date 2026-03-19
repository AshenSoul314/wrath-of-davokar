import {
  onManageActiveEffect,
  prepareActiveEffectCategories,
} from '../helpers/effects.mjs';

import { selectSkillRoll, selectAtHandSlot } from '../helpers/dialog.mjs';
import { sortRankedItems } from '../helpers/utils.mjs';


const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;
const { DialogV2 } = foundry.applications.api;
const TextEditor = foundry.applications.ux.TextEditor.implementation;

// ---------------------------------------------------------------------------
// Base Sheet
// ---------------------------------------------------------------------------

export class WoDActorSheet extends HandlebarsApplicationMixin(ActorSheetV2) {

  static DEFAULT_OPTIONS = {
    classes: ['wrath-of-davokar', 'sheet', 'actor'],
    position: { width: 750, height: 680 },
    form: { submitOnChange: true },
    window: { resizable: true },
    actions: {
      editImage:          WoDActorSheet.#onEditImage,
      itemCreate:         WoDActorSheet.#onItemCreate,
      itemEdit:           WoDActorSheet.#onItemEdit,
      itemDelete:         WoDActorSheet.#onItemDelete,
      itemEquip:          WoDActorSheet.#onItemEquip,
      itemRoll:           WoDActorSheet.#onItemRoll,
      rollSkill:          WoDActorSheet.#onRollSkill,
      showArtifactCard:   WoDActorSheet.#onShowArtifactCard,
      effectCreate:       WoDActorSheet.#onEffectCreate,
      effectEdit:         WoDActorSheet.#onEffectEdit,
      effectDelete:       WoDActorSheet.#onEffectDelete,
      effectToggle:       WoDActorSheet.#onEffectToggle,
      tempCorruptionChange:  WoDActorSheet.#onTempCorruptionChange,
      permCorruptionChange:  WoDActorSheet.#onPermCorruptionChange,
      armorRatingChange:     WoDActorSheet.#onArmorRatingChange,
    },
  };

  static TABS = {
    primary: {
      tabs: [
        { id: 'main',           group: 'primary', label: 'WRATH_OF_DAVOKAR.Base.Tabs.Main' },
        { id: 'description',    group: 'primary', label: 'WRATH_OF_DAVOKAR.Base.Tabs.Description' },
        { id: 'items',          group: 'primary', label: 'WRATH_OF_DAVOKAR.Base.Tabs.Items' },
        { id: 'talents',        group: 'primary', label: 'WRATH_OF_DAVOKAR.Base.Tabs.Talents' },
        { id: 'powers',         group: 'primary', label: 'WRATH_OF_DAVOKAR.Base.Tabs.PowersAndRituals' },
        { id: 'effects',        group: 'primary', label: 'WRATH_OF_DAVOKAR.Base.Tabs.Effects' },
      ],
      initial: 'main',
    },
    talents: {
      tabs: [
        { id: 'talents', group: 'talents', label: 'WRATH_OF_DAVOKAR.Base.Tabs.Talents' },
        { id: 'traits',  group: 'talents', label: 'WRATH_OF_DAVOKAR.Base.Tabs.MonstrousTraits' },
        { id: 'boons',   group: 'talents', label: 'WRATH_OF_DAVOKAR.Base.Tabs.Boons' },
        { id: 'burdens', group: 'talents', label: 'WRATH_OF_DAVOKAR.Base.Tabs.Burdens' },
      ],
      initial: 'talents',
    },
    powers: {
      tabs: [
        { id: 'mysticalPowers',   group: 'powers', label: 'WRATH_OF_DAVOKAR.Base.Tabs.MysticalPowers' },
        { id: 'rituals',          group: 'powers', label: 'WRATH_OF_DAVOKAR.Base.Tabs.Rituals' },
        { id: 'artifacts',        group: 'powers', label: 'WRATH_OF_DAVOKAR.Base.Tabs.ArtifactPowers' },
      ],
      initial: 'mysticalPowers',
    },
  };

  /* -------------------------------------------- */
  /*  Context Preparation                          */
  /* -------------------------------------------- */

  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    const actorData = this.document.toObject(false);
    context.system      = actorData.system;
    context.flags       = actorData.flags;
    context.actorId     = actorData._id;
    context.actor       = this.actor;
    context.config      = CONFIG.WRATH_OF_DAVOKAR;
    context.isOwner     = this.document.isOwner;
    context.isEditable  = this.isEditable;
    context.editable    = this.isEditable;

    // Tab contexts
    context.tabs        = this._prepareTabs('primary');
    context.talentTabs  = this._prepareTabs('talents');
    context.powerTabs   = this._prepareTabs('powers');

    // Build enriched item display objects
    context.enrichedItems = new Map();
    for (const item of this.actor.items) {
      context.enrichedItems.set(item.id, await TextEditor.enrichHTML(
        item.system.description ?? '',
        { secrets: this.document.isOwner, rollData: this.actor.getRollData(), relativeTo: this.actor }
      ));
    }

    // Items
    this._prepareItems(context);

    // Progress bar percentages
    context.system.toughness.percent = context.system.toughness.max ? (context.system.toughness.value / context.system.toughness.max) * 100 : 0;
    context.system.corruption.permanent.percent = context.system.corruption.max ? (context.system.corruption.permanent.total  / context.system.corruption.max) * 100 : 0;
    context.system.corruption.temporary.percent = context.system.corruption.max ? (context.system.corruption.temporary.total / context.system.corruption.max) * 100 : 0;
    context.system.corruption.thresholdPercent = context.system.corruption.max ? (context.system.corruption.threshold.total / context.system.corruption.max) * 100 : 0;

    // Localize attribute and skill labels
    for (const [k, v] of Object.entries(context.system.attributes)) {
      v.label = game.i18n.localize(CONFIG.WRATH_OF_DAVOKAR.attributes[k]?.long ?? k);
    }
    for (const [k, v] of Object.entries(context.system.skills)) {
      v.label = game.i18n.localize(CONFIG.WRATH_OF_DAVOKAR.skills[k]?.long ?? k);
    }

    // Type-specific derived display data
    if (actorData.type === 'character') this._prepareCharacterData(context);
    if (actorData.type === 'npc')       this._prepareNPCData(context);

    // Enriched bio description
    context.enrichedDescription = await TextEditor.enrichHTML(
      this.actor.system.bio.description ?? '',
      { secrets: this.document.isOwner, rollData: this.actor.getRollData(), relativeTo: this.actor }
    );

    // Active effects
    context.effects = prepareActiveEffectCategories(this.actor.allApplicableEffects());

    // Clean up — no longer needed after _prepareItems
    delete context.enrichedItems;

    return context;
  }

  async _preparePartContext(partId, context) {
    context = await super._preparePartContext(partId, context);
    switch (partId) {
      case 'header':
      case 'tabs':
        break;
      case 'main':
      case 'description':
      case 'items':
      case 'effects':
        context.tab = context.tabs[partId];
        break;
      case 'talents':
        context.tab     = context.tabs[partId];
        context.subTabs = context.talentTabs;
        break;
      case 'powers':
        context.tab     = context.tabs[partId];
        context.subTabs = context.powerTabs;
        break;
    }
    return context;
  }

  /* -------------------------------------------- */
  /*  Item Preparation                             */
  /* -------------------------------------------- */

  _prepareItems(context) {
    const equipment       = [];
    const armorHead       = [];
    const armorBody       = [];
    const armorShield     = [];
    const weapons         = [];
    const mysticalPowers  = [];
    const rituals         = [];
    const talents         = [];
    const traits          = [];
    const boons           = [];
    const burdens         = [];
    const conditions      = [];
    const criticalInjuries = [];
    const artifacts       = [];
    const gear            = [];
    const supplies        = [];

    for (const item of this.actor.items) {
      const d = item.toObject(false);
      d.id  = item.id;
      d.img = d.img || Item.DEFAULT_ICON;
      d.enrichedDescription = context.enrichedItems.get(item.id) ?? '';

      if (d.system.isArtifact) artifacts.push(d);

      switch (d.type) {
        case 'armorBody':      armorBody.push(d);        break;
        case 'armorHead':      armorHead.push(d);        break;
        case 'armorShield':    armorShield.push(d);      break;
        case 'boon':           boons.push(d);            break;
        case 'burden':         burdens.push(d);          break;
        case 'condition':      conditions.push(d);       break;
        case 'gear':           gear.push(d);             break;
        case 'criticalInjury': criticalInjuries.push(d); break;
        case 'monsterTrait':   traits.push(d);           break;
        case 'mysticalPower':  mysticalPowers.push(d);   break;
        case 'ritual':         rituals.push(d);          break;
        case 'supply':         supplies.push(d);         break;
        case 'talent':         talents.push(d);          break;
        case 'weapon':         weapons.push(d);          break;
        default:               equipment.push(d);        break;
      }
    }

    context.mysticalPowers   = sortRankedItems(mysticalPowers);
    context.rituals          = sortRankedItems(rituals);
    context.talents          = sortRankedItems(talents);
    context.traits           = sortRankedItems(traits);
    context.boons            = sortRankedItems(boons);
    context.equipment        = equipment.sort((a, b) => a.type.localeCompare(b.type) || a.name.localeCompare(b.name));
    context.armorHead        = armorHead.sort((a, b) => a.name.localeCompare(b.name));
    context.armorBody        = armorBody.sort((a, b) => a.name.localeCompare(b.name));
    context.armorShield      = armorShield.sort((a, b) => a.name.localeCompare(b.name));
    context.weapons          = weapons.sort((a, b) => a.name.localeCompare(b.name));
    context.burdens          = burdens.sort((a, b) => a.name.localeCompare(b.name));
    context.conditions       = conditions.sort((a, b) => a.name.localeCompare(b.name));
    context.criticalInjuries = criticalInjuries.sort((a, b) => a.name.localeCompare(b.name));
    context.gear             = gear.sort((a, b) => a.name.localeCompare(b.name));
    context.supplies         = supplies.sort((a, b) => a.name.localeCompare(b.name));
    context.artifacts        = artifacts.sort((a, b) => a.name.localeCompare(b.name));
  }

  /* -------------------------------------------- */
  /*  Type-specific Display Data                   */
  /* -------------------------------------------- */

  _prepareCharacterData(context) {
    const sys = context.system;

    // XP: unspent = total minus cost of all purchased abilities
    sys.experience.unspent = sys.experience.total;
    for (const list of [context.talents, context.traits, context.mysticalPowers, context.rituals, context.boons, context.burdens]) {
      for (const item of list) sys.experience.unspent -= (item.system.xpCost ?? 0);
    }
  }

  _prepareNPCData(context) {
    const sys = context.system;

    // Aggregate equipped armor
    sys.armorRating = { max: 0, value: 0 };
    for (const list of [context.armorBody, context.armorHead, context.armorShield]) {
      for (const item of list) {
        if (item.system.equip?.isEquipped) {
          sys.armorRating.max   += item.system.rating.max;
          sys.armorRating.value += item.system.rating.value;
        }
      }
    }
  }

  /* -------------------------------------------- */
  /*  Actions                                      */
  /* -------------------------------------------- */

  static async #onEditImage(_event, _target) {
    const attr = this.document.img ? 'img' : 'prototypeToken.texture.src';
    const current = foundry.utils.getProperty(this.document, attr);
    const fp = new FilePicker({
      type: 'image',
      current,
      callback: path => this.document.update({ [attr]: path }),
    });
    fp.browse();
  }

  static async #onItemCreate(event, target) {
    const type = target.dataset.type;
    const name = `New ${type.capitalize()}`;
    await Item.create({ name, type, system: {} }, { parent: this.actor });
  }

  static #onItemEdit(_event, target) {
    const itemId = target.closest('[data-item-id]').dataset.itemId;
    this.actor.items.get(itemId)?.sheet.render(true);
  }

  static async #onItemDelete(_event, target) {
    const itemId = target.closest('[data-item-id]').dataset.itemId;
    const item   = this.actor.items.get(itemId);
    if (!item) return;

    const proceed = await DialogV2.confirm({
      content: `Are you sure you want to delete ${item.name} from ${this.actor.name}?`,
      rejectClose: false,
      modal: true,
    });
    if (!proceed) return;

    if (item.system.equip?.isEquipped) {
      await this._unequipItem(item);
    }
    item.delete();
  }

  static async #onItemEquip(_event, target) {
    const itemId    = target.closest('[data-item-id]').dataset.itemId;
    const item      = this.actor.items.get(itemId);
    if (!item) return;
    item.system.equip?.isEquipped ? await this._unequipItem(item) : await this._equipItem(item);
  }

  static #onItemRoll(_event, target) {
    const itemId = target.closest('[data-item-id]').dataset.itemId;
    this.actor.items.get(itemId)?.roll();
  }

  static async #onRollSkill(event, target) {
    let attribute   = target.dataset.attribute ?? null;
    let skill       = target.dataset.skill ?? null;
    let spellcasting = false;

    if (skill === 'spellcasting') {
      attribute    = this.actor.system.skills.spellcasting.attribute;
      skill        = this.actor.system.skills.spellcasting.skill;
      spellcasting = true;
    }

    // Default attribute from skill
    if (attribute === null) {
      const attrMap = {
        endurance: 'physique', force: 'physique', melee: 'physique',
        dexterity: 'finesse',  discreet: 'finesse', marksmanship: 'finesse', mobility: 'finesse',
        crafting: 'wits',      lore: 'wits', medicus: 'wits', survival: 'wits', vigilance: 'wits',
        insight: 'empathy',    instinct: 'empathy', persuasion: 'empathy', volition: 'empathy',
      };
      attribute = attrMap[skill] ?? 'physique';
    }

    // Default skill from attribute
    if (skill === null) {
      const skillMap = { physique: 'force', finesse: 'dexterity', wits: 'crafting', empathy: 'insight' };
      skill = skillMap[attribute] ?? 'force';
    }

    const result = await selectSkillRoll(this.actor, [attribute, skill], spellcasting);
    if (result !== null) this.actor.buildRoll(result);
  }

  static #onShowArtifactCard(_event, target) {
    const card   = target.closest('[data-item-id]');
    const itemId  = card?.dataset.itemId;
    const powerId = card?.dataset.powerId;
    if (!itemId || !powerId) return;
    const item = this.actor.items.get(itemId) ?? game.items.get(itemId);
    item?.buildChatCardArtifactPower(powerId);
  }

  static async #onEffectCreate(_event, target) {
    onManageActiveEffect({ currentTarget: target, type: 'create' }, this.actor);
  }

  static #onEffectEdit(_event, target) {
    onManageActiveEffect({ currentTarget: target, type: 'edit' }, this.#getEffectParent(target, actor));
  }

  static async #onEffectDelete(_event, target) {
    onManageActiveEffect({ currentTarget: target, type: 'delete' }, this.#getEffectParent(target, actor));
  }

  static #onEffectToggle(_event, target) {
    onManageActiveEffect({ currentTarget: target, type: 'toggle' }, this.#getEffectParent(target, actor));
  }

  static #getEffectParent(target, actor) {
    const row = target.closest('[data-effect-id]');
    return row?.dataset.parentId === actor.id
      ? actor
      : actor.items.get(row?.dataset.parentId);
  }

  static async #onTempCorruptionChange(event, target) {
    let val = parseInt(target.value, 10);
    if (isNaN(val) || val < 0) val = 0;
    await this.actor.update({ 'system.corruption.temporary.value': val });
  }

  static async #onPermCorruptionChange(event, target) {
    let newPerm = parseInt(target.value, 10);
    if (isNaN(newPerm) || newPerm < 0) newPerm = 0;
    await this.actor.update({
      'system.corruption.permanent.value': newPerm
    });
  }

  static async #onArmorRatingChange(event, target) {
    const itemId = target.dataset.itemId;
    const item   = this.actor.items.get(itemId);
    if (!item) return;
    await item.update({ 'system.rating.value': parseInt(target.value, 10) });
  }

  /* -------------------------------------------- */
  /*  Equip / Unequip                              */
  /* -------------------------------------------- */

  async _unequipItem(item) {
    if (!item.system?.equip) return;

    if (item.system.equip.requiresEquipSlot) {
      const slots = this.actor.system.encumbrance.atHandSlots;
      let itemSlotKey     = null;
      let originalSlotData = {};

      outer: for (const key in slots) {
        if (slots[key].itemId === item.id) {
          itemSlotKey      = `system.encumbrance.atHandSlots.${key}`;
          originalSlotData = slots[key];
          break;
        }
        for (const subKey in slots[key].subslots) {
          if (slots[key].subslots[subKey].itemId === item.id) {
            itemSlotKey      = `system.encumbrance.atHandSlots.${key}.subslots.${subKey}`;
            originalSlotData = slots[key].subslots[subKey];
            break outer;
          }
        }
      }

      if (itemSlotKey) {
        const updatedSlot = { itemId: null, maxItemWeight: originalSlotData.maxItemWeight };
        if ('subslots' in originalSlotData) updatedSlot.subslots = {};
        await this.actor.update({ [itemSlotKey]: updatedSlot });
      }
    }

    if (!item.system.equip.alwaysTransferEffects) {
      for (const effect of item.effects) await effect.update({ transfer: false });
    }

    await item.update({ 'system.equip.isEquipped': false });
  }

  async _equipItem(item) {
    if (item.system.equip?.requiresEquipSlot) {
      const slots     = this.actor.system.encumbrance.atHandSlots;
      const selection = await selectAtHandSlot(this.actor, item);
      if (!selection) return;

      const [equipSlot, equipSubslot] = selection;
      let selectedSlot = equipSubslot
        ? slots[equipSlot].subslots[equipSubslot]
        : slots[equipSlot];

      const updatedSlot = { itemId: item.id };

      // Evict any existing occupant(s)
      if (selectedSlot.subslots) {
        for (const subKey in selectedSlot.subslots) {
          const subitem = this.actor.items.get(selectedSlot.subslots[subKey].itemId);
          if (subitem) await this._unequipItem(subitem);
        }
        updatedSlot.subslots = {};
      }
      if (selectedSlot.itemId) {
        const occupant = this.actor.items.get(selectedSlot.itemId);
        if (occupant) await this._unequipItem(occupant);
      }

      // Containers create subslots
      if (item.type === 'container') {
        updatedSlot.subslots = {};
        for (let i = 0; i < item.system.numSubSlots; i++) {
          updatedSlot.subslots[`subslot_${i}`] = { itemId: null, maxItemWeight: item.system.maxItemWeight };
        }
      }

      const slotKey = equipSubslot
        ? `system.encumbrance.atHandSlots.${equipSlot}.subslots.${equipSubslot}`
        : `system.encumbrance.atHandSlots.${equipSlot}`;
      await this.actor.update({ [slotKey]: updatedSlot });

    } else if (['armorBody', 'armorHead', 'armorShield'].includes(item.type)) {
      // Unequip any previously equipped piece of the same slot
      const slotMap = {
        armorBody:   this.actor.equippedArmorBody,
        armorHead:   this.actor.equippedArmorHead,
        armorShield: this.actor.equippedArmorShield,
      };
      const existing = slotMap[item.type];
      if (existing) await this._unequipItem(existing);
    }

    if (!item.system.equip.alwaysTransferEffects) {
      for (const effect of item.effects) await effect.update({ transfer: true });
    }

    await item.update({ 'system.equip.isEquipped': true });
  }
}

// ---------------------------------------------------------------------------
// Character Sheet
// ---------------------------------------------------------------------------

export class WoDCharacterSheet extends WoDActorSheet {
  static PARTS = {
    header:         { template: 'systems/wrath-of-davokar/templates/actor/parts/actor-header.hbs'},
    tabs:           { template: 'templates/generic/tab-navigation.hbs' },
    main:           { template: 'systems/wrath-of-davokar/templates/actor/parts/actor-main.hbs',        scrollable: [''] },
    description:    { template: 'systems/wrath-of-davokar/templates/actor/parts/actor-description.hbs', scrollable: [''] },
    items:          { template: 'systems/wrath-of-davokar/templates/actor/parts/actor-items.hbs',       scrollable: [''] },
    talents:        { template: 'systems/wrath-of-davokar/templates/actor/parts/actor-talents.hbs',     scrollable: [''] },
    powers:         { template: 'systems/wrath-of-davokar/templates/actor/parts/actor-powers.hbs',      scrollable: [''] },
    effects:        { template: 'systems/wrath-of-davokar/templates/actor/parts/actor-effects.hbs',     scrollable: [''] },
  };
}

// ---------------------------------------------------------------------------
// NPC Sheet
// ---------------------------------------------------------------------------

export class WoDNPCSheet extends WoDActorSheet {
  static PARTS = {
    header:         { template: 'systems/wrath-of-davokar/templates/actor/parts/actor-npc-header.hbs' },
    tabs:           { template: 'templates/generic/tab-navigation.hbs' },
    main:           { template: 'systems/wrath-of-davokar/templates/actor/parts/actor-main.hbs',            scrollable: [''] },
    description:    { template: 'systems/wrath-of-davokar/templates/actor/parts/actor-npc-description.hbs', scrollable: [''] },
    items:          { template: 'systems/wrath-of-davokar/templates/actor/parts/actor-items.hbs',           scrollable: [''] },
    talents:        { template: 'systems/wrath-of-davokar/templates/actor/parts/actor-talents.hbs',         scrollable: [''] },
    powers:         { template: 'systems/wrath-of-davokar/templates/actor/parts/actor-powers.hbs',          scrollable: [''] },
    effects:        { template: 'systems/wrath-of-davokar/templates/actor/parts/actor-effects.hbs',         scrollable: [''] },
  };
}
