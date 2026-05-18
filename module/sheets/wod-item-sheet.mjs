import {
  createActiveEffect,
  deleteActiveEffect,
  editActiveEffect,
  toggleActiveEffect,
  prepareActiveEffectCategories,
} from '../helpers/effects.mjs';

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ItemSheetV2 } = foundry.applications.sheets;

const TEMPLATES = 'systems/wrath-of-davokar/templates/item';

/**
 * Base item sheet for Wrath of Davokar.
 * All item type sheets inherit from this class.
 * PARTS must be declared in each subclass.
 */
export class WoDItemSheet extends HandlebarsApplicationMixin(ItemSheetV2) {
  #editMode = false;

  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ['wrath-of-davokar', 'sheet', 'item'],
    position: { width: 520, height: 480 },
    window: { resizable: true },
    form: { submitOnChange: true },
    actions: {
      editImage:           WoDItemSheet.#onEditImage,
      rollCorruption:      WoDItemSheet.#onRollCorruption,
      'effect:create':     WoDItemSheet.#onEffectCreate,
      'effect:edit':       WoDItemSheet.#onEffectEdit,
      'effect:delete':     WoDItemSheet.#onEffectDelete,
      'effect:toggle':     WoDItemSheet.#onEffectToggle,
      artifactPowerCreate: WoDItemSheet.#onArtifactPowerCreate,
      artifactPowerEdit:   WoDItemSheet.#onArtifactPowerEdit,
      artifactPowerDelete: WoDItemSheet.#onArtifactPowerDelete,
      itemEffectCreate:    WoDItemSheet.#onItemEffectCreate,
      itemEffectDelete:    WoDItemSheet.#onItemEffectDelete,
      sendToChat:          WoDItemSheet.#onSendToChat,
      addArtifactPower:    WoDItemSheet.#onAddArtifactPower,
      removeArtifactPower: WoDItemSheet.#onRemoveArtifactPower,
      toggleEditMode:      WoDItemSheet.#onToggleEditMode,
    },
  };

  /** @override */
  static TABS = {
    primary: {
      tabs: [
        { id: 'main',           group: 'primary', label: 'WRATH_OF_DAVOKAR.Base.Tabs.Main' },
        { id: 'effects',        group: 'primary', label: 'WRATH_OF_DAVOKAR.Base.Tabs.Effects'  },
        { id: 'artifactPowers', group: 'primary', label: 'WRATH_OF_DAVOKAR.Base.Tabs.ArtifactPowers'  },
        { id: 'settings',       group: 'primary', label: 'WRATH_OF_DAVOKAR.Base.Tabs.Settings'  },
      ],
      initial: 'main',
    },
  };

  /* -------------------------------------------- */

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    const itemData = this.document.toObject(false);

    context.system = itemData.system;
    context.flags  = itemData.flags;
    context.item   = this.item;
    context.config = CONFIG.WRATH_OF_DAVOKAR;
    context.editable = this.isEditable;
    context.canToggleEdit = this.document.isOwner;
    context.editMode = context.canToggleEdit ? this.#editMode : false;
    context.tabs = this._prepareTabs("primary");

    // Remove settings tab if editMode is false
    if (!this.#editMode) {
      delete context.tabs.settings;
    }

    // Remove artifactPowers tab if item is not an artifact and has no powers
    if (!context.system.isArtifact && !context.system.artifactPowers) {
      delete context.tabs.artifactPowers;
    }

    // Enrich description
    context.enrichedDescription = await TextEditor.enrichHTML(
      this.item.system.description,
      {
        secrets:    this.document.isOwner,
        rollData:   this.item.getRollData(),
        relativeTo: this.item,
      }
    );


    // Resolve artifact power entries for display in artifact powers tab and settings tab
    if ('artifactPowers' in context.system) {
      context.artifactPowerEntries = await Promise.all(
        [...context.system.artifactPowers]
          .sort()
          .map(async artifactPowerId => {
            const found = game.items.find(
              i => i.type === 'artifactPower' && i.system.artifactPowerId === artifactPowerId
            );
            if (!found) return { artifactPowerId, name: artifactPowerId, missing: true };

            const enrichedDescription = await TextEditor.enrichHTML(
              found.system.description,
              {
                secrets:    this.document.isOwner,
                rollData:   found.getRollData(),
                relativeTo: found,
              }
            );

            console.log({
              artifactPowerId,
              name:               found.name,
              img:                found.img,
              corruption:         found.system.corruption,
              action:             found.system.action,
              enrichedDescription,
              missing:            false,
            })
            return {
              artifactPowerId,
              name:               found.name,
              img:                found.img,
              corruption:         found.system.corruption,
              action:             found.system.action,
              enrichedDescription,
              missing:            false,
            };
          })
      );
    }

    // Enrich Item Effect Descriptions
    if ('effectData' in context.system && context.system.effectData) {
      for (let [k, v] of Object.entries(context.system.effectData)) {
        v.enrichedDescription = await TextEditor.enrichHTML(
          v.description,
          {
            secrets:    this.document.isOwner,
            rollData:   this.item.getRollData(),
            relativeTo: this.item,
          }
        );
      }
    }

    // Localize Traditions
    if ('tradition' in context.system) {
      for (let [k, v] of Object.entries(context.system.tradition)) {
        v.label = game.i18n.localize(CONFIG.WRATH_OF_DAVOKAR.tradition[k]) ?? k;
      }
    }

    // Localize Rank
    if ('rank' in context.system) {
      const rank = context.system.rank;
      const rankMap = { 1: 'one', 2: 'two', 3: 'three' };
      const rankKey = rankMap[rank.value];
      if (rankKey) {
        rank.labelTalent = game.i18n.localize(CONFIG.WRATH_OF_DAVOKAR.rank[rankKey].talent);
        rank.labelAbbv   = game.i18n.localize(CONFIG.WRATH_OF_DAVOKAR.rank[rankKey].abbv);
        rank.labelTrait  = game.i18n.localize(CONFIG.WRATH_OF_DAVOKAR.rank[rankKey].trait);
      }
    }

    // Add AOE Radio Button Data for Weapons
    if (itemData.type === 'weapon') {
      context.system.area.radio = {
        none:   'WRATH_OF_DAVOKAR.Weapon.AreaEffect.None',
        cone:   'WRATH_OF_DAVOKAR.Weapon.AreaEffect.Cone',
        radius: 'WRATH_OF_DAVOKAR.Weapon.AreaEffect.Radius',
      };
    }

    // Prepare active effects
    context.effects = prepareActiveEffectCategories(this.item.effects);

    return context;
  }

  /** @override */
  async _preparePartContext(partId, context) {
    context = await super._preparePartContext(partId, context);
    switch (partId) {
      case 'main':
      case 'effects':
      case 'artifactPowers':
      case 'settings':
        context.tab = context.tabs[partId];
        break;
    }
    return context;
  }

  /** @override */
  _configureRenderOptions(options) {
    super._configureRenderOptions(options);

    // Remove artifacts tab if item is not an artifact
    if (!this.document.system.isArtifact) {
      options.parts = options.parts.filter(p => p !== 'artifactPowers');
    }

    // Remove settings tab is user is not an Assistant or above
    if (game.user.role < CONST.USER_ROLES.ASSISTANT) {
      options.parts = options.parts.filter(p => p !== 'settings');
    }
  }

  /** @override */
  _onRender(context, options) {
    super._onRender(context, options);

    const searchInput = this.element.querySelector('.artifact-power-search-input');
    if (!searchInput) return;

    // Filter dropdown as user types
    searchInput.addEventListener('input', (event) => {
      WoDItemSheet.#onArtifactPowerSearch.call(this, event);
    });

    // Close dropdown when clicking outside the search area
    this._powerSearchHandler = (event) => {
      if (!event.target.closest('.artifact-power-search')) {
        this.element.querySelector('.artifact-power-dropdown')
          ?.classList.add('hidden');
      }
    };
    document.addEventListener('click', this._powerSearchHandler);
  }

  /** @override */
  _onClose(options) {
    super._onClose(options);
    // Clean up the document-level click listener when sheet closes
    if (this._powerSearchHandler) {
      document.removeEventListener('click', this._powerSearchHandler);
      this._powerSearchHandler = null;
    }
  }

  /* -------------------------------------------- */
  /*  Actions                                      */
  /* -------------------------------------------- */

  static #onToggleEditMode(_event, _target) {
    this.#editMode = !this.#editMode;
    this.render();
  }

  /**
   * Handle editing the item image.
   * @this {WoDItemSheet}
   * @param {PointerEvent} event
   * @param {HTMLElement}  target
   */
  static async #onEditImage(event, target) {
    const field   = target.dataset.field ?? 'img';
    const current = foundry.utils.getProperty(this.document, field);

    const fp = new foundry.applications.apps.FilePicker({
      type:     'image',
      current:  current,
      callback: (path) => this.document.update({ [field]: path }),
    });

    fp.render(true);
  }

  /**
   * @this {WoDItemSheet}
   * @param {PointerEvent} event
   * @param {HTMLElement}  target
   */
  static #onRollCorruption(event, target) {
    event.preventDefault();
    const { roll, label } = target.dataset;
    if (!roll) return;

    const r = new Roll(roll, this.item.getRollData());
    r.toMessage({
      speaker:  ChatMessage.getSpeaker({ item: this.item }),
      flavor:   label ?? '',
      rollMode: game.settings.get('core', 'rollMode'),
    });
    return r;
  }

  /* -------------------------------------------- */
  /*  Active Effect Actions                        */
  /* -------------------------------------------- */

  /**
   * @this {WoDItemSheet}
   * @param {PointerEvent} event
   * @param {HTMLElement}  target
   */
  static #onEffectCreate(event, target) {
    const effectType = target.closest('[data-effect-type]')?.dataset.effectType ?? 'passive';
    createActiveEffect(this.item, effectType);
  }

  /**
   * @this {WoDItemSheet}
   * @param {PointerEvent} event
   * @param {HTMLElement}  target
   */
  static #onEffectEdit(event, target) {
    const effectId = target.closest('[data-effect-id]')?.dataset.effectId;
    const effect   = this.item.effects.get(effectId);
    editActiveEffect(effect);
  }

  /**
   * @this {WoDItemSheet}
   * @param {PointerEvent} event
   * @param {HTMLElement}  target
   */
  static #onEffectDelete(event, target) {
    const effectId = target.closest('[data-effect-id]')?.dataset.effectId;
    const effect   = this.item.effects.get(effectId);
    deleteActiveEffect(effect);
  }

  /**
   * @this {WoDItemSheet}
   * @param {PointerEvent} event
   * @param {HTMLElement}  target
   */
  static #onEffectToggle(event, target) {
    const effectId = target.closest('[data-effect-id]')?.dataset.effectId;
    const effect   = this.item.effects.get(effectId);
    toggleActiveEffect(effect);
  }

  /* -------------------------------------------- */
  /*  Artifact Power Actions                       */
  /* -------------------------------------------- */

  /**
   * @this {WoDItemSheet}
   * @param {PointerEvent} event
   * @param {HTMLElement}  target
   */
  static async #onArtifactPowerCreate(event, target) {
    event.preventDefault();
    const powers  = this.item.system.powers;
    const powerId = Object.keys(powers).length;

    powers[powerId] = {
      name:        '',
      img:         'systems/wrath-of-davokar/assets/icons/artifact-power.svg',
      description: '',
      action: {
        reaction: false,
        passive:  false,
        special:  false,
        slow:     false,
        fast:     false,
        free:     false,
      },
      corruption: '',
      macro:      '',
    };

    await this.item.update({ _id: this.item.id, 'system.powers': powers });
  }

  /**
   * @this {WoDItemSheet}
   * @param {PointerEvent} event
   * @param {HTMLElement}  target
   */
  static async #onArtifactPowerEdit(event, target) {
    event.preventDefault();
    // Implement edit logic here
  }

  /**
   * @this {WoDItemSheet}
   * @param {PointerEvent} event
   * @param {HTMLElement}  target
   */
  static async #onArtifactPowerDelete(event, target) {
    event.preventDefault();
    const div     = target.closest('.artifact-power');
    const powerId = parseInt(div?.dataset.artifactPowerId);
    if (isNaN(powerId)) return;

    const powers    = this.item.system.powers;
    delete powers[powerId];

    const newPowers = Object.fromEntries(
      Object.values(powers).map((p, i) => [i, p])
    );

    const update = { _id: this.item.id, 'system.powers': newPowers };
    update[`system.powers.-=${Object.keys(newPowers).length}`] = null;
    await this.item.update(update);
  }

  /* -------------------------------------------- */
  /*  Item Effect Actions                          */
  /* -------------------------------------------- */

  /**
   * @this {WoDItemSheet}
   * @param {PointerEvent} event
   * @param {HTMLElement}  target
   */
  static async #onItemEffectCreate(event, target) {
    event.preventDefault();
    const itemEffects = this.item.system.effectData;
    const effectID    = Object.keys(itemEffects).length;

    itemEffects[effectID] = {
      name:        game.i18n.localize('EFFECT.Name'),
      duration:    { rounds: null, turns: null },
      img:         'icons/svg/aura.svg',
      changes:     [],
      description: '',
      tint:        '#ffffff',
    };

    await this.item.update({ _id: this.item.id, 'system.effectData': itemEffects });
  }

  /**
   * @this {WoDItemSheet}
   * @param {PointerEvent} event
   * @param {HTMLElement}  target
   */
  static async #onItemEffectDelete(event, target) {
    event.preventDefault();
    const div      = target.closest('.item-effect');
    const effectID = parseInt(div?.dataset.itemEffectId);
    if (isNaN(effectID)) return;

    const itemEffects = this.item.system.effectData;
    delete itemEffects[effectID];

    const newEffects = Object.fromEntries(
      Object.values(itemEffects).map((e, i) => [i, e])
    );

    const update = { _id: this.item.id, 'system.effectData': newEffects };
    update[`system.effectData.-=${Object.keys(newEffects).length}`] = null;
    await this.item.update(update);
  }

  /* -------------------------------------------- */
  /*  Chat & Search Actions                        */
  /* -------------------------------------------- */

  /**
   * @this {WoDItemSheet}
   * @param {PointerEvent} event
   * @param {HTMLElement}  target
   */
  static async #onSendToChat(event, target) {
    await this.item.buildChatCard();
  }

  /**
   * Filter available artifactPower items as the user types and populate dropdown.
   * @this {WoDItemSheet}
   * @param {InputEvent} event
   */
  static #onArtifactPowerSearch(event) {
    const input    = event.currentTarget;
    const query    = input.value.trim().toLowerCase();
    const dropdown = this.element.querySelector('.artifact-power-dropdown');

    if (!dropdown) return;

    if (!query) {
      dropdown.classList.add('hidden');
      dropdown.innerHTML = '';
      return;
    }

    // Get IDs already on this artifact to show them as already added
    const existingIds = new Set(this.item.system.artifactPowers ?? []);

    // Search game.items for artifactPower items matching the query
    const matches = game.items.filter(i =>
      i.type === 'artifactPower' &&
      i.name.toLowerCase().includes(query)
    );

    if (!matches.length) {
      dropdown.innerHTML = `
        <li class="artifact-power-dropdown-empty">
          ${game.i18n.localize('WRATH_OF_DAVOKAR.Artifact.NoMatchingPowers')}
        </li>
      `;
      dropdown.classList.remove('hidden');
      return;
    }

    // Sort alphabetically, build list items
    dropdown.innerHTML = matches
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(item => {
        const alreadyAdded = existingIds.has(item.system.artifactPowerId);
        return `
          <li class="artifact-power-dropdown-item ${alreadyAdded ? 'already-added' : ''}"
              data-action="addArtifactPower"
              data-power-id="${item.system.artifactPowerId}"
              data-power-name="${item.name}"
              title="${alreadyAdded
                ? game.i18n.localize('WRATH_OF_DAVOKAR.Artifact.PowerAlreadyAdded')
                : item.system.artifactPowerId}">
            <span class="artifact-power-dropdown-name">${item.name}</span>
            <span class="artifact-power-dropdown-id dimmed">(${item.system.artifactPowerId})</span>
            ${alreadyAdded
              ? `<i class="fas fa-check artifact-power-added-icon"></i>`
              : ''}
          </li>
        `;
      })
      .join('');

    dropdown.classList.remove('hidden');
  }

  /**
   * Add an artifactPowerId to the artifact's power list.
   * @this {WoDItemSheet}
   * @param {PointerEvent} event
   * @param {HTMLElement}  target
   */
  static async #onAddArtifactPower(event, target) {
    event.preventDefault();
    const powerId = target.dataset.powerId;
    if (!powerId) return;

    const current = [...(this.item.system.artifactPowers ?? [])];

    // Silently ignore if already present
    if (current.includes(powerId)) return;

    // Add and sort alphabetically
    current.push(powerId);
    current.sort();

    await this.item.update({ 'system.artifactPowers': current });

    // Clear the search input and hide dropdown after adding
    const searchInput = this.element.querySelector('.artifact-power-search-input');
    const dropdown    = this.element.querySelector('.artifact-power-dropdown');
    if (searchInput) searchInput.value = '';
    if (dropdown) {
      dropdown.classList.add('hidden');
      dropdown.innerHTML = '';
    }
  }

  /**
   * Remove an artifactPowerId from the artifact's power list.
   * @this {WoDItemSheet}
   * @param {PointerEvent} event
   * @param {HTMLElement}  target
   */
  static async #onRemoveArtifactPower(event, target) {
    event.preventDefault();
    const powerId = target.dataset.powerId;
    if (!powerId) return;

    const current = [...(this.item.system.artifactPowers ?? [])];
    const updated = current.filter(id => id !== powerId);

    await this.item.update({ 'system.artifactPowers': updated });
  }
}

// ---------------------------------------------------------------------------
// Armor
// ---------------------------------------------------------------------------

export class WoDArmorBodySheet extends WoDItemSheet {
  static PARTS = {
    header: {
      template: `${TEMPLATES}/item-header.hbs`,
    },
    tabs: {
      template: 'templates/generic/tab-navigation.hbs',
      classes: ['wrath-of-davokar'],
    },
    main:    { template: `${TEMPLATES}/item-armorBody.hbs`,  scrollable: [''] },
    effects: { template: 'systems/wrath-of-davokar/templates/shared/parts/sheet-effects.hbs', scrollable: [''] },
    artifactPowers: { template: `${TEMPLATES}/parts/item-artifact-powers.hbs`, scrollable: [''] },
    settings: { template: `${TEMPLATES}/parts/item-settings.hbs`, scrollable: [''] },
  };
}

export class WoDArmorHeadSheet extends WoDItemSheet {
  static PARTS = {
    header: {
      template: `${TEMPLATES}/item-header.hbs`,
    },
    tabs: {
      template: 'templates/generic/tab-navigation.hbs',
      classes: ['wrath-of-davokar'],
    },
    main:    { template: `${TEMPLATES}/item-armorHead.hbs`,  scrollable: [''] },
    effects: { template: 'systems/wrath-of-davokar/templates/shared/parts/sheet-effects.hbs', scrollable: [''] },
    artifactPowers: { template: `${TEMPLATES}/parts/item-artifact-powers.hbs`, scrollable: [''] },
    settings: { template: `${TEMPLATES}/parts/item-settings.hbs`, scrollable: [''] },
  };
}

export class WoDArmorShieldSheet extends WoDItemSheet {
  static PARTS = {
    header: {
      template: `${TEMPLATES}/item-header.hbs`,
    },
    tabs: {
      template: 'templates/generic/tab-navigation.hbs',
      classes: ['wrath-of-davokar'],
    },
    main:    { template: `${TEMPLATES}/item-armorShield.hbs`,  scrollable: [''] },
    effects: { template: 'systems/wrath-of-davokar/templates/shared/parts/sheet-effects.hbs', scrollable: [''] },
    artifactPowers: { template: `${TEMPLATES}/parts/item-artifact-powers.hbs`, scrollable: [''] },
    settings: { template: `${TEMPLATES}/parts/item-settings.hbs`, scrollable: [''] },
  };
}

// ---------------------------------------------------------------------------
// Weapons
// ---------------------------------------------------------------------------

export class WoDWeaponSheet extends WoDItemSheet {
  static PARTS = {
    header: {
      template: `${TEMPLATES}/item-header.hbs`,
    },
    tabs: {
      template: 'templates/generic/tab-navigation.hbs',
      classes: ['wrath-of-davokar'],
    },
    main:    { template: `${TEMPLATES}/item-weapon.hbs`,  scrollable: [''] },
    effects: { template: 'systems/wrath-of-davokar/templates/shared/parts/sheet-effects.hbs', scrollable: [''] },
    artifactPowers: { template: `${TEMPLATES}/parts/item-artifact-powers.hbs`, scrollable: [''] },
    settings: { template: `${TEMPLATES}/parts/item-settings.hbs`, scrollable: [''] },
  };
}

// ---------------------------------------------------------------------------
// Abilities & Powers
// ---------------------------------------------------------------------------

export class WoDTalentSheet extends WoDItemSheet {
  static PARTS = {
    header: {
      template: `${TEMPLATES}/item-header.hbs`,
    },
    tabs: {
      template: 'templates/generic/tab-navigation.hbs',
      classes: ['wrath-of-davokar'],
    },
    main:    { template: `${TEMPLATES}/item-talent.hbs`,  scrollable: [''] },
    effects: { template: 'systems/wrath-of-davokar/templates/shared/parts/sheet-effects.hbs', scrollable: [''] },
    artifactPowers: { template: `${TEMPLATES}/parts/item-artifact-powers.hbs`, scrollable: [''] },
    settings: { template: `${TEMPLATES}/parts/item-settings.hbs`, scrollable: [''] },
  };
}

export class WoDMysticalPowerSheet extends WoDItemSheet {
  static PARTS = {
    header: {
      template: `${TEMPLATES}/item-header.hbs`,
    },
    tabs: {
      template: 'templates/generic/tab-navigation.hbs',
      classes: ['wrath-of-davokar'],
    },
    main:    { template: `${TEMPLATES}/item-mysticalPower.hbs`,  scrollable: [''] },
    effects: { template: 'systems/wrath-of-davokar/templates/shared/parts/sheet-effects.hbs', scrollable: [''] },
    artifactPowers: { template: `${TEMPLATES}/parts/item-artifact-powers.hbs`, scrollable: [''] },
    settings: { template: `${TEMPLATES}/parts/item-settings.hbs`, scrollable: [''] },
  };
}

export class WoDRitualSheet extends WoDItemSheet {
  static PARTS = {
    header: {
      template: `${TEMPLATES}/item-header.hbs`,
    },
    tabs: {
      template: 'templates/generic/tab-navigation.hbs',
      classes: ['wrath-of-davokar'],
    },
    main:    { template: `${TEMPLATES}/item-ritual.hbs`,  scrollable: [''] },
    effects: { template: 'systems/wrath-of-davokar/templates/shared/parts/sheet-effects.hbs', scrollable: [''] },
    artifactPowers: { template: `${TEMPLATES}/parts/item-artifact-powers.hbs`, scrollable: [''] },
    settings: { template: `${TEMPLATES}/parts/item-settings.hbs`, scrollable: [''] },
  };
}

export class WoDMonsterTraitSheet extends WoDItemSheet {
  static PARTS = {
    header: {
      template: `${TEMPLATES}/item-header.hbs`,
    },
    tabs: {
      template: 'templates/generic/tab-navigation.hbs',
      classes: ['wrath-of-davokar'],
    },
    main:    { template: `${TEMPLATES}/item-monsterTrait.hbs`,  scrollable: [''] },
    effects: { template: 'systems/wrath-of-davokar/templates/shared/parts/sheet-effects.hbs', scrollable: [''] },
    artifactPowers: { template: `${TEMPLATES}/parts/item-artifact-powers.hbs`, scrollable: [''] },
    settings: { template: `${TEMPLATES}/parts/item-settings.hbs`, scrollable: [''] },
  };
}

export class WoDBoonSheet extends WoDItemSheet {
  static PARTS = {
    header: {
      template: `${TEMPLATES}/item-header.hbs`,
    },
    tabs: {
      template: 'templates/generic/tab-navigation.hbs',
      classes: ['wrath-of-davokar'],
    },
    main:    { template: `${TEMPLATES}/item-boon.hbs`,  scrollable: [''] },
    effects: { template: 'systems/wrath-of-davokar/templates/shared/parts/sheet-effects.hbs', scrollable: [''] },
    artifactPowers: { template: `${TEMPLATES}/parts/item-artifact-powers.hbs`, scrollable: [''] },
    settings: { template: `${TEMPLATES}/parts/item-settings.hbs`, scrollable: [''] },
  };
}

export class WoDBurdenSheet extends WoDItemSheet {
  static PARTS = {
    header: {
      template: `${TEMPLATES}/item-header.hbs`,
    },
    tabs: {
      template: 'templates/generic/tab-navigation.hbs',
      classes: ['wrath-of-davokar'],
    },
    main:    { template: `${TEMPLATES}/item-burden.hbs`,  scrollable: [''] },
    effects: { template: 'systems/wrath-of-davokar/templates/shared/parts/sheet-effects.hbs', scrollable: [''] },
    artifactPowers: { template: `${TEMPLATES}/parts/item-artifact-powers.hbs`, scrollable: [''] },
    settings: { template: `${TEMPLATES}/parts/item-settings.hbs`, scrollable: [''] },
  };
}

// ---------------------------------------------------------------------------
// Conditions & Status
// ---------------------------------------------------------------------------

export class WoDConditionSheet extends WoDItemSheet {
  static PARTS = {
    header: {
      template: `${TEMPLATES}/item-header.hbs`,
    },
    tabs: {
      template: 'templates/generic/tab-navigation.hbs',
      classes: ['wrath-of-davokar'],
    },
    main:    { template: `${TEMPLATES}/item-condition.hbs`,  scrollable: [''] },
    effects: { template: 'systems/wrath-of-davokar/templates/shared/parts/sheet-effects.hbs', scrollable: [''] },
    artifactPowers: { template: `${TEMPLATES}/parts/item-artifact-powers.hbs`, scrollable: [''] },
    settings: { template: `${TEMPLATES}/parts/item-settings.hbs`, scrollable: [''] },
  };
}

export class WoDCriticalInjurySheet extends WoDItemSheet {
  static PARTS = {
    header: {
      template: `${TEMPLATES}/item-header.hbs`,
    },
    tabs: {
      template: 'templates/generic/tab-navigation.hbs',
      classes: ['wrath-of-davokar'],
    },
    main:    { template: `${TEMPLATES}/item-criticalInjury.hbs`,  scrollable: [''] },
    effects: { template: 'systems/wrath-of-davokar/templates/shared/parts/sheet-effects.hbs', scrollable: [''] },
    artifactPowers: { template: `${TEMPLATES}/parts/item-artifact-powers.hbs`, scrollable: [''] },
    settings: { template: `${TEMPLATES}/parts/item-settings.hbs`, scrollable: [''] },
  };
}

// ---------------------------------------------------------------------------
// Inventory & Gear
// ---------------------------------------------------------------------------

export class WoDAlchemicalItemSheet extends WoDItemSheet {
  static PARTS = {
    header: {
      template: `${TEMPLATES}/item-header.hbs`,
    },
    tabs: {
      template: 'templates/generic/tab-navigation.hbs',
      classes: ['wrath-of-davokar'],
    },
    main:    { template: `${TEMPLATES}/item-alchemicalItem.hbs`,  scrollable: [''] },
    effects: { template: 'systems/wrath-of-davokar/templates/shared/parts/sheet-effects.hbs', scrollable: [''] },
    artifactPowers: { template: `${TEMPLATES}/parts/item-artifact-powers.hbs`, scrollable: [''] },
    settings: { template: `${TEMPLATES}/parts/item-settings.hbs`, scrollable: [''] },
  };
}

export class WoDContainerSheet extends WoDItemSheet {
  static PARTS = {
    header: {
      template: `${TEMPLATES}/item-header.hbs`,
    },
    tabs: {
      template: 'templates/generic/tab-navigation.hbs',
      classes: ['wrath-of-davokar'],
    },
    main:    { template: `${TEMPLATES}/item-container.hbs`,  scrollable: [''] },
    effects: { template: 'systems/wrath-of-davokar/templates/shared/parts/sheet-effects.hbs', scrollable: [''] },
    artifactPowers: { template: `${TEMPLATES}/parts/item-artifact-powers.hbs`, scrollable: [''] },
    settings: { template: `${TEMPLATES}/parts/item-settings.hbs`, scrollable: [''] },
  };
}

export class WoDEquipmentSheet extends WoDItemSheet {
  static PARTS = {
    header: {
      template: `${TEMPLATES}/item-header.hbs`,
    },
    tabs: {
      template: 'templates/generic/tab-navigation.hbs',
      classes: ['wrath-of-davokar'],
    },
    main:    { template: `${TEMPLATES}/item-equipment.hbs`,  scrollable: [''] },
    effects: { template: 'systems/wrath-of-davokar/templates/shared/parts/sheet-effects.hbs', scrollable: [''] },
    artifactPowers: { template: `${TEMPLATES}/parts/item-artifact-powers.hbs`, scrollable: [''] },
    settings: { template: `${TEMPLATES}/parts/item-settings.hbs`, scrollable: [''] },
  };
}

export class WoDGearSheet extends WoDItemSheet {
  static PARTS = {
    header: {
      template: `${TEMPLATES}/item-header.hbs`,
    },
    tabs: {
      template: 'templates/generic/tab-navigation.hbs',
      classes: ['wrath-of-davokar'],
    },
    main:    { template: `${TEMPLATES}/item-gear.hbs`,  scrollable: [''] },
    effects: { template: 'systems/wrath-of-davokar/templates/shared/parts/sheet-effects.hbs', scrollable: [''] },
    artifactPowers: { template: `${TEMPLATES}/parts/item-artifact-powers.hbs`, scrollable: [''] },
    settings: { template: `${TEMPLATES}/parts/item-settings.hbs`, scrollable: [''] },
  };
}

export class WoDSupplySheet extends WoDItemSheet {
  static PARTS = {
    header: {
      template: `${TEMPLATES}/item-header.hbs`,
    },
    tabs: {
      template: 'templates/generic/tab-navigation.hbs',
      classes: ['wrath-of-davokar'],
    },
    main:    { template: `${TEMPLATES}/item-supply.hbs`,  scrollable: [''] },
    effects: { template: 'systems/wrath-of-davokar/templates/shared/parts/sheet-effects.hbs', scrollable: [''] },
    artifactPowers: { template: `${TEMPLATES}/parts/item-artifact-powers.hbs`, scrollable: [''] },
    settings: { template: `${TEMPLATES}/parts/item-settings.hbs`, scrollable: [''] },
  };
}

export class WoDTrapSheet extends WoDItemSheet {
  static PARTS = {
    header: {
      template: `${TEMPLATES}/item-header.hbs`,
    },
    tabs: {
      template: 'templates/generic/tab-navigation.hbs',
      classes: ['wrath-of-davokar'],
    },
    main:    { template: `${TEMPLATES}/item-trap.hbs`,  scrollable: [''] },
    effects: { template: 'systems/wrath-of-davokar/templates/shared/parts/sheet-effects.hbs', scrollable: [''] },
    artifactPowers: { template: `${TEMPLATES}/parts/item-artifact-powers.hbs`, scrollable: [''] },
    settings: { template: `${TEMPLATES}/parts/item-settings.hbs`, scrollable: [''] },
  };
}

// ---------------------------------------------------------------------------
// Miscellaneous
// ---------------------------------------------------------------------------

export class WoDArtifactPowerSheet extends WoDItemSheet {
  static PARTS = {
    header: {
      template: `${TEMPLATES}/item-header.hbs`,
    },
    tabs: {
      template: 'templates/generic/tab-navigation.hbs',
      classes: ['wrath-of-davokar'],
    },
    main:    { template: `${TEMPLATES}/item-artifactPower.hbs`,  scrollable: [''] },
    effects: { template: 'systems/wrath-of-davokar/templates/shared/parts/sheet-effects.hbs', scrollable: [''] },
    artifactPowers: { template: `${TEMPLATES}/parts/item-artifact-powers.hbs`, scrollable: [''] },
    settings: { template: `${TEMPLATES}/parts/item-settings.hbs`, scrollable: [''] },
  };
}

export class WoDLanguageSheet extends WoDItemSheet {
  static PARTS = {
    header: {
      template: `${TEMPLATES}/item-header.hbs`,
    },
    tabs: {
      template: 'templates/generic/tab-navigation.hbs',
      classes: ['wrath-of-davokar'],
    },
    main:    { template: `${TEMPLATES}/item-language.hbs`,  scrollable: [''] },
    effects: { template: 'systems/wrath-of-davokar/templates/shared/parts/sheet-effects.hbs', scrollable: [''] },
    artifactPowers: { template: `${TEMPLATES}/parts/item-artifact-powers.hbs`, scrollable: [''] },
    settings: { template: `${TEMPLATES}/parts/item-settings.hbs`, scrollable: [''] },
  };
}
