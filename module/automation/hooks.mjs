/**
 * @file hooks.mjs
 * @description Hook registry for the Wrath of Davokar system automation pipeline.
 *
 * Modules and items that wish to participate in system automation should:
 *   1. Define an `automationId` string in `item.system.automationId`
 *   2. Register handlers against that ID using {@link registerHook}
 *   3. Use {@link HOOKS} constants for all hook names to avoid typos
 *
 * automationIds should follow the format "module_name.item_name" to avoid
 * conflicts with other modules. e.g. "my_module.theurgy_novice"
 *
 * @example
 * // Registering automation for a talent
 * import { HOOKS } from "./hooks.mjs";
 *
 * Hooks.on("ready", () => {
 *   game.wrathofdavokar.registerHook("my_module.theurgy_novice", {
 *     [HOOKS.POST_COUNT_SUCCESSES]: (context) => {
 *       // ... automation logic
 *     },
 *     [HOOKS.PRE_APPLY_CORRUPTION]: (context) => {
 *       // ... automation logic
 *     }
 *   });
 * });
 */

Hooks.on('canvasReady', _rebuildReactionCache);
Hooks.on('createToken', _rebuildReactionCache);
Hooks.on('deleteToken', _rebuildReactionCache);
Hooks.on('createItem',  rebuildReactionCache);  // guarded version
Hooks.on('deleteItem',  rebuildReactionCache);  // guarded version

/**
 * All valid hook names for the Wrath of Davokar automation pipeline.
 *
 * Use these constants when registering hooks to avoid silent failures
 * from string typos. All hooks receive a mutable `context` object —
 * handlers may read and write to it to pass data to subsequent hooks
 * in the same pipeline.
 *
 * @constant
 * @type {Readonly<Object.<string, string>>}
 */
export const HOOKS = Object.freeze({
  /**
   * ------------------------------------------------------------------
   * Reactions
   * ------------------------------------------------------------------
   * These functions are fired at the start or end of each and every
   * pipeline. These are fired for every actor in the current scene and
   * should be used very sparingly.
   *
   * Handlers for these hooks take two arguments instead of one (context and reactingActor).
   * The reactingActor is the actor who is reacting and possesses the item bound to
   * the handler being called. This may or may not be the same as any actors listed in
   * the context object.
   *
   * If your handler only does something if the controlling actor is the
   * target of the action, use the normal pipeline handlers instead.
   */

  // Called at the start of the Skill Test Pipeline
  PRE_SKILL_TEST_REACT: "onPreSkillTestReact",

  // Called at the end of the Skill Test Pipeline
  POST_SKILL_TEST_REACT: "onPostSkillTestReact",

  // Called at the start of the Spell Pipeline
  PRE_SPELL_REACT: "onPreSpellReact",

  // Called at the end of the Spell Pipeline
  POST_SPELL_REACT: "onPostSpellReact",

  // Called at the start of the Combat Pipeline
  PRE_COMBAT_REACT: "onPreCombatReact",

  // Called at the end of the Combat Pipeline
  POST_COMBAT_REACT: "onPostCombatReact",

  // Called at the start of the Corruption Pipeline
  PRE_CORRUPTION_REACT: "onPreCorruptionReact",

  // Called midway through the Corruption Pipeline, just before the corruption is applied to the actor
  PRE_CORRUPTION_APPLY_REACT: "onPreCorruptionApplyReact",

  // Called at the end of the Corruption Pipeline
  POST_CORRUPTION_REACT: "onPostCorruptionReact",

  // Called at the start of the Damage Pipeline
  PRE_DAMAGE_REACT: "onPreDamageReact",

  // Called at the end of the Damage Pipeline
  POST_DAMAGE_REACT: "onPostDamageReact",

  /**
   * ------------------------------------------------------------------
   * Skill Test Pipeline
   * ------------------------------------------------------------------
   *
   * All handlers in this section MUST check the `context.test.evaluating` and
   * `context.test.contest.evaluating` fields to find out if they are being
   * called during the aggressor or defender side of the test if `context.test.contest.isContested`
   * is true. During the aggressor's test, `context.test.evaluating` is true and `context.test.contest.isContested`
   * is false. During the defender's test, `context.test.contest.evaluating` is true and `context.test.isContested`
   * is false. These values may be undefined or null in a non-contested test, `context.test.contest.isContested`
   * is always defined in any test.
   *
   * In a contested test all handlers are called first for the aggressor then the defender during
   * the aggressor's part of the test. During the defenders test, all handlers are called first
   * for the defender then the aggressor
   */

  /** Determine which attribute + skill pair(s) are available for the roll.
   *  Handlers should append available skills to the context.test.skill.options
   *  array in the form {skill: "skill", source: "what allows this"}. Addition
   *  attributes can be appended to the context.test.attribute.options array in
   *  the form of {attribute:"attribute", source: "what allows this"}.
   *  Handlers should also append any unique combinations of skill and
   *  attribute to context.test.poolOverrides in the form {attribute: "attribute",
   *  skill: "skill", source:"What allows this"}
   */
  RESOLVE_DICE_POOL: "onResolveDicePool",

  /** Apply additive or subtractive modifiers to the resolved dice pool.
   *  Handlers should modify the first two elements in the context.test.dice array
   *  (the first being the attribute dice, the second being the skill dice) or
   *  append additional terms. All dice use term 's' (skill dice) or one of the artifact
   *  dice (12, 10, 8) as all dice in Wrath of Davokar are pushable. Negative
   *  values for dice quantity are allowed.
   */
  MODIFY_DICE_POOL: "onModifyDicePool",

  /** Modify how many times the player may push this roll.
   *  Handlers should modify the context.test.rollOptions.maxPush */
  MODIFY_MAX_PUSHES: "onModifyMaxPushes",

  /** Fires before the dice pool is rolled. `context.test.dice` is final at this point. */
  PRE_ROLL: "onPreRoll",

  /** Fires after the dice pool is rolled. `context.test.roll` contains the Roll object. */
  POST_ROLL: "onPostRoll",

  /** Fires before the player pushes the roll. The `context.test.roll` object keeps track
   *  of the number of pushes taken and remaining. This may be called multiple times in
   *  one pipeline, once for each push.
   */
  PRE_PUSH: "onPrePush",

  /** Fires after a push resolves. This may be called multiple times in one pipeline,
   * once for each push.
  */
  POST_PUSH: "onPostPush",

  /** Fires before sixes are counted. Handlers may mutate `context.test.rollResult`
   *  Each entry is of the form: { termIndex, resultIndex, face, successCount, isSuccess, isFailure, isPushed, isDiscarded }
   *  Handlers may mutate successCount and isFailure to change how dice are counted, but may not change temIndex, resultIndex,
   *  face, isSuccess, isPushed, and isDiscarded. After this step is completed the pipeline will set isSuccess to true if
   *  successCount > 0 after all handlers have been called.
   */
  PRE_COUNT_SUCCESSES: "onPreCountSuccesses",

  /** Fires after successes are counted. `context.test.successes` is set and final. No handler may mutate
   * `context.test.roll`, `context.test.rollResult`, or `context.test.successes` at this point.
  */
  POST_COUNT_SUCCESSES: "onPostCountSuccesses",

  /** Fires before aggressor and defender successes are compared in contested tests
   *  (`context.test.contest.isContested` must be set to true for this to fire).
   */
  PRE_NET_SUCCESSES: "onPreNetSuccesses",

  /** Fires after net successes are calculated. `context.netSuccesses` is set.
   *  (`context.test.contest.isContested` must be set to true for this to fire).
   */
  POST_NET_SUCCESSES: "onPostNetSuccesses",

  // ------------------------------------------------------------------
  // Corruption pipeline
  // ------------------------------------------------------------------

  /** Fires before corruption is rolled. */
  PRE_ROLL_CORRUPTION: "onPreRollCorruption",

  /** Fires after corruption is rolled. */
  POST_ROLL_CORRUPTION: "onPostRollCorruption",

  /** Fires before corruption is applied to the target. */
  PRE_APPLY_CORRUPTION: "onPreApplyCorruption",

  /** Fires after corruption is applied to the target. */
  POST_APPLY_CORRUPTION: "onPostApplyCorruption",

  /** Fires before checking whether a corruption threshold has been crossed. */
  PRE_CORRUPTION_THRESHOLD_CHECK: "onPreCorruptionThresholdCheck",

  /** Fires only when a corruption threshold is actually crossed. This even fires only
   *  if context.corruption.thresholdExceeded is true after the Hook PRE_CORRUPTION_THRESHOLD_CHECK.
   *  Just prior to this hook, the rules for exceeding a corruption threshold where applied:
   *    1. One temporary corruption was turned into permanent corruption if the actor does not have the BlightMarked
   *       condition. (GM may )
   *    2. The Actor gains the BlightMarked condition if they did not already have it.
   */
  CORRUPTION_THRESHOLD_CROSSED: "onCorruptionThresholdCrossed",

  /** Fires after the corruption threshold check resolves, whether or not
   *  the threshold was crossed. */
  POST_CORRUPTION_THRESHOLD_CHECK: "onPostCorruptionThresholdCheck",

  /** Fires before checking whether a corruption max has been crossed. */
  PRE_CORRUPTION_MAX: "onPreCorruptionMaxCheck",

  /** Fires only when a corruption maximum is actually crossed.*/
  CORRUPTION_MAX_CROSSED: "onCorruptionMaxCrossed",

  /** Fires after the corruption max check resolves, whether or not
   *  the maximum was crossed. */
  POST_CORRUPTION_MAX: "onPostCorruptionMaxCheck",

  // ------------------------------------------------------------------
  // Spell pipeline
  // ------------------------------------------------------------------

  /** Fires before the spell casting test is made */
  PRE_SPELL_TEST: "onPreSpellTest",

  /** Fires after the spell casting test is made */
  POST_SPELL_TEST: "onPreSpellTest",

  /** Fires before a spell's effect is applied to its target(s). */
  PRE_SPELL_APPLY_EFFECT: "onPreSpellApplyEffect",

  /** Fires after a spell's effect is applied to its target(s). */
  POST_SPELL_APPLY_EFFECT: "onPostSpellApplyEffect",

  // ------------------------------------------------------------------
  // Combat pipeline
  // ------------------------------------------------------------------

  /** Resolves whether a reaction (parry or dodge) is permitted for this attack.
   *  Handlers should return `true` to explicitly permit, `false` to explicitly
   *  forbid, or `null` for no opinion. `false` always takes precedence. */
  COMBAT_RESOLVE_ATTACK_REACTION:             "onCombatResolveAttackReaction",

  /** Fires before the defender chooses and executes their reaction.
   *  `context.canParry` and `context.canDodge` are set by this point. */
  PRE_COMBAT_DEFENDER_REACT:           "onPreCombatDefenderReact",

  /** Fires after the defender's reaction roll resolves.
   *  `context.defenseSuccesses` is set. */
  POST_COMBAT_DEFENDER_REACT:          "onPostCombatDefenderReact",

  /** Fires before weapon damage is calculated from net successes. */
  PRE_COMBAT_CALCULATE_DAMAGE:         "onPreCombatCalculateDamage",

  /** Fires after weapon damage is calculated. `context.damage` is set. */
  POST_COMBAT_CALCULATE_DAMAGE:        "onPostCombatCalculateDamage",

  /** Fires before the defender rolls their armor rating. */
  PRE_COMBAT_ARMOR_ROLL:               "onPreCombatArmorRoll",

  /** Fires after the defender's armor roll resolves. `context.armorResult` is set. */
  POST_COMBAT_ARMOR_ROLL:              "onPostCombatArmorRoll",

  /** Fires before armor degradation is applied. `context.attackEffects` contains
   *  any effects from the attack that may affect armor (e.g. armor piercing). */
  PRE_COMBAT_ARMOR_DEGRADE:            "onPreCombatArmorDegrade",

  /** Fires after armor degrades. `context.finalArmorRating` is set. */
  POST_COMBAT_ARMOR_DEGRADE:           "onPostCombatArmorDegrade",

  /** Fires before armor is subtracted from damage. `context.bypassFlags` indicates
   *  whether the attack fully or partially ignores armor. */
  PRE_COMBAT_ARMOR_ABSORB_DAMAGE:            "onPreCombatArmorAbsorbDamage",

  /** Fires after absorption resolves. `context.finalDamage` is set. */
  POST_COMBAT_ARMOR_ABSORB_DAMAGE:           "onPostCombatArmorAbsorbDamage",

  // ------------------------------------------------------------------
  // Damage pipeline
  // ------------------------------------------------------------------

  /** Fires before final damage is applied to the target. */
  PRE_DAMAGE_APPLY:             "onPreDamageApply",

  /** Fires after damage is applied. `context.appliedDamage` is set. */
  POST_DAMAGE_APPLY:            "onPostDamageApply",

  /** Fires before checking whether damage exceeds the target's pain threshold. */
  PRE_PAIN_THRESHOLD:           "onPrePainThresholdCheck",

  /** Fires only when damage exceeds the pain threshold.
   *  The In Pain condition will be applied after this hook resolves. */
  PAIN_THRESHOLD_CROSSED:       "onPainThresholdCrossed",

  /** Fires after the pain threshold check resolves, whether or not
   *  the threshold was crossed. */
  POST_PAIN_THRESHOLD:          "onPostPainThresholdCheck",
});

/**
 * A subset of HOOKS, containing only the scene-wide reaction hooks
 */
const REACTION_HOOKS = Object.freeze({
  PRE_SKILL_TEST_REACTION: HOOKS.PRE_SKILL_TEST_REACTION,
  POST_SKILL_TEST_REACT: HOOKS.POST_SKILL_TEST_REACT,
  PRE_SPELL_REACT: HOOKS.PRE_SPELL_REACT,
  POST_SPELL_REACT: HOOKS.POST_SPELL_REACT,
  PRE_COMBAT_REACT: HOOKS.PRE_COMBAT_REACT,
  POST_COMBAT_REACT: HOOKS.POST_COMBAT_REACT,
  PRE_CORRUPTION_REACT: HOOKS.PRE_CORRUPTION_REACT,
  PRE_CORRUPTION_APPLY_REACT: HOOKS.PRE_CORRUPTION_APPLY_REACT,
  POST_CORRUPTION_REACT: HOOKS.POST_CORRUPTION_REACT,
  PRE_DAMAGE_REACT: HOOKS.PRE_DAMAGE_REACT,
  POST_DAMAGE_REACT: HOOKS.POST_DAMAGE_REACT,
});

/**
 * Registers automation handlers for a given automationId.
 *
 * Should be called during Foundry's `ready` hook. Each automationId may only
 * be registered once — duplicate registrations are rejected with a warning.
 * Individual hooks that do not match a known hook name are skipped with a warning,
 * but the rest of the registration proceeds normally.
 *
 * @param {string} automationId - Unique identifier for this automation.
 *   Should follow the format "module_name.item_name" to avoid conflicts.
 *   e.g. "my_module.theurgy_novice"
 *
 * @param {Object.<string, Function>} hooks - An object mapping hook name
 *   strings to a handler functions. Use {@link HOOKS} constants as keys.
 *   Each handler receives a mutable `context` object and may be async.
 *
 * @returns {void}
 *
 * @example
 * game.wrathofdavokar.registerHook("my_module.theurgy_novice", {
 *   [HOOKS.POST_COUNT_SUCCESSES]: (context) => {
 *     // ... automation logic
 *   },
 *   [HOOKS.PRE_APPLY_CORRUPTION]: (context) => {
 *     // ... automation logic
 *   }
 * });
 *
 */
export function registerHook(automationId, hooks) {
  const knownHooks = new Set(Object.values(HOOKS));

  if (game.wrathofdavokar.hookRegistry.has(automationId)) {
    console.warn(
      `Wrath of Davokar | Registration attempted with duplicate automation ID "${automationId}", SKIPPING REGISTRATION. ` +
      `Modules registering hooks should use the format "module_name.item_name" to avoid conflicts.`
    );
    return;
  }

  const newHooks = [];
  for (const hookName of Object.keys(hooks)) {
    if (!knownHooks.has(hookName)) {
      console.warn(
        `Wrath of Davokar | Unknown hook "${hookName}" for "${automationId}", SKIPPING THIS HOOK. ` +
        `Check game.wrathofdavokar.HOOKS for valid hook names.`
      );
    } else {
      newHooks.push(hookName);
    }
  }

  game.wrathofdavokar.hookRegistry.set(automationId, []);
  for (const hookName of newHooks) {
    game.wrathofdavokar.hookRegistry.get(automationId).push({ hookName, handler: hooks[hookName] });
  }

  // If any of the registered hooks are reaction hooks, note this automationId
  // so the scene cache knows to watch for it
  const isReactionHook = newHooks.some(h => REACTION_HOOKS.has(h));
  if (isReactionHook) {
    game.wrathofdavokar.reactionAutomationIds.add(automationId);
  }
}

/**
 * Retrieves all registered handlers for a given actor and hook name.
 *
 * Iterates the actor's owned items, finds those with a registered automationId,
 * and returns all handlers that match the requested hook name. Handlers are
 * returned in item order — no priority sorting is applied.
 *
 * @param {Actor} actor - The Foundry Actor document whose items will be searched.
 * @param {string} hookName - The hook name to retrieve handlers for.
 *   Use {@link HOOKS} constants to avoid typos.
 *
 * @returns {Array<{automationID: string, handler: Function}>} An array of handler functions in the form {id, handler}. Empty if no matching
 *   handlers are found. Each handler accepts a mutable `context` object
 *   and may be async.
 *
 * @example
 * const handlers = game.wrathofdavokar.getHandlers(actor, HOOKS.PRE_ROLL);
 * for (const {handler} of handlers) {
 *   await handler(context);
 * }
 */
export function getHandlers(actor, hookName) {
  const handlers = [];
  for (const item of actor.items) {
    const automationId = item.system?.automationId;
    if (!automationId) continue;
    const entries = game.wrathofdavokar.hookRegistry.get(automationId) ?? [];
    for (const entry of entries) {
      if (entry.hookName === hookName) handlers.push({automationId: automationId, handler:entry.handler});
    }
  }
  return handlers;
}

export function getReactionHandlers(hookName) {
  return game.wrathofdavokar.sceneReactionCache.get(hookName) ?? [];
}

function rebuildReactionCache(item) {
  // Only rebuild if the owning actor has a token in the current scene
  const actor = item.parent;
  if (!actor) return;
  const isInScene = canvas.scene?.tokens.some(t => t.actorId === actor.id);
  if (!isInScene) return;
  _rebuildReactionCache();
}

function _rebuildReactionCache() {
  game.wrathofdavokar.sceneReactionCache.clear();

  for (const token of canvas.scene?.tokens ?? []) {
    const actor = token.actor;
    if (!actor) continue;

    for (const item of actor.items) {
      const automationId = item.system?.automationId;
      if (!automationId) continue;
      if (!game.wrathofdavokar.reactionAutomationIds.has(automationId)) continue;

      const entries = game.wrathofdavokar.hookRegistry.get(automationId) ?? [];
      for (const entry of entries) {
        if (!game.wrathofdavokar.sceneReactionCache.has(entry.hookName)) {
          game.wrathofdavokar.sceneReactionCache.set(entry.hookName, []);
        }
        game.wrathofdavokar.sceneReactionCache.get(entry.hookName).push({
          automationId,
          actor,
          item,
          handler: entry.handler
        });
      }
    }
  }
}
