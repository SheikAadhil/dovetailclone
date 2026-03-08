import { Theme } from "@/types";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { MessageCard } from "./MessageCard";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface ThemeDrawerProps {
  theme: Theme | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ThemeDrawer({ theme, isOpen, onClose }: ThemeDrawerProps) {
  if (!theme) return null;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-[480px] sm:w-[540px] overflow-hidden flex flex-col p-0 gap-0">
        <SheetHeader className="p-6 border-b bg-gray-50/50">
          <SheetTitle className="text-xl font-bold">{theme.name}</SheetTitle>
          <SheetDescription className="mt-2 text-gray-500">
            {theme.summary}
          </SheetDescription>
          
          <div className="flex items-center gap-2 mt-4">
            <Badge variant="outline" className="bg-white">
              {theme.data_point_count} messages
            </Badge>
            {/* Sentiment breakdown could be visualized here if needed */}
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 p-6 bg-gray-50/30">
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
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
