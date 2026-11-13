import * as LucideIcons from 'lucide-react';
import React from 'react';

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function formatDuration(ms?: number): string {
  if (ms === undefined || ms === null) return '-';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

export function formatDate(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return isoString;
  }
}

// Dynamic Lucide icon renderer
export function getLucideIcon(iconName: string, className = 'w-4 h-4'): React.ReactNode {
  const iconsMap = LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>;
  const IconComponent = iconsMap[iconName];
  if (!IconComponent) {
    return React.createElement(LucideIcons.Box, { className });
  }
  return React.createElement(IconComponent, { className });
}
