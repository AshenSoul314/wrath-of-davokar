// module/applications/apply-changes-element.mjs
import { TargetedApplicationMixin } from "./target-mixin.mjs"; // wherever you put the file above

export default class ApplyChangesElement extends TargetedApplicationMixin(HTMLElement) {

  /** @type {ChatMessage} */
  chatMessage;

  /** @type {ApplyData} */
  applyData;

  /** @override */
  get shouldBuildTargetList() {
    return super.shouldBuildTargetList && this.open && this.visible;
  }

  /* -------------------------------------------- */

  connectedCallback() {
    super.connectedCallback();

    const messageId = this.closest("[data-message-id]")?.dataset.messageId;
    this.chatMessage = game.messages.get(messageId);
    if ( !this.chatMessage ) return;

    // Build the frame HTML only once
    if ( !this.targetList ) {
      const div = document.createElement("div");
      this._collapsibleFrame = div;
      div.classList.add("card-tray", "damage-tray", "collapsible");
      if ( !this.open ) div.classList.add("collapsed");
      div.innerHTML = `
        <label class="roboto-upper">
          <i class="fa-solid fa-heart-crack"></i>
          <span>${game.i18n.localize("WRATH_OF_DAVOKAR.Chat.Apply.Label")}</span>
          <i class="fa-solid fa-caret-down"></i>
        </label>
        <div class="collapsible-content">
          <div class="wrapper">
            <button class="apply-changes" type="button">
              <i class="fa-solid fa-reply-all fa-flip-horizontal" inert></i>
              ${game.i18n.localize("WRATH_OF_DAVOKAR.Chat.Apply.Label")}
            </button>
          </div>
        </div>
      `;
      this.replaceChildren(div);
      this.applyButton = div.querySelector(".apply-changes");
      this.applyButton.addEventListener("click", this._onApply.bind(this));
      div.querySelector(".wrapper").prepend(...this.buildTargetContainer());
      div.addEventListener("click", this._handleClickHeader.bind(this));
    }

    this.targetingMode = this.chatMessage?.getFlag("wrath-of-davokar", "targets")?.length ? "targeted" : "selected";
  }

  /* -------------------------------------------- */

  /**
   * Whether a given target's checkbox should be checked by default.
   * @param {string} uuid
   * @returns {boolean}
   */
  targetChecked(uuid) {
    return true;
  }

  /* -------------------------------------------- */

  buildTargetListEntry({ uuid, name }) {
    const actor = fromUuidSync(uuid);
    if ( !actor?.isOwner ) return;

    const disabled = this.targetingMode === "selected" ? " disabled" : "";
    const checked = this.targetChecked(uuid) ? " checked" : "";

    const li = document.createElement("li");
    li.classList.add("target");
    li.dataset.targetUuid = uuid;
    li.innerHTML = `
      <img class="gold-icon">
      <div class="name-stacked">
        <span class="title"></span>
      </div>
      <div class="checkbox">
        <dnd5e-checkbox name="${uuid}"${checked}${disabled}></dnd5e-checkbox>
      </div>
    `;
    Object.assign(li.querySelector(".gold-icon"), { alt: name, src: actor.img });
    li.querySelector(".name-stacked .title").append(name);

    return li;
  }

  /* -------------------------------------------- */

  async _onApply(event) {
    event.preventDefault();
    for ( const li of this.targetList.querySelectorAll(".target") ) {
      const actor = await fromUuid(li.dataset.targetUuid);
      if ( actor ) await this._applyToActor(actor);
    }
  }

  async _applyToActor(actor) {
    const updates = {};
    if ( this.applyData.deltaTempCorruption ) {
      updates["system.corruption.temporary.value"] = Math.max(0, (actor.system.corruption.temporary.value) + this.applyData.deltaTempCorruption);
    }
    if ( this.applyData.deltaPermCorruption ) {
      updates["system.corruption.permanent.value"] = Math.max(0, (actor.system.corruption.permanent.value) + this.applyData.deltaPermCorruption);
    }
    if ( this.applyData.deltaToughness ) {
      updates["system.toughness.value"] = Math.min(actor.system.toughness.max, Math.max(0, (actor.system.toughness.value) + this.applyData.deltaToughness));
    }
    if ( this.applyData.deltaPhy ) {
      updates["system.attributes.physique.value"] = Math.min(actor.system.attributes.physique.max, Math.max(0, (actor.system.attributes.physique.value) + this.applyData.deltaPhy));
    }
    // ... deltaPhy, deltaFin, etc. following the same pattern
    if ( Object.keys(updates).length ) await actor.update(updates);
  }

  /* -------------------------------------------- */

  /** @override */
  _onOpen() {
    this.buildTargetsList();
  }

  /* -------------------------------------------- */

  /** @override */
  _onVisible() {
    this.buildTargetsList();
  }
}



customElements.define("wod-apply-changes", ApplyChangesElement);

export class ApplyData {
  constructor() {
    this.effects = null;
    this.modifiers = null;
    this.deltaToughness = null;
    this.deltaPhy = null;
    this.deltaFin = null;
    this.deltaWit = null;
    this.deltaEmp = null;
    this.deltaTempCorruption = null;
    this.deltaPermCorruption = null;
    this.deltaArmor= null;
  }
}
