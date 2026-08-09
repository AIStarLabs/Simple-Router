// MIT License — Copyright (c) 2026 HarryDau @ AIStarLabs
"use client";

import { useCallback, useEffect, useState } from "react";
import { api, formatCurrency, formatNumber } from "@/lib/api-client";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BreakdownBarChart,
  RequestsAreaChart,
  TokensAreaChart,
  CostBarChart,
  type SeriesDatum,
  type BreakdownDatum,
} from "@/components/charts/usage-charts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface UsageData {
  series: SeriesDatum[];
  byModel: BreakdownDatum[];
  byProvider: BreakdownDatum[];
  byApiKey: BreakdownDatum[];
  byDay: BreakdownDatum[];
}

export default function UsagePage() {
  const [data, setData] = useState<UsageData | null>(null);
  const [days, setDays] = useState("14");
  const [breakdownMetric, setBreakdownMetric] = useState<"requests" | "tokens" | "cost">(
    "requests"
  );

  const load = useCallback(async () => {
    try {
      const d = await api<UsageData>(`/api/admin/usage?days=${days}`);
      setData(d);
    } catch (e) {
      console.error(e);
    }
  }, [days]);

  useEffect(() => {
    load();
  }, [load]);

  const totals = data
    ? data.series.reduce(
        (acc, s) => ({
          requests: acc.requests + s.requests,
          tokens: acc.tokens + s.tokens,
          cost: acc.cost + s.cost,
        }),
        { requests: 0, tokens: 0, cost: 0 }
      )
    : null;

  return (
    <>
      <PageHeader
        title="Usage"
        description="Analytics across API keys, providers, and models"
        actions={
          <Select value={days} onValueChange={(v) => setDays(v ?? "14")}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="14">Last 14 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="Requests" value={totals ? formatNumber(totals.requests) : "…"} />
        <StatCard title="Tokens" value={totals ? formatNumber(totals.tokens) : "…"} />
        <StatCard title="Estimated Cost" value={totals ? formatCurrency(totals.cost) : "…"} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Requests Over Time</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {data ? <RequestsAreaChart data={data.series} /> : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Tokens Over Time</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {data ? <TokensAreaChart data={data.series} /> : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Cost Over Time</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {data ? <CostBarChart data={data.series} /> : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">By Model</CardTitle>
              <Select
                value={breakdownMetric}
                onValueChange={(v) =>
                  setBreakdownMetric((v ?? "requests") as "requests" | "tokens" | "cost")
                }
              >
                <SelectTrigger className="h-8 w-28 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="requests">Requests</SelectItem>
                  <SelectItem value="tokens">Tokens</SelectItem>
                  <SelectItem value="cost">Cost</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="h-64">
            {data ? <BreakdownBarChart data={data.byModel} dataKey={breakdownMetric} /> : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">By Provider</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {data ? <BreakdownBarChart data={data.byProvider} dataKey={breakdownMetric} /> : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">By API Key</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {data ? <BreakdownBarChart data={data.byApiKey} dataKey={breakdownMetric} /> : null}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
