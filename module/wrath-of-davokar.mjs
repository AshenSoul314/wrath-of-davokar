import { WrathOfDavokarActor } from './documents/actor.mjs';
import { WrathOfDavokarItem } from './documents/item.mjs';
import { WrathOfDavokarActorSheet } from './sheets/actor-sheet.mjs';
import { WrathOfDavokarItemSheet } from './sheets/item-sheet.mjs';
import { preloadHandlebarsTemplates } from './helpers/templates.mjs';
import { WRATH_OF_DAVOKAR } from './helpers/config.mjs';
import { STATUS_EFFECTS } from './helpers/effects.mjs';
import { YearZeroRollManager } from '../lib/yzur.js';
import { initWrathTracker } from './helpers/wrath-tracker.mjs';
import { applyMessageHeader, linkEffectButtons } from './helpers/chat.mjs';
import { wrapDrawBars } from './helpers/token.mjs';

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

  // Game Settings
  game.settings.register("wrath-of-davokar", "wrathPoints", {
    name: "Wrath Points",
    scope: "world",
    config: false,
    default: 0,
    type: Number,
    onChange: value => {
      const wrathDisplay = document.getElementById("wrath-points-display");
      if (wrathDisplay) {
        wrathDisplay.innerText = `${value}`;
      }
    },
  });

  // Preload Handlebars templates.
  return preloadHandlebarsTemplates();
});

/* -------------------------------------------- */
/*  Handlebars Helpers                          */
/* -------------------------------------------- */

Handlebars.registerHelper('concat', function (...args) {
  const options = args.pop(); // Remove handlebars options object
  return args.join('');
});

Handlebars.registerHelper('gt', function (a, b) {
  return a > b;
});

Handlebars.registerHelper('lt', function (a, b) {
  return a < b;
});

Handlebars.registerHelper('eq', function (a, b) {
  return a == b;
});

Handlebars.registerHelper('isEmpty', function (a) {
  return (!Array.isArray(a)) || (a.length == 0)
});

Handlebars.registerHelper('hasProperty', function(obj, key) {
  return obj.hasOwnProperty.call(obj, key);
});

Handlebars.registerHelper('isIn', function (value, ...args) {
  // The last argument is Handlebars options object; remove it
  const options = args.pop();
  return args.includes(value);
});

Handlebars.registerHelper('localizeRankTrait', function (rank) {
  let result = `${rank}`
  if (rank == 1) {
    result = game.i18n.localize("WRATH_OF_DAVOKAR.Rank.One.Trait");
  } else if (rank== 2) {
    result = game.i18n.localize("WRATH_OF_DAVOKAR.Rank.Two.Trait");
  } else if (rank == 3) {
    result = game.i18n.localize("WRATH_OF_DAVOKAR.Rank.Three.Trait");
  }
  return result;
});

Handlebars.registerHelper('localizeRankTalent', function (rank) {
  let result = `${rank.value}`
  if (rank == 1) {
    result = game.i18n.localize("WRATH_OF_DAVOKAR.Rank.One.Talent");
  } else if (rank== 2) {
    result = game.i18n.localize("WRATH_OF_DAVOKAR.Rank.Two.Talent");
  } else if (rank == 3) {
    result = game.i18n.localize("WRATH_OF_DAVOKAR.Rank.Three.Talent");
  }
  return result;
});

Handlebars.registerHelper('localizeTraditions', function (traditionsObj) {
  let traditions = []
  if (traditionsObj.theurgy.value) {
    traditions.push(game.i18n.localize("WRATH_OF_DAVOKAR.Power.Tradition.Theurgy"));
  }
  if (traditionsObj.trollSinging.value) {
    traditions.push(game.i18n.localize("WRATH_OF_DAVOKAR.Power.Tradition.TrollSinging"));
  }
  if (traditionsObj.sorcery.value) {
    traditions.push(game.i18n.localize("WRATH_OF_DAVOKAR.Power.Tradition.Sorcery"));
  }
  if (traditionsObj.staffMagic.value) {
    traditions.push(game.i18n.localize("WRATH_OF_DAVOKAR.Power.Tradition.StaffMagic"));
  }
  if (traditionsObj.symbolism.value) {
    traditions.push(game.i18n.localize("WRATH_OF_DAVOKAR.Power.Tradition.Symbolism"));
  }
  if (traditionsObj.witchcraft.value) {
    traditions.push(game.i18n.localize("WRATH_OF_DAVOKAR.Power.Tradition.Witchcraft"));
  }
  if (traditionsObj.wizardry.value) {
    traditions.push(game.i18n.localize("WRATH_OF_DAVOKAR.Power.Tradition.Wizardry"));
  }
  if (traditions.length === 0) {
    traditions.push(game.i18n.localize("WRATH_OF_DAVOKAR.Power.Tradition.None"));
  }
  data.tradition = traditions.join(', ');
  return result;
});

Handlebars.registerHelper('localizeRange', function (range, area) {
  let result = `${range}`
  if (this.system.range == 'engaged') {
    result += game.i18n.localize("WRATH_OF_DAVOKAR.Range.Engaged");
  } else {
    result += `${range} ${game.i18n.localize("WRATH_OF_DAVOKAR.Action.Move.abbv")}`;
  }

  if (area.hasArea && area.type) {
    result += ` ${game.i18n.localize("WRATH_OF_DAVOKAR.Weapon.AreaEffect.Cone")} `;
  } else if (area.hasArea && (!area.type)) {
    result += ` ${game.i18n.localize("WRATH_OF_DAVOKAR.Weapon.AreaEffect.Radius")} `;
  }
  return result;
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

Hooks.on('renderChatLog', (app, html, data) => {
  html.on('click', '.dice-button.push', _onPush);
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


/* -------------------------------------------- */
/*  Chat Customization                          */
/* -------------------------------------------- */
Hooks.on("renderChatMessage", (message, html, data) => {
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
  
  const command = powerID === -1 ? `game.wrathofdavokar.rollItemMacro("${data.uuid}");` : `game.wrathofdavokar.rollItemMacro("${data.uuid}", ${powerID});`;
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
 */
function rollItemMacro(itemUuid, powerId=-1) {
  // Reconstruct the drop data so that we can load the item.
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
      item.roll();
    } else {
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
