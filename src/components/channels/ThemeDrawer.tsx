"use client";

import { Theme } from "@/types";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  X, MoreHorizontal, MessageSquare, Clock, 
  Calendar, ChevronRight, Share2, Plus, 
  Smile, Frown, Meh, MoreVertical
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface ThemeDrawerProps {
  theme: Theme | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ThemeDrawer({ theme, isOpen, onClose }: ThemeDrawerProps) {
  if (!theme) return null;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:w-[640px] md:w-[720px] p-0 flex flex-col h-full max-w-full border-l border-gray-100 shadow-2xl">
        {/* Header - Matching Dovetail Style */}
        <header className="h-[56px] border-b border-gray-100 flex items-center justify-between px-4 bg-white shrink-0">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-[#15181E]" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
            <div className="w-[1px] h-4 bg-gray-200 mx-1" />
            <div className="flex items-center gap-2">
              <div className="p-1 text-[#5550ff]">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24">
                  <path stroke="currentColor" strokeLinecap="square" strokeWidth="2" d="M5.5 11.5h1v1h-1zm6 0h1v1h-1zm6 0h1v1h-1z" clip-rule="evenodd"></path>
                </svg>
              </div>
              <span className="text-[14px] font-medium text-[#15181E] truncate max-w-[300px]">
                {theme.name}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button variant="ghost" className="h-8 px-3 text-[14px] font-medium text-[#15181E] hover:bg-gray-100">
              Share
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-[#15181E] hover:bg-gray-100">
              <MoreHorizontal className="w-5 h-5" />
            </Button>
          </div>
        </header>

        {/* Content Area */}
        <ScrollArea className="flex-1 bg-white">
          <div className="p-8 max-w-3xl mx-auto">
            {/* Title & Description */}
            <div className="mb-10">
              <h1 className="text-[32px] font-bold text-[#15181E] leading-tight mb-4">
                {theme.name}
              </h1>
              
              <div className="prose prose-sm max-w-none text-[#15181E] leading-relaxed">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {theme.summary || theme.description || "No description provided."}
                </ReactMarkdown>
              </div>
            </div>

            {/* Strategic Implications (if available) */}
            {theme.product_implication && (
              <div className="mb-10 bg-[#F6F7FB] rounded-xl p-6 border border-gray-100">
                <h3 className="text-[12px] font-bold text-[#6E7684] uppercase tracking-widest mb-3">
                  Product Implication
                </h3>
                <p className="text-[14px] text-[#15181E] font-medium leading-relaxed italic">
                  {theme.product_implication}
                </p>
              </div>
            )}

            {/* Signal Evidence Section */}
            <div className="mt-12 border-t border-gray-100 pt-10">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-[18px] font-bold text-[#15181E]">
                  Evidence
                  <span className="ml-2 text-[#6E7684] font-medium text-[14px]">
                    {theme.data_point_count || 0}
                  </span>
                </h2>
                <Button variant="ghost" className="h-8 px-3 text-[12px] font-bold text-[#5550ff] uppercase tracking-wider hover:bg-indigo-50">
                  View all in data
                </Button>
              </div>

              {/* Mock Evidence List (to match requested visual density) */}
              <div className="space-y-4">
                {theme.representative_evidence && theme.representative_evidence.length > 0 ? (
                  theme.representative_evidence.map((evidence, i) => (
                    <div key={i} className="group relative bg-white border border-gray-100 rounded-xl p-5 hover:border-indigo-200 hover:shadow-sm transition-all">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-[#6E7684]">
                          U{i+1}
                        </div>
                        <span className="text-[12px] font-medium text-[#6E7684]">
                          User Participant • {format(new Date(), "MMM dd, yyyy")}
                        </span>
                      </div>
                      <p className="text-[14px] text-[#15181E] leading-relaxed">
                        "{evidence}"
                      </p>
                      
                      <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-20 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                    <MessageSquare className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                    <p className="text-[14px] text-[#6E7684] font-medium">No evidence snapshots available yet.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Footer Actions */}
        <footer className="h-[56px] border-t border-gray-100 flex items-center justify-between px-4 bg-[#F6F7FB] shrink-0">
          <div className="flex items-center gap-4">
            <span className="text-[12px] text-[#6E7684] font-medium">
              Last updated {format(new Date(), "MMM dd")}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" className="h-8 px-3 text-[14px] font-medium text-[#15181E]">
              Add to board
            </Button>
            <Button className="h-8 px-4 bg-[#15181E] text-white hover:bg-black rounded-md text-[14px] font-medium">
              Create insight
            </Button>
          </div>
        </footer>
      </SheetContent>
    </Sheet>
  );
}
