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

Handlebars.registerHelper('localizeAttribute', function (attribute) {
  let result = attribute;
  const attributeLower = attribute.toLowerCase();

  switch (attributeLower) {
    case "physique":
      result = game.i18n.localize("WRATH_OF_DAVOKAR.Attributes.Physique.long");
      break;
    case "finesse":
      result = game.i18n.localize("WRATH_OF_DAVOKAR.Attributes.Finesse.long");
      break;
    case "wits":
      result = game.i18n.localize("WRATH_OF_DAVOKAR.Attributes.Wits.long");
      break;
    case "empathy":
      result = game.i18n.localize("WRATH_OF_DAVOKAR.Attributes.Empathy.long");
      break;
  }
  return result;
});

Handlebars.registerHelper('localizeSkill', function (skill) {
  let result = skill;
  const skillLower = skill.toLowerCase();

  switch (skillLower) {
    case "endurance":
      result = game.i18n.localize("WRATH_OF_DAVOKAR.Skills.Endurance.long");
      break;
    case "force":
      result = game.i18n.localize("WRATH_OF_DAVOKAR.Skills.Force.long");
      break;
    case "melee":
      result = game.i18n.localize("WRATH_OF_DAVOKAR.Skills.Melee.long");
      break;
    case "dexterity":
      result = game.i18n.localize("WRATH_OF_DAVOKAR.Skills.Dexterity.long");
      break;
    case "discreet":
      result = game.i18n.localize("WRATH_OF_DAVOKAR.Skills.Discreet.long");
      break;
    case "marksmanship":
      result = game.i18n.localize("WRATH_OF_DAVOKAR.Skills.Marksmanship.long");
      break;
    case "mobility":
      result = game.i18n.localize("WRATH_OF_DAVOKAR.Skills.Mobility.long");
      break;
    case "crafting":
      result = game.i18n.localize("WRATH_OF_DAVOKAR.Skills.Crafting.long");
      break;
    case "lore":
      result = game.i18n.localize("WRATH_OF_DAVOKAR.Skills.Lore.long");
      break;
    case "medicus":
      result = game.i18n.localize("WRATH_OF_DAVOKAR.Skills.Medicus.long");
      break;
    case "survival":
      result = game.i18n.localize("WRATH_OF_DAVOKAR.Skills.Survival.long");
      break;
    case "vigilance":
      result = game.i18n.localize("WRATH_OF_DAVOKAR.Skills.Vigilance.long");
      break;
    case "insight":
      result = game.i18n.localize("WRATH_OF_DAVOKAR.Skills.Insight.long");
      break;
    case "instinct":
      result = game.i18n.localize("WRATH_OF_DAVOKAR.Skills.Instinct.long");
      break;
    case "persuasion":
      result = game.i18n.localize("WRATH_OF_DAVOKAR.Skills.Persuasion.long");
      break;
    case "volition":
      result = game.i18n.localize("WRATH_OF_DAVOKAR.Skills.Volition.long");
      break;
    case "spellcasting":
      result = game.i18n.localize("WRATH_OF_DAVOKAR.Skills.Spellcasting.long");
      break;
  }
  return result;
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
  const result = traditions.join(', ');
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

Handlebars.registerHelper('localizeActions', function (actionsObj) {
  let actions = [];
  if (actionsObj?.reaction) actions.push(game.i18n.localize("WRATH_OF_DAVOKAR.Action.Reaction"));
  if (actionsObj?.passive) actions.push(game.i18n.localize("WRATH_OF_DAVOKAR.Action.Passive"));
  if (actionsObj?.free) actions.push(game.i18n.localize("WRATH_OF_DAVOKAR.Action.Free.abbr"));
  if (actionsObj?.fast) actions.push(game.i18n.localize("WRATH_OF_DAVOKAR.Action.Fast.abbr"));
  if (actionsObj?.slow) actions.push(game.i18n.localize("WRATH_OF_DAVOKAR.Action.Slow.abbr"));
  if (actionsObj?.special) actions.push(game.i18n.localize("WRATH_OF_DAVOKAR.Action.Special"));
  if (actions.length === 0) actions = [game.i18n.localize("WRATH_OF_DAVOKAR.Action.None")];
  return actions.join(', ');
});

Handlebars.registerHelper('localizeSingleAction', function (actionName) {
  let result = actionName
  switch (actionName) {
    case "reaction":
      result = game.i18n.localize("WRATH_OF_DAVOKAR.Action.Reaction");
      break;
    case "passive":
      result = game.i18n.localize("WRATH_OF_DAVOKAR.Action.Passive");
      break;
    case "fast":
      result = game.i18n.localize("WRATH_OF_DAVOKAR.Action.Fast.abbr");
      break;
    case "slow":
      result = game.i18n.localize("WRATH_OF_DAVOKAR.Action.Slow.abbr");
      break;
    case "free":
      result = game.i18n.localize("WRATH_OF_DAVOKAR.Action.Free.abbr");
      break;
    case "special":
      result = game.i18n.localize("WRATH_OF_DAVOKAR.Action.Special");
      break;
  }
  return result;
});

Handlebars.registerHelper("isGM", function (options) {
  return game.user.isGM ? options.fn(this) : options.inverse(this);
});

Handlebars.registerHelper("isTrusted", function (options) {
  return game.user.role >= CONST.USER_ROLES.TRUSTED
    ? options.fn(this)
    : options.inverse(this);
});

Handlebars.registerHelper("generateItemSlotsHTML", function (actorId) {
  const actor = game.actors.get(actorId);
  let html = `<ol class='panel-content items-list'>`;

  for (let slotKey in actor.system.encumbrance.equipSlots) {
    const slot = actor.system.encumbrance.equipSlots[slotKey];

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
    if (item.system.equip.requiresEquipSlot || !item.system.equip.isEquipped) return;
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
          <div class='item-name'>
            <div class='item-image'>
              <a class='rollable interactive' data-roll-type='item'>
                <img  src='${item.img}'  title='${item.name}' width='24' height='24'/>
              </a>
            </div>
            <h4>
              ${item.name}`;

  if (item.system.isArtifact) {
    html += `<img
                class="icon"
                src='systems/wrath-of-davokar/assets/icons/artifact.svg'
                title='${game.i18n.localize("WRATH_OF_DAVOKAR.Item.IsArtifact")}'
                width='18'
                height='18'/>`;
  }

  html += `
            </h4>
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

  if (item.system.range === 'engaged') {
    html += game.i18n.localize("WRATH_OF_DAVOKAR.Range.Engaged");
  } else {
    html += `${item.system.range} ${game.i18n.localize("WRATH_OF_DAVOKAR.Action.Move.abbv")} `;
    if (item.system.area === 'cone') html += game.i18n.localize('WRATH_OF_DAVOKAR.Range.Cone');
    if (item.system.area === 'radius') html += game.i18n.localize('WRATH_OF_DAVOKAR.Range.Radius');
  }

  html += `
          </div>
          <div class='item-controls'>
            <a class='item-control item-equip interactive' title='${game.i18n.localize("WRATH_OF_DAVOKAR.Item.UnequipItem", {type: itemTypeLocalized})}'>
              <img
                src='systems/wrath-of-davokar/assets/icons/battle-gear.svg'
                title='${game.i18n.localize("WRATH_OF_DAVOKAR.Item.Equipped")}'
                width='24'
                height='24'
              />
            </a>
            <a class='item-control item-edit' title='${game.i18n.localize("DOCUMENT.Update", {type: itemTypeLocalized})}'>
              <i class='fas fa-edit'></i>
            </a>
            <a class='item-control item-delete' title='${game.i18n.localize("DOCUMENT.Delete", {type: itemTypeLocalized})}'>
              <i class='fas fa-trash'></i>
            </a>
          </div>
        </div>
        <div class="flex-row quality-list-row"> `;

  for (let qualityKey in item.system.qualities) {
    const quality = item.system.qualities[qualityKey];
    if (quality.value === true) {
      html += ` <label class='quality flexshrink'>${game.i18n.localize(quality.localize)}</label> ;`
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
        <div class='item-name'>
          <div class='item-image'>
            <a class='rollable interactive' data-roll-type='item'>
              <img  src='${item.img}'  title='${item.name}' width='24' height='24'/>
            </a>
          </div>
          <h4>
            ${item.name}`;

  if (item.system.isArtifact) {
    html += `<img
                class="icon"
                src='systems/wrath-of-davokar/assets/icons/artifact.svg'
                title='${game.i18n.localize("WRATH_OF_DAVOKAR.Item.IsArtifact")}'
                width='18'
                height='18'/>`;
  }

  html += `
          </h4>
        </div>
        <div class='item-attribute'>
          ${itemTypeLocalized}
        </div>
        <div class='item-controls'>
          <a class='item-control item-equip interactive' title='${game.i18n.localize("WRATH_OF_DAVOKAR.Item.UnequipItem", {type: itemTypeLocalized})}'>
            <img
              src='systems/wrath-of-davokar/assets/icons/battle-gear.svg'
              title='${game.i18n.localize("WRATH_OF_DAVOKAR.Item.Equipped")}'
              width='24'
              height='24'
            />
          </a>
          <a class='item-control item-edit' title='${game.i18n.localize("DOCUMENT.Update", {type: itemTypeLocalized})}'>
            <i class='fas fa-edit'></i>
          </a>
          <a class='item-control item-delete' title='{${game.i18n.localize("DOCUMENT.Delete", {type: itemTypeLocalized})}'>
            <i class='fas fa-trash'></i>
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
        <div class='item-name'>
          <div class='item-image'>
            <a class='rollable interactive' data-roll-type='item'>
              <img  src='${item.img}'  title='${item.name}' width='24' height='24'/>
            </a>
          </div>
          <h4>
            ${item.name}`;

  if (item.system.isArtifact) {
    html += `<img
                class="icon"
                src='systems/wrath-of-davokar/assets/icons/artifact.svg'
                title='${game.i18n.localize("WRATH_OF_DAVOKAR.Item.IsArtifact")}'
                width='18'
                height='18'/>`;
  }

  html += `
          </h4>
        </div>
        <div class='item-attribute'>
          ${itemTypeLocalized}
        </div>
        <div class='item-controls'>
          <a class='item-control item-equip interactive' title='${game.i18n.localize("WRATH_OF_DAVOKAR.Item.UnequipItem", {type: itemTypeLocalized})}'>
            <img
              src='systems/wrath-of-davokar/assets/icons/battle-gear.svg'
              title='${game.i18n.localize("WRATH_OF_DAVOKAR.Item.Equipped")}'
              width='24'
              height='24'
            />
          </a>
          <a class='item-control item-edit' title='${game.i18n.localize("DOCUMENT.Update", {type: itemTypeLocalized})}'>
            <i class='fas fa-edit'></i>
          </a>
          <a class='item-control item-delete' title='{${game.i18n.localize("DOCUMENT.Delete", {type: itemTypeLocalized})}'>
            <i class='fas fa-trash'></i>
          </a>
        </div>
      </div>`;

  html += `<ol class='items-list container-list max-width'>`
  for (let subSlotKey in actor.system.encumbrance.equipSlots[slotKey].subslots) {
    const slot = actor.system.encumbrance.equipSlots[slotKey].subslots[subSlotKey];

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