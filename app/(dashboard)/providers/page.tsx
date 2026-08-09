// MIT License — Copyright (c) 2026 HarryDau @ AIStarLabs
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Power } from "lucide-react";
import { api } from "@/lib/api-client";
import { PageHeader } from "@/components/dashboard/page-header";
import { useConfirm } from "@/components/dashboard/confirm-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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

interface Provider {
  id: string;
  name: string;
  type: string;
  baseUrl: string;
  authType: string;
  enabled: boolean;
  createdAt: string;
  _count: { models: number; apiKeys: number };
}

const PROVIDER_TYPES = [
  { value: "openai", label: "OpenAI" },
  { value: "gemini", label: "Google Gemini" },
  { value: "anthropic", label: "Anthropic" },
  { value: "groq", label: "Groq" },
  { value: "openrouter", label: "OpenRouter" },
  { value: "alibaba", label: "Alibaba DashScope" },
  { value: "local", label: "Local (Ollama/vLLM)" },
];

const PRESET_URLS: Record<string, string> = {
  openai: "https://api.openai.com/v1",
  gemini: "https://generativelanguage.googleapis.com/v1beta/openai",
  anthropic: "https://api.anthropic.com/v1",
  groq: "https://api.groq.com/openai/v1",
  openrouter: "https://openrouter.ai/api/v1",
  alibaba: "https://dashscope.aliyuncs.com/compatible-mode/v1",
  local: "http://localhost:11434/v1",
};

export default function ProvidersPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState("openai");
  const [baseUrl, setBaseUrl] = useState(PRESET_URLS.openai);
  const [saving, setSaving] = useState(false);
  const { confirm, dialog } = useConfirm();

  const load = useCallback(async () => {
    try {
      const data = await api<{ providers: Provider[] }>("/api/admin/providers");
      setProviders(data.providers);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function selectType(v: string | null) {
    const value = v ?? "openai";
    setType(value);
    setBaseUrl(PRESET_URLS[value] ?? "");
  }

  async function createProvider(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api("/api/admin/providers", {
        method: "POST",
        body: JSON.stringify({ name, type, baseUrl }),
      });
      toast.success("Provider created");
      setDialogOpen(false);
      setName("");
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function toggle(id: string, enabled: boolean) {
    try {
      await api(`/api/admin/providers/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ enabled: !enabled }),
      });
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  function remove(id: string, name: string) {
    confirm(
      {
        title: "Delete provider",
        description: `Delete "${name}" and all of its models and keys? This cannot be undone.`,
        confirmLabel: "Delete",
      },
      async () => {
        try {
          await api(`/api/admin/providers/${id}`, { method: "DELETE" });
          toast.success("Provider deleted");
          await load();
        } catch (e) {
          toast.error((e as Error).message);
        }
      }
    );
  }

  return (
    <>
      <PageHeader
        title="Providers"
        description="Upstream AI providers and their credentials"
        actions={
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Provider
          </Button>
        }
      />

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Models</TableHead>
              <TableHead>API Keys</TableHead>
              <TableHead>Enabled</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            ) : providers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  No providers yet. Add your first provider.
                </TableCell>
              </TableRow>
            ) : (
              providers.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">
                    <Link href={`/providers/${p.id}`} className="hover:underline">
                      {p.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{p.type}</Badge>
                  </TableCell>
                  <TableCell>{p._count.models}</TableCell>
                  <TableCell>{p._count.apiKeys}</TableCell>
                  <TableCell>
                    <Switch
                      checked={p.enabled}
                      onCheckedChange={() => toggle(p.id, p.enabled)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Link
                        href={`/providers/${p.id}`}
                        className={buttonVariants({ variant: "ghost", size: "icon" })}
                      >
                        <Pencil className="h-4 w-4" />
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggle(p.id, p.enabled)}
                        title={p.enabled ? "Disable" : "Enable"}
                      >
                        <Power className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => remove(p.id, p.name)}
                        className="text-destructive"
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
            <DialogTitle>Add Provider</DialogTitle>
            <DialogDescription>
              Preset models will be seeded automatically for known provider types.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={createProvider} className="space-y-4">
            <div className="space-y-2">
              <Label>Provider Type</Label>
              <Select value={type} onValueChange={selectType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROVIDER_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My OpenAI"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Base URL</Label>
              <Input
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="https://api.openai.com/v1"
                required
              />
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

      {dialog}
    </>
  );
}
