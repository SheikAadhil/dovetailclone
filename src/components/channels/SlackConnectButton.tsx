"use client";

import { Button } from "@/components/ui/button";
import { Slack as SlackIcon } from "lucide-react";

interface SlackConnectButtonProps {
  workspaceId: string;
  channelId?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
  className?: string;
}

export function SlackConnectButton({ 
  workspaceId, 
  channelId = "new", 
  variant = "default",
  size = "default",
  className = ""
}: SlackConnectButtonProps) {
  const handleConnect = () => {
    window.location.href = `/api/slack/install?workspaceId=${workspaceId}&channelId=${channelId}`;
  };

  return (
    <Button 
      onClick={handleConnect}
      variant={variant}
      size={size}
      className={`bg-[#4A154B] hover:bg-[#361038] text-white border-0 ${className}`}
    >
      <SlackIcon className="mr-2 h-4 w-4" />
      Connect Slack
    </Button>
  );
}
