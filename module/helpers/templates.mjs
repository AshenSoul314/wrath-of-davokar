/**
 * Define a set of template paths to pre-load
 * Pre-loaded templates are compiled and cached for fast access when rendering
 * @return {Promise}
 */
export const preloadHandlebarsTemplates = async function () {
  return foundry.applications.handlebars.loadTemplates([
    // Actor partials.
    'systems/wrath-of-davokar/templates/actor/parts/actor-main.hbs',
    'systems/wrath-of-davokar/templates/actor/parts/actor-description.hbs',
    'systems/wrath-of-davokar/templates/actor/parts/actor-items.hbs',
    'systems/wrath-of-davokar/templates/actor/parts/actor-effects.hbs',
    'systems/wrath-of-davokar/templates/actor/parts/actor-mysticalPowers.hbs',
    'systems/wrath-of-davokar/templates/actor/parts/actor-talents.hbs',
    // Item partials
    'systems/wrath-of-davokar/templates/item/parts/item-artifact-powers.hbs',
    'systems/wrath-of-davokar/templates/item/parts/item-effects.hbs',
    'systems/wrath-of-davokar/templates/item/parts/item-macro.hbs',
    'systems/wrath-of-davokar/templates/item/parts/item-settings.hbs',
    // Dice partials
    'systems/wrath-of-davokar/templates/dice/roll.hbs',
    'systems/wrath-of-davokar/templates/dice/infos.hbs',
    'systems/wrath-of-davokar/templates/dice/tooltip.hbs',
  ]);
};
