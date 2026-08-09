// MIT License — Copyright (c) 2026 HarryDau @ AIStarLabs
import { prisma } from "@/lib/db";
import { decryptSecret } from "@/lib/crypto";
import { buildCandidateOrder, type MappingCandidate } from "@/lib/routing";
import type { RoutingStrategy } from "@prisma/client";

export class ModelNotFoundError extends Error {
  constructor(public model: string) {
    super(`The model '${model}' does not exist or you do not have access to it`);
    this.name = "ModelNotFoundError";
  }
}

export interface KeyPermissionForResolve {
  providerModelId: string;
  enabled: boolean;
  priority: number;
  weight: number;
  providerModel: {
    id: string;
    modelId: string;
    enabled: boolean;
    provider: {
      id: string;
      name: string;
      type: string;
      enabled: boolean;
      baseUrl: string;
      authType: string;
    };
  };
}

export interface ResolveApiKey {
  id: string;
  name: string;
  routingStrategy: RoutingStrategy;
  permissions: KeyPermissionForResolve[];
}

export interface ExecutionTarget {
  provider: {
    id: string;
    name: string;
    type: string;
    baseUrl: string;
    authType: string;
  };
  providerModel: { id: string; modelId: string; providerId: string };
  providerKeys: Array<{
    id: string;
    apiKey: string;
    organization: string | null;
    priority: number;
    enabled: boolean;
  }>;
}

export interface ResolveResult {
  targets: ExecutionTarget[];
  providerModelIds: string[];
}

function toCandidate(p: KeyPermissionForResolve): MappingCandidate {
  return {
    providerModelId: p.providerModelId,
    priority: p.priority,
    weight: p.weight,
    providerId: p.providerModel.provider.id,
    providerName: p.providerModel.provider.name,
    providerType: p.providerModel.provider.type,
    modelId: p.providerModel.modelId,
  };
}

function toCandidateFromProviderModel(pm: {
  id: string;
  modelId: string;
  providerId: string;
  provider: { id: string; name: string; type: string };
}): MappingCandidate {
  return {
    providerModelId: pm.id,
    priority: 0,
    weight: 1,
    providerId: pm.provider.id,
    providerName: pm.provider.name,
    providerType: pm.provider.type,
    modelId: pm.modelId,
  };
}

async function buildTargets(
  candidates: MappingCandidate[]
): Promise<ExecutionTarget[]> {
  const targets: ExecutionTarget[] = [];
  for (const c of candidates) {
    const provider = await prisma.provider.findUnique({
      where: { id: c.providerId },
      select: { id: true, name: true, type: true, baseUrl: true, authType: true },
    });
    const model = await prisma.providerModel.findUnique({
      where: { id: c.providerModelId },
      select: { id: true, modelId: true, providerId: true },
    });
    if (!provider || !model) continue;
    const keys = await prisma.providerAPIKey.findMany({
      where: { providerId: provider.id },
      orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
    });
    targets.push({
      provider,
      providerModel: model,
      providerKeys: keys
        .filter((k) => k.enabled)
        .map((k) => ({
          id: k.id,
          apiKey: (() => {
            try {
              return decryptSecret(k.apiKey);
            } catch {
              return "";
            }
          })(),
          organization: k.organization,
          priority: k.priority,
          enabled: k.enabled,
        })),
    });
  }
  return targets;
}

/**
 * Resolves a client model request to concrete provider targets.
 *
 * - If `model` matches a provider model the key is permitted to use, it is
 *   routed directly to that provider model.
 * - If `model` equals the key's name (the key's virtual model), the key's
 *   routing strategy is applied across the key's permitted models.
 */
export async function resolveTargets(params: {
  model: string;
  apiKey: ResolveApiKey;
}): Promise<ResolveResult> {
  const { model, apiKey } = params;
  const hasExplicitPermissions = apiKey.permissions.length > 0;

  // 1. Direct provider model, permitted by the key
  const direct = apiKey.permissions.find(
    (p) => p.enabled && p.providerModel.modelId === model
  );
  if (direct) {
    if (!direct.providerModel.enabled || !direct.providerModel.provider.enabled) {
      throw new ModelNotFoundError(model);
    }
    const targets = await buildTargets([toCandidate(direct)]);
    if (targets.length === 0) throw new ModelNotFoundError(model);
    return { targets, providerModelIds: [direct.providerModelId] };
  }

  // Allow-all keys (no explicit permissions) may reference any enabled model.
  if (!hasExplicitPermissions) {
    const pm = await prisma.providerModel.findFirst({
      where: { modelId: model, enabled: true },
      include: { provider: true },
    });
    if (pm && pm.provider.enabled) {
      const targets = await buildTargets([toCandidateFromProviderModel(pm)]);
      if (targets.length === 0) throw new ModelNotFoundError(model);
      return { targets, providerModelIds: [pm.id] };
    }
  }

  // 2. Virtual model: the key itself routes across its permitted models.
  if (model === apiKey.name) {
    let candidates = apiKey.permissions
      .filter(
        (p) =>
          p.enabled &&
          p.providerModel.enabled &&
          p.providerModel.provider.enabled
      )
      .map(toCandidate);

    // Allow-all keys (no explicit grants) route across every enabled model.
    if (candidates.length === 0 && !hasExplicitPermissions) {
      const allModels = await prisma.providerModel.findMany({
        where: { enabled: true },
        include: { provider: true },
      });
      candidates = allModels
        .filter((pm) => pm.provider.enabled)
        .map(toCandidateFromProviderModel);
    }

    if (candidates.length === 0) throw new ModelNotFoundError(model);

    const ordered = buildCandidateOrder(apiKey.routingStrategy, candidates, apiKey.id);
    const targets = await buildTargets(ordered);
    if (targets.length === 0) throw new ModelNotFoundError(model);
    return {
      targets,
      providerModelIds: targets.map((t) => t.providerModel.id),
    };
  }

  throw new ModelNotFoundError(model);
}
