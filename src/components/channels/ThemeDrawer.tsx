import { Theme } from "@/types";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { MessageCard } from "./MessageCard";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface ThemeDrawerProps {
  theme: Theme | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ThemeDrawer({ theme, isOpen, onClose }: ThemeDrawerProps) {
  if (!theme) return null;

  const trendUI = theme.trend_direction === 'rising' 
    ? { color: 'text-green-600', icon: <TrendingUp className="w-4 h-4" /> }
    : theme.trend_direction === 'falling'
      ? { color: 'text-red-600', icon: <TrendingDown className="w-4 h-4" /> }
      : { color: 'text-gray-400', icon: <Minus className="w-4 h-4" /> };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-[480px] sm:w-[540px] p-0 flex flex-col h-full">
        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200">
          <div className="flex flex-col min-h-full">
            <SheetHeader className="p-6 border-b bg-gray-50/50">
              <SheetTitle className="text-xl font-bold">{theme.name}</SheetTitle>
              <SheetDescription className="mt-2 text-gray-500">
                {theme.summary}
              </SheetDescription>

              {theme.description && (
                <div className="mt-4 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                  <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">Product Insights & Recommendations</h4>
                  <p className="text-sm text-indigo-900 leading-relaxed font-medium">
                    {theme.description}
                  </p>
                </div>
              )}
              
              <div className="flex items-center gap-4 mt-4">
                <Badge variant="outline" className="bg-white">
                  {theme.data_point_count} messages
                </Badge>
                
                {theme.trend_percent_change !== undefined && (
                  <div className={`flex items-center gap-1.5 text-xs font-bold ${trendUI.color}`}>
                    {trendUI.icon}
                    {theme.trend_percent_change > 0 ? '+' : ''}{theme.trend_percent_change}%
                    <span className="text-gray-400 font-normal ml-0.5">vs last week</span>
                  </div>
                )}
              </div>
            </SheetHeader>

            {/* Trend Chart */}
            {theme.trend_data && theme.trend_data.length >= 2 && (
              <div className="p-6 border-b bg-white">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Volume Trend</h4>
                <div className="h-28 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={theme.trend_data}>
                      <XAxis dataKey="date" hide />
                      <YAxis hide />
                      <Tooltip 
                        contentStyle={{ fontSize: '10px', borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                        labelStyle={{ fontWeight: 'bold' }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="count" 
                        stroke="#4f46e5" 
                        strokeWidth={3} 
                        dot={{ r: 4, fill: '#4f46e5', strokeWidth: 2, stroke: '#fff' }} 
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            <div className="p-6 bg-gray-50/30 flex-1">
               <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Supporting Evidence</h4>
              <div className="space-y-4">
                {theme.data_points && theme.data_points.length > 0 ? (
                  theme.data_points.map((msg) => (
                    <MessageCard key={msg.id} message={msg} />
                  ))
                ) : (
                  <div className="text-center text-gray-500 py-10">
                    No messages found for this theme.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
