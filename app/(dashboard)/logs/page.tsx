// MIT License — Copyright (c) 2026 HarryDau @ AIStarLabs
"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { api, formatCurrency, formatDate, formatNumber } from "@/lib/api-client";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface LogRow {
  id: string;
  model: string | null;
  endpoint: string | null;
  status: string;
  requestTokens: number;
  responseTokens: number;
  cost: number;
  latency: number;
  stream: boolean;
  createdAt: string;
  error: string | null;
  apiKey: { name: string } | null;
  provider: { name: string } | null;
}

interface ProvidersResponse {
  providers: Array<{ id: string; name: string }>;
}

const STATUSES = [
  { value: "", label: "All statuses" },
  { value: "success", label: "Success" },
  { value: "error", label: "Error" },
  { value: "rateLimited", label: "Rate limited" },
  { value: "authError", label: "Auth error" },
  { value: "notFound", label: "Not found" },
];

function statusVariant(status: string) {
  switch (status) {
    case "success":
      return "default" as const;
    case "error":
      return "destructive" as const;
    case "rateLimited":
      return "secondary" as const;
    default:
      return "outline" as const;
  }
}

export default function LogsPage() {
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [providers, setProviders] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [providerId, setProviderId] = useState("");
  const [selected, setSelected] = useState<LogRow | null>(null);
  const limit = 50;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: String(limit),
        page: String(page),
      });
      if (q) params.set("q", q);
      if (status) params.set("status", status);
      if (providerId) params.set("providerId", providerId);
      const res = await api<{ logs: LogRow[]; total: number; pages: number }>(
        `/api/admin/logs?${params.toString()}`
      );
      setLogs(res.logs);
      setTotal(res.total);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [q, status, providerId, page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    api<ProvidersResponse>("/api/admin/providers")
      .then((d) => setProviders(d.providers))
      .catch(() => {});
  }, []);

  const pages = Math.max(1, Math.ceil(total / limit));

  return (
    <>
      <PageHeader title="Logs" description="Structured request logs" />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search model, endpoint, error…"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
          className="max-w-xs"
        />
        <Select
          value={status}
          onValueChange={(v) => {
            setStatus(v ?? "");
            setPage(1);
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={providerId}
          onValueChange={(v) => {
            setProviderId(v ?? "");
            setPage(1);
          }}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All providers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All providers</SelectItem>
            {providers.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="ml-auto text-sm text-muted-foreground">
          {formatNumber(total)} results
        </span>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>API Key</TableHead>
              <TableHead>Provider</TableHead>
              <TableHead>Model</TableHead>
              <TableHead>Endpoint</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Tokens</TableHead>
              <TableHead>Cost</TableHead>
              <TableHead>Latency</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            ) : logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                  No logs match your filters
                </TableCell>
              </TableRow>
            ) : (
              logs.map((l) => (
                <TableRow
                  key={l.id}
                  className="cursor-pointer"
                  onClick={() => setSelected(l)}
                >
                  <TableCell className="whitespace-nowrap text-xs">
                    {formatDate(l.createdAt)}
                  </TableCell>
                  <TableCell className="text-xs">{l.apiKey?.name ?? "—"}</TableCell>
                  <TableCell className="text-xs">{l.provider?.name ?? "—"}</TableCell>
                  <TableCell className="font-mono text-xs">{l.model ?? "—"}</TableCell>
                  <TableCell className="text-xs">{l.endpoint ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(l.status)}>{l.status}</Badge>
                  </TableCell>
                  <TableCell className="text-xs">
                    {formatNumber(l.requestTokens + l.responseTokens)}
                    {l.stream ? " ⇄" : ""}
                  </TableCell>
                  <TableCell className="text-xs">{formatCurrency(l.cost)}</TableCell>
                  <TableCell className="text-xs">{l.latency}ms</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Page {page} of {pages}
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= pages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      </div>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request details</DialogTitle>
          </DialogHeader>
          {selected ? (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <Badge variant={statusVariant(selected.status)}>{selected.status}</Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Time</p>
                  <p>{formatDate(selected.createdAt)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">API Key</p>
                  <p>{selected.apiKey?.name ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Provider</p>
                  <p>{selected.provider?.name ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Model</p>
                  <p className="font-mono">{selected.model ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Endpoint</p>
                  <p className="font-mono">{selected.endpoint ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Prompt tokens</p>
                  <p>{formatNumber(selected.requestTokens)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Completion tokens</p>
                  <p>{formatNumber(selected.responseTokens)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Cost</p>
                  <p>{formatCurrency(selected.cost)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Latency</p>
                  <p>{selected.latency}ms</p>
                </div>
              </div>
              {selected.error ? (
                <div>
                  <p className="text-xs text-muted-foreground">Error</p>
                  <pre className="mt-1 overflow-x-auto rounded-md bg-muted p-3 text-xs">
                    {selected.error}
                  </pre>
                </div>
              ) : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
