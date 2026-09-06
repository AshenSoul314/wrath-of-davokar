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
 * The WP input is grouped with bar2, the armor input is grouped with bar1.
 * Icons are overlaid inside each input using a .wod-input-wrap container.
 */

/** @type {Record<string, string>} Maps bar attribute path to FontAwesome icon class */
const BAR_ICONS = {
  corruption:  "fa-solid fa-skull icon-corruption wod-input-icon",
  willpower:   "fa-solid fa-fire-flame-curved icon-willpower wod-input-icon",
  toughness:   "fa-solid fa-heart icon-toughness wod-input-icon",
  armorRating: "fa-solid fa-shield-halved icon-armorRating wod-input-icon",
};

/**
 * Returns the icon class for a given bar attribute path, or null if unknown.
 * @param {string|undefined} attribute
 * @returns {string|null}
 */
function _iconForAttribute(attribute) {
  if (!attribute) return null;
  const key = attribute.replace(/^system\./, "");
  return BAR_ICONS[key] ?? null;
}

/**
 * Wraps an existing input element in a .wod-input-wrap div and appends an
 * icon overlaid on the right side of the input. Returns the wrapper.
 *
 * Because <input> is a void element, the icon cannot be a child of it —
 * instead the wrapper is position:relative and the icon is position:absolute.
 *
 * @param {HTMLInputElement} input
 * @param {string} iconClass - FontAwesome class string
 * @returns {HTMLDivElement} the wrapper
 */
function _wrapInputWithIcon(input, iconClass) {
  const wrapper = document.createElement("div");
  wrapper.className = "wrath-of-davokar wod-input-wrap";

  input.replaceWith(wrapper);
  wrapper.appendChild(input);

  const icon = document.createElement("i");
  icon.className = iconClass;
  icon.setAttribute("inert", "");
  wrapper.appendChild(icon);

  return wrapper;
}

// ---------------------------------------------------------------------------
// Shared bar input behaviour
// ---------------------------------------------------------------------------

/**
 * Parse a bar input string into a resolved numeric value.
 *
 * Rules (applied after trimming whitespace):
 *   - Starts with "+" → add delta to current value
 *   - Starts with "-" → subtract delta from current value
 *   - Purely numeric   → treat as an absolute value override
 *   - Anything else    → return null (caller should ignore)
 *
 * @param {string} raw          - Raw string from the input element
 * @param {number} currentValue - The current value before the edit
 * @returns {number|null}       - Resolved value, or null if unparseable
 */
function _parseBarInput(raw, currentValue) {
  const trimmed = raw.trim();
  if (trimmed === "") return null;

  if (trimmed.startsWith("+")) {
    const delta = Number(trimmed.slice(1));
    if (isNaN(delta)) return null;
    return currentValue + delta;
  }

  if (trimmed.startsWith("-")) {
    const delta = Number(trimmed.slice(1));
    if (isNaN(delta)) return null;
    return currentValue - delta;
  }

  const absolute = Number(trimmed);
  if (isNaN(absolute)) return null;
  return absolute;
}

/**
 * Attach the standard WoD bar input behaviours to an input element:
 *   - On focus: select all text
 *   - On change: parse via _parseBarInput, clamp, then call onCommit(value)
 *
 * The input's displayed value is reset to the clamped result after commit,
 * and also reset to currentValue if the input is unparseable.
 *
 * @param {HTMLInputElement} input
 * @param {object}   opts
 * @param {number}   opts.min         - Minimum allowed value (default 0)
 * @param {number}   opts.max         - Maximum allowed value
 * @param {()=>number} opts.getValue  - Returns the current live value
 * @param {(value: number) => Promise<void>} opts.onCommit - Called with the
 *                                      resolved value when the input changes
 */
function _attachBarInputListeners(input, { min = 0, max, getValue, onCommit }) {
  // Select all on focus so the user can immediately type a new value
  input.addEventListener("focus", () => {
    input.select();
  });

  input.addEventListener("change", async (event) => {
    const raw = event.currentTarget.value;
    const currentValue = getValue();
    const resolved = _parseBarInput(raw, currentValue);

    if (resolved === null) {
      // Unparsable — reset to current value without committing
      input.value = currentValue;
      return;
    }

    const clamped = Math.clamp(resolved, min, max);
    input.value = clamped;
    await onCommit(clamped);
  });
}

// ---------------------------------------------------------------------------
// Hook registration
// ---------------------------------------------------------------------------

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

  _addBarIcons(token, html);
  _patchCorruptionInput(token, html);
  _injectArmorRatingInput(token, html);

  if (token.actor?.type === "character") {
    _injectWillpowerInput(token, html);
  }
}

// ---------------------------------------------------------------------------
// Icons for standard bar inputs
// ---------------------------------------------------------------------------

/**
 * Overlay an icon inside each standard bar input (bar1, bar2) based on the
 * attribute they are assigned to.
 *
 * @param {WoDTokenDocument} token
 * @param {HTMLElement} html
 */
function _addBarIcons(token, html) {
  for (const barName of ["bar1", "bar2"]) {
    const attribute = token[barName]?.attribute;
    const iconClass = _iconForAttribute(attribute);
    if (!iconClass) continue;

    const input = html.querySelector(`.attribute.${barName} input`);
    if (!input) continue;

    _wrapInputWithIcon(input, iconClass);
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

    const input = html.querySelector(`.attribute.${barName} input`);
    if (!input) continue;

    const corruption = token.actor?.system?.corruption;
    if (!corruption) continue;

    // Clone to strip Foundry's default listener, then attach ours
    const fresh = input.cloneNode(true);
    input.replaceWith(fresh);

    _attachBarInputListeners(fresh, {
      min: 0,
      max: corruption.max,
      getValue: () => token.actor.system.corruption.temporary.value,
      onCommit: async (value) => {
        await token.actor.update({ "system.corruption.temporary.value": value });
      },
    });
  }
}

// ---------------------------------------------------------------------------
// Willpower always-on input
// ---------------------------------------------------------------------------

/**
 * Inject a willpower input into the HUD's middle column, grouped with the
 * bar2 input inside a shared wrapper div. This preserves the two-slot column
 * layout (bar2+willpower on top, bar1 on bottom) without disrupting flex/grid
 * spacing.
 *
 * Skipped if willpower is already occupying a standard bar slot.
 *
 * @param {WoDTokenDocument} token
 * @param {HTMLElement} html
 */
function _injectWillpowerInput(token, html) {
  if (token.bar1?.attribute === "willpower") return;
  if (token.bar2?.attribute === "willpower") return;

  const willpower = token.actor?.system?.willpower;
  if (!willpower) return;

  const middle = html.querySelector(".col.middle");
  if (!middle) return;

  const bar2Div = middle.querySelector(".attribute.bar2");
  if (!bar2Div) return;

  // Group bar2 and the WP input together in one layout slot
  const group = document.createElement("div");
  group.className = "wrath-of-davokar flex-column flex-gap";
  bar2Div.replaceWith(group);

  const wpWrapper = document.createElement("div");
  wpWrapper.className = "attribute wod-willpower";

  const input = document.createElement("input");
  input.className = "willpower-token-hud-input";
  input.type = "text";
  input.name = "willpower";
  input.value = willpower.value;
  input.title = game.i18n.format('WRATH_OF_DAVOKAR.Willpower.label');

  _attachBarInputListeners(input, {
    min: 0,
    max: willpower.max,
    getValue: () => token.actor.system.willpower.value,
    onCommit: async (value) => {
      await token.actor.update({ "system.willpower.value": value });
    },
  });

  // Overlay the willpower icon inside the input
  _wrapInputWithIcon(input, BAR_ICONS.willpower);

  wpWrapper.appendChild(input.parentElement); // append the wrapper, not the raw input
  group.appendChild(wpWrapper);
  group.appendChild(bar2Div);
}

// ---------------------------------------------------------------------------
// Armor rating always-on input
// ---------------------------------------------------------------------------

/**
 * Inject an armorRating input into the HUD's middle column, grouped with the
 * bar1 input inside a shared wrapper div. This preserves the two-slot column
 * layout (bar2 on top, bar1+armor on bottom) without disrupting flex/grid
 * spacing.
 *
 * Skipped if armorRating is already occupying a standard bar slot.
 *
 * @param {WoDTokenDocument} token
 * @param {HTMLElement} html
 */
function _injectArmorRatingInput(token, html) {
  if (token.bar1?.attribute === "armorRating") return;
  if (token.bar2?.attribute === "armorRating") return;

  const armorRating = token.actor?.system?.armorRating;
  if (!armorRating) return;

  const middle = html.querySelector(".col.middle");
  if (!middle) return;

  const bar1Div = middle.querySelector(".attribute.bar1");
  if (!bar1Div) return;

  // Group bar1 and the armor input together in one layout slot
  const group = document.createElement("div");
  group.className = "wrath-of-davokar flex-column flex-gap";
  bar1Div.replaceWith(group);
  group.appendChild(bar1Div);

  const armorWrapper = document.createElement("div");
  armorWrapper.className = "attribute wod-armorRating";

  const input = document.createElement("input");
  input.className = "armorRating-token-hud-input";
  input.type = "text";
  input.name = "armor";
  input.value = armorRating.value;
  input.title = game.i18n.format('WRATH_OF_DAVOKAR.armor.rating.label');

  _attachBarInputListeners(input, {
    min: 0,
    max: armorRating.max,
    getValue: () => token.actor.system.armorRating.value,
    onCommit: async (value) => {
      await token.actor.update({ "system.armorRating.value": value });
    },
  });

  // Overlay the armor icon inside the input
  _wrapInputWithIcon(input, BAR_ICONS.armorRating);

  armorWrapper.appendChild(input.parentElement); // append the wrapper, not the raw input
  group.appendChild(armorWrapper);
}
