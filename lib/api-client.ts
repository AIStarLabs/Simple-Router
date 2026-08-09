// MIT License — Copyright (c) 2026 HarryDau @ AIStarLabs
export async function api<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      message = body?.error ?? message;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

export async function apiDownload(path: string): Promise<void> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  const { filename, config } = await res.json();
  const blob = new Blob([JSON.stringify(config, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename ?? "simple-router-config.json";
  a.click();
  URL.revokeObjectURL(url);
}

export function formatNumber(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "0";
  return new Intl.NumberFormat().format(n);
}

export function formatCurrency(n: number | null | undefined): string {
  const v = n ?? 0;
  if (v === 0) return "$0.00";
  if (v < 0.01) return `$${v.toFixed(5)}`;
  return `$${v.toFixed(2)}`;
}

export function formatDuration(ms: number | null | undefined): string {
  if (ms === null || ms === undefined) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function formatDate(iso: string | Date | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}
