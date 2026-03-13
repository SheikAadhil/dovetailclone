"use client";

import { useState } from "react";
import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { MessageSquare, Settings, LayoutGrid, Radar, Menu, X } from "lucide-react";

import { NotificationBell } from "@/components/channels/NotificationBell";
import { UsageStats } from "@/components/channels/UsageStats";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - responsive */}
      <aside className={`
        fixed lg:relative z-50 h-full bg-white border-r border-gray-200 flex flex-col
        transition-transform duration-300 ease-in-out
        w-56 lg:w-56
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <Link href="/channels" className="flex items-center gap-2 font-bold text-lg text-indigo-600">
            <LayoutGrid className="w-5 h-5" />
            <span>Pulse</span>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1 rounded-md hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-0.5">
          <Link
            href="/channels"
            onClick={() => setSidebarOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-50"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Channels</span>
          </Link>
          <Link
            href="/sensing"
            onClick={() => setSidebarOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-50"
          >
            <Radar className="w-4 h-4" />
            <span>Sensing</span>
          </Link>
        </nav>

        <div className="p-3 border-t border-gray-100 mt-auto flex flex-col gap-1">
          <div className="flex items-center justify-between px-2 mb-1">
            <UsageStats variant="mini" />
            <NotificationBell />
          </div>
          <div className="flex items-center gap-2 px-2 py-1.5 text-sm font-medium text-gray-500 hover:text-gray-700 cursor-pointer">
            <Settings className="w-4 h-4" />
            <span>Settings</span>
          </div>
          <div className="mt-2 px-2 flex items-center gap-2">
            <UserButton afterSignOutUrl="/" />
            <span className="text-xs text-gray-400 hidden sm:inline">Signed in</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile header */}
        <header className="lg:hidden p-3 bg-white border-b flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-md hover:bg-gray-100"
          >
            <Menu className="w-5 h-5" />
          </button>
          <Link href="/channels" className="flex items-center gap-2 font-bold text-indigo-600">
            <LayoutGrid className="w-5 h-5" />
            <span>Pulse</span>
          </Link>
        </header>

        <div className="flex-1 p-3 sm:p-4 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
