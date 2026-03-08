"use client";

import { useState, useEffect } from "react";
import { AnomalyAlert } from "@/types";
import { Bell, AlertTriangle, TrendingDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuHeader,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";

export function NotificationBell() {
  const [alerts, setAlerts] = useState<AnomalyAlert[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAlerts = async () => {
    try {
      const res = await fetch('/api/alerts');
      const data = await res.json();
      setAlerts(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
    // Poll for alerts every 5 minutes
    const interval = setInterval(fetchAlerts, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const markAllRead = async () => {
    try {
      await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_all_read' })
      });
      setAlerts([]);
    } catch (e) {
      console.error(e);
    }
  };

  const markRead = async (id: string) => {
    try {
      await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'mark_read' })
      });
      setAlerts(prev => prev.filter(a => a.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  const unreadCount = alerts.length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative h-9 w-9 p-0 rounded-full">
          <Bell className="h-5 w-5 text-gray-500" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center bg-red-500 text-[10px] border-2 border-white">
              {unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between p-4 pb-2">
          <h3 className="font-bold text-sm">Alerts</h3>
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="text-[10px] text-indigo-600 hover:underline font-medium">
              Mark all read
            </button>
          )}
        </div>
        <DropdownMenuSeparator />
        <div className="max-h-[400px] overflow-auto">
          {unreadCount === 0 ? (
            <div className="p-8 text-center">
              <p className="text-xs text-gray-400">No new alerts.</p>
            </div>
          ) : (
            alerts.map((alert) => (
              <div key={alert.id} className="group relative">
                <Link 
                  href={`/channels/${alert.channel_id}?themeId=${alert.theme_id}`}
                  onClick={() => markRead(alert.id)}
                  className="block p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex gap-3">
                    <div className={`mt-0.5 p-1.5 rounded-full flex-shrink-0 ${alert.alert_type === 'spike' ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'}`}>
                      {alert.alert_type === 'spike' ? <AlertTriangle className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-gray-900 leading-snug">
                        <span className="font-bold">"{alert.theme_name}"</span> is {alert.alert_type === 'spike' ? 'up' : 'down'} <span className="font-bold">{Math.round(alert.percent_change)}%</span> this week.
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-indigo-600 font-medium">{alert.channel_name}</span>
                        <span className="text-[10px] text-gray-400">
                          {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
                <button 
                  onClick={() => markRead(alert.id)}
                  className="absolute top-4 right-2 opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 rounded transition-all"
                >
                  <Check className="w-3 h-3 text-gray-400" />
                </button>
              </div>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
