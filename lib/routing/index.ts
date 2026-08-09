// MIT License — Copyright (c) 2026 HarryDau @ AIStarLabs
import { randomInt } from "crypto";
import type { RoutingStrategy } from "@prisma/client";

export interface MappingCandidate {
  providerModelId: string;
  priority: number;
  weight: number;
  providerId: string;
  providerName: string;
  providerType: string;
  modelId: string;
}

const roundRobin = new Map<string, number>();

function nextRoundRobin(key: string): number {
  const current = roundRobin.get(key) ?? 0;
  roundRobin.set(key, current + 1);
  return current;
}

function weightedPick(items: MappingCandidate[]): MappingCandidate {
  const total = items.reduce((s, i) => s + Math.max(1, i.weight), 0);
  let roll = randomInt(total);
  for (const item of items) {
    roll -= Math.max(1, item.weight);
    if (roll < 0) return item;
  }
  return items[items.length - 1];
}

/**
 * Produces the ordered list of candidate provider-models for a given strategy.
 * For single-select strategies (fixed/random/roundRobin/weighted) it returns one
 * entry; the gateway adds provider-key fallbacks around it. For
 * priorityFailover it returns all entries sorted by priority.
 */
export function buildCandidateOrder(
  strategy: RoutingStrategy,
  mappings: MappingCandidate[],
  rrKey?: string
): MappingCandidate[] {
  const active = mappings.slice();
  if (active.length === 0) return [];

  switch (strategy) {
    case "fixed":
      return [active[0]];
    case "random":
      return [active[randomInt(active.length)]];
    case "roundRobin": {
      const idx = nextRoundRobin(rrKey ?? "default");
      return [active[idx % active.length]];
    }
    case "weighted":
      return [weightedPick(active)];
    case "priorityFailover":
      return [...active].sort(
        (a, b) => a.priority - b.priority || b.weight - a.weight
      );
    default:
      return [active[0]];
  }
}

export function formatRoutingStrategy(strategy: RoutingStrategy): string {
  switch (strategy) {
    case "fixed":
      return "Fixed";
    case "random":
      return "Random";
    case "roundRobin":
      return "Round Robin";
    case "weighted":
      return "Weighted Random";
    case "priorityFailover":
      return "Priority Failover";
    default:
      return strategy;
  }
}
