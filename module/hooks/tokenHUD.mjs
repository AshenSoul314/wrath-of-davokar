/**
 * TokenHUD hook registrations for Wrath of Davokar.
 * Handles custom bar input behaviour and the always-on willpower input.
 *
 * V13 note: renderTokenHUD passes a plain HTMLElement, not a jQuery object.
 * Use querySelector/addEventListener throughout — no jQuery.
 *
 * HUD structure (relevant part):
 *   <div class="col middle">
 *     <div class="attribute bar2"><input type="text" name="bar2" ...></div>
 *     <div class="attribute bar1"><input type="text" name="bar1" ...></div>
 *   </div>
 *
 * The WP input is injected by wrapping .attribute.bar1 and the new WP input
 * together in a .wod-bar-group div, preserving the column layout.
 */

/**
 * Register all TokenHUD hooks. Call once during system init.
 */
export function registerTokenHUDHooks() {
  Hooks.on("renderTokenHUD", _onRenderTokenHUD);
}

/**
 * @param {TokenHUD} hud
 * @param {HTMLElement} html
 */
function _onRenderTokenHUD(hud, html) {
  const token = hud.object?.document;
  if (!token) return;

  _patchCorruptionInput(token, html);

  if (token.actor?.type === "character") {
    _injectWillpowerInput(token, html);
  }
}

// ---------------------------------------------------------------------------
// Corruption bar input patch
// ---------------------------------------------------------------------------

/**
 * If a bar input maps to corruption, replace Foundry's submit handler so
 * writes target only corruption.temporary.value.
 *
 * getBarAttribute() already returns temporary.value as the display value,
 * so the input shows the right number. This ensures the write path matches.
 *
 * @param {WoDTokenDocument} token
 * @param {HTMLElement} html
 */
function _patchCorruptionInput(token, html) {
  for (const barName of ["bar1", "bar2"]) {
    if (token[barName]?.attribute !== "corruption") continue;

    console.warn(`_patchCorruptionInput`);

    const input = html.querySelector(`.attribute.${barName} input`);
    if (!input) continue;
    console.warn(`_patchCorruptionInput 1`);

    const corruption = token.actor?.system?.corruption;
    if (!corruption) continue;
    console.warn(`_patchCorruptionInput 2`);

    // Clone to strip Foundry's default listener, then attach ours
    const fresh = input.cloneNode(true);
    input.replaceWith(fresh);

    fresh.addEventListener("change", async (event) => {
      const raw = Number(event.currentTarget.value);
      console.warn(`New Temp Corruption (RAW): ${raw}`);
      if (isNaN(raw)) return;

      const clamped = Math.clamp(raw, 0, corruption.max);
      console.warn(`New Temp Corruption (CLAMPED): ${clamped}`);
      await token.actor.update({ "system.corruption.temporary.value": clamped });
    });
  }
}

// ---------------------------------------------------------------------------
// Willpower always-on input
// ---------------------------------------------------------------------------

/**
 * Inject a willpower input into the HUD's middle column, grouped with the
 * bar1 input inside a shared wrapper div. This preserves the two-slot column
 * layout (bar2 on top, bar1+willpower on bottom) without disrupting flex/grid
 * spacing.
 *
 * Skipped if willpower is already occupying a standard bar slot.
 *
 * @param {WoDTokenDocument} token
 * @param {HTMLElement} html
 */
function _injectWillpowerInput(token, html) {
  if (token.bar1?.attribute === "system.willpower") return;
  if (token.bar2?.attribute === "system.willpower") return;

  const willpower = token.actor?.system?.willpower;
  if (!willpower) return;

  const middle = html.querySelector(".col.middle");
  if (!middle) return;

  // Find bar1 — we'll wrap it together with the WP input so they share
  // one layout slot in the column rather than adding a third slot.
  const bar1Div = middle.querySelector(".attribute.bar1");
  if (!bar1Div) return;

  // Create the group wrapper and move bar1 into it
  const group = document.createElement("div");
  group.className = "wrath-of-davokar flex-column flex-gap";
  bar1Div.replaceWith(group);
  group.appendChild(bar1Div);

  // Build the WP input, mirroring the .attribute.barN structure
  const wpWrapper = document.createElement("div");
  wpWrapper.className = "attribute wod-willpower";

  const input = document.createElement("input");
  input.className = "willpower-token-hud-input";
  input.type = "text";
  input.name = "willpower";
  input.value = willpower.value;
  input.title = game.i18n.format('WRATH_OF_DAVOKAR.Willpower.label');

  input.addEventListener("change", async (event) => {
    const raw = Number(event.currentTarget.value);
    if (isNaN(raw)) return;

    const clamped = Math.clamp(raw, 0, willpower.max);
    await token.actor.update({ "system.willpower.value": clamped });

    // Reflect clamped value back if user typed out of range
    input.value = clamped;
  });

  wpWrapper.appendChild(input);
  group.appendChild(wpWrapper);
}
