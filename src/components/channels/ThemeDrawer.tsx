import { Theme } from "@/types";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { MessageCard } from "./MessageCard";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, TrendingDown, Minus, Lightbulb, Zap } from "lucide-react";

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

  const isDeep = theme.topic_name?.toLowerCase().includes('deep analysis') || false;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:w-[480px] md:w-[540px] p-0 flex flex-col h-full max-w-full">
        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200">
          <div className="flex flex-col min-h-full">
            <SheetHeader className="p-6 border-b bg-indigo-50/30">
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-indigo-100 text-indigo-700 border-none font-black text-[9px] uppercase tracking-widest gap-1">
                  <Zap className="w-3 h-3" /> Product Insight
                </Badge>
              </div>
              <SheetTitle className="text-xl font-black tracking-tight">{theme.name}</SheetTitle>
              
              <div className="flex items-center gap-4 mt-2">
                <Badge variant="outline" className="bg-white font-bold text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-lg border-gray-200 text-gray-500">
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

            <div className="p-6 border-b">
               <div className={`p-5 rounded-2xl border ${isDeep ? 'bg-amber-50/50 border-amber-100' : 'bg-indigo-50/50 border-indigo-100'} relative overflow-hidden group`}>
                  <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
                    {isDeep ? <Lightbulb className="w-12 h-12 text-amber-600" /> : <Zap className="w-12 h-12 text-indigo-600" />}
                  </div>
                  <h4 className={`text-[10px] font-black ${isDeep ? 'text-amber-400' : 'text-indigo-400'} uppercase tracking-widest mb-3 flex items-center gap-2`}>
                    <span className={`w-1.5 h-1.5 ${isDeep ? 'bg-amber-400' : 'bg-indigo-400 animate-pulse'} rounded-full`} />
                    {isDeep ? 'Latent Patterns & Dynamics' : 'Actionable Recommendations'}
                  </h4>
                  <div className="space-y-3 relative z-10">
                    <p className={`text-sm ${isDeep ? 'text-amber-900 font-medium italic' : 'text-indigo-900 font-bold'} leading-relaxed`}>
                      {theme.summary}
                    </p>
                    {theme.description && (
                      <p className="text-sm text-gray-600 leading-relaxed border-t pt-3 mt-3 border-black/5">
                        {theme.description}
                      </p>
                    )}
                  </div>
                </div>
            </div>

            {/* Trend Chart */}
            {theme.trend_data && theme.trend_data.length >= 2 && (
              <div className="p-6 border-b bg-white">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Volume History</h4>
                <div className="h-28 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={theme.trend_data}>
                      <XAxis dataKey="date" hide />
                      <YAxis hide />
                      <Tooltip 
                        contentStyle={{ fontSize: '10px', borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}
                        labelStyle={{ fontWeight: 'bold' }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="count" 
                        stroke={isDeep ? "#f59e0b" : "#6366f1"} 
                        strokeWidth={4} 
                        dot={{ r: 4, fill: isDeep ? "#f59e0b" : "#6366f1", strokeWidth: 2, stroke: '#fff' }} 
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            <div className="p-6 bg-gray-50/30 flex-1">
               <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Signal Evidence</h4>
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
