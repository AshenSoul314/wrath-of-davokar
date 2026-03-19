import {localizeActions,
        localizeSingleAction,
        localizeAttribute,
        localizeRange,
        localizeRankTalent,
        localizeRankTrait,
        localizeSkill,
        localizeTraditions,
        localizeWeaponType,
        localizeQuality} from "./localize.mjs";


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
  let html = `<ol class='panel-content items-list'>`;

  actor.items.forEach(item => {
    if (!item.system.equip) return;
    if (item.system?.equip.requiresEquipSlot || !item.system?.equip.isEquipped) return;
    if (['armorBody', 'armorHead', 'armorShield'].includes(item.type)) return;
    html += generateGeneralItemSlot(item);
  });

  html += '</ol>';
  return new Handlebars.SafeString(html);
});

function generateWeaponSlot(item) {
  const itemTypeLocalized = game.i18n.localize("TYPES.Item.weapon");
  let html = `
    <li class='item flex-column' data-item-id='${item.id}'>
        <div class="flex-row max-width">
          <div class='item-name item-control item-edit'>
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
            <a class='item-control item-equip' title='${game.i18n.localize("WRATH_OF_DAVOKAR.Item.UnequipItem", {type: itemTypeLocalized})}'>
              <img
                src='systems/wrath-of-davokar/assets/icons/battle-gear.svg'
                title='${game.i18n.localize("WRATH_OF_DAVOKAR.Item.Equipped")}'
                width='24'
                height='24'
              />
            </a>
            <a class='item-control rollable' data-roll-type='item' title='${game.i18n.localize("WRATH_OF_DAVOKAR.Item.Use")}'>
              <i class='fa-solid fa-dice fa-xl'></i>
            </a>
          </div>
        </div>
        <div class="flex-row quality-list-row"> `;

  for (let qualityKey in item.system.qualities) {
    const quality = item.system.qualities[qualityKey];
    if (quality) {
      html += `<span class='quality'>${localizeQuality(qualityKey)}</span>`;
    }
  }

  html += `
        </div>
      </li>`;
  return html;
}

function generateGeneralItemSlot(item) {
  let itemTypeLocalized;

  if (item.type === 'alchemicalItem') {
    itemTypeLocalized = game.i18n.localize("TYPES.Item.alchemicalItem");
  } else if (item.type === 'equipment') {
    itemTypeLocalized = game.i18n.localize("TYPES.Item.equipment");
  } else if (item.type === 'trap') {
    itemTypeLocalized = game.i18n.localize("TYPES.Item.trap");
  }

  let html = `
    <li class='item flex-column' data-item-id='{{item._id}}'>
      <div class="flex-row max-width">
        <div class='item-name item-control item-edit'>
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
          <a class='item-control item-equip' title='${game.i18n.localize("WRATH_OF_DAVOKAR.Item.UnequipItem", {type: itemTypeLocalized})}'>
            <img
              src='systems/wrath-of-davokar/assets/icons/battle-gear.svg'
              title='${game.i18n.localize("WRATH_OF_DAVOKAR.Item.Equipped")}'
              width='24'
              height='24'
            />
          </a>
          <a class='item-control rollable' data-roll-type='item' title='${game.i18n.localize("WRATH_OF_DAVOKAR.Item.Use")}'>
            <i class='fa-solid fa-dice fa-xl'></i>
          </a>
        </div>
      </div>
      <div class="flex-row quality-list-row">`;

  for (let qualityKey in item.system.qualities) {
    const quality = item.system.qualities[qualityKey];
    if (quality.value === true) {
      html += ` <label class='quality flexshrink'>${game.i18n.localize(quality.localize)}</label>`;
    }
  }

  html += `
        </div>
      </li>`;

  return html;
}

function generateContainerSlot(item, slotKey, actor) {
  const itemTypeLocalized = game.i18n.localize("TYPES.Item.container");

  let html = `
    <li class='item flex-column' data-item-id='{{item._id}}'>
      <div class="flex-row max-width">
        <div class='item-name item-control item-edit'>
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
          <a class='item-control item-equip' title='${game.i18n.localize("WRATH_OF_DAVOKAR.Item.UnequipItem", {type: itemTypeLocalized})}'>
            <img
              src='systems/wrath-of-davokar/assets/icons/battle-gear.svg'
              title='${game.i18n.localize("WRATH_OF_DAVOKAR.Item.Equipped")}'
              width='24'
              height='24'
            />
          </a>
          <a class='item-control rollable' data-roll-type='item' title='${game.i18n.localize("WRATH_OF_DAVOKAR.Item.Use")}'>
            <i class='fa-solid fa-dice fa-xl'></i>
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
        case "alchemicalItem":
        case "equipment":
        case "trap":
          html += generateGeneralItemSlot(item);
          break;
        case "weapon":
          html += generateWeaponSlot(item);
          break;
      }
    }
  }
  html += `</ol></li>`;
  return html;
}
