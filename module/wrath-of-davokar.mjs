import { WoDActorDocument } from './documents/wod-actor-document.mjs';
import { WoDItemDocument } from './documents/wod-item-document.mjs';
import { preloadHandlebarsTemplates } from './helpers/templates.mjs';
import { WRATH_OF_DAVOKAR } from './helpers/config.mjs';
import { STATUS_EFFECTS, handleEffectCreation } from './helpers/effects.mjs';
import { YearZeroRollManager } from '../lib/yzur.js';
import { initWrathTracker, updateWrathSettings } from './helpers/wrath-tracker.mjs';
import { addWrathWrapperToMessage, applyMessageHeader, linkEffectButtons, initApplySection } from './helpers/chat.mjs';
import {ApplyData} from './applications/apply-changes-element.mjs'
// import { wrapDrawBars } from './helpers/token.mjs';
import './helpers/handlebars-helpers.mjs'

import { WoDItemSheet } from './sheets/wod-item-sheet.mjs';

import {
  WoDCharacterSheet,
  WoDNPCSheet
} from './sheets/wod-actor-sheet.mjs';

import {WoDTokenDocument} from './documents/wod-token-document.mjs'
import {WoDToken} from './canvas/wod-token.mjs'
import {registerTokenHUDHooks} from './hooks/tokenHUD.mjs'

import {HOOKS, getHandlers, registerHook} from './automation/hooks.mjs';
import {
  onSkillTestPipelineKeep,
  onSkillTestPipelinePush,
  onSkillTestPipelineDelete
} from './automation/skill-test-pipeline.mjs'

// Exports for module development
export {HOOKS, registerHook, getHandlers} from "./automation/hooks.mjs";

const Actors = foundry.documents.collections.Actors;
const Items = foundry.documents.collections.Items;

/* -------------------------------------------- */
/*  Init Hook                                   */
/* -------------------------------------------- */

Hooks.once('init', function () {
  // ---------------------------
  // Setup Global Context
  // ---------------------------
  game.wrathofdavokar = {
    WoDActorDocument,
    WoDItemDocument,
    rollItemMacro,
    hookRegistry: new Map(),
    reactionAutomationIds: new Set(),
    sceneReactionCache:    new Map(),
    registerHook,
    getHandlers,
    pendingSkillTestPipelineRolls: new Map(),
  };

  // ---------------------------
  // Override CONFIG
  // ---------------------------

  // Add custom constants for configuration.
  CONFIG.WRATH_OF_DAVOKAR = WRATH_OF_DAVOKAR;

  // Set an initiative formula for the system
  CONFIG.Combat.initiative = {
    formula: '@dexterity + @instinct',
    decimals: 2,
  };

  // Define custom Document classes
  CONFIG.Actor.documentClass = WoDActorDocument;
  CONFIG.Item.documentClass = WoDItemDocument;
  CONFIG.Token.documentClass = WoDTokenDocument;
  CONFIG.Token.objectClass = WoDToken;

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

  // ---------------------------
  // Register Sheets
  // ---------------------------
  // Register Actor sheet application classes
  Actors.registerSheet('wrath-of-davokar', WoDCharacterSheet, {
    types: ['character'],
    makeDefault: true,
    label: 'WRATH_OF_DAVOKAR.SheetLabel.Character',
  });
  Actors.registerSheet('wrath-of-davokar', WoDNPCSheet, {
    types: ['npc'],
    makeDefault: true,
    label: 'WRATH_OF_DAVOKAR.SheetLabel.NPC',
  });

  // Register Item sheet application classes
  Items.registerSheet('wrath-of-davokar', WoDItemSheet, {
    types: ['alchemicalItem'],
    makeDefault: true,
    label: 'WRATH_OF_DAVOKAR.SheetLabel.AlchemicalItem',
  });

  Items.registerSheet('wrath-of-davokar', WoDItemSheet, {
    types: ['armorBody'],
    makeDefault: true,
    label: 'WRATH_OF_DAVOKAR.SheetLabel.ArmorBody',
  });

  Items.registerSheet('wrath-of-davokar', WoDItemSheet, {
    types: ['armorHead'],
    makeDefault: true,
    label: 'WRATH_OF_DAVOKAR.SheetLabel.ArmorHead',
  });

  Items.registerSheet('wrath-of-davokar', WoDItemSheet, {
    types: ['armorShield'],
    makeDefault: true,
    label: 'WRATH_OF_DAVOKAR.SheetLabel.ArmorShield',
  });

  Items.registerSheet('wrath-of-davokar', WoDItemSheet, {
    types: ['artifactPower'],
    makeDefault: true,
    label: 'WRATH_OF_DAVOKAR.SheetLabel.ArtifactPower',
  });

  Items.registerSheet('wrath-of-davokar', WoDItemSheet, {
    types: ['boon'],
    makeDefault: true,
    label: 'WRATH_OF_DAVOKAR.SheetLabel.Boon',
  });

  Items.registerSheet('wrath-of-davokar', WoDItemSheet, {
    types: ['burden'],
    makeDefault: true,
    label: 'WRATH_OF_DAVOKAR.SheetLabel.Burden',
  });

  Items.registerSheet('wrath-of-davokar', WoDItemSheet, {
    types: ['condition'],
    makeDefault: true,
    label: 'WRATH_OF_DAVOKAR.SheetLabel.Condition',
  });

  Items.registerSheet('wrath-of-davokar', WoDItemSheet, {
    types: ['container'],
    makeDefault: true,
    label: 'WRATH_OF_DAVOKAR.SheetLabel.Container',
  });

  Items.registerSheet('wrath-of-davokar', WoDItemSheet, {
    types: ['criticalInjury'],
    makeDefault: true,
    label: 'WRATH_OF_DAVOKAR.SheetLabel.CriticalInjury',
  });

  Items.registerSheet('wrath-of-davokar', WoDItemSheet, {
    types: ['equipment'],
    makeDefault: true,
    label: 'WRATH_OF_DAVOKAR.SheetLabel.Equipment',
  });

  Items.registerSheet('wrath-of-davokar', WoDItemSheet, {
    types: ['gear'],
    makeDefault: true,
    label: 'WRATH_OF_DAVOKAR.SheetLabel.Gear',
  });

  Items.registerSheet('wrath-of-davokar', WoDItemSheet, {
    types: ['language'],
    makeDefault: true,
    label: 'WRATH_OF_DAVOKAR.SheetLabel.Language',
  });

  Items.registerSheet('wrath-of-davokar', WoDItemSheet, {
    types: ['monsterTrait'],
    makeDefault: true,
    label: 'WRATH_OF_DAVOKAR.SheetLabel.MonsterTrait',
  });

  Items.registerSheet('wrath-of-davokar', WoDItemSheet, {
    types: ['mysticalPower'],
    makeDefault: true,
    label: 'WRATH_OF_DAVOKAR.SheetLabel.MysticalPower',
  });

  Items.registerSheet('wrath-of-davokar', WoDItemSheet, {
    types: ['ritual'],
    makeDefault: true,
    label: 'WRATH_OF_DAVOKAR.SheetLabel.Ritual',
  });

  Items.registerSheet('wrath-of-davokar', WoDItemSheet, {
    types: ['supply'],
    makeDefault: true,
    label: 'WRATH_OF_DAVOKAR.SheetLabel.Supply',
  });

  Items.registerSheet('wrath-of-davokar', WoDItemSheet, {
    types: ['talent'],
    makeDefault: true,
    label: 'WRATH_OF_DAVOKAR.SheetLabel.Talent',
  });

  Items.registerSheet('wrath-of-davokar', WoDItemSheet, {
    types: ['trap'],
    makeDefault: true,
    label: 'WRATH_OF_DAVOKAR.SheetLabel.Trap',
  });

  Items.registerSheet('wrath-of-davokar', WoDItemSheet, {
    types: ['weapon'],
    makeDefault: true,
    label: 'WRATH_OF_DAVOKAR.SheetLabel.Weapon',
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


  // ---------------------------
  // Setup Hooks
  // ---------------------------
  registerTokenHUDHooks()

  // ---------------------------
  // Handlebars Templates
  // ---------------------------]
  return preloadHandlebarsTemplates();
});

/* -------------------------------------------- */
/*  Setup Hook                                  */
/* -------------------------------------------- */
Hooks.once('setup', () => {

  // Let others know they can register their automation hooks
  Hooks.callAll('wodAutomationReady', game.wrathofdavokar.registerHook);

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
  //wrapDrawBars()
});


/* -------------------------------------------- */
/*  Migrations                                  */
/* -------------------------------------------- */
Hooks.once('ready', async () => {
  for (const actor of game.actors) {
    const updates = {};

    // Migrate legacy corruption scalar fields to objects
    const corruption = actor.system?.corruption;
    if (typeof corruption?.threshold === "number") {
      updates["system.corruption.threshold"] = { value: corruption.threshold, bonus: 0 };
    }

    // Migrate legacy actors missing attribute max — default it to the
    // attribute's current value
    const attributes = actor.system?.attributes;
    if (attributes) {
      for (const [key, attribute] of Object.entries(attributes)) {
        if (attribute.max === undefined) {
          updates[`system.attributes.${key}.max`] = attribute.value;
        }
      }
    }

    if (Object.keys(updates).length > 0) {
      console.log(`WoD | Migrating actor data for actor: ${actor.name}`);
      await actor.update(updates);
    }
  }
});

/* -------------------------------------------- */
/*  YZUR Hooks                                  */
/* -------------------------------------------- */
Hooks.on('renderChatMessageHTML', (message, html, context) => {

  // Link Dice roll buttons
  if (!message.getFlag('wrath-of-davokar', 'pendingRollPipeline')) {
    // Normal Dice Rolls
    html.querySelectorAll('.dice-button.dice-push').forEach(button => {
      button.addEventListener('click', _onDicePush);
    });
    html.querySelectorAll('.dice-button.dice-keep').forEach(button => {
      button.addEventListener('click', _onDiceKeep);
    });
  } else {
    // Skill Test Pipeline Enabled Dice Rolls
    html.querySelectorAll('.dice-button.dice-push').forEach(button => {
      button.addEventListener('click', onSkillTestPipelinePush);
    });
    html.querySelectorAll('.dice-button.dice-keep').forEach(button => {
      button.addEventListener('click', onSkillTestPipelineKeep);
    });
  }

  // Apply Section
  const apply_section = html.querySelector('.apply-section');
  if (apply_section) {
    initApplySection(apply_section, message);
  }
});

Hooks.on('deleteChatMessage', (message) => {

  // Cancel Pipeline rolls when their message is deleted before a response is given
  if (message.getFlag('wrath-of-davokar', 'pendingRollPipeline')) {
    onSkillTestPipelineDelete(message)
  }
});

async function _onDicePush(event) {
  event.preventDefault();

  // Get the message.
  const chatCard = event.currentTarget.closest('.chat-message');
  const messageId = chatCard.dataset.messageId;
  const message = game.messages.get(messageId);

  // Copy the roll.
  let roll = message.rolls[0].duplicate();

  // Delete the previous message.
  await message.delete();

  // Push the roll and send it.
  await roll.push({ async: true });

  let applyData = new ApplyData()
  applyData.deltaTempCorruption = 1;
  applyData.deltaWP = 1;
  roll.options.applyData = applyData;

  // Capture the tokens targeted at push time so the "Targeted" apply mode has something to show.
  const targets = Array.from(game.user.targets)
    .filter(t => t.actor)
    .map(t => ({ uuid: t.actor.uuid, name: t.name }));

  await roll.toMessage({
    // Foundry's flags field rejects non-plain-object values (it silently replaces them with {}),
    // so the ApplyData class instance has to be flattened to a plain object before being stored.
    flags: { 'wrath-of-davokar': { applyData: { ...applyData }, targets: targets } }
  });
}

async function _onDiceKeep(event) {
  event.preventDefault();

  // Get the message.
  const chatCard = event.currentTarget.closest('.chat-message');
  const messageId = chatCard.dataset.messageId;
  const message = game.messages.get(messageId);

  // Copy the roll and update the message.
  let roll = message.rolls[0].duplicate();
  roll.options.keep = true;
  await message.update({ rolls: [roll.toJSON()] });
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

/* -------------------------------------------- */
/*  Active Effect Injection                     */
/* -------------------------------------------- */

Hooks.on("renderActiveEffectConfig", (app, html, context, options) => {

  const effect = app.document;
  const checked = effect.getFlag("wrath-of-davokar", "transferOnEquipOverride");

  const field = document.createElement("div");
  field.classList.add("form-group");

  field.innerHTML = `
    <label for="wod-transferOnEquipOverride">Transfer on Equip Override</label>
    <div class="form-fields">
      <input type="checkbox" name="flags.wrath-of-davokar.transferOnEquipOverride" id="wod-transferOnEquipOverride" ${checked ? "checked" : ""}>
    </div>
    <p class="hint">Always transfer this effect when the parent item is equipped.</p>
  `;

  let detailsTab = html.querySelector('.tab[data-tab="details"]');
  
  if (detailsTab) {
    detailsTab.appendChild(field);
  } else {
    // last-resort fallback
    html.querySelector("section.window-content")?.appendChild(field);
  }

});
