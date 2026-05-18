import {
  createActiveEffect,
  deleteActiveEffect,
  editActiveEffect,
  toggleActiveEffect,
  prepareActiveEffectCategories,
} from '../helpers/effects.mjs';

import { selectSkillRoll, selectAtHandSlot } from '../helpers/dialog.mjs';
import { sortRankedItems } from '../helpers/utils.mjs';


const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;
const TextEditor = foundry.applications.ux.TextEditor.implementation;

// ---------------------------------------------------------------------------
// Base Sheet
// ---------------------------------------------------------------------------

export class WoDActorSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
  #editMode = false;
  #itemSearchQuery = '';
  #talentSearchQuery = ''
  #powerSearchQuery = ''
  #activeTooltip = null;
  #hideTooltipTimer = null;
  #isHoveringTooltipOrParent = false;
  #enrichedDescriptions = new Map();

  static DEFAULT_OPTIONS = {
    classes: ['wrath-of-davokar', 'sheet', 'actor'],
    position: { width: 750, height: 680 },
    form: { submitOnChange: true },
    window: { resizable: true },
    actions: {
      editImage:            WoDActorSheet.#onEditImage,
      itemCreate:           WoDActorSheet.#onItemCreate,
      itemEdit:             WoDActorSheet.#onItemEdit,
      itemDelete:           WoDActorSheet.#onItemDelete,
      itemEquip:            WoDActorSheet.#onItemEquip,
      itemRoll:             WoDActorSheet.#onItemRoll,
      rollSkill:            WoDActorSheet.#onRollSkill,
      showArtifactCard:     WoDActorSheet.#onShowArtifactCard,
      'effect:create':      WoDActorSheet.#onEffectCreate,
      'effect:edit':        WoDActorSheet.#onEffectEdit,
      'effect:delete':      WoDActorSheet.#onEffectDelete,
      'effect:toggle':      WoDActorSheet.#onEffectToggle,
      tempCorruptionChange: WoDActorSheet.#onTempCorruptionChange,
      permCorruptionChange: WoDActorSheet.#onPermCorruptionChange,
      armorRatingChange:    WoDActorSheet.#onArmorRatingChange,
      gearDurabilityChange: WoDActorSheet.#onGearDurabilityChange,
      supplyChange:         WoDActorSheet.#onSupplyChange,
      toggleEditMode:       WoDActorSheet.#onToggleEditMode,
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

  _onRender(context, options) {
    super._onRender(context, options);

    // Items Search Bar
    const searchInputItems = this.element.querySelector('.items-tab .search-input');
    if (searchInputItems) {
      // Restore previous search
      searchInputItems.value = this.#itemSearchQuery;
      if (this.#itemSearchQuery) {
        this.#filterItems(this.element, this.#itemSearchQuery);
      }

      searchInputItems.addEventListener('input', (event) => {
        this.#itemSearchQuery = event.target.value;
        this.#filterItems(this.element, this.#itemSearchQuery);
      });
    }

    // Talents Search Bar
    const searchInputTalents = this.element.querySelector('.talents-tab .search-input');
    if (searchInputTalents) {
      // Restore previous search
      searchInputTalents.value = this.#talentSearchQuery;
      if (this.#talentSearchQuery) {
        this.#filterTalents(this.element, this.#talentSearchQuery);
      }

      searchInputTalents.addEventListener('input', (event) => {
        this.#talentSearchQuery = event.target.value;
        this.#filterTalents(this.element, this.#talentSearchQuery);
      });
    }

    // Powers Search Bar
    const searchInputPowers = this.element.querySelector('.powers-tab .search-input');
    if (searchInputPowers) {
      // Restore previous search
      searchInputPowers.value = this.#powerSearchQuery;
      if (this.#talentSearchQuery) {
        this.#filterPowers(this.element, this.#powerSearchQuery);
      }

      searchInputPowers.addEventListener('input', (event) => {
        this.#powerSearchQuery = event.target.value;
        this.#filterPowers(this.element, this.#powerSearchQuery);
      });
    }

    // Item hover tooltips
    this.#activeTooltip?.remove();
    this.#activeTooltip = null;

    for (const row of this.element.querySelectorAll('li[data-item-id]')) {
      let hoverTimer = null;

      row.addEventListener('mouseenter', (event) => {
        console.log('ROW: Mouse Enter');
        this.#isHoveringTooltipOrParent = true;

        // Cancel any pending hide when re-entering a row
        clearTimeout(this.#hideTooltipTimer);
        this.#hideTooltipTimer = null;

        hoverTimer = setTimeout(async () => {
          console.log('ROW: Hover Timer Expired');
          const itemId = row.dataset.itemId;
          const item = this.actor.items.get(itemId);
          if (!item) return;
          await this.#showItemTooltip(item, row);
        }, 200);
      });

      row.addEventListener('mouseleave', () => {
        console.log('ROW: Mouse Leave');
        clearTimeout(hoverTimer);
        hoverTimer = null;

        this.#isHoveringTooltipOrParent = false;
        this.#scheduleHideTooltip();
      });
    }
  }

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
    context.editable    = this.isEditable;

    // Edit mode: owners can toggle; non-owners are always locked
    context.canToggleEdit = this.document.isOwner;
    context.editMode      = context.canToggleEdit ? this.#editMode : false;

    // Tab contexts
    context.tabs        = this._prepareTabs('primary');
    context.talentTabs  = this._prepareTabs('talents');
    context.powerTabs   = this._prepareTabs('powers');

    // Build enriched item display objects
    this.#enrichedDescriptions = new Map();
    for (const item of this.actor.items) {
      this.#enrichedDescriptions.set(item.id, await TextEditor.enrichHTML(
        item.system.description ?? '',
        { secrets: this.document.isOwner, rollData: this.actor.getRollData(), relativeTo: this.actor }
      ));
    }
    context.enrichedItems = this.#enrichedDescriptions;

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
    const equipment        = [];
    const armorHead        = [];
    const armorBody        = [];
    const armorShield      = [];
    const weapons          = [];
    const mysticalPowers   = [];
    const rituals          = [];
    const talents          = [];
    const traits           = [];
    const boons            = [];
    const burdens          = [];
    const conditions       = [];
    const criticalInjuries = [];
    const artifacts        = [];
    const gear             = [];
    const supplies         = [];
    const alchemicalItems  = [];
    const containers       = [];
    const artifactPowersMap= {};

    for (const item of this.actor.items) {
      const d = item.toObject(false);
      d.id  = item.id;
      d.img = d.img || Item.DEFAULT_ICON;
      d.enrichedDescription = context.enrichedItems.get(item.id) ?? '';

      switch (item.type) {
        case 'weapon':          weapons.push(d);          break;
        case 'armorBody':       armorBody.push(d);        break;
        case 'armorHead':       armorHead.push(d);        break;
        case 'armorShield':     armorShield.push(d);      break;
        case 'equipment':       equipment.push(d);        break;
        case 'mysticalPower':   mysticalPowers.push(d);   break;
        case 'ritual':          rituals.push(d);          break;
        case 'talent':          talents.push(d);          break;
        case 'monsterTrait':    traits.push(d);           break;
        case 'boon':            boons.push(d);            break;
        case 'burden':          burdens.push(d);          break;
        case 'condition':       conditions.push(d);       break;
        case 'criticalInjury':  criticalInjuries.push(d); break;
        case 'alchemicalItem':  alchemicalItems.push(d);  break;
        case 'gear':            gear.push(d);             break;
        case 'supply':          supplies.push(d);         break;
        case 'container':       containers.push(d);       break;
        case 'artifactPower':
          artifactPowersMap[d.system.artifactPowerId] = d;
          break;
      }
      if (item.system.isArtifact) {
        artifacts.push(d);
      }
    }

    // After all items are categorized, attach resolved powers to each artifact
    for (const artifact of artifacts) {
      artifact.resolvedPowers = (artifact.system.artifactPowers ?? [])
        .map(powerId => artifactPowersMap[powerId])
        .filter(Boolean);
    }

    context.weapons          = weapons.sort((a, b) => a.name.localeCompare(b.name));
    context.armorBody        = armorBody.sort((a, b) => a.name.localeCompare(b.name));
    context.armorHead        = armorHead.sort((a, b) => a.name.localeCompare(b.name));
    context.armorShield      = armorShield.sort((a, b) => a.name.localeCompare(b.name));
    context.equipment        = equipment.sort((a, b) => a.name.localeCompare(b.name));
    context.mysticalPowers   = sortRankedItems(mysticalPowers);
    context.rituals          = sortRankedItems(rituals);
    context.talents          = sortRankedItems(talents);
    context.traits           = sortRankedItems(traits);
    context.boons            = sortRankedItems(boons);
    context.burdens          = burdens.sort((a, b) => a.name.localeCompare(b.name));
    context.conditions       = conditions.sort((a, b) => a.name.localeCompare(b.name));
    context.criticalInjuries = criticalInjuries.sort((a, b) => a.name.localeCompare(b.name));
    context.artifacts        = artifacts.sort((a, b) => a.name.localeCompare(b.name));
    context.gear             = gear.sort((a, b) => a.name.localeCompare(b.name));
    context.supplies         = supplies.sort((a, b) => a.name.localeCompare(b.name));
    context.alchemicalItems  = alchemicalItems.sort((a, b) => a.name.localeCompare(b.name));
    context.containers       = containers.sort((a, b) => a.name.localeCompare(b.name));
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
  /*  Tool Tips                                   */
  /* -------------------------------------------- */
  async #showItemTooltip(item, anchorRow) {
    this.#hideItemTooltip(); // ensure no duplicate

    const tooltip = document.createElement('div');
    tooltip.classList.add('wrath-of-davokar', 'item-tooltip');
    const enrichedDescription = this.#enrichedDescriptions.get(item.id)
    tooltip.innerHTML = await foundry.applications.handlebars.renderTemplate('systems/wrath-of-davokar/templates/item/parts/item-tooltip.hbs', {item: item, enrichedDescription:enrichedDescription});

    // Position off-screen BEFORE appending so layout is never affected
    tooltip.style.top  = '-9999px';
    tooltip.style.left = '-9999px';

    document.body.appendChild(tooltip);
    this.#activeTooltip = tooltip;

    // Keep the tooltip alive while the cursor is inside it
    tooltip.addEventListener('mouseenter', () => {
      console.log('TOOLTIP: Mouse Enter');
      this.#isHoveringTooltipOrParent = true;

      clearTimeout(this.#hideTooltipTimer);
      this.#hideTooltipTimer = null;
    });
    tooltip.addEventListener('mouseleave', () => {
      console.log('TOOLTIP: Mouse Leave');
      this.#isHoveringTooltipOrParent = false;
      this.#scheduleHideTooltip();
    });

    // Measure after append (now the browser knows its dimensions)
    const boundingRect    = anchorRow.getBoundingClientRect();
    const toolTipRect = tooltip.getBoundingClientRect();
    const margin  = 0;

    let x = boundingRect.left - margin - toolTipRect.width;
    let y  = boundingRect.top;

    if (x < margin) {
      x = margin
      y = boundingRect.top - toolTipRect.height
    }

    tooltip.style.top  = `${Math.max(margin, y)}px`;
    tooltip.style.left = `${Math.max(margin, x)}px`;
  }

  #scheduleHideTooltip() {
    console.log('#scheduleHideTooltip: ENTER');
    clearTimeout(this.#hideTooltipTimer);
    this.#hideTooltipTimer = setTimeout(() => {
      if (!this.#isHoveringTooltipOrParent) {
        this.#hideItemTooltip();
      }
    }, 200);
    console.log('#scheduleHideTooltip: EXIT');
  }

  #hideItemTooltip() {
    console.log('#hideItemTooltip: ENTER');
    clearTimeout(this.#hideTooltipTimer);
    this.#hideTooltipTimer = null;
    this.#activeTooltip?.remove();
    this.#activeTooltip = null;
    console.log('#hideItemTooltip: EXIT');
  }

  /* -------------------------------------------- */
  /*  Actions                                     */
  /* -------------------------------------------- */

  static #onToggleEditMode(_event, _target) {
    this.#editMode = !this.#editMode;
    this.render();
  }

  static async #onEditImage(_event, target) {
    const attr = target.dataset.edit;
    const current = foundry.utils.getProperty(this.document, attr);
    const fp = new FilePicker({
      current,
      type: 'image',
      callback: path => this.document.update({'img': path }),
      top: this.position.top + 40,
      left: this.position.left + 10,
    });
    return fp.browse();
  }

  static async #onItemCreate(_event, target) {
    const type = target.dataset.type;
    const itemData = { name: `New ${type}`, type };
    await Item.create(itemData, { parent: this.actor });
  }

  static #onItemEdit(_event, target) {
    const li = target.closest('[data-item-id]');
    const item = this.actor.items.get(li?.dataset.itemId);
    item?.sheet.render(true);
  }

  static async #onItemDelete(_event, target) {
    const li = target.closest('[data-item-id]');
    const item = this.actor.items.get(li?.dataset.itemId);

    if (!item) return;

    const deleteItem = await foundry.applications.api.DialogV2.confirm({
      window: { title: game.i18n.format('WRATH_OF_DAVOKAR.Dialog.Items.Delete.Title', {itemName: item.name}) },
      content: game.i18n.format('WRATH_OF_DAVOKAR.Dialog.Items.Delete.Body', {itemName: item.name, actorName:this.actor.name})
    })

    if (deleteItem) {
      this.unequipItem(item);
      await item.delete();
    }
  }

  static async #onItemEquip(_event, target) {
    const li = target.closest('[data-item-id]');
    const item = this.actor.items.get(li?.dataset.itemId);
    if (!item) return;
    if (item.system.equip?.isEquipped) await this.unequipItem(item);
    else await this.equipItem(item);
  }

  static async #onItemRoll(_event, target) {
    const li = target.closest('[data-item-id]');
    const item = this.actor.items.get(li?.dataset.itemId);
    item?.roll();
  }

  static async #onRollSkill(_event, target) {
    const attribute    = target.dataset.attribute ?? null;
    const skill        = target.dataset.skill     ?? null;
    const modifier     = target.dataset.modifier  ?? null;
    const title        = target.dataset.title     ?? null;
    const spellcasting = target.dataset.spellcasting === 'true';

    if (attribute === null && skill === null) return;

    let resolvedSkill = skill;
    if (resolvedSkill === null) {
      const skillMap = { physique: 'force', finesse: 'dexterity', wits: 'crafting', empathy: 'insight' };
      resolvedSkill = skillMap[attribute] ?? 'force';
    }

    const result = await selectSkillRoll(this.actor, [attribute, resolvedSkill], spellcasting, modifier, title);
    if (result !== null) this.actor.buildRoll(result);
  }

  static #onShowArtifactCard(_event, target) {
    const card    = target.closest('[data-item-id]');
    const itemId  = card?.dataset.itemId;
    const powerId = card?.dataset.powerId;
    if (!itemId || !powerId) return;
    const item = this.actor.items.get(itemId) ?? game.items.get(itemId);
    item?.buildChatCardArtifactPower(powerId);
  }

  #filterItems (element, query) {
    const term = query.trim().toLocaleLowerCase();
    for (const list of element.querySelectorAll('.items-tab .items-list')) {
      let anyVisible = false;

      for (const listElement of list.querySelectorAll('li[data-item-id]')) {
        const item = this.actor.items.get(listElement.dataset.itemId);
        const name = item.name.toLocaleLowerCase() ?? '';
        const visible = !term || name.includes(term);
        listElement.style.display = visible ? '' : 'none';
        if (visible) anyVisible = true;
      }

      // Hide the whole section (including its header) when nothing matches
      list.style.display = anyVisible ? '' : 'none';
    }
  }

  #filterTalents (element, query) {
    const term = query.trim().toLocaleLowerCase();
    for (const grid of element.querySelectorAll('.talents-tab .talent-grid')) {
      for (const card of grid.querySelectorAll('div[data-item-id]')) {
        const item = this.actor.items.get(card.dataset.itemId);
        console.log(item)
        const name = item.name.toLocaleLowerCase() ?? '';
        const visible = !term || name.includes(term);
        card.style.display = visible ? '' : 'none';
      }
    }
  }

  #filterPowers (element, query) {
    const term = query.trim().toLocaleLowerCase();
    for (const grid of element.querySelectorAll('.powers-tab .talent-grid')) {
      for (const card of grid.querySelectorAll('div[data-item-id]')) {
        const item = this.actor.items.get(card.dataset.itemId);
        console.log(item)
        const name = item.name.toLocaleLowerCase() ?? '';
        const visible = !term || name.includes(term);
        card.style.display = visible ? '' : 'none';
      }
    }
  }

  /* -------------------------------------------- */
  /*  Active Effect Actions                        */
  /* -------------------------------------------- */

  static #onEffectCreate(_event, target) {
    const effectType = target.closest('[data-effect-type]')?.dataset.effectType ?? 'passive';
    createActiveEffect(this.actor, effectType);
  }

  static #onEffectEdit(_event, target) {
    const row      = target.closest('[data-effect-id]');
    const parentId = row?.dataset.parentId;
    const owner    = (parentId && parentId !== this.actor.id)
      ? this.actor.items.get(parentId) ?? this.actor
      : this.actor;
    const effectId = target.closest('[data-effect-id]')?.dataset.effectId;
    const effect   = owner.effects.get(effectId);
    editActiveEffect(effect);
  }

  static #onEffectDelete(_event, target) {
    const row      = target.closest('[data-effect-id]');
    const parentId = row?.dataset.parentId;
    const owner    = (parentId && parentId !== this.actor.id)
      ? this.actor.items.get(parentId) ?? this.actor
      : this.actor;
    const effectId = target.closest('[data-effect-id]')?.dataset.effectId;
    const effect   = owner.effects.get(effectId);
    deleteActiveEffect(effect);
  }

  static #onEffectToggle(_event, target) {
    const row      = target.closest('[data-effect-id]');
    const parentId = row?.dataset.parentId;
    const owner    = (parentId && parentId !== this.actor.id)
      ? this.actor.items.get(parentId) ?? this.actor
      : this.actor;
    const effectId = target.closest('[data-effect-id]')?.dataset.effectId;
    const effect   = owner.effects.get(effectId);
    toggleActiveEffect(effect);
  }

  /* -------------------------------------------- */
  /*  Corruption & Stat Changes                    */
  /* -------------------------------------------- */

  static async #onTempCorruptionChange(event, target) {
    let val = parseInt(target.value, 10);
    if (isNaN(val)) return;
    if (val < 0) val = 0;
    await this.actor.update({ 'system.corruption.temporary.value': val });
  }

  static async #onPermCorruptionChange(event, target) {
    let newPerm = parseInt(target.value, 10);
    if (isNaN(newPerm)) return;
    if (newPerm < 0) newPerm = 0;
    await this.actor.update({ 'system.corruption.permanent.value': newPerm });
  }

  static async #onArmorRatingChange(event, target) {
    const itemId = target.dataset.itemId;
    const item   = this.actor.items.get(itemId);
    if (!item) return;

    let newValue = parseInt(target.value, 10);
    if (isNaN(newValue)) return;

    newValue = Math.clamp(newValue, 0, item.system.armorRating.max);
    await item.update({ 'system.rating.value': newValue });
  }

  static async #onGearDurabilityChange(event, target) {
    const itemId = target.dataset.itemId;
    const item   = this.actor.items.get(itemId);
    if (!item) return;

    let newValue = parseInt(target.value, 10);
    if (isNaN(newValue)) return;

    newValue = Math.clamp(newValue, 0, item.system.durability.max);
    await item.update({ 'system.durability.value': newValue });
  }

  static async #onSupplyChange(event, target) {
    const itemId = target.dataset.itemId;
    const item   = this.actor.items.get(itemId);
    if (!item) return;

    let newValue = parseInt(target.value, 10);
    if (isNaN(newValue)) return;

    if (newValue < 0) newValue = 0;
    await item.update({ 'system.supply': newValue });
  }

  /* -------------------------------------------- */
  /*  Equip / Unequip                             */
  /* -------------------------------------------- */

  async unequipItem(item) {
    if (!item.system?.equip) return;

    if (item.system.equip.requiresEquipSlot) {
      this.clearSlot(item.id);
    }

    if (!item.system.equip.alwaysTransferEffects) {
      for (const effect of item.effects) await effect.update({ transfer: false });
    }

    await item.update({ 'system.equip.isEquipped': false });
  }

  async clearSlot(itemId) {
    const slots = this.actor.system.encumbrance.atHandSlots;
    let itemSlotKey      = null;
    let originalSlotData = {};

    outer: for (const key in slots) {
      if (slots[key].itemId === itemId) {
        itemSlotKey      = `system.encumbrance.atHandSlots.${key}`;
        originalSlotData = slots[key];
        break;
      }
      for (const subKey in slots[key].subslots) {
        if (slots[key].subslots[subKey].itemId === itemId) {
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

  async equipItem(item) {
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
          if (subitem) await this.unequipItem(subitem);
        }
        updatedSlot.subslots = {};
      }
      if (selectedSlot.itemId) {
        const occupant = this.actor.items.get(selectedSlot.itemId);
        if (occupant) await this.unequipItem(occupant);
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
      if (existing) await this.unequipItem(existing);
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
    header:      { template: 'systems/wrath-of-davokar/templates/actor/parts/actor-header.hbs' },
    tabs:        { template: 'templates/generic/tab-navigation.hbs' },
    main:        { template: 'systems/wrath-of-davokar/templates/actor/parts/actor-main.hbs',        scrollable: [''] },
    description: { template: 'systems/wrath-of-davokar/templates/actor/parts/actor-description.hbs', scrollable: [''] },
    items:       { template: 'systems/wrath-of-davokar/templates/actor/parts/actor-items.hbs',       scrollable: [''] },
    talents:     { template: 'systems/wrath-of-davokar/templates/actor/parts/actor-talents.hbs',     scrollable: [''] },
    powers:      { template: 'systems/wrath-of-davokar/templates/actor/parts/actor-powers.hbs',      scrollable: [''] },
    effects:     { template: 'systems/wrath-of-davokar/templates/shared/parts/sheet-effects.hbs',    scrollable: [''] },
  };
}

// ---------------------------------------------------------------------------
// NPC Sheet
// ---------------------------------------------------------------------------

export class WoDNPCSheet extends WoDActorSheet {
  static PARTS = {
    header:      { template: 'systems/wrath-of-davokar/templates/actor/parts/actor-npc-header.hbs' },
    tabs:        { template: 'templates/generic/tab-navigation.hbs' },
    main:        { template: 'systems/wrath-of-davokar/templates/actor/parts/actor-main.hbs',            scrollable: [''] },
    description: { template: 'systems/wrath-of-davokar/templates/actor/parts/actor-npc-description.hbs', scrollable: [''] },
    items:       { template: 'systems/wrath-of-davokar/templates/actor/parts/actor-items.hbs',           scrollable: [''] },
    talents:     { template: 'systems/wrath-of-davokar/templates/actor/parts/actor-talents.hbs',         scrollable: [''] },
    powers:      { template: 'systems/wrath-of-davokar/templates/actor/parts/actor-powers.hbs',          scrollable: [''] },
    effects:     { template: 'systems/wrath-of-davokar/templates/shared/parts/sheet-effects.hbs',        scrollable: [''] },
  };
}
