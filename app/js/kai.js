// @ts-check
/**
 * Pure helpers for brushing after KAI (Kauflächen, Außenflächen, Innenflächen).
 * @module kai
 */
import { BRUSH_PLANS, SURFACES, JAWS } from './config.js';

/** @typedef {{surface: 'kau'|'aussen'|'innen', jaw: 'unten'|'oben'|'beide'}} Step */

/**
 * Steps of a brushing plan (unknown ids fall back to the first plan).
 * @param {string} planId Plan id.
 * @returns {Step[]}
 */
export function planSteps(planId) {
  const plan = BRUSH_PLANS.find((p) => p.id === planId) || BRUSH_PLANS[0];
  return /** @type {Step[]} */ (plan.steps);
}

/**
 * German label of a step, e.g. "Kauflächen unten" or "Außenflächen unten und oben".
 * @param {Step} step Step.
 * @returns {string}
 */
export function stepLabel(step) {
  return `${SURFACES[step.surface].name} ${JAWS[step.jaw]}`;
}

/**
 * Jaw being brushed right now: for "beide" the lower jaw in the first half, then the upper jaw.
 * @param {Step} step Step.
 * @param {number} progress Progress inside the step (0…1).
 * @returns {'unten'|'oben'}
 */
export function jawAt(step, progress) {
  if (step.jaw !== 'beide') return step.jaw;
  return progress < 0.5 ? 'unten' : 'oben';
}

/**
 * How much of one step's work on a jaw is done.
 * @param {Step} step Step.
 * @param {'unten'|'oben'} jaw Jaw.
 * @param {number} progress Progress inside the step (0…1).
 * @returns {number} 0…1 (0 if the step does not touch this jaw).
 */
function stepShare(step, jaw, progress) {
  if (step.jaw === jaw) return progress;
  if (step.jaw !== 'beide') return 0;
  return jaw === 'unten' ? Math.min(1, progress * 2) : Math.max(0, progress * 2 - 1);
}

/**
 * How clean a jaw is so far (drives the disappearing sugar spots and sparkles).
 * @param {Step[]} steps Plan steps.
 * @param {number} index Current step.
 * @param {number} progress Progress inside the current step (0…1).
 * @param {'unten'|'oben'} jaw Jaw.
 * @returns {number} 0…1
 */
export function jawProgress(steps, index, progress, jaw) {
  const touching = steps.filter((s) => s.jaw === jaw || s.jaw === 'beide').length;
  if (touching === 0) return 0;
  let done = 0;
  steps.forEach((s, i) => {
    if (i < index) done += stepShare(s, jaw, 1);
    else if (i === index) done += stepShare(s, jaw, progress);
  });
  return Math.min(1, done / touching);
}
