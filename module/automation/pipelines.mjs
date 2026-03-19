export const PIPELINES = Object.freeze({
  SPELL: "spell",
  COMBAT: "combat",
  SKILL_TEST: "skillTest",
  DAMAGE: "damage",
  CORRUPTION: "corruption"
});


export async function callHook(context, targetActor, hookName, isReactionHook=false) {

  if (isReactionHook) {
    const handlers = game.wrathofdavokar.getReactionHandlers(hookName);
    for (const { automationId, actor: reactingActor, handlerFunc } of handlers) {
      if (!context.handlers[automationId]) {
        context.handlers[automationId] = {};
      }
      context.handlers[automationId][hookName] = {};
      await handlerFunc(context, reactingActor);
    }
  } else {
    const handlers = game.wrathofdavokar.getHandlers(targetActor, hookName);
    for (const { automationId, handlerFunc } of handlers) {
      if (!context.handlers[automationId]) {
        context.handlers[automationId] = {};
      }
      context.handlers[automationId][hookName] = {};
      await handlerFunc(context);
    }
  }
}

/**
 * Creates a fresh test context for a new pipeline run.
 * @param {Actor} actor - The actor initiating the test.
 * @param {string} title - Display title for the roll.
 * @param {BaseContext|null} parentContext - The parent pipeline context, if any.
 * @returns {TestContext}
 */
export function createTestContext(actor, title, target=null, parentContext=null) {
  return {
    actor,
    canceled: false,
    pipeline: PIPELINES.SKILL_TEST,
    parentContext,
    handlers: {},
    test: {
      evaluating: false,
      attribute: { defaultAttribute: null, options: [], value: null },
      skill:     { defaultSkill: null,     options: [], value: null },
      poolOverrides: [],
      dice: null,
      rollData: { title:title, maxPush: 1, yzGame:'wod' },
      roll: null,
      rollResult: null,
      successes: null,
      contest: {
        evaluating: false,
        isContested: !!target,
        actor: target,
        attribute: { defaultAttribute: null, options: [], value: null },
        skill:     { defaultSkill: null,     options: [], value: null },
        poolOverrides: [],
        dice: null,
        rollData: { title:title, maxPush: 1 },
        roll: null,
        rollResult:null,
        successes: null,
        netSuccesses: null,
      }
    }
  };
}


/**
 * Creates a fresh corruption context for a new pipeline run.
 * @param {Actor} actor - The actor who is gaining the corruption.
 * @param {BaseContext|null} parentContext - The parent pipeline context, if any.
 * @returns {TestContext}
 */
export function createCorruptionContext(actor, parentContext=null) {
  return {
    actor,
    canceled: false,
    pipeline: PIPELINES.CORRUPTION,
    parentContext,
    handlers: {},
    corruption: {
      tempFormula: null,
      permanentFormula: null,
      dice: null,
      rollData: { title:title, },
      roll: null,
      rollResult: null,
      corruptionGained: null,
      exceedThreshold: null,
      exceedMax: null
    }
  };
}

/**
 * Creates a fresh combat context for a new pipeline run.
 * @param {Actor} actor - The actor initiating the attack.
 * @param {Actor} target - The actor being targeted by the attack.
 * @param {Item} activeItem - The item being used in the attack, not guarunteed to be a weapon type item
 * @param {BaseContext|null} parentContext - The parent pipeline context, if any.
 * @returns {CombatContext}
 */
export function createCombatContext(actor, target, activeItem, parentContext = null) {
  return {
    actor,
    canceled: false,
    pipeline: PIPELINES.COMBAT,
    parentContext,
    handlers: {},
    combat: {
      target,
      attack:  { activeItem, attack_test: null },
      defence: { can_parry: true, can_dodge: true, defence_test: null },
      raw_damage:     [],
      armor_test:     null,
      incoming_damage: [],
      damage_applied:  [],
      pain_exceeded:   false,
    }
  };
}