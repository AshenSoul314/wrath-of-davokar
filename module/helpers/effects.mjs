const EFFECT_ICON_PATH = 'systems/wrath-of-davokar/assets/icons/effects/'

/**
 * Generates an array of status effect objects for a given ranked status type.
 *
 * @param {string} type - The type of effect to generate (e.g., "acid", "fire", "poison").
 * @param {number} [count=9] - The number of ranks to generate (defaults to 9).
 * @returns {Array<Object>} An array of status effect objects.
 */
function generateRankedEffectGroup(type, count = 9) {
  const typeCap = type.charAt(0).toUpperCase() + type.slice(1);
  return Array.from({ length: count }, (_, i) => {
    const level = i + 1;
    return {
      id: `${type}-${level}`,
      name: `WRATH_OF_DAVOKAR.Effect.${typeCap}.${level}`,
      img: `${EFFECT_ICON_PATH}${type}-${level}.svg`,
      changes: [],
      statuses: [`${type}-${level}`],
    };
  });
}


export const STATUS_EFFECTS = [
  // Base Foundry Effects to keep
  {
    id: "dead",
    name: "EFFECT.StatusDead",
    img: "icons/svg/skull.svg"
  },
  {
    id: "unconscious",
    name: "EFFECT.StatusUnconscious",
    img: "icons/svg/unconscious.svg"
  },
  {
    id: "fly",
    name: "EFFECT.StatusFlying",
    img: "icons/svg/wing.svg"
  },
  {
    id: "blind",
    name: "EFFECT.StatusBlind",
    img: "icons/svg/blind.svg"
  },
  {
    id: "deaf",
    name: "EFFECT.StatusDeaf",
    img: "icons/svg/deaf.svg"
  },
  {
    id: "hover",
    name: "EFFECT.StatusHover",
    img: "icons/svg/wingfoot.svg"
  },
  {
    id: "burrow",
    name: "EFFECT.StatusBurrow",
    img: "icons/svg/mole.svg"
  },
  {
    id: "invisible",
    name: "EFFECT.StatusInvisible",
    img: "icons/svg/invisible.svg"
  },

  // WOD Custom Effects
  {
    id: "broken",
    name: "WRATH_OF_DAVOKAR.Effect.Broken",
    img: `${EFFECT_ICON_PATH}broken.svg`,
    changes: [],
    statuses: ["broken"],
  },
  {
    id: "pain",
    name: "WRATH_OF_DAVOKAR.Effect.Pain",
    img: `${EFFECT_ICON_PATH}pain.svg`,
    changes: [],
    statuses: ["pain"],
  },
  {
    id: "blightMarked",
    name: "WRATH_OF_DAVOKAR.Effect.BlightMarked",
    img: `${EFFECT_ICON_PATH}blightMarked.svg`,
    changes: [
      {
        key: "system.conditions.blightMarked",
        mode: 5,
        value: true
      }
    ],
    statuses: ["blightMarked"],
  },
  
  // Dynamically generated groups
  ...generateRankedEffectGroup("acid"),
  ...generateRankedEffectGroup("fire"),
  ...generateRankedEffectGroup("poison"),
];

/**
 * Manage Active Effect instances through an Actor or Item Sheet via effect control buttons.
 * @param {MouseEvent} event      The left-click event on the effect control
 * @param {Actor|Item} owner      The owning document which manages this effect
 */
export function onManageActiveEffect(event, owner) {
  event.preventDefault();
  const a = event.currentTarget;
  const li = a.closest('li');
  const effect = li.dataset.effectId
    ? owner.effects.get(li.dataset.effectId)
    : null;
  switch (a.dataset.action) {
    case 'create':
      return owner.createEmbeddedDocuments('ActiveEffect', [
        {
          name: game.i18n.format('DOCUMENT.New', {
            type: game.i18n.localize('DOCUMENT.ActiveEffect'),
          }),
          icon: 'icons/svg/aura.svg',
          origin: owner.uuid,
          'duration.rounds':
            li.dataset.effectType === 'temporary' ? 1 : undefined,
          disabled: li.dataset.effectType === 'inactive',
        },
      ]);
    case 'edit':
      return effect.sheet.render(true);
    case 'delete':
      return effect.delete();
    case 'toggle':
      return effect.update({ disabled: !effect.disabled });
  }
}

/**
 * Prepare the data structure for Active Effects which are currently embedded in an Actor or Item.
 * @param {ActiveEffect[]} effects    A collection or generator of Active Effect documents to prepare sheet data for
 * @return {object}                   Data for rendering
 */
export function prepareActiveEffectCategories(effects) {
  // Define effect header categories
  const categories = {
    temporary: {
      type: 'temporary',
      label: game.i18n.localize('WRATH_OF_DAVOKAR.Effect.Temporary'),
      effects: [],
    },
    passive: {
      type: 'passive',
      label: game.i18n.localize('WRATH_OF_DAVOKAR.Effect.Passive'),
      effects: [],
    },
    inactive: {
      type: 'inactive',
      label: game.i18n.localize('WRATH_OF_DAVOKAR.Effect.Inactive'),
      effects: [],
    },
  };

  // Iterate over active effects, classifying them into categories
  for (let e of effects) {
    if (e.disabled) categories.inactive.effects.push(e);
    else if (e.isTemporary) categories.temporary.effects.push(e);
    else categories.passive.effects.push(e);
  }
  return categories;
}
