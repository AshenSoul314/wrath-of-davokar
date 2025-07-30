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

Handlebars.registerHelper("isGM", function (options) {
  return game.user.isGM ? options.fn(this) : options.inverse(this);
});

Handlebars.registerHelper("isTrusted", function (options) {
  return game.user.role >= CONST.USER_ROLES.TRUSTED
    ? options.fn(this)
    : options.inverse(this);
});