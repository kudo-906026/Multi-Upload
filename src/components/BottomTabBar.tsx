import React from 'react';
import { Video, Flame, History, Users } from 'lucide-react';
import { PlatformAuthStatus } from '@shared/types';

export type TabId = 'create' | 'trends' | 'queue' | 'accounts' | 'presets' | 'settings';

interface BottomTabBarProps {
  activeTab: TabId;
  onSelectTab: (tab: TabId) => void;
  activeJobsCount?: number;
  authStatus?: PlatformAuthStatus | null;
}

export const BottomTabBar: React.FC<BottomTabBarProps> = ({
  activeTab,
  onSelectTab,
  activeJobsCount = 0,
  authStatus,
}) => {
  const ytCount = authStatus?.youtube.accounts?.length || 0;
  const igCount = authStatus?.instagram.accounts?.length || 0;
  const connectedCount = ytCount + igCount;

  const tabs: {
    id: TabId;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number | string | null;
    dot?: boolean;
  }[] = [
    {
      id: 'create',
      label: 'Studio',
      icon: Video,
    },
    {
      id: 'trends',
      label: 'Trends',
      icon: Flame,
    },
    {
      id: 'queue',
      label: 'Queue',
      icon: History,
      badge: activeJobsCount > 0 ? activeJobsCount : null,
    },
    {
      id: 'accounts',
      label: 'Accounts',
      icon: Users,
      dot: connectedCount === 0, // show subtle alert dot if no accounts are connected yet
    },
  ];

  return (
    <nav
      aria-label="Bottom Navigation"
      className="fixed bottom-0 left-0 right-0 z-50 bg-slate-950/85 backdrop-blur-2xl border-t border-slate-800/80 shadow-[0_-8px_30px_rgba(0,0,0,0.6)] px-2 pt-1 pb-[calc(env(safe-area-inset-bottom)+0.35rem)]"
    >
      <div className="max-w-md sm:max-w-xl mx-auto flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive =
            activeTab === tab.id ||
            (tab.id === 'create' && (activeTab === 'presets' || activeTab === 'settings'));

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectTab(tab.id)}
              className={`relative flex flex-col items-center justify-center flex-1 py-1.5 px-2 rounded-2xl transition-all duration-200 select-none ${
                isActive
                  ? 'text-indigo-400 scale-[1.02]'
                  : 'text-slate-400 hover:text-slate-200 active:scale-95'
              }`}
            >
              {/* Active Tab Glow & Pill */}
              {isActive && (
                <span className="absolute -top-1 w-8 h-1 bg-gradient-to-r from-indigo-500 via-pink-500 to-amber-500 rounded-full shadow-[0_0_12px_rgba(99,102,241,0.8)]" />
              )}

              <div className="relative">
                <Icon
                  className={`w-5 h-5 sm:w-6 sm:h-6 transition-transform duration-200 ${
                    isActive ? 'scale-110 drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]' : ''
                  }`}
                />

                {/* Counter Badge (e.g. Active Queue Jobs) */}
                {typeof tab.badge === 'number' && tab.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 min-w-[1.1rem] h-[1.1rem] px-1 bg-gradient-to-r from-pink-500 to-rose-500 text-white text-[10px] font-extrabold rounded-full flex items-center justify-center shadow-lg animate-pulse">
                    {tab.badge}
                  </span>
                )}

                {/* Warning dot if no account connected */}
                {tab.dot && (
                  <span
                    className="absolute -top-0.5 -right-1 w-2 h-2 bg-amber-400 rounded-full ring-2 ring-slate-950"
                    title="No platforms connected yet"
                  />
                )}
              </div>

              <span
                className={`text-[11px] font-semibold mt-1 tracking-tight transition-colors ${
                  isActive ? 'text-white' : 'text-slate-400'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
