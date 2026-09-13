'use client';

import { sendWorldCommand } from '../../lib/world/bridge';
import type { WorldCommand, WorldCommandResult, WorldLayer, ScaleTier } from '../../lib/world/commands';

export type LiveNavigationPlan = Readonly<{
  commands: WorldCommand[];
  acknowledgement: string;
  context: string;
}>;

export type LiveNavigationExecution = Readonly<{
  ok: boolean;
  reason?: string;
  commandsAccepted: number;
}>;

type NavigationSender = (command: WorldCommand) => Promise<WorldCommandResult>;
type DispatchListener = (command: WorldCommand, index: number) => void;

const EXPLANATION_PATTERN = /\b(?:what|why|how|when|who|history|historical|population|weather|temperature|news|happened|founded|built|old|many|cause|causes|caused|causal|reason|effect|impact|explain|describe|research|investigate|summarize|rephrase|compare|comparison|contrast|difference|similar|tell me about)\b/;
const NAVIGATION_PATTERN = /\b(?:show|take|fly|go|visit|navigate|bring|move|zoom|drop|descend|look|view|focus|highlight|find|locate|where)\b/;
const LAYER_ACTION_PATTERN = /\b(?:show|view|focus|highlight|display|turn on|reveal|see|look at|hide|turn off|disable|remove)\b/;
const TRACKING_ACTION_PATTERN = /\b(?:follow|track|trace|monitor)\b/;
const NAMED_TRACKING_OBJECT_PATTERN = /\b(?:[a-z]{2,3}\s?-?\d{2,4}|(?:sentinel|landsat|starlink|cosmos|noaa|goes)[ -]?\d+[a-z]?)\b/;

function normalized(question: string): string {
  return question.toLowerCase().replace(/[’']s\b/g, '').replace(/[’']/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}

function requestedTarget(text: string): { id: 'singapore' | 'new-york' | 'challenger-deep' | 'palm-jumeirah' | 'makkah'; label: string } | null {
  if (/\b(?:challenger deep|mariana trench|deepest (?:known )?(?:trench|point|place))\b/.test(text)) {
    return { id: 'challenger-deep', label: 'Challenger Deep' };
  }
  if (/\b(?:new york|nyc)\b/.test(text)) return { id: 'new-york', label: 'New York' };
  if (/\bsingapore\b/.test(text)) return { id: 'singapore', label: 'Singapore' };
  if (/\b(?:palm jumeirah|the palm)\b/.test(text)) return { id: 'palm-jumeirah', label: 'Palm Jumeirah' };
  if (/\b(?:makkah|mecca|masjid al haram|kaaba)\b/.test(text)) return { id: 'makkah', label: 'Makkah' };
  return null;
}

/** Exact supported place mention for starting a journey while a fuller answer is prepared. */
export function catalogueTargetIdInQuestion(question: string): 'singapore' | 'new-york' | 'challenger-deep' | 'palm-jumeirah' | 'makkah' | null {
  const text = normalized(question);
  if (/\b(?:challenger deep|mariana trench)\b/.test(text)) return 'challenger-deep';
  if (/\b(?:new york|nyc)\b/.test(text)) return 'new-york';
  if (/\bsingapore\b/.test(text)) return 'singapore';
  if (/\b(?:palm jumeirah|the palm)\b/.test(text)) return 'palm-jumeirah';
  if (/\b(?:makkah|mecca|masjid al haram|kaaba)\b/.test(text)) return 'makkah';
  return null;
}

function requestedLayer(text: string): WorldLayer | null {
  if (/\b(?:satellites?|orbital objects?)\b/.test(text)) return 'satellites';
  if (/\b(?:aircraft|airplanes?|aeroplanes?|planes?|flights?)\b/.test(text)) return 'aircraft';
  if (/\b(?:ships?|vessels?)\b/.test(text)) return 'ships';
  if (/\b(?:urban|traffic|city activity|street activity)\b/.test(text)) return 'urban';
  return null;
}

function requestedScale(text: string): ScaleTier | null {
  if (/\b(?:street|street level|ground level)\b/.test(text)) return 'street';
  if (/\bcity(?: level| scale| view)?\b/.test(text)) return 'city';
  if (/\bregion(?:al| level| scale| view)?\b/.test(text)) return 'region';
  if (/\b(?:planet|planetary|globe|global|orbit|zoom out|take me out)\b/.test(text)) return 'planet';
  return null;
}

function layerContext(layer: WorldLayer, hasPlaceLanguage: boolean): string {
  const descriptions: Record<WorldLayer, string> = {
    satellites: 'The orbital layer shows objects moving around Earth.',
    aircraft: 'The aircraft layer shows air movements across Earth.',
    ships: 'The shipping layer shows movements across the oceans.',
    urban: 'The city layer reveals activity along the streets.',
  };
  const limitation = hasPlaceLanguage && layer !== 'urban'
    ? ' Showing the global layer.'
    : '';
  return descriptions[layer] + limitation + ' Movement is illustrative, not live tracking.';
}

/** Resolve only bounded visual intents. Complex or factual questions stay on the Agents answer path. */
export function planLiveNavigation(question: string): LiveNavigationPlan | null {
  const text = normalized(question);
  if (!text) return null;

  // Answers, comparisons and particular-object tracking need the model/backend.
  // A visual phrase inside such a request is supporting context, not a complete plan.
  if (EXPLANATION_PATTERN.test(text) || TRACKING_ACTION_PATTERN.test(text) || NAMED_TRACKING_OBJECT_PATTERN.test(text)) return null;

  if (/^(?:back|reset|reset view|go back|start over|take me out|zoom out)$/.test(text)) {
    return { commands: [{ type: 'resetView' }], acknowledgement: 'Back to Earth.', context: 'The view returns to the planet scale.' };
  }

  const target = requestedTarget(text);
  const layer = requestedLayer(text);
  const scale = requestedScale(text);
  const navigates = NAVIGATION_PATTERN.test(text);
  const layerAction = layer !== null && LAYER_ACTION_PATTERN.test(text);

  // A place name inside a historical or factual question is context for the backend,
  // not permission to move the renderer.
  if (!navigates && !layerAction) return null;

  if (layer && layerAction) {
    const enabled = !/\b(?:hide|turn off|disable|remove)\b/.test(text);
    const hasPlaceLanguage = /\b(?:over|above|near|around)\s+[a-z0-9]|\bin\s+(?!orbit\b|space\b|the (?:sky|atmosphere)\b)[a-z0-9]/.test(text);
    if (layer !== 'urban') {
      return {
        commands: enabled
          ? [{ type: 'setScale', tier: 'planet' }, { type: 'focusLayer', layer, enabled: true }]
          : [{ type: 'focusLayer', layer, enabled: false }],
        acknowledgement: enabled ? (layer === 'aircraft' ? 'Showing the flight layer.' : `Showing ${layer}.`) : `Hiding ${layer}.`,
        context: layerContext(layer, hasPlaceLanguage),
      };
    }
    if (!target) return null;
  }

  if (target) {
    const commands: WorldCommand[] = [{ type: 'flyTo', targetId: target.id }];
    if (scale && !(target.id === 'challenger-deep' && (scale === 'city' || scale === 'street'))) commands.push({ type: 'setScale', tier: scale });
    const wantsVibe = /\b(?:vibe|activity|traffic|urban)\b/.test(text);
    const disablesLayer = /\b(?:hide|turn off|disable|remove)\b/.test(text);
    if ((layer === 'urban' || wantsVibe) && target.id !== 'challenger-deep') commands.push({ type: 'focusLayer', layer: 'urban', enabled: !disablesLayer });
    const context = target.id === 'challenger-deep'
      ? 'Challenger Deep is the deepest known point in the ocean; its relief is exaggerated here so the depth can be seen.'
      : target.id === 'new-york'
        ? 'New York gathers around a tidal harbour where islands, rivers and streets meet.'
        : target.id === 'palm-jumeirah' ? 'The mapped trunk, fronds and crescent emerge from the Dubai coast. Road activity is illustrative.'
        : target.id === 'makkah' ? 'Soft interpretive collective flow circles the mapped Kaaba anchor counter-clockwise. This is not live crowd tracking.'
        : 'Singapore meets the Singapore Strait. Street activity here is illustrative.';
    return { commands, acknowledgement: target.id === 'challenger-deep' ? 'Challenger Deep.' : `${target.label}. Let’s go.`, context };
  }

  const strictScaleIntent = /^(?:show|view|zoom|move|go|take me|pull)(?: me)?(?: to| into| out to)? (?:the )?(?:planet|planetary|globe|global|orbit|region|regional|city|street)(?: level| scale| view)?$/.test(text);
  if (scale && navigates && strictScaleIntent) {
    return { commands: [{ type: 'setScale', tier: scale }], acknowledgement: scale === 'planet' ? 'Pulling back.' : `Moving to ${scale} scale.`, context: 'The current target is retained when that scale is supported.' };
  }

  return null;
}

/** Dispatch in order and report renderer acceptance; cancellation prevents later commands. */
export async function executeLiveNavigation(
  plan: LiveNavigationPlan,
  options: { signal: AbortSignal; send?: NavigationSender; onDispatch?: DispatchListener },
): Promise<LiveNavigationExecution> {
  const sender = options.send ?? sendWorldCommand;
  let commandsAccepted = 0;
  for (let index = 0; index < plan.commands.length; index += 1) {
    if (options.signal.aborted) return { ok: false, reason: 'Navigation was cancelled.', commandsAccepted };
    const command = plan.commands[index];
    options.onDispatch?.(command, index);
    let result: WorldCommandResult;
    try {
      result = await sender(command);
    } catch (error) {
      return { ok: false, reason: error instanceof Error ? error.message : 'The visual command failed.', commandsAccepted };
    }
    if (!result.ok) return { ok: false, reason: result.reason ?? 'The world rejected that visual command.', commandsAccepted };
    commandsAccepted += 1;
    if (options.signal.aborted) return { ok: false, reason: 'Navigation was cancelled.', commandsAccepted };
  }
  return { ok: true, commandsAccepted };
}
