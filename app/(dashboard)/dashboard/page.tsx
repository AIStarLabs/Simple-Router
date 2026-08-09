// MIT License — Copyright (c) 2026 HarryDau @ AIStarLabs
"use client";

import { useEffect, useState, useCallback } from "react";
import { Activity, Boxes, Gauge, KeyRound, TriangleAlert } from "lucide-react";
import { api, formatCurrency, formatNumber } from "@/lib/api-client";
import { StatCard } from "@/components/dashboard/stat-card";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  RequestsAreaChart,
  TokensAreaChart,
  CostBarChart,
  type SeriesDatum,
} from "@/components/charts/usage-charts";

interface Stats {
  todayRequests: number;
  yesterdayRequests: number;
  activeKeys: number;
  activeProviders: number;
  totalTokens: number;
  totalCost: number;
  errorCount: number;
  averageLatency: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [series, setSeries] = useState<SeriesDatum[]>([]);

  const load = useCallback(async () => {
    const [s, u] = await Promise.all([
      api<{ stats: Stats }>("/api/admin/dashboard/stats"),
      api<{ series: SeriesDatum[] }>("/api/admin/usage?days=14"),
    ]);
    setStats(s.stats);
    setSeries(u.series);
  }, []);

  useEffect(() => {
    load().catch(console.error);
  }, [load]);

  return (
    <>
      <PageHeader title="Dashboard" description="Overview of gateway traffic" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Requests Today"
          value={stats ? formatNumber(stats.todayRequests) : "…"}
          hint={
            stats && stats.yesterdayRequests > 0
              ? `${formatNumber(stats.yesterdayRequests)} yesterday`
              : undefined
          }
          icon={<Activity className="h-4 w-4 text-muted-foreground" />}
        />
        <StatCard
          title="Active API Keys"
          value={stats ? formatNumber(stats.activeKeys) : "…"}
          icon={<KeyRound className="h-4 w-4 text-muted-foreground" />}
        />
        <StatCard
          title="Active Providers"
          value={stats ? formatNumber(stats.activeProviders) : "…"}
          icon={<Boxes className="h-4 w-4 text-muted-foreground" />}
        />
        <StatCard
          title="Avg Latency"
          value={stats ? `${formatNumber(stats.averageLatency)}ms` : "…"}
          icon={<Gauge className="h-4 w-4 text-muted-foreground" />}
        />
        <StatCard
          title="Total Tokens"
          value={stats ? formatNumber(stats.totalTokens) : "…"}
          icon={<Activity className="h-4 w-4 text-muted-foreground" />}
        />
        <StatCard
          title="Estimated Cost"
          value={stats ? formatCurrency(stats.totalCost) : "…"}
          icon={<Activity className="h-4 w-4 text-muted-foreground" />}
        />
        <StatCard
          title="Errors"
          value={stats ? formatNumber(stats.errorCount) : "…"}
          icon={<TriangleAlert className="h-4 w-4 text-muted-foreground" />}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Requests (14 days)</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <RequestsAreaChart data={series} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Token usage (14 days)</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <TokensAreaChart data={series} />
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm">Cost (14 days)</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <CostBarChart data={series} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
