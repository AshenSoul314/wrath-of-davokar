/**
 * Define a set of template paths to pre-load
 * Pre-loaded templates are compiled and cached for fast access when rendering
 * @return {Promise}
 */
export const preloadHandlebarsTemplates = async function () {
  return foundry.applications.handlebars.loadTemplates([
    // Inner tab partials
    'systems/wrath-of-davokar/templates/actor/parts/talents/talents-talents.hbs',
    'systems/wrath-of-davokar/templates/actor/parts/talents/talents-traits.hbs',
    'systems/wrath-of-davokar/templates/actor/parts/talents/talents-boons.hbs',
    'systems/wrath-of-davokar/templates/actor/parts/talents/talents-burdens.hbs',
    'systems/wrath-of-davokar/templates/actor/parts/powers/powers-mysticalPowers.hbs',
    'systems/wrath-of-davokar/templates/actor/parts/powers/powers-rituals.hbs',
    'systems/wrath-of-davokar/templates/actor/parts/powers/powers-artifacts.hbs',
    // Dice partials
    'systems/wrath-of-davokar/templates/dice/roll.hbs',
    'systems/wrath-of-davokar/templates/dice/infos.hbs',
    'systems/wrath-of-davokar/templates/dice/tooltip.hbs',
    // Chat partials
    'systems/wrath-of-davokar/templates/chat/item-card.hbs',
    // Item Tooltip Partial
    'systems/wrath-of-davokar/templates/item/parts/item-tooltip.hbs',
  ]);
};
