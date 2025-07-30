/**
 * Extend the basic Item with some very simple modifications.
 * @extends {Item}
 */
export class WrathOfDavokarItem extends Item {
  /**
   * Augment the basic Item data model with additional dynamic data.
   */
  prepareData() {
    super.prepareData();
  }

  /**
   * Prepare a data object which defines the data schema used by dice roll commands against this Item
   * @override
   */
  getRollData() {
    // Starts off by populating the roll data with a shallow copy of `this.system`
    const rollData = { ...this.system };

    // Quit early if there's no parent actor
    if (!this.actor) return rollData;

    // If present, add the actor's roll data
    rollData.actor = this.actor.getRollData();

    return rollData;
  }

  /**
   * Handle creating a card that is sent to chat describing the item.
   */
  async buildChatCard() {
    let content = "";
    const speaker = ChatMessage.getSpeaker({ actor: this.actor });
    const actor = game.actors.get(speaker);
    let enrichedDescription = await TextEditor.enrichHTML(
      this.system.description,
      {
        // Necessary in v11, can be removed in v12
        async: true,
        // Data to fill in for inline rolls
        rollData: this.getRollData(),
        // Relative UUID resolution
        relativeTo: this,
      }
    );

    const data = {
      _id: this._id,
      actorId: this.actor?.id || null,
      img: this.img,
      name: this.name,
      enrichedDescription: enrichedDescription,
      system: this.system
    };
    
    content = await renderTemplate('systems/wrath-of-davokar/templates/chat/item-card.hbs', data);

    ChatMessage.create({
      // token: token,
      speaker: ChatMessage.getSpeaker(),
      user: game.user.id,
      rollMode: game.settings.get("core", "rollMode"),
      content: content
    });
  }

  /**
   * Handle creating a card that is sent to chat describing one of the item's powers.
   * @param {number} powerID   The originating click event
   */
  async buildChatCardArtifactPower(powerID) {
    let content = "";
    const speaker = ChatMessage.getSpeaker({ actor: this.actor });
    const actor = game.actors.get(speaker);
    let power = this.system.powers[powerID];
    let enrichedDescription = await TextEditor.enrichHTML(
      power.description,
      {
        // Necessary in v11, can be removed in v12
        async: true,
        // Data to fill in for inline rolls
        rollData: this.getRollData(),
        // Relative UUID resolution
        relativeTo: this,
      }
    );
    
    const data = {
      _id: this._id,
      actorId: this.actor?.id || null,
      img: power.img,
      name: `${this.name}: ${power.name}`,
      enrichedDescription: enrichedDescription,
      system: {
        action: power.action,
        corruption: power.corruption,
        description: power.description
      }
    };

    if ("effectData" in this.system) {
      data.system.effectData = this.system.effectData
    }
    
    
    content = await renderTemplate('systems/wrath-of-davokar/templates/chat/item-card.hbs', data);

    ChatMessage.create({
      // token: token,
      speaker: ChatMessage.getSpeaker(),
      user: game.user.id,
      rollMode: game.settings.get("core", "rollMode"),
      content: content
    });
  }

  /**
   * Handle clickable rolls.
   * @param {Event} event   The originating click event
   */
  async roll() {
    const item = this;

    // Initialize chat data.
    const speaker = ChatMessage.getSpeaker({ actor: this.actor });
    const rollMode = game.settings.get('core', 'rollMode');
    const label = `${item.name}`;

    // If there's no roll data, send a chat message.
    if (!this.system.formula || !this.system.trim()) {
      this.buildChatCard()
    }
    // Otherwise, create a roll and send a chat message from it.
    else {
      // Retrieve roll data.
      const rollData = this.getRollData();

      // Invoke the roll and submit it to chat.
      const roll = new Roll(rollData.formula, rollData);
      // If you need to store the value first, uncomment the next line.
      // const result = await roll.evaluate();
      roll.toMessage({
        speaker: speaker,
        rollMode: rollMode,
        flavor: label,
      });
      return roll;
    }
  }

  async executeMacro() {
    const macro = this.system.macro;

    if (!macro || typeof macro !== "string" || macro.trim() === "") {
      return this.roll?.(); // Fall back to a default item roll, if undefined
    }

    const actor = this.actor ?? null;
    const token = actor?.getActiveTokens()[0] ?? null;
    const speaker = ChatMessage.getSpeaker({ actor, token });
    const character = game.user.character;
    const scope = { item: this };

    const AsyncFunction = foundry.utils.AsyncFunction;

    try {
      const fn = new AsyncFunction(
        "speaker", "actor", "token", "character", "scope", ...Object.keys(scope),
        `{${macro}\n}`
      );
      return await fn.call(this, speaker, actor, token, character, scope, ...Object.values(scope));
    } catch (err) {
      ui.notifications.error("MACRO.Error", { localize: true });
    }
  }
}

