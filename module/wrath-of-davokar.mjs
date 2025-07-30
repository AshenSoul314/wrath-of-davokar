import { WrathOfDavokarActor } from './documents/actor.mjs';
import { WrathOfDavokarItem } from './documents/item.mjs';
import { WrathOfDavokarActorSheet } from './sheets/actor-sheet.mjs';
import { WrathOfDavokarItemSheet } from './sheets/item-sheet.mjs';
import { preloadHandlebarsTemplates } from './helpers/templates.mjs';
import { WRATH_OF_DAVOKAR } from './helpers/config.mjs';
import { STATUS_EFFECTS, handleEffectCreation } from './helpers/effects.mjs';
import { YearZeroRollManager } from '../lib/yzur.js';
import { initWrathTracker, updateWrathSettings } from './helpers/wrath-tracker.mjs';
import { addWrathWrapperToMessage, applyMessageHeader, linkEffectButtons } from './helpers/chat.mjs';
import { wrapDrawBars } from './helpers/token.mjs';
import './helpers/handlebars-helpers.mjs'

const Actors = foundry.documents.collections.Actors;
const Items = foundry.documents.collections.Items;
const ActorSheet = foundry.appv1.sheets.ActorSheet;
const ItemSheet = foundry.appv1.sheets.ItemSheet;

/* -------------------------------------------- */
/*  Init Hook                                   */
/* -------------------------------------------- */

Hooks.once('init', function () {
  // Add utility classes to the global game object so that they're more easily
  // accessible in global contexts.
  game.wrathofdavokar = {
    WrathOfDavokarActor,
    WrathOfDavokarItem,
    rollItemMacro,
  };

  // Add custom constants for configuration.
  CONFIG.WRATH_OF_DAVOKAR = WRATH_OF_DAVOKAR;


  /**
   * Set an initiative formula for the system
   * @type {String}
   */
  CONFIG.Combat.initiative = {
    formula: '@dexterity + @instinct',
    decimals: 2,
  };

  // Define custom Document classes
  CONFIG.Actor.documentClass = WrathOfDavokarActor;
  CONFIG.Item.documentClass = WrathOfDavokarItem;

  // // Initiative Deck
  // CONFIG.Cards.presets = {
  //   initiative: {
  //     label: "Initiative Deck",
  //     src: "systems/wrath-of-davokar/asset/cards/initiative-deck.json",
  //     type: "deck",
  //   },
  // };

  // Active Effects are never copied to the Actor,
  // but will still apply to the Actor from within the Item
  // if the transfer property on the Active Effect is true.
  CONFIG.ActiveEffect.legacyTransferral = false;

  // Register sheet application classes
  Actors.unregisterSheet('core', ActorSheet);
  Actors.registerSheet('wrath-of-davokar', WrathOfDavokarActorSheet, {
    makeDefault: true,
    label: 'WRATH_OF_DAVOKAR.SheetLabels.Actor',
  });
  Items.unregisterSheet('core', ItemSheet);
  Items.registerSheet('wrath-of-davokar', WrathOfDavokarItemSheet, {
    makeDefault: true,
    label: 'WRATH_OF_DAVOKAR.SheetLabels.Item',
  });

  // Register the YZE Dice Roller
  YearZeroRollManager.register("wod", {
    "ROLL.chatTemplate": "systems/wrath-of-davokar/templates/dice/roll.hbs",
    "ROLL.tooltipTemplate": "systems/wrath-of-davokar/templates/dice/tooltip.hbs",
    "ROLL.infosTemplate": "systems/wrath-of-davokar/templates/dice/infos.hbs",
  });

  // ---------------------------
  // Game Settings
  // ---------------------------

  // Wrath Points
  game.settings.register("wrath-of-davokar", "wrath-points", {
    name: "Wrath Points",
    scope: "world",
    config: false,
    default: 0,
    type: Number,
    default: 0
  });
  
  // Wrath Track UI
  game.settings.register('wrath-of-davokar', 'overflow-wrath', {
    name: "Overflow Wrath Threshold",
    hint: "The maximum number of Wrath Points allowed before triggering the wrath display begins to visually overflow. This should usually equal to twice the number of players",
    scope: 'world',
    config: true,
    type: Number,
    default: 8,
    onChange: value => {
      let val = Number(value);
      if (!Number.isInteger(val) || val < 1) {
        ui.notifications.error("Overflow Wrath must be an integer greater than or equal to 1. Resetting to 8.");
        game.settings.set('wrath-of-davokar', 'overflowWrath', 8);
      }
    }
  });

  // Movement Action
  game.settings.register('wrath-of-davokar', 'movement-action-length', {
    name: "Movement Action Length",
    hint: "The distance (in grid units) a creature travels in one Movement Action by default.",
    scope: 'world',
    config: true,
    type: Number,
    default: 30,
  });

  // Performance Mode
  game.settings.register('wrath-of-davokar', 'performance-mode', {
    name: "Performance Mode",
    hint: "If checked, Wrath of Davokar will use fewer performance intensive graphics and switch to lighter-weight alternatives",
    scope: 'client',
    config: true,
    type: Boolean,
    default: false,
  });

  // Preload Handlebars templates.
  return preloadHandlebarsTemplates();
});



/* -------------------------------------------- */
/*  Ready Hook                                  */
/* -------------------------------------------- */

Hooks.once('ready', async () => {
  CONFIG.statusEffects = STATUS_EFFECTS;

  // Wait to register hotbar drop hook on ready so that modules could register earlier if they want to
  Hooks.on('hotbarDrop', (bar, data, slot) => {
    createItemMacro(data, slot);
    return false;
  });

  // Setup the Wrath Tracker
  await initWrathTracker();

  // Wrap the Draw Bars Function
  wrapDrawBars() 
});


/* -------------------------------------------- */
/*  YZUR Hooks                                  */
/* -------------------------------------------- */

Hooks.on('renderChatMessageHTML', (message, html, context) => {
  html.querySelectorAll('.dice-button.push').forEach(button => {
    button.addEventListener('click', _onPush);
  });
});

async function _onPush(event) {
  event.preventDefault();

  // Get the message.
  let chatCard = event.currentTarget.closest('.chat-message');
  let messageId = chatCard.dataset.messageId;
  let message = game.messages.get(messageId);

  // Copy the roll.
  let roll = message.rolls[0].duplicate();

  // Delete the previous message.
  await message.delete();

  // Push the roll and send it.
  await roll.push({ async: true });
  await roll.toMessage();
}

Hooks.on('preCreateActiveEffect', (effect, options, userId) => {
  handleEffectCreation(effect, options, userId);
});

Hooks.on("updateSetting", (setting) => {
  if (setting.key === "wrath-of-davokar.wrath-points") {
    updateWrathSettings(setting);
  }
});

/* -------------------------------------------- */
/*  Chat Customization                          */
/* -------------------------------------------- */
Hooks.on("renderChatMessageHTML", (message, html, context) => {
  addWrathWrapperToMessage(html);
  applyMessageHeader(message, html);
  linkEffectButtons(html);
});

/* -------------------------------------------- */
/*  Hotbar Macros                               */
/* -------------------------------------------- */

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {Object} data     The dropped data
 * @param {number} slot     The hotbar slot to use
 * @returns {Promise}
 */
async function createItemMacro(data, slot) {
  // First, determine if this is a valid owned item.
  if (data.type !== 'Item') return;
  if (!data.uuid.includes('Actor.') && !data.uuid.includes('Token.')) {
    return ui.notifications.warn(
      'You can only create macro buttons for owned Items'
    );
  }
  // If it is, retrieve it based on the uuid.
  const item = await Item.fromDropData(data);

  // If this is an artifact, we need to ask the user if they want to create a
  // macro for the item or one of the artifact power
  let powerID = -1;

  if (item.system.isArtifact) {
    
    let content = `<label><input type="radio" name="choice" value="-1" checked>${item.name}</label>`;
    for (let [key, value] of Object.entries(item.system.powers)) {
      content += `<label><input type="radio" name="choice" value="${key}">${item.name}: ${value.name}</label>`;
    }

    let result = null;
    try{
      result = await foundry.applications.api.DialogV2.prompt({
        window: { title: `${item.name}: ${game.i18n.localize("MACRO.Save")}`},
        content: content,
        ok: {
          callback: (event, button, dialog ) => {
            const formElement = button.form;
            const formData = new FormDataExtended(formElement);
            const formDataObj = formData.object;
            return formDataObj
          }
        }
      });
    } catch {
      return false;
    }
    powerID = parseInt(result.choice, 10);;
  }

  // Create the macro command using the uuid.
  const command = `await game.wrathofdavokar.rollItemMacro("${data.uuid}", ${powerID});`;
  const name = powerID === -1 ? item.name : `${item.name}: ${item.system.powers[powerID].name}`;
  const img = powerID === -1 ? item.img : item.system.powers[powerID].img;

  let macro = game.macros.find(
    (m) => m.name === item.name && m.command === command
  );
  if (!macro) {
    macro = await Macro.create({
      name: name,
      type: 'script',
      img: img,
      command: command,
      flags: { 'wrath-of-davokar.itemMacro': true },
    });
  }
  game.user.assignHotbarMacro(macro, slot);
  return false;
}

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {string} itemUuid
 * @param {number} powerId
 */
async function rollItemMacro(itemUuid, powerId) {
  // Reconstruct the drop data so that we can load the item.
  console.log('Enter Run Macro')
  const dropData = {
    type: 'Item',
    uuid: itemUuid,
  };
  // Load the item from the uuid.
  Item.fromDropData(dropData).then((item) => {
    // Determine if the item loaded and if it's an owned item.
    if (!item || !item.parent) {
      const itemName = item?.name ?? itemUuid;
      return ui.notifications.warn(
        `Could not find item ${itemName}. You may need to delete and recreate this macro.`
      );
    }

    // Trigger the item roll
    if (powerId === -1) {
      console.log('This is an Item')
      const macro = item.system.macro

      if (macro && typeof macro === "string" && macro.trim() !== "") {
        item.executeMacro()
      } else {
        console.log('No custom macro found');
        item.roll();
      }
    } else {
      console.log('This is an Artifact Power')
      try {
        item.buildChatCardArtifactPower(powerId);
      } catch {
        const itemName = item?.name ?? itemUuid;
        return ui.notifications.warn(
          `Unable to get requested power from item ${itemName}. You may need to delete and recreate this macro.`
        );
      }
    }
  });
}
