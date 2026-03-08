import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { MessageSquare, Settings, LayoutGrid } from "lucide-react";

import { NotificationBell } from "@/components/channels/NotificationBell";
import { UsageStats } from "@/components/channels/UsageStats";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col fixed h-full z-10">
        <div className="p-6 border-b border-gray-100">
          <Link href="/channels" className="flex items-center gap-2 font-bold text-xl text-indigo-600">
            <LayoutGrid className="w-6 h-6" />
            <span>Pulse</span>
          </Link>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          <Link 
            href="/channels" 
            className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-50 bg-gray-100"
          >
            <MessageSquare className="w-4 h-4" />
            Channels
          </Link>
          {/* Add more nav items here */}
        </nav>

        <div className="p-4 border-t border-gray-100 mt-auto flex flex-col gap-1">
          <div className="flex items-center justify-between px-3 mb-2">
            <UsageStats variant="mini" />
            <NotificationBell />
          </div>
          <div className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 cursor-pointer">
            <Settings className="w-4 h-4" />
            Settings
          </div>
          <div className="mt-4 px-3 flex items-center gap-3">
            <UserButton afterSignOutUrl="/" />
            <span className="text-xs text-gray-400">Signed in</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 p-8 overflow-auto h-full">
        {children}
      </main>
    </div>
  );
}
