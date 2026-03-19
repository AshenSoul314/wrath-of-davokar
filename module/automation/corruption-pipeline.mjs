
import { HOOKS } from "./hooks.mjs";
import { PIPELINES, createTestContext, callHook } from "./pipelines.mjs";
import {localizeAttribute, localizeSkill } from "../helpers/localize.mjs";
import { YearZeroRoll } from '../../lib/yzur.js';

export function onSkillTestPipelineKeep(event) {
  event.preventDefault();
  const messageId = event.currentTarget.closest('.chat-message').dataset.messageId;
  _resolveAndLockMessage(messageId, { canceled: false, pushed: false });
}

export function onSkillTestPipelinePush(event) {
  event.preventDefault();
  const messageId = event.currentTarget.closest('.chat-message').dataset.messageId;
  _resolveAndLockMessage(messageId, { canceled: false, pushed: true });
}

export function onSkillTestPipelineDelete(message) {
  const pending = game.wrathofdavokar.pendingSkillTestPipelineRolls.get(message.id);
  if (!pending) return;
  game.wrathofdavokar.pendingSkillTestPipelineRolls.delete(message.id);
  pending.resolve({ canceled: true, pushed: false });
}

function _resolveAndLockMessage(messageId, decision) {
  const pending = game.wrathofdavokar.pendingSkillTestPipelineRolls.get(messageId);
  if (!pending) return;

  game.messages.get(messageId)?.setFlag('wrath-of-davokar', 'pendingRollPipeline', false);
  game.wrathofdavokar.pendingSkillTestPipelineRolls.delete(messageId);
  pending.resolve(decision);
}

/**
 * Suspends the pipeline until the player clicks Keep or Push on the chat card,
 * or the message is deleted (cancel).
 *
 * @param {TestContext} context - The active pipeline context.
 * @param {string} messageId - The Foundry chat message ID to wait on.
 * @returns {Promise<{canceled: boolean, pushed: boolean}>}
 */
async function suspendForPlayerDecision(context, messageId) {
  return new Promise((resolve) => {
    game.wrathofdavokar.pendingSkillTestPipelineRolls.set(messageId, { resolve, context });
  });
}

function buildPoolOptions(defaultAttr, defaultSkill, optionsAttr, optionsSkill, poolOverrides) {
  const attributes = [{value:defaultAttr, source:"Default"},  ...optionsAttr];
  const skills     = [{value:defaultSkill, source:"Default"}, ...optionsSkill];

  const matrix = [];
  for (const attribute of attributes) {
    for (const skill of skills) {
      // Only label sources that aren't the default to keep the label clean
      const sources = [attribute.source, skill.source]
        .filter(s => s !== "Default")
        .join(", ");

      matrix.push({
        attribute: attribute.value,
        skill:     skill.value,
        source:    sources || "Default",
      });
    }
  }

  // Append fully-specified overrides
  matrix.push(...poolOverrides);

  // Deduplicate by attribute+skill pair
  const seen = new Set();
  return matrix.filter(({ attribute, skill }) => {
    const key = `${attribute}+${skill}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function promptPoolSelection(poolOptions, actor) {
  // If only one option, return it immediately without prompting
  if (poolOptions.length === 1) return poolOptions[0];

  return new Promise((resolve) => {
    const buttons = {};

    for (const [index, option] of poolOptions.entries()) {
      const attrValue  = actor.system.attributes[option.attribute].total ?? 0;
      const skillValue = actor.system.skills[option.skill].total ?? 0;
      const total      = attrValue + skillValue;

      buttons[index] = {
        label: `${localizeAttribute(option.attribute)} + ${localizeSkill(option.skill)} (${total}D) — ${option.source}`,
        callback: () => resolve(option)
      };
    }

    new Dialog({
      title: "Select Dice Pool",
      content: "<p>Multiple options are available for this roll.</p>",
      buttons,
      close: () => resolve(null)  // default to null on close
    }).render(true);
  });
}

async function _generateChatMessage(context) {

  let message = await context.test.roll.toMessage({
    flags: {'wrath-of-davokar': {'pendingRollPipeline': true}}
  }, {create: true });

  // If the roll cannot be pushed, display message and return
  if (context.roll.maxPush === 0) return true;

  // Suspend and await response from user
  let decision = await suspendForPlayerDecision(context, message.id);
  if (decision.canceled) return false;

  // Push the roll if player selected to push and more pushes are allowed
  while (decision.pushed && context.test.roll.maxPush > context.test.roll.pushCount) {
    console.log('Push Loop: Push Button Presses');

    // HOOK: PRE_PUSH
    if (context.test.evaluating) {
      await callHook(context, context.test.actor, HOOKS.PRE_PUSH);
      await callHook(context, context.test.contest.actor, HOOKS.PRE_PUSH);
    } else {
      await callHook(context, context.test.contest.actor, HOOKS.PRE_PUSH);
      await callHook(context, context.test.actor, HOOKS.PRE_PUSH);
    }

    // Execute push
    await context.test.roll.push({ async: true });

    // HOOK: POST_PUSH
    if (context.test.evaluating) {
      await callHook(context, context.test.actor, HOOKS.POST_PUSH);
      if (context.test.contest.isContested) await callHook(context, context.test.contest.actor, HOOKS.POST_PUSH);
    } else {
      await callHook(context, context.test.contest.actor, HOOKS.POST_PUSH);
      await callHook(context, context.test.actor, HOOKS.POST_PUSH);
    }

    // Break loop if roll cannot be further pushed
    if (context.test.roll.maxPush <= context.test.roll.pushCount) break;

    // Render new message and suspend again
    const oldMessage = game.messages.get(message.id);
    await oldMessage?.delete();
    message = await context.test.roll.toMessage({
      flags: { 'wrath-of-davokar': { pendingRollPipeline: true } }
    }, { create: true });
    decision = await suspendForPlayerDecision(context, message.id);

    if (decision.canceled) return false;
    if (!decision.pushed) break;
  }

  // Roll accepted or out of pushes. Delete message and replace with one without Push or Accepts
  message = game.messages.get(message.id);
  context.test.roll.options.keep = true;
  await message.update({ rolls: [context.test.roll.toJSON()] });

  context.test.messageId = message.id
  return true
}

function _buildDiceResults(roll) {
  const results = [];
  roll.terms.forEach((term, termIndex) => {
    if (!term.results) return;
    term.results.forEach((r, resultIndex) => {
      // Look up how many successes this face value represents for this die type
      const successCount = term.constructor.SUCCESS_TABLE
        ? (term.constructor.SUCCESS_TABLE[r.result] ?? 0)
        : (r.result >= 6 ? 1 : 0);

      results.push({
        termIndex,
        resultIndex,
        face:           r.result,
        successCount,           // how many successes this die face represents
        isSuccess:      successCount > 0,
        isFailure:      r.result === 1 && term.constructor.LOCKED_VALUES?.includes(1),
        isPushed:       !!r.pushed,
        isDiscarded:    !!r.discarded,
      });
    });
  });
  return results;
}

function _syncRollOverrides(roll, overrides) {
  for (const override of overrides) {
    const term = roll.terms[override.termIndex];
    if (!term?.results) continue;
    const result = term.results[override.resultIndex];
    if (!result) continue;

    // Mutate result properties — YZUR's getResultCSS reads these
    if (override.success !== undefined) result.success = override.success ? true : undefined;
    if (override.failure !== undefined) result.failure = override.failure ? true : undefined;
  }
}

function countSuccesses(overrides) {
  return overrides.reduce((total, override) => {
    if (override.isDiscarded) return total;
    return total + (override.successCount ?? 0);
  }, 0);
}

export async function runSkillTestPipeline(
  actor,
  name,
  defaultAttribute = null,
  defaultSkill=null,
  max_pushes = 1,
  target = null,
  default_target_attribute = null,
  default_target_skill=null,
  target_max_pushes=1,
  parentContext=null
) {

  // Setup Pipeline
  const context = createTestContext(actor, name, target, parentContext);
  context.test.attribute.defaultAttribute = defaultAttribute;
  context.test.skill.defaultSkill = defaultSkill;
  context.test.rollData.maxPush = max_pushes

  if (context.test.contest.isContested) {
    context.test.contest.attribute.defaultAttribute = default_target_attribute;
    context.test.contest.skill.defaultSkill = default_target_skill;
    context.test.contest.rollData.maxPush = target_max_pushes

  }

  // Evaluate aggressor or initiator roll
  context.test.evaluating = true;
  context.test.contest.evaluating = false;

  // HOOK: PRE_SKILL_TEST_REACT
  // Fires for all actors in scene
  // Handlers may set context.canceled to cancel the pipeline, or modify any data in the current context
  await callHook(context, null, HOOKS.PRE_SKILL_TEST_REACT, isReactionHook=true);
  if (context.canceled) return context;

  // HOOK: RESOLVE_DICE_POOL
  await callHook(context, context.actor, HOOKS.RESOLVE_DICE_POOL);
  if (context.test.contest.isContested) await callHook(context, context.test.contest.actor, HOOKS.RESOLVE_DICE_POOL);
  if (context.canceled) return context;

  // Generate Dice Pools
  const poolOptions = buildPoolOptions(context.test.attribute.defaultAttribute, context.test.skill.defaultSkill,
    context.test.attribute.options, context.test.skill.options, context.test.poolOverrides);
  const selectedPool = await promptPoolSelection(poolOptions, context.actor);

  // Abort pipeline if user canceled the prompt
  if (!selectedPool) {
    context.canceled = true;
    return context;
  }

  context.test.dice = [
    {
      term: 's',  // All WoD dice use skill dice — all dice are pushable
      number: context.actor.system.attributes[selectedPool.attribute].total ?? 0,
      flavor: localizeAttribute(selectedPool.attribute)
    },
    {
      term: 's',  // All WoD dice use skill dice — all dice are pushable
      number: context.actor.system.skills[selectedPool.skill].total ?? 0,
      flavor: localizeSkill(selectedPool.skill)
    }
  ];

  // HOOK: MODIFY_DICE_POOL
  await callHook(context, context.actor, HOOKS.MODIFY_DICE_POOL);
  if (context.test.contest.isContested) await callHook(context, context.test.contest.actor, HOOKS.MODIFY_DICE_POOL);
  if (context.canceled) return context;

  // HOOK: MODIFY_MAX_PUSHES
  await callHook(context, context.actor, HOOKS.MODIFY_MAX_PUSHES);
  if (context.test.contest.isContested) await callHook(context, context.test.contest.actor, HOOKS.MODIFY_MAX_PUSHES);
  if (context.canceled) return context;

  // HOOK: PRE_ROLL
  await callHook(context, context.actor, HOOKS.PRE_ROLL);
  if (context.test.contest.isContested) await callHook(context, context.test.contest.actor, HOOKS.PRE_ROLL);
  if (context.canceled) return context;

  // Roll the Dice
  context.test.roll = YearZeroRoll.forge(context.test.dice, context.test.rollData, {});
  await context.test.roll.evaluate();

  // HOOK: POST_ROLL
  await callHook(context, context.actor, HOOKS.POST_ROLL);
  if (context.test.contest.isContested) await callHook(context, context.test.contest.actor, HOOKS.POST_ROLL);
  if (context.canceled) return context;

  // Render Dice to Chat and suspend pipeline
  const pipelineAborted = _generateChatMessage(context)

  if (pipelineAborted) {
    context.canceled = true;
    return context;
  }

  // Populate the parsable dice results before firing PRE_COUNT_SUCCESSES
  context.test.rollResult = _buildDiceResults(context.test.roll);

  // HOOK: PRE_COUNT_SUCCESSES
  await callHook(context, context.actor, HOOKS.PRE_COUNT_SUCCESSES);
  if (context.test.contest.isContested) await callHook(context, context.test.contest.actor, HOOKS.PRE_COUNT_SUCCESSES);
  if (context.canceled) return context;

  // Apply overrides to roll results and update the message
  if (context.test.rollResult.length > 0) {
    _syncRollOverrides(context.test.roll, context.test.rollResult);

    // Re-render tooltip with updated classes and update the message
    const message = game.messages.get(context.test.currentMessageId);
    if (message) {
      await message.update({ rolls: [context.test.roll.toJSON()] });
    }
  }

  // Count successes with overrides applied
  context.test.successes = countSuccesses(context.test.rollResult);

  // HOOK: POST_COUNT_SUCCESSES
  await callHook(context, context.actor, HOOKS.POST_COUNT_SUCCESSES);
  if (context.test.contest.isContested) await callHook(context, context.test.contest.actor, HOOKS.POST_COUNT_SUCCESSES);
  if (context.canceled) return context;

  // ---------------------------------------------------
  // BEGIN CONTESTED TEST
  // ---------------------------------------------------
  if (context.test.contest.isContested) {
    // CONTESTED ROLL PIPELINE CALL if CONTESTED
    context.test.evaluating = false;
    context.test.contest.evaluating = true;

    // HOOK: RESOLVE_DICE_POOL
    await callHook(context, context.test.contest.actor, HOOKS.RESOLVE_DICE_POOL);
    await callHook(context, context.actor, HOOKS.RESOLVE_DICE_POOL);
    if (context.canceled) return context;

    // Generate Dice Pools
    const poolOptions = buildPoolOptions(context.test.contest.attribute.defaultAttribute,
      context.test.contest.skill.defaultSkill, context.test.contest.attribute.options,
      context.test.contest.skill.options, context.test.contest.poolOverrides);
    const selectedPool = await promptPoolSelection(poolOptions, context.test.contest.actor);

    // Abort pipeline if user canceled the prompt
    if (!selectedPool) {
      context.canceled = true;
      return context;
    }

    context.test.contest.dice = [
      {
        term: 's',  // All WoD dice use skill dice — all dice are pushable
        number: context.test.contest.actor.system.attributes[selectedPool.attribute].total ?? 0,
        flavor: localizeAttribute(selectedPool.attribute)
      },
      {
        term: 's',  // All WoD dice use skill dice — all dice are pushable
        number: context.test.contest.actor.system.skills[selectedPool.skill].total ?? 0,
        flavor: localizeSkill(selectedPool.skill)
      }
    ];

    // HOOK: MODIFY_DICE_POOL
    await callHook(context, context.test.contest.actor, HOOKS.MODIFY_DICE_POOL);
    await callHook(context, context.actor, HOOKS.MODIFY_DICE_POOL);
    if (context.canceled) return context;

    // HOOK: MODIFY_MAX_PUSHES
    await callHook(context, context.test.contest.actor, HOOKS.MODIFY_MAX_PUSHES);
    await callHook(context, context.actor, HOOKS.MODIFY_MAX_PUSHES);
    if (context.canceled) return context;

    // HOOK: PRE_ROLL
    await callHook(context, context.test.contest.actor, HOOKS.PRE_ROLL);
    await callHook(context, context.actor, HOOKS.PRE_ROLL);
    if (context.canceled) return context;

    // Roll the Dice
    context.test.contest.roll = YearZeroRoll.forge(context.test.contest.dice, context.test.contest.rollData, {});
    await context.test.context.roll.evaluate();

    // HOOK: POST_ROLL
    await callHook(context, context.test.contest.actor, HOOKS.POST_ROLL);
    await callHook(context, context.actor, HOOKS.POST_ROLL);
    if (context.canceled) return context;

    // Render Dice to Chat and suspend pipeline
    const pipelineAborted = _generateChatMessage(context)

    if (pipelineAborted) {
      context.canceled = true;
      return context;
    }

    // Populate the parsable dice results before firing PRE_COUNT_SUCCESSES
    context.test.rollResult = _buildDiceResults(context.test.contest.roll);

    // HOOK: PRE_COUNT_SUCCESSES
    await callHook(context, context.test.contest.actor, HOOKS.PRE_COUNT_SUCCESSES);
    await callHook(context, context.actor, HOOKS.PRE_COUNT_SUCCESSES);
    if (context.canceled) return context;

    // Apply overrides to roll results and update the message
    if (context.test.contest.rollResult.length > 0) {
      _syncRollOverrides(context.test.contest.roll, context.test.contest.rollResult);

      // Re-render tooltip with updated classes and update the message
      const message = game.messages.get(context.test.contest.currentMessageId);
      if (message) {
        await message.update({ rolls: [context.test.contest.roll.toJSON()] });
      }
    }

    // Count successes with overrides applied
    context.test.contest.successes = countSuccesses(context.test.contest.rollResult);

    // HOOK: POST_COUNT_SUCCESSES
    await callHook(context, context.test.contest.actor, HOOKS.POST_COUNT_SUCCESSES);
    await callHook(context, context.actor, HOOKS.POST_COUNT_SUCCESSES);
    if (context.canceled) return context;

    // HOOK: PRE_NET_SUCCESSES
    await callHook(context, context.test.contest.actor, HOOKS.PRE_NET_SUCCESSES);
    await callHook(context, context.actor, HOOKS.PRE_NET_SUCCESSES);
    if (context.canceled) return context;

    // Set netSuccesses
    context.test.contest.newSuccesses = context.test.successes - context.test.contest.successes;

    // HOOK: POST_NET_SUCCESSES
    await callHook(context, context.test.contest.actor, HOOKS.POST_NET_SUCCESSES);
    await callHook(context, context.actor, HOOKS.POST_NET_SUCCESSES);
    if (context.canceled) return context;

  }
  // ---------------------------------------------------
  // END CONTESTED TESTS
  // ---------------------------------------------------

  // HOOK: POST_SKILL_TEST_REACT
  // Fires for all actors in scene
  await callHook(context, null, HOOKS.POST_SKILL_TEST_REACT, isReactionHook=true);
  return context;
}