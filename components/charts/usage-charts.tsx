// MIT License — Copyright (c) 2026 HarryDau @ AIStarLabs
"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

export interface SeriesDatum {
  date: string;
  requests: number;
  tokens: number;
  cost: number;
  errors: number;
}

export function RequestsAreaChart({ data }: { data: SeriesDatum[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id="gRequests" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity={0.4} />
            <stop offset="100%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 12 }}
          tickFormatter={(v: string) => v.slice(5)}
        />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip />
        <Area
          type="monotone"
          dataKey="requests"
          stroke="hsl(var(--chart-1))"
          fill="url(#gRequests)"
          name="Requests"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function TokensAreaChart({ data }: { data: SeriesDatum[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id="gTokens" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--chart-2))" stopOpacity={0.4} />
            <stop offset="100%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="date" tick={{ fontSize: 12 }} tickFormatter={(v: string) => v.slice(5)} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip />
        <Area
          type="monotone"
          dataKey="tokens"
          stroke="hsl(var(--chart-2))"
          fill="url(#gTokens)"
          name="Tokens"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function CostBarChart({ data }: { data: SeriesDatum[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="date" tick={{ fontSize: 12 }} tickFormatter={(v: string) => v.slice(5)} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip />
        <Bar dataKey="cost" fill="hsl(var(--chart-3))" name="Cost ($)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export interface BreakdownDatum {
  key: string;
  label: string;
  requests: number;
  tokens: number;
  cost: number;
}

export function BreakdownBarChart({ data, dataKey = "requests" }: { data: BreakdownDatum[]; dataKey?: "requests" | "tokens" | "cost" }) {
  const sorted = [...data].sort((a, b) => b[dataKey] - a[dataKey]).slice(0, 12);
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={sorted}
        layout="vertical"
        margin={{ top: 4, right: 24, left: 8, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 12 }} />
        <YAxis
          type="category"
          dataKey="label"
          width={140}
          tick={{ fontSize: 12 }}
        />
        <Tooltip />
        <Bar dataKey={dataKey} fill="hsl(var(--chart-4))" name={dataKey} radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
