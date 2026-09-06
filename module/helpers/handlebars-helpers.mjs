import {localizeActions,
        localizeSingleAction,
        localizeAttribute,
        localizeRange,
        localizeRankTalent,
        localizeRankTrait,
        localizeSkill,
        localizeTraditions,
        localizeWeaponType,
        localizeWeaponTypes,
        localizeQuality,
        localizeCost } from "./localize.mjs";


/**
 * --------------------------------------------
 * Logic Helpers
 * --------------------------------------------
 */
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


Handlebars.registerHelper('abs', function (value) {
  return Math.abs(value)
});


/**
 * --------------------------------------------
 * Localization Helpers
 * --------------------------------------------
 */
Handlebars.registerHelper('localizeAttribute', localizeAttribute);

Handlebars.registerHelper('localizeSkill', localizeSkill);

Handlebars.registerHelper('localizeRankTrait', localizeRankTrait);

Handlebars.registerHelper('localizeRankTalent', localizeRankTalent);

Handlebars.registerHelper('localizeTraditions', localizeTraditions);

Handlebars.registerHelper('localizeRange', localizeRange);

Handlebars.registerHelper('localizeActions', localizeActions);

Handlebars.registerHelper('localizeSingleAction', localizeSingleAction);

Handlebars.registerHelper('localizeQuality', localizeQuality);

Handlebars.registerHelper('localizeWeaponType', localizeWeaponType);

Handlebars.registerHelper('localizeWeaponTypes', localizeWeaponTypes);

Handlebars.registerHelper('localizeCost', localizeCost);

/**
 * --------------------------------------------
 * Access Helpers
 * --------------------------------------------
 */
Handlebars.registerHelper("isGM", function (options) {
  return game.user.isGM ? options.fn(this) : options.inverse(this);
});

Handlebars.registerHelper("isTrusted", function (options) {
  return game.user.role >= CONST.USER_ROLES.TRUSTED
    ? options.fn(this)
    : options.inverse(this);
});

/**
 * --------------------------------------------
 * HTML Generator Helpers
 * --------------------------------------------
 */

Handlebars.registerHelper("generateQualities", function(qualities, options) {
  const includeNoQuality = options?.hash?.includeNoQuality ?? false;
  const html = generateQualities(qualities, includeNoQuality);
  return new Handlebars.SafeString(html);
});

Handlebars.registerHelper("generateWillpowerBar", function (actorId) {
  const actor = game.actors.get(actorId);
  let html = `<div class="flex-row progress-bar flex-between bar-willpower">`;
  for (let i = 0; i < actor.system.willpower.max; i++) {
    html += `<div `;
    if (i < actor.system.willpower.value) {
      html += `class="bar-willpower-filled`;
    } else {
      html += `class="bar-willpower-empty`;
    }

    if (i === 0) html+= " bar-willpower-start"
    if (i === actor.system.willpower.max - 1) html+= " bar-willpower-end"

    html += `"></div>`;
  }
  html += `</div>`;
  return new Handlebars.SafeString(html);
});

Handlebars.registerHelper("generateItemSlotsHTML", function (actorId) {
  const actor = game.actors.get(actorId);
  let html = `<ol class='panel-content items-list'>`;

  for (let slotKey in actor.system.encumbrance.atHandSlots) {
    const slot = actor.system.encumbrance.atHandSlots[slotKey];

    if (slot.itemId === null) {
        html += `<li class='item flex-row max-width'>${game.i18n.localize("WRATH_OF_DAVOKAR.Item.ItemSlots.EmptySlot")}</li>`;
    } else {
      const item = actor.items.get(slot.itemId);

      if (!item) {
        actor.system.encumbrance.atHandSlots[slotKey]
        html += `<li class='item flex-row max-width'>${game.i18n.localize("WRATH_OF_DAVOKAR.Item.ItemSlots.EmptySlot")}</li>`;
        continue;
      }

      switch (item.type) {
        case "armorHead":
        case "armorBody":
        case "armorShield":
          break;
        case "alchemicalItem":
        case "equipment":
        case "trap":
          html += generateGeneralItemSlot(item);
          break;
        case "container":
          html += generateContainerSlot(item, slotKey, actor);
          break;
        case "weapon":
          html += generateWeaponSlot(item);
          break;
      }
    }
  }
  html += '</ol>';
  return new Handlebars.SafeString(html);
});

Handlebars.registerHelper("generateWornItemsHTML", function (actorId) {
  const actor = game.actors.get(actorId);
  let html = `
    <div class="panel">
      <div class="panel-header">${game.i18n.localize("WRATH_OF_DAVOKAR.Item.WornItems")}</div>
      <ol class='panel-content items-list'>`;

  let foundWornItem = false;
  actor.items.forEach(item => {
    if (!item.system.equip) return;
    if (item.system?.equip.requiresEquipSlot || !item.system?.equip.isEquipped) return;
    if (['armorBody', 'armorHead', 'armorShield'].includes(item.type)) return;
    foundWornItem = true;

    switch (item.type) {
      case "alchemicalItem":
      case "equipment":
      case "trap":
        html += generateGeneralItemSlot(item);
        break;
      case "weapon":
        html += generateWeaponSlot(item);
        break;
      default:
        html += generateGeneralItemSlot(item);
        break;
    }
  });

  html += '</ol></div>';

  if (!foundWornItem) return new Handlebars.SafeString('');
  return new Handlebars.SafeString(html);
});

function generateQualities(qualities, includeNoQuality=false) {
  let html = '';
  for (const quality in qualities) {
    if (quality === "noQuality" && !includeNoQuality) continue;
    if (qualities[quality]) {
      html += `<span class="quality">${localizeQuality(quality)}</span>`;
    }
  }
  return html;
}

function generateWeaponSlot(item) {
  const itemTypeLocalized = game.i18n.localize("TYPES.Item.weapon");
  let html = `
    <li class='item flex-column draggable' data-item-id='${item.id}'>
        <div class="flex-row max-width">
          <div class='item-name'>
            <div class='item-image'>
              <img  src='${item.img}'  title='${item.name}' width='24' height='24'/>
            </div>
            <div class='flex-row flex-gap'>
              <h4>${item.name} </h4>`;

  if (item.system.isArtifact) {
    html += `<img
                class="icon"
                src='systems/wrath-of-davokar/assets/icons/artifact.svg'
                title='${game.i18n.localize("WRATH_OF_DAVOKAR.Item.IsArtifact")}'
                width='18'
                height='18'/>`;
  }

  html += `
            </div>
          </div>
          <div class='item-attribute'>
            ${item.system.damage} ${game.i18n.localize("WRATH_OF_DAVOKAR.Weapon.BaseDamage.abbv")}
          </div>
          <div class='item-attribute'>`;
  if (item.system.grip === 'oneHand') {
    html += game.i18n.localize('WRATH_OF_DAVOKAR.Weapon.Grip.OneHand.abbv');
  } else if (item.system.grip === 'twoHand') {
    html += game.i18n.localize('WRATH_OF_DAVOKAR.Weapon.Grip.TwoHand.abbv');
  }

  html += `
          </div>
          <div class='item-attribute'> `;

  if (item.system.range === 0) {
    html += game.i18n.localize("WRATH_OF_DAVOKAR.Range.Engaged");
  } else {
    html += `${item.system.range} ${game.i18n.localize("WRATH_OF_DAVOKAR.Action.Move.abbv")} `;
    if (item.system.area === 'cone') html += game.i18n.localize('WRATH_OF_DAVOKAR.Range.Cone');
    if (item.system.area === 'radius') html += game.i18n.localize('WRATH_OF_DAVOKAR.Range.Radius');
  }

  html += `
          </div>
          <div class='item-controls'>
            <a class='item-control' data-action="itemEquip" title='${game.i18n.localize("WRATH_OF_DAVOKAR.Item.UnequipItem", {type: itemTypeLocalized})}'>
              <i class="fa-solid fa-hand"></i>
            </a>
            <a class='item-control' data-action="itemRoll" title='${game.i18n.localize("WRATH_OF_DAVOKAR.Item.Use")}'>
              <i class='fa-solid fa-dice'></i>
            </a>
          </div>
        </div>
        <div class="flex-row quality-list-row"> `;
  html += generateQualities(item.system.qualities, false);
  html += `
        </div>
      </li>`;
  return html;
}

function generateGeneralItemSlot(item) {
  const itemTypeLocalized = game.i18n.localize(`TYPES.Item.${item.type}`);
  let html = `
    <li class='item flex-column draggable' data-item-id='${item.id}'>
      <div class="flex-row max-width">
        <div class='item-name'>
          <div class='item-image'>
            <img  src='${item.img}'  title='${item.name}' width='24' height='24'/>
          </div>
          <div class='flex-row flex-gap'>
              <h4>${item.name} </h4>`;

  if (item.system.isArtifact) {
    html += `<img
                class="icon"
                src='systems/wrath-of-davokar/assets/icons/artifact.svg'
                title='${game.i18n.localize("WRATH_OF_DAVOKAR.Item.IsArtifact")}'
                width='18'
                height='18'/>`;
  }

  html += `
          </div>
        </div>
        <div class='item-attribute'>
          ${itemTypeLocalized}
        </div>
        <div class='item-controls'>
          <a class='item-control' data-action="itemEquip" title='${game.i18n.localize("WRATH_OF_DAVOKAR.Item.UnequipItem", {type: itemTypeLocalized})}'>
            <i class="fa-solid fa-hand"></i>
          </a>
          <a class='item-control' data-action="itemRoll" title='${game.i18n.localize("WRATH_OF_DAVOKAR.Item.Use")}'>
            <i class='fa-solid fa-dice'></i>
          </a>
        </div>
      </div>
      <div class="flex-row quality-list-row">`;
  html += generateQualities(item.system.qualities, false);
  html += `
        </div>
      </li>`;

  return html;
}

function generateContainerSlot(item, slotKey, actor) {
  const itemTypeLocalized = game.i18n.localize("TYPES.Item.container");

  let html = `
    <li class='item flex-column draggable' data-item-id='${item.id}'>
      <div class="flex-row max-width">
        <div class='item-name'>
          <div class='item-image'>
            <img  src='${item.img}'  title='${item.name}' width='24' height='24'/>
          </div>
          <div class='flex-row flex-gap'>
            <h4>${item.name} </h4>`;

  if (item.system.isArtifact) {
    html += `<img
                class="icon"
                src='systems/wrath-of-davokar/assets/icons/artifact.svg'
                title='${game.i18n.localize("WRATH_OF_DAVOKAR.Item.IsArtifact")}'
                width='18'
                height='18'/>`;
  }

  html += `
          </div>
        </div>
        <div class='item-attribute'>
          ${itemTypeLocalized}
        </div>
        <div class='item-controls'>
          <a class='item-control' data-action="itemEquip" title='${game.i18n.localize("WRATH_OF_DAVOKAR.Item.UnequipItem", {type: itemTypeLocalized})}'>
            <i class="fa-solid fa-hand"></i>
          </a>
          <a class='item-control' data-action="itemRoll" title='${game.i18n.localize("WRATH_OF_DAVOKAR.Item.Use")}'>
            <i class='fa-solid fa-dice'></i>
          </a>
        </div>
      </div>`;

  html += `<ol class='items-list container-list max-width'>`
  for (let subSlotKey in actor.system.encumbrance.atHandSlots[slotKey].subslots) {
    const slot = actor.system.encumbrance.atHandSlots[slotKey].subslots[subSlotKey];

    if (slot.itemId === null) {
        html += `<li class='item flex-row max-width'>${game.i18n.localize("WRATH_OF_DAVOKAR.Item.ItemSlots.EmptySlot")}</li>`;
    } else {
      const item = actor.items.get(slot.itemId);
      switch (item.type) {
        case "armorHead":
        case "armorBody":
        case "armorShield":
          break;
        case "weapon":
          html += generateWeaponSlot(item);
          break;
        default:
          html += generateGeneralItemSlot(item);
          break;
      }
    }
  }
  html += `</ol></li>`;
  return html;
}
