
/**
 * Display a skill roll selection dialog for an actor.
 *
 * This function prompts the user to choose an attribute and skill combination
 * for a skill check, or optionally toggle the use of the `spellcasting` skill instead.
 * It dynamically updates the displayed dice pool based on the current selection.
 *
 * @param {Actor} actor - The actor for whom the skill roll is being selected.
 * @param {[string, string]} [defaultCombo=["physique", "endurance"]] - Default attribute and skill to preselect.
 * @param {boolean} [defaultSpellcasting=false] - Whether to default to using spellcasting (and lock out other selections).
 * @param {Object} [modifiers={}] - Optional roll modifiers (reserved for future use or external logic).
 * @returns {Promise<{attribute: string, skill: string, useSpellcasting: boolean} | null>}
 * Returns the selected attribute, skill, and spellcasting toggle state, or `null` if the dialog was cancelled.
 */
export async function selectSkillRoll(actor, defaultCombo=["physique", "endurance"], defaultSpellcasting=false, modifiers={}) {

  // Skip spellcasting
  const attributes = Object.keys(actor.system.attributes);
  const skills = Object.keys(actor.system.skills).filter(skill => skill !== "spellcasting"); 
  skills.push('corruption');
  console.log('before function', defaultCombo);

  const attrOptions = attributes.map(attr => {
    console.log('in function', defaultCombo);
    const label = game.i18n.format(`WRATH_OF_DAVOKAR.Attributes.${attr.charAt(0).toUpperCase() + attr.slice(1)}.long`);
    const selected = attr === defaultCombo[0];

    console.log(`${attr} === ${defaultCombo[0]} --> ${selected}`)
    
    if (selected) {
      return `<option value="${attr}" selected>${label} (${actor.system.attributes[attr].total})</option>`;
    }
    return `<option value="${attr}">${label} (${actor.system.attributes[attr].total})</option>`;
  }).join("");

  const skillOptions = skills.map(skill => {
    let label;
    const selected = skill === defaultCombo[1];
    if (skill === 'corruption') {
      label = `${game.i18n.format('WRATH_OF_DAVOKAR.Corruption.Total')} (${actor.system.corruption.total})}`;
    } else {
      const localize = game.i18n.format(`WRATH_OF_DAVOKAR.Skills.${skill.charAt(0).toUpperCase() + skill.slice(1)}.long`)
      label = `${localize} (${actor.system.skills[skill].total})`;
    }

    if (selected) {
      return `<option value="${skill}" selected>${label}</option>`;
    }
    return `<option value="${skill}">${label}</option>`;
  }).join("");

  const content = `
  <div class="wrath-of-davokar">
    <div class="form-group">
      <label>${game.i18n.localize("WRATH_OF_DAVOKAR.Attributes.Label")}</label>
      <select name="attrSelect" ${defaultSpellcasting ? "disabled" : ""}>${attrOptions}</select>
    </div>
    <div class="form-group">
      <label>${game.i18n.localize("WRATH_OF_DAVOKAR.Skills.Label")}</label>
      <select name="skillSelect" ${defaultSpellcasting ? "disabled" : ""}>${skillOptions}</select>
    </div>
    <div class="form-group">
      <label>
        ${game.i18n.format("WRATH_OF_DAVOKAR.Skills.Spellcasting.long")}
        <input type="checkbox" name="spellToggle" ${defaultSpellcasting ? "checked" : ""}/>
      </label>
    </div>
    <hr>
    <div class="form-group">
      <label>${game.i18n.localize("WRATH_OF_DAVOKAR.Roll.Modifier")}</label>
      <input type="number" name="modifier" step="1" value="0"></input>
    </div>
    <label>${game.i18n.localize("WRATH_OF_DAVOKAR.Roll.Dice.ArtifactDice")}</label>
    <div class="form-group">
      <label for="d8">D8</label>
      <input type="number" id="d8" name="d8" value="0">
      <label for="d10">D10</label>
      <input type="number" id="d10" name="d10" value="0">
      <label for="d12">D12</label>
      <input type="number" id="d12" name="d12" value="0">
    </div>
  </div>
  `;

  let result;
  try {

    console.info('Showing Prompt')
    result = await foundry.applications.api.DialogV2.prompt({
      window: { title: game.i18n.localize("WRATH_OF_DAVOKAR.Roll.Label") },
      content,
      ok: {
        label: game.i18n.format("Confirm"),
        callback: (event, button, dialog) => {
          const form = button.form;
          const attribute = form.attrSelect.value;
          const skill = form.skillSelect.value;
          const useSpellcasting = form.spellToggle.checked;
          const modifier = parseInt(form.modifier?.value || "0", 10);
          const d8 = form.d8?.value;
          const d10 = form.d10?.value;
          const d12 = form.d12?.value;
          
          const result = {
            attribute: attribute, 
            skill: skill, 
            spellcasting: useSpellcasting, 
            mod: modifier,
            d8: d8,
            d10: d10,
            d12: d12
          };
          console.log("result", result);
          return result;
        }
      },
      cancel: {
        label: game.i18n.format("Cancel"),
        callback: () => null
      },
      defaultButton: "ok",
      close: () => null,
      render: (_force, _options) => {
        // Grab the dialog element via a reliable global query
        const dialogEl = document.querySelector("dialog") || document.querySelector("form.dialog");
        if (!dialogEl) return;

        const form = dialogEl.querySelector("form");
        const attrSelect = form?.elements["attrSelect"];
        const skillSelect = form?.elements["skillSelect"];
        const spellToggle = form?.elements["spellToggle"];

        const updateDialog = () => {
          const useSpellcasting = spellToggle.checked;
          attrSelect.disabled = useSpellcasting;
          skillSelect.disabled = useSpellcasting;

          if (useSpellcasting) {
            attrSelect.value = actor.system.skills.spellcasting.attribute;
            skillSelect.value = actor.system.skills.spellcasting.skill;
          }
        };

        attrSelect?.addEventListener("change", updateDialog);
        skillSelect?.addEventListener("change", updateDialog);
        spellToggle?.addEventListener("change", updateDialog);

        updateDialog(); // Initial render
      }
    });
  } catch (error) {
    console.error(error)
    console.warn('User Closed Prompt')
    result = null;
  }
    
  return result;
}

/**
 * Get the attacking token from the attacker's actor object. If the attacking actor
 * has multiple tokens in the scene, then prompt the user to choose one.
 * @param {actor} actor The actor that is attacking
 */
export async function chooseAttackerToken(actor) {
  const tokens = actor.getActiveTokens();

  if (tokens.length === 0) {
    ui.notifications.warn(game.i18n.format("WRATH_OF_DAVOKAR.Attack.Error.NoAttackerTokens"));
    return null;
  }

  if (tokens.length === 1) return tokens[0]; // No need to ask

  const options = tokens.map(token => `<option value="${token.id}">${token.name}</option>`).join("");

  const content = `
    <form>
      <div class="form-group">
        <label>${game.i18n.format("WRATH_OF_DAVOKAR.Attack.Dialog.ChooseAttacker.Content")}</label>
        <select name="token-choice">${options}</select>
      </div>
    </form>
  `;

  let result;
  try {
    result = await foundry.application.api.DialogV2.prompt({
      window: {title: game.i18n.format("WRATH_OF_DAVOKAR.Attack.Dialog.ChooseAttacker.Title", {actorName: actor.name})},
      content: content,
      ok: {
        label: game.i18n.format("Confirm"),
        callback: (event, button, dialog) => {
          const tokenId = button.form.elements.token-choice.val();
          return tokens.find(t => t.id === tokenId);
        }
      },
      cancel: {
        label: game.i18n.localize("Cancel"),
        callback: () => null
      }
    });
  } catch {
    result = null;
  }

  return result;
}