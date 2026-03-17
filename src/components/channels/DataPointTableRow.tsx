import { DataPoint } from "@/types";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { MessageSquare, Smile, Frown, Meh, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DataPointTableRowProps {
  message: DataPoint;
  isSelected: boolean;
  onSelect: (id: string, selected: boolean) => void;
  onExpand: (message: DataPoint) => void;
}

export function DataPointTableRow({
  message,
  isSelected,
  onSelect,
  onExpand
}: DataPointTableRowProps) {
  let sentimentIcon = <Meh className="w-4 h-4 text-gray-400" />;
  if (message.sentiment === 'positive') sentimentIcon = <Smile className="w-4 h-4 text-green-500" />;
  if (message.sentiment === 'negative') sentimentIcon = <Frown className="w-4 h-4 text-red-500" />;

  return (
    <tr 
      className={cn(
        "group border-b border-gray-100 transition-colors hover:bg-gray-50/50 cursor-pointer h-[72px]",
        isSelected && "bg-[#F6F7FB]"
      )}
      onClick={() => onExpand(message)}
    >
      <td className="w-12 px-4 py-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-center">
          <Checkbox 
            checked={isSelected} 
            onCheckedChange={(checked) => onSelect(message.id, !!checked)}
            className="w-4 h-4 border-gray-300 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
          />
        </div>
      </td>
      <td className="px-4 py-3 min-w-0 max-w-0 w-full align-top">
        <div className="flex flex-col gap-1 w-full">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-900 truncate">
              {message.sender_name || 'Anonymous'}
            </span>
            <span className="text-[10px] font-medium text-gray-400 uppercase tracking-widest">
              {format(parseISO(message.message_timestamp), "MMM dd, yyyy")}
            </span>
          </div>
          <div 
            className="text-[12px] font-medium text-[#6E7684] line-clamp-2 leading-tight max-w-full"
            style={{ 
              display: '-webkit-box', 
              WebkitLineClamp: 2, 
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
            }}
          >
            {message.content}
          </div>
        </div>
      </td>
      <td className="px-4 py-3 w-[120px] min-w-[120px] align-center flex items-center justify-center h-[72px]">
        <div className="flex items-center gap-2">
          {sentimentIcon}
          <span className="text-[12px] font-medium text-[#6E7684] capitalize">
            {message.sentiment || 'neutral'}
          </span>
        </div>
      </td>
      <td className="px-4 py-3 w-12 min-w-fit text-right align-center h-[72px] pr-6">
        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
          <MoreHorizontal className="w-4 h-4" />
        </Button>
      </td>
    </tr>
  );
}
