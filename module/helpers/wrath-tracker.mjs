
let previousWrath = 0;

function updateWrathDisplay(current) {
  const max = game.settings.get("wrath-of-davokar", "overflow-wrath");
  const fillPercent = Math.min(current / max, 1) * 100;

  const liquid = document.querySelector('.wrath-liquid');
  const orbContainer = document.querySelector('.wrath-orb-container');
  const orb = document.querySelector('.wrath-orb');
  const pointsDisplay = document.querySelector('#wrath-points-display');

  liquid.style.transform = `translateY(${100 - fillPercent}%)`;
  pointsDisplay.textContent = `${current}`;
  
  previousWrath = current;
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
  previousWrath = points;

  const html = await foundry.applications.handlebars.renderTemplate("systems/wrath-of-davokar/templates/ui/wrath-tracker.hbs", {
    points
  });

  const uiTop = document.getElementById("ui-top");
  if (uiTop) {
    const wrapper = document.createElement("div");
    wrapper.innerHTML = html;
    uiTop.appendChild(wrapper.firstElementChild);

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
    previousWrath = wrath
    updateWrathDisplay(wrath);
  }
}

export async function updateWrathSettings(setting) {
  if (setting.key === "wrath-of-davokar.wrath-points") {
    updateWrathDisplay(setting.value);
  }
}
