
function updateWrathDisplay(current) {
  const max = game.settings.get("wrath-of-davokar", "overflow-wrath");
  const value = 1.0 - Math.min(1, Math.max(0, current / max));
  const result = -5 + 90 * value;

  const liquid = document.querySelector('#wrath-wave');
  const pointsDisplay = document.querySelector('#wrath-points');
  const wrathDisplay = document.querySelector('#wrath-tracker');

  liquid.style.transform = `rotate(-45deg) translateY(${result}%)`;
  pointsDisplay.textContent = `${current}`;
  wrathDisplay.setAttribute('title', `${game.i18n.format('WRATH_OF_DAVOKAR.Wrath.Label')}: ${current}`);

}


/**
 * Initializes the Wrath Points tracker UI element in the Foundry VTT interface.
 *
 * This function renders a Handlebars template and injects it into the DOM within the `#ui-top` header element.
 * It displays the current Wrath Points and, if the user is a GM, provides buttons to increment or decrement the value.
 *
 * Wrath Points are retrieved and updated via the "wrath-of-davokar.wrath-points" game setting.
 *
 * @async
 * @function initWrathTracker
 * @returns {Promise<void>} Resolves when the tracker has been rendered and event listeners added.
 */
export async function initWrathTracker() {
  const points = game.settings.get("wrath-of-davokar", "wrath-points");
  const html = await foundry.applications.handlebars.renderTemplate("systems/wrath-of-davokar/templates/ui/wrath-tracker.hbs", {
    points
  });

  const uiRight = document.getElementById("ui-right-column-1");
  if (uiRight) {
    const wrapper = document.createElement("div");
    wrapper.innerHTML = html;
    uiRight.appendChild(wrapper.firstElementChild);

    // Add button functionality
    if (game.user.isGM) {
      document.querySelector(".wp-increase")?.addEventListener("click", () => {
        const value = game.settings.get("wrath-of-davokar", "wrath-points");
        game.settings.set("wrath-of-davokar", "wrath-points", value + 1);
      });

      document.querySelector(".wp-decrease")?.addEventListener("click", () => {
        const value = game.settings.get("wrath-of-davokar", "wrath-points");
        if (value > 0) game.settings.set("wrath-of-davokar", "wrath-points", value - 1);
      });
    }

    const wrath = game.settings.get("wrath-of-davokar", "wrath-points")
    updateWrathDisplay(wrath);
  }
}

export async function updateWrathSettings(setting) {
  if (setting.key === "wrath-of-davokar.wrath-points") {
    updateWrathDisplay(setting.value);
  }
}
