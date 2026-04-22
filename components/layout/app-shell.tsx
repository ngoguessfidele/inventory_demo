import type { ReactNode } from "react";
import { Sidebar } from "./sidebar";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 lg:flex">
      <Sidebar />
      <main className="flex-1 p-4 lg:p-8">{children}</main>
    </div>
  );
}

