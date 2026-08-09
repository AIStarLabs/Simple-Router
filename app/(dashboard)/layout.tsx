// MIT License — Copyright (c) 2026 HarryDau @ AIStarLabs
import { requireUser } from "@/lib/auth/session";
import { Sidebar } from "@/components/dashboard/sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar user={{ name: user.name ?? user.email, email: user.email }} />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-7xl px-6 py-8">{children}</div>
      </main>
    </div>
  );
}
