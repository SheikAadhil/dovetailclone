import { Theme } from "@/types";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { MessageCard } from "./MessageCard";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-[480px] sm:w-[540px] p-0 flex flex-col h-full">
        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200">
          <div className="flex flex-col min-h-full">
            <SheetHeader className="p-6 border-b bg-gray-50/50">
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
              <Tabs defaultValue="product" className="w-full">
                <TabsList className="grid w-full grid-cols-2 p-1 bg-gray-100 rounded-2xl h-12 mb-6">
                  <TabsTrigger value="product" className="rounded-xl font-black text-[11px] uppercase tracking-widest gap-2 data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm">
                    <Zap className="w-3.5 h-3.5" />
                    Product Insights
                  </TabsTrigger>
                  <TabsTrigger value="deep" className="rounded-xl font-black text-[11px] uppercase tracking-widest gap-2 data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm">
                    <Lightbulb className="w-3.5 h-3.5" />
                    Deep Analysis
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="product" className="mt-0 focus-visible:outline-none">
                  <div className="space-y-4">
                    <div className="p-5 bg-indigo-50/50 rounded-2xl border border-indigo-100 relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
                        <Zap className="w-12 h-12 text-indigo-600" />
                      </div>
                      <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse" />
                        Actionable Recommendations
                      </h4>
                      <p className="text-sm text-indigo-900 leading-relaxed font-bold relative z-10">
                        {theme.summary}
                      </p>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="deep" className="mt-0 focus-visible:outline-none">
                  <div className="space-y-4">
                    <div className="p-5 bg-amber-50/50 rounded-2xl border border-amber-100 relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
                        <Lightbulb className="w-12 h-12 text-amber-600" />
                      </div>
                      <h4 className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
                        Latent Patterns & Dynamics
                      </h4>
                      <p className="text-sm text-amber-900 leading-relaxed font-medium relative z-10 italic">
                        {theme.description || "The analysis engine is still processing deep patterns for this synthesis."}
                      </p>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
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
                        stroke="#6366f1" 
                        strokeWidth={4} 
                        dot={{ r: 4, fill: '#6366f1', strokeWidth: 2, stroke: '#fff' }} 
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
