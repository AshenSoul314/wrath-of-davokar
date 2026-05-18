/**
 * Extend the basic Item with some very simple modifications.
 * @extends {Item}
 */
export class WoDItemDocument extends Item {
  /**
   * Augment the basic Item data model with additional dynamic data.
   */
  prepareData() {
    // Prepare data for the item. Calling the super version of this executes
    // the following, in order: data reset (to clear active effects),
    // prepareBaseData(), prepareEmbeddedDocuments() (including active effects),
    // prepareDerivedData().
    super.prepareData();
  }

  /**
   * @override
   * Data modifications before active effects have been applied
  */
  prepareBaseData() {
    const itemData = this;
    const systemData = itemData.system;

    // Setup the noQuality Quality
    if (systemData.qualities) {
      let noQuality = true;
      for (let qualityKey in systemData.qualities) {
        if (systemData.qualities[qualityKey]) {
          noQuality = false;
          break;
        }
      }
      systemData.qualities.noQuality = noQuality;
    }
  }

  /**
   * @override
   * Data modifications after active effects have been applied
   */
  prepareDerivedData() {
    // Pass
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


  /** @override */
  async _onCreate(data, options, userId) {
    await super._onCreate(data, options, userId);
    await this.autoImportArtifactPowers();
  }

  /** @override */
  async _onDelete(options, userId) {
    await super._onDelete(options, userId);
    await this.autoRemoveArtifactPowers();
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

  async autoImportArtifactPowers() {
    if (!this.actor || !('artifactPowers' in this.system)) return;
    if (!this.system.artifactPowers.length) return;

    // Find which powers are available in game.items
    const foundPowers = game.items.filter(i =>
      i.type === 'artifactPower' &&
      this.system.artifactPowers.includes(i.system.artifactPowerId)
    );

    // Find which powers are already on the actor (avoid duplicates)
    const existingPowerIds = new Set(
      this.actor.items
        .filter(i => i.type === 'artifactPower')
        .map(i => i.system.artifactPowerId)
    );

    const powersToAdd = foundPowers.filter(
      p => !existingPowerIds.has(p.system.artifactPowerId)
    );

    const missingPowerIds = this.system.artifactPowers.filter(
      id => !foundPowers.find(p => p.system.artifactPowerId === id)
    );

    // Check if user can create embedded documents on this actor
    const canModify = this.actor.canUserModify(game.user, 'create');

    if (!canModify) {
      // User cannot auto-import, show warning with manual list
      const missingList = this.system.artifactPowers
        .map(id => `<li>${id}</li>`)
        .join('');

      await foundry.applications.api.DialogV2.alert({
        window: { title: game.i18n.localize('WRATH_OF_DAVOKAR.Dialog.ArtifactPowers.Import.PermissionErrorTitle') },
        content: `
          <p>${game.i18n.localize('WRATH_OF_DAVOKAR.Dialog.ArtifactPowers.Import.PermissionErrorBody')}</p>
          ${powersToAdd.length ? `
            <ul>${powersToAdd.map(p => `<li>${p.name}</li>`).join('')}</ul>
          ` : ''}
          ${missingPowerIds.length ? `
            <p>${game.i18n.localize('WRATH_OF_DAVOKAR.Dialog.ArtifactPowers.Import.Missing')}</p>
            <ul>${missingPowerIds.map(id => `<li>${id}</li>`).join('')}</ul>
          ` : ''}
        `,
      });
      return;
    }

    // User can modify — ask if they want to auto-import
    const confirm = await foundry.applications.api.DialogV2.confirm({
      window: { title: game.i18n.localize('WRATH_OF_DAVOKAR.Dialog.ArtifactPowers.Import.Title') },
      content: `
        <p>${game.i18n.localize('WRATH_OF_DAVOKAR.Dialog.ArtifactPowers.Import.Body')}</p>
        <ul>${powersToAdd.map(p => `<li>${p.name}</li>`).join('')}</ul>
        ${missingPowerIds.length ? `
          <p>${game.i18n.localize('WRATH_OF_DAVOKAR.Dialog.ArtifactPowers.Import.Missing')}</p>
          <ul>${missingPowerIds.map(id => `<li>${id}</li>`).join('')}</ul>
        ` : ''}
      `,
    });

    if (confirm) {
      // Auto-import
      if (powersToAdd.length) {
        try {
          await this.actor.createEmbeddedDocuments('Item', powersToAdd.map(i => i.toObject()));
        } catch(e) {
          await foundry.applications.api.DialogV2.alert({
            window: { title: game.i18n.localize('WRATH_OF_DAVOKAR.Dialog.ArtifactPowers.Import.PermissionErrorTitle') },
            content: `<p>${game.i18n.localize('WRATH_OF_DAVOKAR.Dialog.ArtifactPowers.Import.PermissionErrorBody')}</p>`,
          });
        }
      }
      if (missingPowerIds.length) {
        await foundry.applications.api.DialogV2.alert({
          window: { title: game.i18n.localize('WRATH_OF_DAVOKAR.Dialog.ArtifactPowers.Import.MissingTitle') },
          content: `
            <p>${game.i18n.localize('WRATH_OF_DAVOKAR.Dialog.ArtifactPowers.Import.Missing')}</p>
            <ul>${missingPowerIds.map(id => `<li>${id}</li>`).join('')}</ul>
          `,
        });
      }
    }
  }

  async autoRemoveArtifactPowers() {
    if (!this.actor || !('artifactPowers' in this.system)) return;
    if (!this.system.artifactPowers.length) return;

    // Find powers on the actor that belong to this artifact
    const powersToRemove = this.actor.items.filter(i =>
      i.type === 'artifactPower' &&
      this.system.artifactPowers.includes(i.system.artifactPowerId)
    );

    if (!powersToRemove.length) return;

    // Check if any power is also required by another artifact on this actor
    const otherArtifacts = this.actor.items.filter(i =>
      i.id !== this.id &&
      'artifactPowers' in i.system &&
      i.system.artifactPowers.length
    );

    const sharedPowers = powersToRemove.filter(power =>
      otherArtifacts.some(artifact =>
        artifact.system.artifactPowers.includes(power.system.artifactPowerId)
      )
    );

    const removablePowers = powersToRemove.filter(
      p => !sharedPowers.find(s => s.id === p.id)
    );

    if (!removablePowers.length) return;

    const canModify = this.actor.canUserModify(game.user, 'delete');

    if (!canModify) {
      await foundry.applications.api.DialogV2.alert({
        window: { title: game.i18n.localize('WRATH_OF_DAVOKAR.Dialog.ArtifactPowers.Remove.PermissionErrorTitle') },
        content: `
          <p>${game.i18n.localize('WRATH_OF_DAVOKAR.Dialog.ArtifactPowers.Remove.PermissionErrorBody')}</p>
          <ul>${removablePowers.map(p => `<li>${p.name}</li>`).join('')}</ul>
          ${sharedPowers.length ? `
            <p>${game.i18n.localize('WRATH_OF_DAVOKAR.Dialog.ArtifactPowers.Remove.Shared')}</p>
            <ul>${sharedPowers.map(p => `<li>${p.name}</li>`).join('')}</ul>
          ` : ''}
        `,
      });
      return;
    }

    const confirm = await foundry.applications.api.DialogV2.confirm({
      window: { title: game.i18n.localize('WRATH_OF_DAVOKAR.Dialog.ArtifactPowers.Remove.Title') },
      content: `
        <p>${game.i18n.localize('WRATH_OF_DAVOKAR.Dialog.ArtifactPowers.Remove.Body')}</p>
        <ul>${removablePowers.map(p => `<li>${p.name}</li>`).join('')}</ul>
        ${sharedPowers.length ? `
          <p>${game.i18n.localize('WRATH_OF_DAVOKAR.Dialog.ArtifactPowers.Remove.Shared')}</p>
          <ul>${sharedPowers.map(p => `<li>${p.name}</li>`).join('')}</ul>
        ` : ''}
      `,
    });

    if (confirm) {
      try {
        await this.actor.deleteEmbeddedDocuments('Item', removablePowers.map(p => p.id));
      } catch(e) {
        await foundry.applications.api.DialogV2.alert({
          window: { title: game.i18n.localize('WRATH_OF_DAVOKAR.Dialog.ArtifactPowers.Remove.PermissionErrorTitle') },
          content: `<p>${game.i18n.localize('WRATH_OF_DAVOKAR.Dialog.ArtifactPowers.Remove.PermissionErrorBody')}</p>`,
        });
      }
    }
  }
}
