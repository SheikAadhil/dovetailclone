"use client";

import { useState, useEffect } from "react";
import { Loader2, Zap, BarChart3 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface UsageData {
  data_points_this_month: number;
  data_points_limit: number;
  channels_count: number;
  sources_count: number;
  plan: string;
}

export function UsageStats({ variant = "full" }: { variant?: "full" | "mini" }) {
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/workspace/usage')
      .then(res => res.json())
      .then(data => {
        setUsage(data);
        setLoading(false);
      });
  }, []);

  if (loading || !usage) return <div className="h-10 w-full animate-pulse bg-gray-100 rounded-md" />;

  const percent = Math.min((usage.data_points_this_month / usage.data_points_limit) * 100, 100);
  const remaining = usage.data_points_limit - usage.data_points_this_month;
  
  const getBarColor = () => {
    if (percent >= 95) return "bg-red-500";
    if (percent >= 80) return "bg-amber-500";
    return "bg-indigo-600";
  };

  if (variant === "mini") {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <div className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1.5 rounded-md transition-colors border border-gray-100 bg-white shadow-sm">
            <div className={`w-2 h-2 rounded-full ${getBarColor().replace('bg-', 'bg-')}`} />
            <span className="text-[10px] font-bold text-gray-600">{usage.data_points_this_month}/{usage.data_points_limit}</span>
          </div>
        </PopoverTrigger>
        <PopoverContent side="top" align="start" className="w-64 p-4 shadow-xl border-indigo-100">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-sm">Monthly Usage</h4>
              <span className="text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded font-bold uppercase">{usage.plan} plan</span>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Data points</span>
                <span className="font-medium">{usage.data_points_this_month.toLocaleString()} / {usage.data_points_limit.toLocaleString()}</span>
              </div>
              <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                <div style={{ width: `${percent}%` }} className={`h-full transition-all duration-500 ${getBarColor()}`} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-50">
              <div className="space-y-0.5">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Channels</p>
                <p className="text-sm font-bold text-gray-900">{usage.channels_count}</p>
              </div>
              <div className="space-y-0.5">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Sources</p>
                <p className="text-sm font-bold text-gray-900">{usage.sources_count}</p>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <div className="bg-white border rounded-xl p-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-indigo-600" />
          <span className="text-sm font-bold text-gray-900">Workspace Usage</span>
        </div>
        <span className="text-xs text-gray-500 font-medium">{usage.data_points_this_month.toLocaleString()} of {usage.data_points_limit.toLocaleString()} used</span>
      </div>
      
      <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
        <div style={{ width: `${percent}%` }} className={`h-full transition-all duration-500 ${getBarColor()}`} />
      </div>
      
      <div className="flex items-center justify-between text-[11px]">
        <p className="text-gray-500 italic flex items-center gap-1">
          <Zap className="w-3 h-3 text-amber-500" />
          {remaining.toLocaleString()} data points remaining this month
        </p>
        <button className="text-indigo-600 font-bold hover:underline">Upgrade Plan</button>
      </div>
    </div>
  );
}
