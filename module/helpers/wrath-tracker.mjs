/**
 * Initializes the Wrath Points tracker UI element in the Foundry VTT interface.
 *
 * This function renders a Handlebars template and injects it into the DOM within the `#ui-top` header element.
 * It displays the current Wrath Points and, if the user is a GM, provides buttons to increment or decrement the value.
 * 
 * Wrath Points are retrieved and updated via the "wrath-of-davokar.wrathPoints" game setting.
 *
 * @async
 * @function initWrathTracker
 * @returns {Promise<void>} Resolves when the tracker has been rendered and event listeners added.
 */
export async function initWrathTracker() {
  const points = game.settings.get("wrath-of-davokar", "wrathPoints");

  const html = await renderTemplate("systems/wrath-of-davokar/templates/ui/wrath-tracker.hbs", {
    points,
    isGM: game.user.isGM
  });

  const uiTop = document.getElementById("ui-top");
  if (uiTop) {
    const wrapper = document.createElement("div");
    wrapper.innerHTML = html;
    uiTop.appendChild(wrapper.firstElementChild);

    // Add button functionality
    if (game.user.isGM) {
      document.querySelector(".wp-increase")?.addEventListener("click", () => {
        let value = game.settings.get("wrath-of-davokar", "wrathPoints");
        game.settings.set("wrath-of-davokar", "wrathPoints", value + 1);
      });

      document.querySelector(".wp-decrease")?.addEventListener("click", () => {
        let value = game.settings.get("wrath-of-davokar", "wrathPoints");
        if (value > 0) game.settings.set("wrath-of-davokar", "wrathPoints", value - 1);
      });
    }
  }
}
