import React from 'react';
import { useUIStore, type AppView } from '@/stores/ui-store';
import {
  Home,
  Network,
  LayoutGrid,
  Bot,
  PenTool,
  Clock,
  Settings as SettingsIcon,
} from 'lucide-react';

interface NavItem {
  id: AppView;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'workflows', label: 'Workflows', icon: Network },
  { id: 'templates', label: 'Templates', icon: LayoutGrid },
  { id: 'agents', label: 'Agents', icon: Bot },
  { id: 'tools', label: 'Tools', icon: PenTool },
  { id: 'executions', label: 'Executions', icon: Clock },
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
];

export const AppSidebar: React.FC = () => {
  const currentView = useUIStore((s) => s.currentView);
  const setCurrentView = useUIStore((s) => s.setCurrentView);

  return (
    <aside className="w-56 shrink-0 bg-[#0a1c14] text-[#e0ece5] flex flex-col justify-between p-4 select-none h-full z-40 border-r border-[#153828]">
      <div className="space-y-6">
        {/* Brand Header */}
        <div
          onClick={() => setCurrentView('home')}
          className="flex items-center gap-2.5 cursor-pointer px-2 py-1 group"
        >
          <div className="w-8 h-8 rounded-xl bg-[#15803d] group-hover:bg-[#16a34a] flex items-center justify-center text-white font-display font-black text-sm shadow-[0_0_12px_rgba(21,128,61,0.45)] transition-all">
            A
          </div>
          <span className="font-display font-black text-base tracking-tight text-white group-hover:text-[#86efac] transition-colors">
            AgentOS
          </span>
        </div>

        {/* Navigation List */}
        <nav className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              currentView === item.id ||
              (item.id === 'workflows' && currentView === 'editor');

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setCurrentView(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#183f2e] text-white font-bold shadow-xs border-l-4 border-[#22c55e]'
                    : 'text-[#8da597] font-semibold hover:text-white hover:bg-[#122e22]'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0 stroke-[2.2]" />
                <span className="font-sans">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* User Profile at bottom (Without Upgrade to Pro) */}
      <div className="pt-4 border-t border-[#153828]">
        <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl hover:bg-[#122e22] cursor-pointer transition-colors">
          <div className="w-8 h-8 rounded-full bg-[#183f2e] text-[#86efac] flex items-center justify-center font-display font-black text-xs shrink-0 ring-2 ring-[#22c55e]/40 shadow-2xs">
            RN
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-display text-xs font-bold text-white truncate">
              Rippika N.
            </span>
            <span className="font-sans text-[10px] font-medium text-[#7d9b8b] truncate">
              Personal Workspace
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
};
