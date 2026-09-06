/**
 * Adds functionality to a custom HTML element for displaying a target selector and displaying targets.
 * @param {typeof HTMLElement} Base  The base class being mixed.
 * @returns {typeof TargetedApplicationElement}
 */
export function TargetedApplicationMixin(BaseClass) {
  return class TargetedApplication extends BaseClass {

    /**
     * Currently registered hook for monitoring for changes to selected tokens.
     * @type {number|null}
     */
    selectedTokensHook = null;

    /**
     * Currently registered hook for monitoring for changes to targeted tokens.
     * @type {number|null}
     */
    targetedTokensHook = null;

    /**
     * Whether the collapsible tray content is currently expanded.
     * @type {boolean}
     */
    _open = false;

    /**
     * Whether to rebuild the target list.
     * @type {boolean|void}
     */
    get shouldBuildTargetList() {
      return !!this.targetList;
    }

    /**
     * Whether the collapsible tray content is currently expanded.
     * @type {boolean}
     */
    get open() {
      return this._open;
    }

    set open(value) {
      value = !!value;
      if ( value === this._open ) return;
      this._open = value;
      this._collapsibleFrame?.classList.toggle("collapsed", !value);
      if ( value ) this._onOpen();
    }

    /**
     * Whether this element currently has anything worth showing (e.g. the current user has an active target)
     * and should be displayed at all.
     * @type {boolean}
     */
    get visible() {
      return !this.hidden;
    }

    set visible(value) {
      value = !!value;
      if ( value === this.visible ) return;
      this.hidden = !value;
      if ( value ) this._onVisible();
    }

    /**
     * Called whenever the tray transitions from collapsed to expanded. Override to react (e.g. rebuild the
     * target list, which is skipped while collapsed for performance).
     */
    _onOpen() {}

    /**
     * Called whenever the tray transitions from hidden to visible. Override to react.
     */
    _onVisible() {}

    /**
     * Currently target selection mode.
     * @type {"targeted"|"selected"}
     */
    get targetingMode() {
      return this.targetSourceControl.querySelector('[aria-pressed="true"]')?.dataset.mode ?? "targeted";
    }

    set targetingMode(mode) {
      const toPress = this.targetSourceControl.querySelector(`[data-mode="${mode}"]`);
      const currentlyPressed = this.targetSourceControl.querySelector('[aria-pressed="true"]');
      if ( currentlyPressed ) currentlyPressed.ariaPressed = false;
      toPress.ariaPressed = true;

      this.buildTargetsList();
      if ( (mode === "targeted") && (this.selectedTokensHook !== null) ) {
        Hooks.off("controlToken", this.selectedTokensHook);
        this.selectedTokensHook = null;
      } else if ( (mode === "selected") && (this.selectedTokensHook === null) ) {
        this.selectedTokensHook = Hooks.on("controlToken", foundry.utils.debounce(() => this.buildTargetsList(), 50));
      }
    }

    /**
     * The list of application targets.
     * @type {HTMLUListElement}
     */
    targetList;

    /**
     * The controls for selecting target source mode.
     * @type {HTMLElement}
     */
    targetSourceControl;

    /* -------------------------------------------- */
    /*  Life-Cycle                                  */
    /* -------------------------------------------- */

    /** @inheritDoc */
    connectedCallback() {
      super.connectedCallback?.();
      this.hidden = !this._hasActiveTargets();
      if ( this.targetedTokensHook === null ) {
        this.targetedTokensHook = Hooks.on("targetToken", this._onTargetToken.bind(this));
      }
    }

    /** @inheritDoc */
    disconnectedCallback() {
      super.disconnectedCallback?.();
      if ( this.selectedTokensHook ) Hooks.off("controlToken", this.selectedTokensHook);
      if ( this.targetedTokensHook ) {
        Hooks.off("targetToken", this.targetedTokensHook);
        this.targetedTokensHook = null;
      }
    }

    /**
     * Whether the current user has at least one active target.
     * @returns {boolean}
     */
    _hasActiveTargets() {
      return game.user.targets.size > 0;
    }

    /* -------------------------------------------- */
    /*  Rendering                                   */
    /* -------------------------------------------- */

    /**
     * Return the HTML elements needed to build the target source control and target list.
     * @returns {HTMLElement[]}
     */
    buildTargetContainer() {
      this.targetSourceControl = document.createElement("div");
      this.targetSourceControl.classList.add("target-source-control");
      this.targetSourceControl.innerHTML = `
        <button type="button" class="unbutton" data-mode="targeted" aria-pressed="false">
          <i class="fa-solid fa-bullseye" inert></i> ${game.i18n.localize("WRATH_OF_DAVOKAR.Tokens.Targeted")}
        </button>
        <button type="button" class="unbutton" data-mode="selected" aria-pressed="false">
          <i class="fa-solid fa-expand" inert></i> ${game.i18n.localize("WRATH_OF_DAVOKAR.Tokens.Selected")}
        </button>
      `;
      this.targetSourceControl.querySelectorAll("button").forEach(b =>
        b.addEventListener("click", this._onChangeTargetMode.bind(this))
      );

      this.targetList = document.createElement("ul");
      this.targetList.classList.add("targets", "unlist");

      return [this.targetSourceControl, this.targetList];
    }

    /**
     * Build a list of targeted tokens based on current mode & replace any existing targets.
     */
    buildTargetsList() {
      if ( this.shouldBuildTargetList === false ) return;
      const targetedTokens = new Map();
      switch ( this.targetingMode ) {
        case "targeted":
          game.user.targets.forEach(t => {
            if ( t.actor ) targetedTokens.set(t.actor.uuid, t.name);
          });
          break;
        case "selected":
          canvas.tokens?.controlled?.forEach(t => {
            if ( t.actor ) targetedTokens.set(t.actor.uuid, t.name);
          });
          break;
      }
      const targets = Array.from(targetedTokens.entries())
        .map(([uuid, name]) => this.buildTargetListEntry({ uuid, name }))
        .filter(t => t);
      if ( targets.length ) this.targetList.replaceChildren(...targets);
      else {
        const li = document.createElement("li");
        li.classList.add("none");
        li.innerText = game.i18n.localize(`WRATH_OF_DAVOKAR.Tokens.None${this.targetingMode.capitalize()}`);
        this.targetList.replaceChildren(li);
      }
    }

    /**
     * Create a list entry for a single target.
     * @param {object} data
     * @param {string} data.uuid  UUID of the targeted actor.
     * @param {string} data.name  Name of the targeted token.
     * @returns {HTMLLIElement|void}
     * @abstract
     */
    buildTargetListEntry({ uuid, name }) {}

    /* -------------------------------------------- */
    /*  Event Handlers                              */
    /* -------------------------------------------- */

    /**
     * Handle clicking on the target mode buttons.
     * @param {PointerEvent} event  Triggering click event.
     */
    async _onChangeTargetMode(event) {
      event.preventDefault();
      this.targetingMode = event.currentTarget.dataset.mode;
    }

    /**
     * Handle a token being targeted or untargeted, updating this element's visibility and, if the "Targeted"
     * source mode is active, rebuilding the target list to reflect the change.
     * @param {User} user
     * @param {Token} token
     * @param {boolean} targeted
     */
    _onTargetToken(user, token, targeted) {
      if ( user !== game.user ) return;
      this.visible = this._hasActiveTargets();
      if ( this.targetingMode === "targeted" ) this.buildTargetsList();
    }

    /**
     * Handle a click within the tray, toggling the collapsible content open/closed when the click originated
     * from the header label rather than the interactive content inside the tray body.
     * @param {PointerEvent} event
     */
    _handleClickHeader(event) {
      if ( event.target.closest(".collapsible-content") ) return;
      if ( !event.target.closest("label") ) return;
      this.open = !this.open;
    }
  };
}
