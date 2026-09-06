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
      flags: {
        wod: {
          type: type,
          value: count,
          onTurnStart: true,
          singular: true
        }
      }
    };
  });
}


export const STATUS_EFFECTS = [
  // Base Foundry Effects to keep
  {
    id: "dead",
    name: "EFFECT.StatusDead",
    img: "icons/svg/skull.svg",
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
    changes: []
  },
  {
    id: "blightMarked",
    name: "WRATH_OF_DAVOKAR.Effect.BlightMarked",
    img: `${EFFECT_ICON_PATH}blightMarked.svg`,
    changes: []
  },
  {
    id: "concentration",
    name: "WRATH_OF_DAVOKAR.Effect.Concentration",
    img: `${EFFECT_ICON_PATH}concentration.svg`,
    changes: []
  },
  {
    id: "grappled",
    name: "WRATH_OF_DAVOKAR.Effect.Grappled",
    img: `${EFFECT_ICON_PATH}grappled.svg`,
    changes: []
  },
  {
    id: "pain",
    name: "WRATH_OF_DAVOKAR.Effect.Pain",
    img: `${EFFECT_ICON_PATH}pain.svg`,
    changes: []
  },
  {
    id: "prone",
    name: "WRATH_OF_DAVOKAR.Effect.Prone",
    img: `${EFFECT_ICON_PATH}prone.svg`,
    changes: []
  },
  {
    id: "over-encumbered",
    name: "WRATH_OF_DAVOKAR.Effect.OverEncumbered",
    img: `${EFFECT_ICON_PATH}over-encumbered.svg`,
    changes: []
  },

  // Dynamically generated groups
  ...generateRankedEffectGroup("acid"),
  ...generateRankedEffectGroup("fire"),
  ...generateRankedEffectGroup("poison"),
];

/* -------------------------------------------- */
/*  Active Effect CRUD Helpers                  */
/* -------------------------------------------- */

/**
 * Create a new ActiveEffect on the owner document.
 *
 * @param {Actor|Item}  owner
 * @param {'temporary'|'passive'|'inactive'} [effectType='passive']
 * @returns {Promise<ActiveEffect[]>}
 */
export function createActiveEffect(owner, effectType = 'passive') {
  return owner.createEmbeddedDocuments('ActiveEffect', [
    {
      name: game.i18n.format('DOCUMENT.New', {
        type: game.i18n.localize('DOCUMENT.ActiveEffect'),
      }),
      icon: 'icons/svg/aura.svg',
      origin: owner.uuid,
      'duration.rounds': effectType === 'temporary' ? 1 : undefined,
      disabled:          effectType === 'inactive',
    },
  ]);
}

/**
 * Open the sheet for an existing ActiveEffect.
 *
 * @param {ActiveEffect} effect
 * @returns {ApplicationV2}
 */
export function editActiveEffect(effect) {
  return effect?.sheet.render(true);
}

/**
 * Delete an existing ActiveEffect.
 *
 * @param {ActiveEffect} effect
 * @returns {Promise<ActiveEffect>}
 */
export function deleteActiveEffect(effect) {
  return effect?.delete();
}

/**
 * Toggle the disabled state of an existing ActiveEffect.
 *
 * @param {ActiveEffect} effect
 * @returns {Promise<ActiveEffect>}
 */
export function toggleActiveEffect(effect) {
  return effect?.update({ disabled: !effect.disabled });
}

/* -------------------------------------------- */
/*  Effect Category Preparation                 */
/* -------------------------------------------- */

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

/* -------------------------------------------- */
/*  Effect Creation Hook                        */
/* -------------------------------------------- */

export async function handleEffectCreation(effect, options, userId) {
  // Only run for the initiating user to avoid remote duplication
  if (userId !== game.user.id) return;

  // Only handle effects created on Actors
  const actor = effect.parent;
  if (!(actor instanceof Actor)) return;

  // Only handle effects with WOD flags
  const flags = foundry.utils.getProperty(effect, 'flags.wod') ?? null;
  if (flags === null) return;

  // Read flag values from the newly created effect
  const type   = foundry.utils.getProperty(effect, 'flags.wod.type')   ?? null;
  const value  = foundry.utils.getProperty(effect, 'flags.wod.value')  ?? Number.NEGATIVE_INFINITY;
  const single = foundry.utils.getProperty(effect, 'flags.wod.single') ?? false;

  // Only care about singular, typed effects
  if (!single || type === null) return;

  // Check if a copy of this effect type already exists on the actor
  const existing = actor.effects.find(
    e => e.id !== effect.id && foundry.utils.getProperty(e, 'flags.wod.type') === type
  );
  if (!existing) return;

  const existingValue = foundry.utils.getProperty(existing, 'flags.wod.value') ?? Number.NEGATIVE_INFINITY;

  if (value > existingValue) {
    // New effect is stronger — remove the old one
    await existing.delete();
  } else {
    // New effect is weaker or equal — remove it and notify
    await effect.delete();
    ui.notifications.info(`${actor.name} already has a stronger or equal ${type} effect.`);
  }
}
