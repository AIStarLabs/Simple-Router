// MIT License — Copyright (c) 2026 HarryDau @ AIStarLabs
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Plus, Trash2, Power, RefreshCw, Copy } from "lucide-react";
import { api } from "@/lib/api-client";
import { PageHeader } from "@/components/dashboard/page-header";
import { useConfirm } from "@/components/dashboard/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface InboundKey {
  id: string;
  name: string;
  maskedKey: string;
  enabled: boolean;
  description: string | null;
  routingStrategy: string;
  modelCount: number;
  rateLimitRPM: number | null;
  rateLimitTPM: number | null;
  requestCount: number;
  createdAt: string;
}

const STRATEGIES = [
  { value: "fixed", label: "Fixed" },
  { value: "random", label: "Random" },
  { value: "roundRobin", label: "Round Robin" },
  { value: "weighted", label: "Weighted Random" },
  { value: "priorityFailover", label: "Priority Failover" },
];

export default function KeysPage() {
  const [keys, setKeys] = useState<InboundKey[]>([]);
  const [models, setModels] = useState<Array<{ id: string; modelId: string; provider: { name: string } }>>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [strategy, setStrategy] = useState("fixed");
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [rpm, setRpm] = useState("");
  const [tpm, setTpm] = useState("");
  const [saving, setSaving] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const { confirm, dialog } = useConfirm();

  const load = useCallback(async () => {
    try {
      const [keyData, modelData] = await Promise.all([
        api<{ keys: InboundKey[] }>("/api/admin/keys"),
        api<{ models: Array<{ id: string; modelId: string; provider: { name: string } }> }>("/api/admin/models"),
      ]);
      setKeys(keyData.keys);
      setModels(modelData.models);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function toggleModel(modelId: string) {
    setSelectedModels((prev) =>
      prev.includes(modelId) ? prev.filter((m) => m !== modelId) : [...prev, modelId]
    );
  }

  async function createKey(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api<{ id: string; key: string }>("/api/admin/keys", {
        method: "POST",
        body: JSON.stringify({
          name,
          description: description || undefined,
          routingStrategy: strategy,
          models: selectedModels,
          rateLimitRPM: rpm ? Number(rpm) : null,
          rateLimitTPM: tpm ? Number(tpm) : null,
        }),
      });
      setNewKey(res.key);
      setDialogOpen(false);
      setName("");
      setDescription("");
      setStrategy("fixed");
      setSelectedModels([]);
      setRpm("");
      setTpm("");
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function toggle(id: string, enabled: boolean) {
    try {
      await api(`/api/admin/keys/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ enabled: !enabled }),
      });
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function rotate(id: string) {
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

  function remove(id: string, name: string) {
    confirm(
      {
        title: "Delete API key",
        description: `Delete "${name}"? All requests using it will stop working.`,
        confirmLabel: "Delete",
      },
      async () => {
        await api(`/api/admin/keys/${id}`, { method: "DELETE" });
        toast.success("API key deleted");
        await load();
      }
    );
  }

  function copyKey(key: string) {
    navigator.clipboard.writeText(key);
    toast.success("Copied to clipboard");
  }

  return (
    <>
      <PageHeader
        title="Inbound API Keys"
        description="Keys that external clients use to call your gateway"
        actions={
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Key
          </Button>
        }
      />

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>API Key</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Routing</TableHead>
              <TableHead>Models</TableHead>
              <TableHead>Rate Limit</TableHead>
              <TableHead>Requests</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            ) : keys.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                  No API keys yet
                </TableCell>
              </TableRow>
            ) : (
              keys.map((k) => (
                <TableRow key={k.id}>
                  <TableCell className="font-medium">
                    <Link href={`/keys/${k.id}`} className="hover:underline">
                      {k.name}
                    </Link>
                    <span className="ml-2 font-mono text-xs text-muted-foreground">
                      {k.name}
                    </span>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    <span className="inline-flex items-center gap-2">
                      {k.maskedKey}
                      <button
                        onClick={() => copyKey(k.maskedKey)}
                        className="text-muted-foreground hover:text-foreground"
                        title="Copy masked key"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={k.enabled ? "default" : "secondary"}>
                      {k.enabled ? "Active" : "Disabled"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{k.routingStrategy}</Badge>
                  </TableCell>
                  <TableCell>{k.modelCount}</TableCell>
                  <TableCell className="text-xs">
                    {k.rateLimitRPM || k.rateLimitTPM
                      ? `${k.rateLimitRPM ?? "∞"} RPM · ${k.rateLimitTPM ?? "∞"} TPM`
                      : "Unlimited"}
                  </TableCell>
                  <TableCell>{k.requestCount}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => rotate(k.id)} title="Rotate">
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => toggle(k.id, k.enabled)}>
                        <Power className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => remove(k.id, k.name)}
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create API Key</DialogTitle>
            <DialogDescription>
              Give the key a name that identifies the project using it.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={createKey} className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Project A"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional"
              />
            </div>
            <div className="space-y-2">
              <Label>Routing strategy</Label>
              <Select value={strategy} onValueChange={(v) => setStrategy(v ?? "fixed")}>
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
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Rate limit (RPM)</Label>
                <Input
                  value={rpm}
                  onChange={(e) => setRpm(e.target.value)}
                  type="number"
                  placeholder="Optional"
                />
              </div>
              <div className="space-y-2">
                <Label>Rate limit (TPM)</Label>
                <Input
                  value={tpm}
                  onChange={(e) => setTpm(e.target.value)}
                  type="number"
                  placeholder="Optional"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>
                Models
                <span className="ml-1 font-normal text-muted-foreground">
                  (leave empty to route across all enabled models)
                </span>
              </Label>
              <div className="max-h-52 space-y-1 overflow-y-auto rounded-md border p-2">
                {models.length === 0 ? (
                  <p className="p-2 text-sm text-muted-foreground">
                    No models in the catalog yet.
                  </p>
                ) : (
                  models.map((m) => (
                    <label
                      key={m.id}
                      className="flex cursor-pointer items-center gap-2 rounded p-1.5 text-sm hover:bg-accent/50"
                    >
                      <Checkbox
                        checked={selectedModels.includes(m.id)}
                        onCheckedChange={() => toggleModel(m.id)}
                      />
                      <span className="font-mono text-xs">{m.modelId}</span>
                      <span className="ml-auto text-xs text-muted-foreground">
                        {m.provider.name}
                      </span>
                    </label>
                  ))
                )}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Creating…" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(newKey)} onOpenChange={(open) => !open && setNewKey(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Your new API key</DialogTitle>
            <DialogDescription>
              Copy this key now. You will not be able to see it again.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 rounded-md border bg-muted p-3">
            <code className="flex-1 break-all font-mono text-xs">{newKey}</code>
            <Button size="sm" variant="ghost" onClick={() => newKey && copyKey(newKey)}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <DialogFooter>
            <Button onClick={() => setNewKey(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {dialog}
    </>
  );
}
