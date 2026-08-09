// MIT License — Copyright (c) 2026 HarryDau @ AIStarLabs
"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { RefreshCw, Save, Copy, Loader2 } from "lucide-react";
import { api, formatDate, formatNumber } from "@/lib/api-client";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const STRATEGIES = [
  { value: "fixed", label: "Fixed — always use the first model" },
  { value: "random", label: "Random" },
  { value: "roundRobin", label: "Round Robin" },
  { value: "weighted", label: "Weighted Random" },
  { value: "priorityFailover", label: "Priority Failover" },
];

interface Permission {
  id: string;
  providerModelId: string;
  enabled: boolean;
  priority: number;
  weight: number;
  rateLimitRPM: number | null;
  rateLimitTPM: number | null;
  providerModel: { modelId: string; provider: { name: string } };
}

interface KeyDetail {
  id: string;
  name: string;
  maskedKey: string;
  enabled: boolean;
  description: string | null;
  routingStrategy: string;
  rateLimitRPM: number | null;
  rateLimitTPM: number | null;
  dailyLimit: number | null;
  monthlyLimit: number | null;
  permissions: Permission[];
  _count: { usageLogs: number };
}

interface ModelOption {
  id: string;
  modelId: string;
  provider: { name: string };
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

export default function ApiKeyDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [key, setKey] = useState<KeyDetail | null>(null);
  const [models, setModels] = useState<ModelOption[]>([]);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [rpm, setRpm] = useState("");
  const [tpm, setTpm] = useState("");
  const [daily, setDaily] = useState("");
  const [monthly, setMonthly] = useState("");
  const [saving, setSaving] = useState(false);
  const [savingModelId, setSavingModelId] = useState<string | null>(null);
  const [newKey, setNewKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [k, m, l] = await Promise.all([
      api<{ key: KeyDetail }>(`/api/admin/keys/${id}`),
      api<{ models: ModelOption[] }>("/api/admin/models"),
      api<{ logs: LogRow[] }>(`/api/admin/logs?apiKeyId=${id}&limit=50`),
    ]);
    setKey(k.key);
    setModels(m.models);
    setLogs(l.logs);
    setRpm(k.key.rateLimitRPM?.toString() ?? "");
    setTpm(k.key.rateLimitTPM?.toString() ?? "");
    setDaily(k.key.dailyLimit?.toString() ?? "");
    setMonthly(k.key.monthlyLimit?.toString() ?? "");
  }, [id]);

  useEffect(() => {
    load().catch((e) => toast.error((e as Error).message));
  }, [load]);

  async function saveLimits(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api(`/api/admin/keys/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          rateLimitRPM: rpm ? Number(rpm) : null,
          rateLimitTPM: tpm ? Number(tpm) : null,
          dailyLimit: daily ? Number(daily) : null,
          monthlyLimit: monthly ? Number(monthly) : null,
        }),
      });
      toast.success("Rate limits saved");
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function updatePermission(
    modelId: string,
    patch: Partial<{
      enabled: boolean;
      priority: number;
      weight: number;
      rateLimitRPM: number | null;
      rateLimitTPM: number | null;
    }>
  ) {
    try {
      await api(`/api/admin/keys/${id}/permissions`, {
        method: "POST",
        body: JSON.stringify({ providerModelId: modelId, ...patch }),
      });
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  function updatePermissionLocal(
    modelId: string,
    patch: Partial<{
      priority: number;
      weight: number;
      rateLimitRPM: number | null;
      rateLimitTPM: number | null;
    }>
  ) {
    setKey((k) =>
      k
        ? {
            ...k,
            permissions: k.permissions.map((p) =>
              p.providerModelId === modelId ? { ...p, ...patch } : p
            ),
          }
        : k
    );
  }

  async function commitPermission(modelId: string) {
    if (!key) return;
    const perm = key.permissions.find((p) => p.providerModelId === modelId);
    if (!perm) return;
    setSavingModelId(modelId);
    try {
      await api(`/api/admin/keys/${id}/permissions`, {
        method: "POST",
        body: JSON.stringify({
          providerModelId: modelId,
          enabled: perm.enabled,
          priority: perm.priority,
          weight: perm.weight,
          rateLimitRPM: perm.rateLimitRPM,
          rateLimitTPM: perm.rateLimitTPM,
        }),
      });
      toast.success("Saved");
    } catch (e) {
      toast.error((e as Error).message);
      await load();
    } finally {
      setSavingModelId(null);
    }
  }

  async function rotate() {
    try {
      const res = await api<{ key: string }>(`/api/admin/keys/${id}/rotate`, {
        method: "POST",
      });
      setNewKey(res.key);
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  if (!key) {
    return <PageHeader title="API Key" description="Loading…" />;
  }

  return (
    <>
      <PageHeader
        title={key.name}
        description={key.description ?? "Inbound API key"}
        actions={
          <Button variant="outline" onClick={rotate}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Rotate Key
          </Button>
        }
      />

      <div className="mb-4 flex items-center gap-3">
        <Badge variant={key.enabled ? "default" : "secondary"}>
          {key.enabled ? "Active" : "Disabled"}
        </Badge>
        <span className="text-xs text-muted-foreground">
          {formatNumber(key._count.usageLogs)} requests
        </span>
      </div>

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="models">Allowed Models</TabsTrigger>
          <TabsTrigger value="limits">Rate Limits</TabsTrigger>
          <TabsTrigger value="usage">Usage</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-4">
          <Card className="max-w-lg">
            <CardHeader>
              <CardTitle>General</CardTitle>
              <CardDescription>Key identity</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={key.name}
                  onChange={(e) => {
                    setKey({ ...key, name: e.target.value });
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  value={key.description ?? ""}
                  onChange={(e) => setKey({ ...key, description: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Routing strategy</Label>
                <Select
                  value={key.routingStrategy}
                  onValueChange={(v) =>
                    setKey({ ...key, routingStrategy: v ?? key.routingStrategy })
                  }
                >
                  <SelectTrigger>
                    <SelectValue
                      getLabel={(v) => STRATEGIES.find((s) => s.value === v)?.label}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {STRATEGIES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  This key is a virtual model named <code className="font-mono">{key.name}</code>.
                  Clients route across the granted models below using this strategy.
                </p>
              </div>
              <div className="space-y-2">
                <Label>Enabled</Label>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={key.enabled}
                    onCheckedChange={async (v) => {
                      await api(`/api/admin/keys/${id}`, {
                        method: "PATCH",
                        body: JSON.stringify({ enabled: v }),
                      });
                      await load();
                    }}
                  />
                  <span className="text-sm text-muted-foreground">
                    {key.enabled ? "Accepting requests" : "Requests rejected"}
                  </span>
                </div>
              </div>
              <Button
                onClick={async () => {
                  await api(`/api/admin/keys/${id}`, {
                    method: "PATCH",
                    body: JSON.stringify({
                      name: key.name,
                      description: key.description ?? "",
                      routingStrategy: key.routingStrategy,
                    }),
                  });
                  toast.success("Saved");
                  await load();
                }}
              >
                <Save className="mr-2 h-4 w-4" />
                Save
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="models" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Models &amp; Routing</CardTitle>
              <CardDescription>
                Grant models to this key. Priority (lower = tried first) and weight (for
                weighted routing) define how the key&apos;s virtual model routes. Clients can
                also call any granted provider model directly. Leave empty to allow every
                enabled model.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Model</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Allowed</TableHead>
                    <TableHead className="w-20">Priority</TableHead>
                    <TableHead className="w-20">Weight</TableHead>
                    <TableHead className="w-20">RPM</TableHead>
                    <TableHead className="w-20">TPM</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {models.map((m) => {
                    const perm = key.permissions.find((p) => p.providerModelId === m.id);
                    return (
                      <TableRow key={m.id} className={savingModelId === m.id ? "opacity-60" : ""}>
                        <TableCell className="font-mono text-xs">
                          {m.modelId}
                          {savingModelId === m.id ? (
                            <span className="ml-2 inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              Saving
                            </span>
                          ) : null}
                        </TableCell>
                        <TableCell>{m.provider.name}</TableCell>
                        <TableCell>
                          <Switch
                            checked={Boolean(perm?.enabled)}
                            onCheckedChange={() =>
                              updatePermission(m.id, { enabled: !perm?.enabled })
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            className="h-8 w-16 text-xs"
                            value={perm?.priority ?? 0}
                            disabled={!perm}
                            onChange={(e) =>
                              updatePermissionLocal(m.id, {
                                priority: Number(e.target.value),
                              })
                            }
                            onBlur={() => commitPermission(m.id)}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={1}
                            className="h-8 w-16 text-xs"
                            value={perm?.weight ?? 1}
                            disabled={!perm}
                            onChange={(e) =>
                              updatePermissionLocal(m.id, { weight: Number(e.target.value) })
                            }
                            onBlur={() => commitPermission(m.id)}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            className="h-8 w-16 text-xs"
                            value={perm?.rateLimitRPM ?? ""}
                            placeholder="∞"
                            disabled={!perm}
                            onChange={(e) =>
                              updatePermissionLocal(m.id, {
                                rateLimitRPM: e.target.value ? Number(e.target.value) : null,
                              })
                            }
                            onBlur={() => commitPermission(m.id)}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            className="h-8 w-16 text-xs"
                            value={perm?.rateLimitTPM ?? ""}
                            placeholder="∞"
                            disabled={!perm}
                            onChange={(e) =>
                              updatePermissionLocal(m.id, {
                                rateLimitTPM: e.target.value ? Number(e.target.value) : null,
                              })
                            }
                            onBlur={() => commitPermission(m.id)}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="limits" className="mt-4">
          <Card className="max-w-xl">
            <CardHeader>
              <CardTitle>Rate Limits</CardTitle>
              <CardDescription>Key-level limits applied to all requests</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={saveLimits} className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Requests / minute</Label>
                  <Input value={rpm} onChange={(e) => setRpm(e.target.value)} type="number" />
                </div>
                <div className="space-y-2">
                  <Label>Tokens / minute</Label>
                  <Input value={tpm} onChange={(e) => setTpm(e.target.value)} type="number" />
                </div>
                <div className="space-y-2">
                  <Label>Requests / day</Label>
                  <Input value={daily} onChange={(e) => setDaily(e.target.value)} type="number" />
                </div>
                <div className="space-y-2">
                  <Label>Requests / month</Label>
                  <Input value={monthly} onChange={(e) => setMonthly(e.target.value)} type="number" />
                </div>
                <div className="col-span-2">
                  <Button type="submit" disabled={saving}>
                    <Save className="mr-2 h-4 w-4" />
                    {saving ? "Saving…" : "Save Limits"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="usage" className="mt-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-muted-foreground">Requests</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatNumber(key._count.usageLogs)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-muted-foreground">Granted Models</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{key.permissions.filter((p) => p.enabled).length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-muted-foreground">Status</CardTitle>
              </CardHeader>
              <CardContent>
                <Badge variant={key.enabled ? "default" : "secondary"}>
                  {key.enabled ? "Active" : "Disabled"}
                </Badge>
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
                        <Badge variant={l.status === "success" ? "default" : "destructive"}>
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

      <Dialog open={Boolean(newKey)} onOpenChange={(open) => !open && setNewKey(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rotated API key</DialogTitle>
            <DialogDescription>
              The old key is no longer valid. Copy the new key now.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 rounded-md border bg-muted p-3">
            <code className="flex-1 break-all font-mono text-xs">{newKey}</code>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => newKey && navigator.clipboard.writeText(newKey)}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <DialogFooter>
            <Button onClick={() => setNewKey(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
