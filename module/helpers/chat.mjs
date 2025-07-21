
/**
 * Modifies the chat message header to include custom visuals like token image, actor name, and player name.
 * It also adjusts the header background and text color based on the user's color for better contrast.
 *
 * @param {ChatMessage} message - The Foundry VTT chat message being rendered.
 * @param {jQuery} html - The jQuery-wrapped HTML content of the message being rendered.
 */
export function applyMessageHeader(message, html) {
  const user = message.author;
  const speaker = message.speaker;
  const actor = game.actors.get(speaker.actor);

  // Safely get the token if canvas is ready
  let token = null;
  if (canvas?.ready && speaker.token) {
      token = canvas.tokens.get(speaker.token);
  }
  // Fallback to actor's active token if not found
  token = token || actor?.getActiveTokens()?.[0];

  const userColor = user?.color || 0x666666;
  const userName = user?.name || "Unknown Player";
  const actorName = actor?.name || speaker.alias || user?.name || "Unknown Character";
  const tokenImg = token?.document?.texture?.src || actor?.img || user.avatar || "icons/svg/mystery-man.svg";

  // Determine text color
  const hex = userColor.toString(16).padStart(6, "0");
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  const color = yiq >= 128 ? "#000000" : "#FFFFFF";

  // Modify message header background
  const $header = html.find("header.message-header");
  $header.css("background-color", userColor);
  $header.css("color", color);

  // Replace the sender with custom HTML
  const $sender = $header.find(".message-sender");
  const $customSender = $(`
    <div class="message-sender flexrow flex-nowrap flex-gap">
    <img src="${tokenImg}" width="30" height="30" class="flexshrink" style="border: none;" />
    <div class="flex-column">
        <span class="message-speaker">${actorName}</span>
        <span class="message-user">${userName}</span>
    </div>
    </div>
  `);
  $sender.replaceWith($customSender);
}

/**
 * Adds click event listeners to `.applyItemEffectButton` elements in the chat message,
 * allowing GMs to apply item-linked effects (e.g., from artifacts or powers) to selected tokens.
 *
 * Assumes each button has `data-item-id` and `data-item-power-id` attributes.
 *
 * Validates the item and effect exist, and ensures tokens are selected before applying.
 * Automatically fills in effect label, origin, and icon if missing.
 *
 * @param {jQuery} html - The jQuery-wrapped HTML content containing the buttons.
 */
export function linkEffectButtons(html) {
  html.find(".applyItemEffectButton").on("click", async (event) => {
    const button = event.currentTarget;
    const itemId = button.dataset.itemId;
    const effectKey = button.dataset.itemPowerId;
    const actorId = button.dataset.actorId;
    
    let item;
    let sourceActor;

    if (actorId) {
      sourceActor = game.actors.get(actorId);
      item = sourceActor?.items.get(itemId);
    } else {
      item = game.items.get(itemId);
    }

    if (!item) {
      return ui.notifications.warn("Item not found.");
    }

    const effectData = foundry.utils.getProperty(item.system, `effectData.${effectKey}`);
    if (!effectData) {
      return ui.notifications.warn("Effect data not found.");
    }

    const selectedTokens = canvas.tokens.controlled;
    if (!selectedTokens.length) {
      return ui.notifications.warn("No tokens selected.");
    }

    for (const token of selectedTokens) {
      const targetActor = token.actor;
      if (!targetActor) continue;

      const effect = foundry.utils.deepClone(effectData);
      effect.name ??= item.name;
      effect.img ??= item.img;
      effect.origin = sourceActor ? `${sourceActor.uuid}.${item.uuid}` : item.uuid;
      effect.flags ??= {};
      effect.flags["wrath-of-davokar"] = {
        itemEffectKey: effectKey
      };

      await targetActor.createEmbeddedDocuments("ActiveEffect", [effect]);
      ui.notifications.info(`Applied "${effect.name}" to ${targetActor.name}`);
    }
    
  });

  html.find(".removeItemEffectButton").on("click", async (event) => {
    const button = event.currentTarget;
    const itemId = button.dataset.itemId;
    const actorId = button.dataset.actorId;
    const effectKey = button.dataset.itemEffectId;

    let item;
    let sourceActor;

    if (actorId) {
      sourceActor = game.actors.get(actorId);
      item = sourceActor?.items.get(itemId);
    } else {
      item = game.items.get(itemId);
    }

    if (!item) {
      return ui.notifications.warn("Item not found.");
    }

    const selectedTokens = canvas.tokens.controlled;
    if (!selectedTokens.length) {
      return ui.notifications.warn("No tokens selected.");
    }



    for (const token of selectedTokens) {
      const targetActor = token.actor;
      if (!targetActor) continue;

      // Check if the given effect originates from this item
      const removeId = sourceActor ? `${sourceActor.uuid}.${item.uuid}` : item.uuid;
      const toRemove = targetActor.effects.filter(effect => {
        const flags = effect.flags?.["wrath-of-davokar"];
        
        return (
          (effect.origin === removeId) &&
          (flags?.itemEffectKey === effectKey)
        );
      });

      // Check if the name matches this item
      if (!toRemove.length) {
        ui.notifications.info(`No matching effects on ${targetActor.name}`);
        continue;
      }


      const names = toRemove.map(e => e.name).join(', ')
      const ids = toRemove.map(e => e.id);
      await targetActor.deleteEmbeddedDocuments("ActiveEffect", ids);

      ui.notifications.info(`Removed "${names}" from ${targetActor.name}`);
    }
  });


}