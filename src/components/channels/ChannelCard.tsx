import Link from "next/link";
import { Star, MoreHorizontal, Check } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

interface ChannelCardProps {
  channel: {
    id: string;
    name: string;
    description: string | null;
    is_active: boolean;
    slack_channel_name: string | null;
    last_analyzed_at: string | null;
    created_at: string;
    message_count: number;
    theme_count: number;
  };
}

export function ChannelCard({ channel }: ChannelCardProps) {
  // Use a deterministic placeholder image based on name
  const imageId = (channel.name.length % 5) + 1;
  const imageUrl = `https://dovetail.com/assets/a330ed336348e41df18c.png`; // Fallback to Dovetail-like asset

  return (
    <div className="relative group w-full aspect-[4/3] rounded-xl overflow-hidden border border-gray-100 bg-white hover:shadow-md transition-all">
      <Link href={`/channels/${channel.id}`} className="block w-full h-full">
        {/* Image / Thumbnail Container */}
        <div className="relative w-full h-[65%] bg-gray-50 overflow-hidden">
          <img 
            alt={channel.name} 
            src={imageUrl} 
            className="w-full h-full object-cover grayscale-[0.2] group-hover:grayscale-0 transition-all duration-500"
          />
          
          {/* Overlays (Visible on Hover) */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
          
          <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="secondary" size="icon" className="h-8 w-8 bg-white/90 hover:bg-white text-gray-600 shadow-sm border-none">
              <Star className="w-4 h-4" />
            </Button>
            <Button variant="secondary" size="icon" className="h-8 w-8 bg-white/90 hover:bg-white text-gray-600 shadow-sm border-none">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-3 flex flex-col justify-between h-[35%]">
          <h3 className="text-[14px] font-semibold text-gray-900 truncate">
            {channel.name}
          </h3>
          
          <div className="flex items-center gap-2 mt-auto">
            <div className="p-0.5 text-orange-500">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 16 16">
                <g stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m3.5 11.5 2-5 5 3 2-5"></path>
                  <g fill="currentColor">
                    <path d="M2.5 10.5h2v2h-2zM4.5 5.5h2v2h-2zM9.5 8.5h2v2h-2zM11.5 3.5h2v2h-2z"></path>
                  </g>
                </g>
              </svg>
            </div>
            <span className="text-[12px] font-medium text-gray-500">
              {channel.last_analyzed_at 
                ? formatDistanceToNow(new Date(channel.last_analyzed_at), { addSuffix: true }).replace('about ', '')
                : 'Never'}
            </span>
          </div>
        </div>
      </Link>

      {/* Checkbox (Visible on Hover or when Selected) */}
      <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="w-5 h-5 bg-white rounded border border-gray-200 flex items-center justify-center">
          <Checkbox className="data-[state=checked]:bg-indigo-600 border-none shadow-none w-4 h-4" />
        </div>
      </div>
    </div>
  );
}
