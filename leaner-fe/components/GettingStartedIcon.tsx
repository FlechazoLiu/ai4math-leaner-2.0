"use client";

import {
  MonitorCog,
  Cloud,
  Gamepad2,
  type LucideIcon,
} from "lucide-react";

/**
 * Icon lookup map for GettingStarted items.
 * Add more icons here as more getting-started cards are added.
 */
const iconMap: Record<string, LucideIcon> = {
  MonitorCog,
  Cloud,
  Gamepad2,
};

interface GettingStartedIconProps {
  name: string;
  className?: string;
}

export function GettingStartedIcon({ name, className }: GettingStartedIconProps) {
  const Icon = iconMap[name];
  if (!Icon) {
    return <Cloud className={className} />; // fallback
  }
  return <Icon className={className} />;
}
