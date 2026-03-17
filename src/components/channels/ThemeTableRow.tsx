import { Theme } from "@/types";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

interface ThemeTableRowProps {
  theme: Theme;
  isSelected: boolean;
  onSelect: (id: string, selected: boolean) => void;
  onView: (theme: Theme) => void;
  sentimentColor?: string;
}

export function ThemeTableRow({
  theme,
  isSelected,
  onSelect,
  onView,
  sentimentColor = "#5550ff"
}: ThemeTableRowProps) {
  return (
    <tr 
      className={cn(
        "group border-b border-gray-100 transition-colors hover:bg-gray-50/50 cursor-pointer h-[72px]",
        isSelected && "bg-[#F6F7FB]"
      )}
      onClick={() => onView(theme)}
    >
      <td className="w-12 px-4 py-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-center">
          <Checkbox 
            checked={isSelected} 
            onCheckedChange={(checked) => onSelect(theme.id, !!checked)}
            className="w-4 h-4 border-gray-300 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
          />
        </div>
      </td>
      <td className="px-4 py-3 min-w-0 max-w-0 w-full align-top">
        <div className="flex flex-col gap-1 w-full">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-900 truncate">
              {theme.name}
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
            {theme.summary || theme.description || "No description provided."}
          </div>
        </div>
      </td>
      <td className="px-4 py-3 w-[200px] min-w-[200px] align-bottom pb-4">
        <div 
          className="h-1.5 w-full rounded-full" 
          style={{ 
            backgroundColor: sentimentColor,
            opacity: theme.data_point_count > 0 ? 1 : 0.2
          }} 
        />
      </td>
      <td className="px-4 py-3 w-12 min-w-fit text-right align-bottom pb-4 pr-6">
        <span className="text-[14px] font-medium text-gray-900">
          {theme.data_point_count}
        </span>
      </td>
    </tr>
  );
}
