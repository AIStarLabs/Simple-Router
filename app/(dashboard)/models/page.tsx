// MIT License — Copyright (c) 2026 HarryDau @ AIStarLabs
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Trash2, Power, FlaskConical, Loader2, Eye, EyeOff, Copy, Plus, ChevronDown } from "lucide-react";
import { api } from "@/lib/api-client";
import { PageHeader } from "@/components/dashboard/page-header";
import { useConfirm } from "@/components/dashboard/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
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

interface ModelRow {
  id: string;
  modelId: string;
  displayName: string | null;
  enabled: boolean;
  supportsVision: boolean;
  supportsImage: boolean;
  supportsReasoning: boolean;
  supportsVietnamese: boolean;
  bestTaskTags: string[];
  provider: { id: string; name: string; type: string };
  _count: { permissions: number };
}

const TEST_KEY_LS = "sr-test-model-key";
const TEST_PROMPT_LS = "sr-test-model-prompt";

function lsGet(key: string): string {
  try {
    return atob(localStorage.getItem(key) ?? "");
  } catch {
    return "";
  }
}

function lsSet(key: string, value: string) {
  localStorage.setItem(key, btoa(value));
}

export default function ModelsPage() {
  const [models, setModels] = useState<ModelRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [providerFilter, setProviderFilter] = useState<string>("all");
  const [providers, setProviders] = useState<Array<{ id: string; name: string }>>([]);
  const [testModel, setTestModel] = useState<ModelRow | null>(null);
  const [testKey, setTestKey] = useState("");
  const [testPrompt, setTestPrompt] = useState("");
  const [testOutput, setTestOutput] = useState("");
  const [testThinking, setTestThinking] = useState("");
  const [testError, setTestError] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [showThinking, setShowThinking] = useState(true);
  const [modelOpen, setModelOpen] = useState(false);
  const [addProviderId, setAddProviderId] = useState("");
  const [addModelId, setAddModelId] = useState("");
  const [addDisplayName, setAddDisplayName] = useState("");
  const [addMaxContext, setAddMaxContext] = useState("");
  const [addVision, setAddVision] = useState(false);
  const [addImage, setAddImage] = useState(false);
  const [addReasoning, setAddReasoning] = useState(false);
  const [addVietnamese, setAddVietnamese] = useState(false);
  const [addTags, setAddTags] = useState("");
  const [savingModel, setSavingModel] = useState(false);
  const { confirm, dialog } = useConfirm();

  const load = useCallback(async () => {
    try {
      const [m, p] = await Promise.all([
        api<{ models: ModelRow[] }>("/api/admin/models"),
        api<{ providers: Array<{ id: string; name: string }> }>("/api/admin/providers"),
      ]);
      setModels(m.models);
      setProviders(p.providers);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function toggle(id: string, enabled: boolean) {
    try {
      await api(`/api/admin/models/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ enabled: !enabled }),
      });
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  function remove(id: string, modelId: string) {
    confirm(
      {
        title: "Delete model",
        description: `Delete "${modelId}" from the catalog?`,
        confirmLabel: "Delete",
      },
      async () => {
        await api(`/api/admin/models/${id}`, { method: "DELETE" });
        toast.success("Model deleted");
        await load();
      }
    );
  }

  function openTest(model: ModelRow) {
    setTestModel(model);
    setTestKey(lsGet(TEST_KEY_LS));
    setTestPrompt(lsGet(TEST_PROMPT_LS));
    setTestOutput("");
    setTestThinking("");
    setTestError(null);
    setShowKey(false);
    setShowThinking(true);
  }

  function closeTest() {
    if (testing) return;
    setTestModel(null);
    setTestOutput("");
    setTestThinking("");
    setTestError(null);
  }

  async function addModel(e: React.FormEvent) {
    e.preventDefault();
    if (!addProviderId) {
      toast.error("Select a provider");
      return;
    }
    setSavingModel(true);
    try {
      await api("/api/admin/models", {
        method: "POST",
        body: JSON.stringify({
          providerId: addProviderId,
          modelId: addModelId.trim(),
          displayName: addDisplayName || undefined,
          maxContext: addMaxContext ? Number(addMaxContext) : null,
          supportsVision: addVision,
          supportsImage: addImage,
          supportsReasoning: addReasoning,
          supportsVietnamese: addVietnamese,
          bestTaskTags: addTags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
        }),
      });
      toast.success("Model added");
      setModelOpen(false);
      setAddProviderId("");
      setAddModelId("");
      setAddDisplayName("");
      setAddMaxContext("");
      setAddVision(false);
      setAddImage(false);
      setAddReasoning(false);
      setAddVietnamese(false);
      setAddTags("");
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSavingModel(false);
    }
  }

  async function runTest() {
    if (!testModel) return;
    if (!testPrompt.trim()) {
      setTestError("Enter a prompt first");
      return;
    }
    setTesting(true);
    setTestOutput("");
    setTestThinking("");
    setTestError(null);
    lsSet(TEST_KEY_LS, testKey);
    lsSet(TEST_PROMPT_LS, testPrompt);
    try {
      const res = await api<{ ok: boolean; content?: string; thinking?: string; error?: string }>(
        "/api/admin/test-model",
        {
          method: "POST",
          body: JSON.stringify({
            modelId: testModel.id,
            apiKey: testKey,
            prompt: testPrompt,
          }),
        }
      );
      if (!res.ok) throw new Error(res.error ?? "Test failed");
      setTestOutput(res.content ?? "");
      setTestThinking(res.thinking ?? "");
    } catch (e) {
      setTestError((e as Error).message);
    } finally {
      setTesting(false);
    }
  }

  const filtered = models.filter((m) => {
    const matchQ =
      !q ||
      m.modelId.toLowerCase().includes(q.toLowerCase()) ||
      m.provider.name.toLowerCase().includes(q.toLowerCase());
    const matchP = providerFilter === "all" || m.provider.id === providerFilter;
    return matchQ && matchP;
  });

  return (
    <>
      <PageHeader
        title="Models"
        description="Catalog of models available across providers"
        actions={
          <Button onClick={() => setModelOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Model
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search models…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-xs"
        />
        <Select value={providerFilter} onValueChange={(v) => setProviderFilter(v ?? "all")}>
          <SelectTrigger className="w-56">
            <SelectValue
              getLabel={(v) =>
                v === "all" ? "All providers" : providers.find((p) => p.id === v)?.name
              }
            />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All providers</SelectItem>
            {providers.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Model</TableHead>
              <TableHead>Provider</TableHead>
              <TableHead>Capabilities</TableHead>
              <TableHead>Grants</TableHead>
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
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  No models found
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-mono text-xs">{m.modelId}</TableCell>
                  <TableCell>
                    <Link
                      href={`/providers/${m.provider.id}`}
                      className="text-sm hover:underline"
                    >
                      {m.provider.name}
                    </Link>
                  </TableCell>
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
                  <TableCell>{m._count.permissions}</TableCell>
                  <TableCell>
                    <Switch checked={m.enabled} onCheckedChange={() => toggle(m.id, m.enabled)} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openTest(m)}
                        title={`Test ${m.modelId}`}
                      >
                        <FlaskConical className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => toggle(m.id, m.enabled)}>
                        <Power className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => remove(m.id, m.modelId)}
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

      <Dialog open={Boolean(testModel)} onOpenChange={(open) => !open && closeTest()}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Test model</DialogTitle>
            <DialogDescription>
              <span className="font-mono">{testModel?.modelId}</span> ·{" "}
              {testModel?.provider.name} — calls the model directly with your key.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>API key</Label>
              <div className="flex gap-2">
                <Input
                  type={showKey ? "text" : "password"}
                  value={testKey}
                  onChange={(e) => setTestKey(e.target.value)}
                  placeholder="Provider API key (leave empty if not required)"
                  autoComplete="off"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  title={showKey ? "Hide key" : "Show key"}
                  onClick={() => setShowKey((v) => !v)}
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Prompt</Label>
              <Textarea
                value={testPrompt}
                onChange={(e) => setTestPrompt(e.target.value)}
                placeholder="Ask the model something…"
                rows={4}
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                API key and prompt are saved in this browser for future tests.
              </p>
              <Button onClick={runTest} disabled={testing}>
                {testing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Testing…
                  </>
                ) : (
                  "Test"
                )}
              </Button>
            </div>
            {testError ? (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                {testError}
              </div>
            ) : null}
            {testThinking ? (
              <div className="rounded-md border border-dashed border-primary/30 bg-primary/5 p-3">
                <button
                  type="button"
                  className="flex w-full items-center justify-between text-xs font-semibold text-primary/80"
                  onClick={() => setShowThinking((v) => !v)}
                >
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary/60" />
                    Thinking
                  </span>
                  <ChevronDown
                    className={`h-3.5 w-3.5 transition-transform ${showThinking ? "" : "-rotate-90"}`}
                  />
                </button>
                {showThinking ? (
                  <div className="mt-2 max-h-48 overflow-y-auto whitespace-pre-wrap break-words border-t border-primary/10 pt-2 font-mono text-xs italic leading-relaxed text-muted-foreground">
                    {testThinking}
                  </div>
                ) : null}
              </div>
            ) : null}
            {testOutput ? (
              <div className="rounded-md border bg-muted p-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground">Response</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs"
                    onClick={() => {
                      navigator.clipboard.writeText(testOutput);
                      toast.success("Copied");
                    }}
                  >
                    <Copy className="mr-1 h-3 w-3" />
                    Copy
                  </Button>
                </div>
                <div className="markdown-body max-h-80 overflow-y-auto break-words text-sm leading-relaxed">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{testOutput}</ReactMarkdown>
                </div>
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeTest} disabled={testing}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={modelOpen} onOpenChange={setModelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Model</DialogTitle>
          </DialogHeader>
          <form onSubmit={addModel} className="space-y-4">
            <div className="space-y-2">
              <Label>Provider</Label>
              <Select value={addProviderId} onValueChange={(v) => setAddProviderId(v ?? "")}>
                <SelectTrigger className="w-full">
                  <SelectValue
                    getLabel={(v) =>
                      v
                        ? providers.find((p) => p.id === v)?.name
                        : "Select a provider…"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {providers.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Model ID</Label>
              <Input
                value={addModelId}
                onChange={(e) => setAddModelId(e.target.value)}
                placeholder="gpt-4o-mini"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Display name</Label>
              <Input
                value={addDisplayName}
                onChange={(e) => setAddDisplayName(e.target.value)}
                placeholder="GPT-4o Mini"
              />
            </div>
            <div className="space-y-2">
              <Label>Max context (tokens)</Label>
              <Input
                value={addMaxContext}
                onChange={(e) => setAddMaxContext(e.target.value)}
                type="number"
                placeholder="Optional"
              />
            </div>
            <div className="space-y-2">
              <Label>Capabilities</Label>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={addVision}
                    onCheckedChange={(v) => setAddVision(Boolean(v))}
                  />
                  Vision
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={addImage}
                    onCheckedChange={(v) => setAddImage(Boolean(v))}
                  />
                  Image generation
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={addReasoning}
                    onCheckedChange={(v) => setAddReasoning(Boolean(v))}
                  />
                  Reasoning
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={addVietnamese}
                    onCheckedChange={(v) => setAddVietnamese(Boolean(v))}
                  />
                  Vietnamese
                </label>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Best task tags (comma-separated)</Label>
              <Input
                value={addTags}
                onChange={(e) => setAddTags(e.target.value)}
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
