
export function localizeAttribute(attribute) {
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
}

export function localizeSkill(skill) {
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
    case "corruption":
    case "totalCorruption":
      result = game.i18n.localize("WRATH_OF_DAVOKAR.Corruption.Total.long");
      break;

  }
  return result;
}

export function localizeRankTrait(rank) {
  let result = `${rank}`
  if (rank == 1) {
    result = game.i18n.localize("WRATH_OF_DAVOKAR.Rank.One.Trait");
  } else if (rank== 2) {
    result = game.i18n.localize("WRATH_OF_DAVOKAR.Rank.Two.Trait");
  } else if (rank == 3) {
    result = game.i18n.localize("WRATH_OF_DAVOKAR.Rank.Three.Trait");
  }
  return result;
}

export function localizeRankTalent(rank) {
  let result = `${rank.value}`
  if (rank == 1) {
    result = game.i18n.localize("WRATH_OF_DAVOKAR.Rank.One.Talent");
  } else if (rank== 2) {
    result = game.i18n.localize("WRATH_OF_DAVOKAR.Rank.Two.Talent");
  } else if (rank == 3) {
    result = game.i18n.localize("WRATH_OF_DAVOKAR.Rank.Three.Talent");
  }
  return result;
}

export function localizeTraditions(traditionsObj) {
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
  const result = traditions.sort().join(', ');
  return result;
}

export function localizeRange(range, area=null) {
  let result = `${range}`
  if (this.system.range == -1) {
    result = game.i18n.localize("WRATH_OF_DAVOKAR.Range.Self");
  }else if (this.system.range == 0) {
    result = game.i18n.localize("WRATH_OF_DAVOKAR.Range.Engaged");
  } else {
    result = `${range} ${game.i18n.localize("WRATH_OF_DAVOKAR.Action.Move.abbv")}`;
  }

  if (area) {
    if (area.hasArea && area.type) {
      result += ` ${game.i18n.localize("WRATH_OF_DAVOKAR.Weapon.AreaEffect.Cone")} `;
    } else if (area.hasArea && (!area.type)) {
      result += ` ${game.i18n.localize("WRATH_OF_DAVOKAR.Weapon.AreaEffect.Radius")} `;
    }
  }
  return result;
}

export function localizeActions(actionsObj) {
  let actions = [];
  if (actionsObj.reaction) actions.push(game.i18n.localize("WRATH_OF_DAVOKAR.Action.Reaction"));
  if (actionsObj.passive) actions.push(game.i18n.localize("WRATH_OF_DAVOKAR.Action.Passive"));
  if (actionsObj.free) actions.push(game.i18n.localize("WRATH_OF_DAVOKAR.Action.Free.abbr"));
  if (actionsObj.fast) actions.push(game.i18n.localize("WRATH_OF_DAVOKAR.Action.Fast.abbr"));
  if (actionsObj.slow) actions.push(game.i18n.localize("WRATH_OF_DAVOKAR.Action.Slow.abbr"));
  if (actionsObj.special) actions.push(game.i18n.localize("WRATH_OF_DAVOKAR.Action.Special"));
  if (actions.length === 0) actions = [game.i18n.localize("WRATH_OF_DAVOKAR.Action.None")];
  return actions.join(', ');
}

export function localizeSingleAction(actionName) {
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
}

export function localizeQuality(quality) {
  const capitalized = quality.charAt(0).toUpperCase() + quality.slice(1);
  return game.i18n.localize(`WRATH_OF_DAVOKAR.Qualities.${capitalized}`);
}

export function localizeWeaponType(weaponType) {
  const capitalized = weaponType.charAt(0).toUpperCase() + weaponType.slice(1);
  return game.i18n.localize(`WRATH_OF_DAVOKAR.Weapon.Type.${capitalized}`);
}

export function localizeWeaponTypes(weaponTypesObj) {

  let weaponTypes = [];
  for (let key in weaponTypesObj) {
    if (weaponTypesObj[key]) {
      weaponTypes.push(localizeWeaponType(key));
    }
  }
  const result = weaponTypes.sort().join(', ');
  return result;
}

export function localizeCost(costObj) {
  let cost = []
  if (costObj.thaler) {
    cost.push(`${costObj.thaler} ${game.i18n.localize('WRATH_OF_DAVOKAR.Money.Thaler')}`);
  }
  if (costObj.shilling) {
    cost.push(`${costObj.shilling} ${game.i18n.localize('WRATH_OF_DAVOKAR.Money.Shilling')}`);
  }
  if (costObj.orteg) {
    cost.push(`${costObj.orteg} ${game.i18n.localize('WRATH_OF_DAVOKAR.Money.Orteg')}`);
  }

  if (!cost.length) {
    cost.push(`0 ${game.i18n.localize('WRATH_OF_DAVOKAR.Money.Thaler')}`);
  }
  const result = cost.join(', ');
  return result;
}