// MIT License — Copyright (c) 2026 HarryDau @ AIStarLabs
"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  Power,
  PlugZap,
  Save,
} from "lucide-react";
import { api, formatDate, formatNumber } from "@/lib/api-client";
import { PageHeader } from "@/components/dashboard/page-header";
import { useConfirm } from "@/components/dashboard/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Provider {
  id: string;
  name: string;
  type: string;
  baseUrl: string;
  authType: string;
  enabled: boolean;
  apiKeys: ProviderKey[];
  models: ProviderModel[];
  _count: { usageLogs: number };
}

interface ProviderKey {
  id: string;
  name: string;
  organization: string | null;
  priority: number;
  enabled: boolean;
}

interface ProviderModel {
  id: string;
  modelId: string;
  displayName: string | null;
  enabled: boolean;
  supportsVision: boolean;
  supportsImage: boolean;
  supportsReasoning: boolean;
  supportsVietnamese: boolean;
  bestTaskTags: string[];
  _count?: { permissions: number };
}

interface LogRow {
  id: string;
  model: string | null;
  endpoint: string | null;
  status: string;
  requestTokens: number;
  responseTokens: number;
  cost: number;
  latency: number;
  createdAt: string;
  error: string | null;
}

export default function ProviderDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [provider, setProvider] = useState<Provider | null>(null);
  const [models, setModels] = useState<ProviderModel[]>([]);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [keyOpen, setKeyOpen] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [keyValue, setKeyValue] = useState("");
  const [keyPriority, setKeyPriority] = useState("0");
  const [testing, setTesting] = useState(false);
  const [modelOpen, setModelOpen] = useState(false);
  const [modelId, setModelId] = useState("");
  const [modelDisplayName, setModelDisplayName] = useState("");
  const [modelMaxContext, setModelMaxContext] = useState("");
  const [modelVision, setModelVision] = useState(false);
  const [modelImage, setModelImage] = useState(false);
  const [modelReasoning, setModelReasoning] = useState(false);
  const [modelVietnamese, setModelVietnamese] = useState(false);
  const [modelTags, setModelTags] = useState("");
  const [savingModel, setSavingModel] = useState(false);
  const { confirm, dialog } = useConfirm();

  const load = useCallback(async () => {
    const [p, m, l] = await Promise.all([
      api<{ provider: Provider }>(`/api/admin/providers/${id}`),
      api<{ models: ProviderModel[] }>(`/api/admin/providers/${id}/models`),
      api<{ logs: LogRow[] }>(`/api/admin/logs?providerId=${id}&limit=50`),
    ]);
    setProvider(p.provider);
    setModels(m.models);
    setLogs(l.logs);
  }, [id]);

  useEffect(() => {
    load().catch((e) => toast.error((e as Error).message));
  }, [load]);

  async function saveGeneral(e: React.FormEvent) {
    e.preventDefault();
    if (!provider) return;
    setSaving(true);
    try {
      await api(`/api/admin/providers/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: provider.name,
          baseUrl: provider.baseUrl,
          enabled: provider.enabled,
        }),
      });
      toast.success("Saved");
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function createKey(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api(`/api/admin/providers/${id}/keys`, {
        method: "POST",
        body: JSON.stringify({
          name: keyName,
          apiKey: keyValue,
          priority: Number(keyPriority),
        }),
      });
      toast.success("API key added");
      setKeyOpen(false);
      setKeyName("");
      setKeyValue("");
      setKeyPriority("0");
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function toggleKey(keyId: string, enabled: boolean) {
    try {
      await api(`/api/admin/providers/${id}/keys/${keyId}`, {
        method: "PATCH",
        body: JSON.stringify({ enabled: !enabled }),
      });
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  function deleteKey(keyId: string) {
    confirm(
      { title: "Delete API key", description: "Remove this provider credential?", confirmLabel: "Delete" },
      async () => {
        await api(`/api/admin/providers/${id}/keys/${keyId}`, { method: "DELETE" });
        toast.success("API key deleted");
        await load();
      }
    );
  }

  async function toggleModel(modelId: string, enabled: boolean) {
    try {
      await api(`/api/admin/models/${modelId}`, {
        method: "PATCH",
        body: JSON.stringify({ enabled: !enabled }),
      });
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  function deleteModel(m: ProviderModel) {
    confirm(
      {
        title: "Delete model",
        description: `Delete "${m.modelId}" from this provider? Any API key grants on it will be removed.`,
        confirmLabel: "Delete",
      },
      async () => {
        await api(`/api/admin/models/${m.id}`, { method: "DELETE" });
        toast.success("Model deleted");
        await load();
      }
    );
  }

  async function seedModels() {
    try {
      const res = await api<{ count: number }>(`/api/admin/providers/${id}/models`, {
        method: "POST",
      });
      toast.success(`Seeded ${res.count} preset models`);
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function addModel(e: React.FormEvent) {
    e.preventDefault();
    setSavingModel(true);
    try {
      await api("/api/admin/models", {
        method: "POST",
        body: JSON.stringify({
          providerId: id,
          modelId: modelId.trim(),
          displayName: modelDisplayName || undefined,
          maxContext: modelMaxContext ? Number(modelMaxContext) : null,
          supportsVision: modelVision,
          supportsImage: modelImage,
          supportsReasoning: modelReasoning,
          supportsVietnamese: modelVietnamese,
          bestTaskTags: modelTags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
        }),
      });
      toast.success("Model added");
      setModelOpen(false);
      setModelId("");
      setModelDisplayName("");
      setModelMaxContext("");
      setModelVision(false);
      setModelImage(false);
      setModelReasoning(false);
      setModelVietnamese(false);
      setModelTags("");
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSavingModel(false);
    }
  }

  async function testConnection(keyId?: string) {
    setTesting(true);
    try {
      // With a key id: test that specific key. Without: test the first enabled key
      // via the collection PATCH endpoint.
      const path = keyId
        ? `/api/admin/providers/${id}/keys/${keyId}/test`
        : `/api/admin/providers/${id}/keys`;
      const res = await api<{ health: { ok: boolean; latency?: number; message?: string; models?: unknown[] } }>(path, {
        method: keyId ? "POST" : "PATCH",
      });
      if (res.health.ok) {
        toast.success(`Connection OK (${res.health.latency ?? 0}ms, ${(res.health.models ?? []).length} models)`);
      } else {
        toast.error(res.health.message ?? "Connection failed");
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setTesting(false);
    }
  }

  if (!provider) {
    return <PageHeader title="Provider" description="Loading…" />;
  }

  return (
    <>
      <PageHeader
        title={provider.name}
        description={`${provider.type} · ${provider.baseUrl}`}
        actions={
          <Button variant="outline" onClick={() => testConnection()} disabled={testing}>
            <PlugZap className="mr-2 h-4 w-4" />
            {testing ? "Testing…" : "Test Connection"}
          </Button>
        }
      />

      <Tabs defaultValue="general" className="mt-2">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="keys">API Keys</TabsTrigger>
          <TabsTrigger value="models">Models</TabsTrigger>
          <TabsTrigger value="stats">Statistics</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-4">
          <Card className="max-w-xl">
            <CardHeader>
              <CardTitle>General</CardTitle>
              <CardDescription>Provider connection settings</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={saveGeneral} className="space-y-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    value={provider.name}
                    onChange={(e) =>
                      setProvider({ ...provider, name: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Base URL</Label>
                  <Input
                    value={provider.baseUrl}
                    onChange={(e) =>
                      setProvider({ ...provider, baseUrl: e.target.value })
                    }
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={provider.enabled}
                    onCheckedChange={(v) => setProvider({ ...provider, enabled: v })}
                  />
                  <Label>Enabled</Label>
                </div>
                <Button type="submit" disabled={saving}>
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? "Saving…" : "Save"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="keys" className="mt-4">
          <div className="mb-3 flex justify-end">
            <Button onClick={() => setKeyOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add API Key
            </Button>
          </div>
          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Key</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Enabled</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {provider.apiKeys.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                      No API keys configured
                    </TableCell>
                  </TableRow>
                ) : (
                  provider.apiKeys.map((k) => (
                    <TableRow key={k.id}>
                      <TableCell className="font-medium">{k.name}</TableCell>
                      <TableCell className="font-mono text-xs">••••••••</TableCell>
                      <TableCell>{k.priority}</TableCell>
                      <TableCell>
                        <Switch
                          checked={k.enabled}
                          onCheckedChange={() => toggleKey(k.id, k.enabled)}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => testConnection(k.id)}
                            disabled={testing}
                          >
                            <PlugZap className="mr-1 h-3 w-3" />
                            Test
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleKey(k.id, k.enabled)}
                          >
                            <Power className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            onClick={() => deleteKey(k.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="models" className="mt-4">
          <div className="mb-3 flex gap-2">
            <Button variant="outline" onClick={() => seedModels()}>
              <Plus className="mr-2 h-4 w-4" />
              Seed Preset Models
            </Button>
            <Button onClick={() => setModelOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Model
            </Button>
          </div>
          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Model</TableHead>
                  <TableHead>Display Name</TableHead>
                  <TableHead>Capabilities</TableHead>
                  <TableHead>Enabled</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {models.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                      No models yet. Seed presets or add a model manually.
                    </TableCell>
                  </TableRow>
                ) : (
                  models.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-mono text-xs">{m.modelId}</TableCell>
                      <TableCell>{m.displayName ?? "—"}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {m.supportsVision ? <Badge variant="secondary">vision</Badge> : null}
                          {m.supportsImage ? <Badge variant="secondary">image</Badge> : null}
                          {m.supportsReasoning ? <Badge variant="secondary">reasoning</Badge> : null}
                          {m.supportsVietnamese ? <Badge variant="secondary">Vietnamese</Badge> : null}
                          {m.bestTaskTags.map((tag) => (
                            <Badge key={tag} variant="outline">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={m.enabled}
                          onCheckedChange={() => toggleModel(m.id, m.enabled)}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          onClick={() => deleteModel(m)}
                          title={`Delete ${m.modelId}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="stats" className="mt-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-muted-foreground">Requests</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatNumber(provider._count.usageLogs)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-muted-foreground">Models</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{models.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-muted-foreground">API Keys</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{provider.apiKeys.length}</div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="logs" className="mt-4">
          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tokens</TableHead>
                  <TableHead>Latency</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                      No requests logged yet
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="text-xs">{formatDate(l.createdAt)}</TableCell>
                      <TableCell className="font-mono text-xs">{l.model ?? "—"}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            l.status === "success"
                              ? "default"
                              : l.status === "rateLimited"
                                ? "secondary"
                                : "destructive"
                          }
                        >
                          {l.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {formatNumber(l.requestTokens + l.responseTokens)}
                      </TableCell>
                      <TableCell className="text-xs">{l.latency}ms</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={keyOpen} onOpenChange={setKeyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Provider API Key</DialogTitle>
          </DialogHeader>
          <form onSubmit={createKey} className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={keyName} onChange={(e) => setKeyName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>API Key</Label>
              <Input
                value={keyValue}
                onChange={(e) => setKeyValue(e.target.value)}
                type="password"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Input
                value={keyPriority}
                onChange={(e) => setKeyPriority(e.target.value)}
                type="number"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setKeyOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Add Key</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={modelOpen} onOpenChange={setModelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Model</DialogTitle>
          </DialogHeader>
          <form onSubmit={addModel} className="space-y-4">
            <div className="space-y-2">
              <Label>Model ID</Label>
              <Input
                value={modelId}
                onChange={(e) => setModelId(e.target.value)}
                placeholder="gpt-4o-mini"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Display name</Label>
              <Input
                value={modelDisplayName}
                onChange={(e) => setModelDisplayName(e.target.value)}
                placeholder="GPT-4o Mini"
              />
            </div>
            <div className="space-y-2">
              <Label>Max context (tokens)</Label>
              <Input
                value={modelMaxContext}
                onChange={(e) => setModelMaxContext(e.target.value)}
                type="number"
                placeholder="Optional"
              />
            </div>
            <div className="space-y-2">
              <Label>Capabilities</Label>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={modelVision}
                    onCheckedChange={(v) => setModelVision(Boolean(v))}
                  />
                  Vision
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={modelImage}
                    onCheckedChange={(v) => setModelImage(Boolean(v))}
                  />
                  Image generation
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={modelReasoning}
                    onCheckedChange={(v) => setModelReasoning(Boolean(v))}
                  />
                  Reasoning
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={modelVietnamese}
                    onCheckedChange={(v) => setModelVietnamese(Boolean(v))}
                  />
                  Vietnamese
                </label>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Best task tags (comma-separated)</Label>
              <Input
                value={modelTags}
                onChange={(e) => setModelTags(e.target.value)}
                placeholder="code, natural language, agentic"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModelOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={savingModel}>
                {savingModel ? "Adding…" : "Add Model"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {dialog}
    </>
  );
}
