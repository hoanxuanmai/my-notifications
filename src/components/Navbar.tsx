import React from 'react';
import {
  Bell,
  Database,
  ArrowRightLeft,
  Send,
  FileCode2,
  Sliders,
  Sparkles,
  Volume2,
  VolumeX,
  Radio,
  CheckCircle2,
  Settings,
  HelpCircle,
  Terminal,
} from 'lucide-react';
import { ActiveTab, SupabaseConfig } from '../types';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  unreadCount: number;
  config: SupabaseConfig;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onOpenConnectModal: () => void;
  onQuickDispatch: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  unreadCount,
  config,
  soundEnabled,
  onToggleSound,
  onOpenConnectModal,
  onQuickDispatch,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur border-b border-slate-800 text-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-500 p-0.5 shadow-lg shadow-emerald-500/20 flex items-center justify-center">
              <div className="h-full w-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Bell className="h-5 w-5 text-emerald-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold tracking-tight text-white text-base sm:text-lg">
                  my-notifications
                </span>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Supabase + Realtime
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                NestJS to Supabase Notification Migration Hub
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex items-center space-x-1">
            <button
              onClick={() => setActiveTab('inbox')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'inbox'
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Bell className="h-4 w-4" />
              <span>Inbox Feed</span>
              {unreadCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-xs font-bold bg-emerald-500 text-slate-950">
                  {unreadCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('migration')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'migration'
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <ArrowRightLeft className="h-4 w-4 text-cyan-400" />
              <span>NestJS ➔ Supabase</span>
              <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-cyan-500/20 text-cyan-300">
                Migration
              </span>
            </button>

            <button
              onClick={() => setActiveTab('dispatcher')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'dispatcher'
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Send className="h-4 w-4 text-emerald-400" />
              <span>Dispatcher Lab</span>
            </button>

            <button
              onClick={() => setActiveTab('schemas')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'schemas'
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Database className="h-4 w-4 text-indigo-400" />
              <span>SQL & RLS</span>
            </button>

            <button
              onClick={() => setActiveTab('cli')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'cli'
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Terminal className="h-4 w-4 text-emerald-400" />
              <span>CLI & Deploy</span>
              <span className="px-1.5 py-0.2 text-[10px] font-bold rounded bg-emerald-500/20 text-emerald-300">
                CLI
              </span>
            </button>

            <button
              onClick={() => setActiveTab('templates')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'templates'
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <FileCode2 className="h-4 w-4 text-amber-400" />
              <span>Templates</span>
            </button>

            <button
              onClick={() => setActiveTab('preferences')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'preferences'
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Sliders className="h-4 w-4" />
              <span>Settings</span>
            </button>
          </nav>

          {/* Right Action Tools */}
          <div className="flex items-center gap-2.5">
            {/* Quick Dispatch trigger */}
            <button
              onClick={onQuickDispatch}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-sm transition active:scale-95 cursor-pointer"
              title="Trigger a test real-time notification"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Test Alert</span>
            </button>

            {/* Sound toggle */}
            <button
              onClick={onToggleSound}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title={soundEnabled ? 'Mute notification chimes' : 'Enable notification chimes'}
            >
              {soundEnabled ? <Volume2 className="h-4 w-4 text-emerald-400" /> : <VolumeX className="h-4 w-4" />}
            </button>

            {/* Supabase connection status pill */}
            <button
              onClick={onOpenConnectModal}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition ${
                config.isConnected
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                  : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800 hover:border-slate-600'
              }`}
            >
              <Radio className={`h-3 w-3 ${config.isConnected ? 'text-emerald-400 animate-pulse' : 'text-cyan-400'}`} />
              <span className="hidden sm:inline">
                {config.isConnected ? 'Supabase Live' : 'Realtime Engine'}
              </span>
              <Settings className="h-3 w-3 ml-0.5 opacity-60" />
            </button>
          </div>
        </div>

        {/* Mobile Tab Bar */}
        <div className="flex md:hidden items-center justify-between py-2 border-t border-slate-800 overflow-x-auto text-xs">
          <button
            onClick={() => setActiveTab('inbox')}
            className={`px-3 py-1.5 rounded font-medium whitespace-nowrap ${
              activeTab === 'inbox' ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-400'
            }`}
          >
            Inbox ({unreadCount})
          </button>
          <button
            onClick={() => setActiveTab('migration')}
            className={`px-3 py-1.5 rounded font-medium whitespace-nowrap ${
              activeTab === 'migration' ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-400'
            }`}
          >
            NestJS ➔ Supabase
          </button>
          <button
            onClick={() => setActiveTab('dispatcher')}
            className={`px-3 py-1.5 rounded font-medium whitespace-nowrap ${
              activeTab === 'dispatcher' ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-400'
            }`}
          >
            Dispatcher
          </button>
          <button
            onClick={() => setActiveTab('schemas')}
            className={`px-3 py-1.5 rounded font-medium whitespace-nowrap ${
              activeTab === 'schemas' ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-400'
            }`}
          >
            SQL & RLS
          </button>
          <button
            onClick={() => setActiveTab('cli')}
            className={`px-3 py-1.5 rounded font-medium whitespace-nowrap ${
              activeTab === 'cli' ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-400'
            }`}
          >
            CLI & Deploy
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`px-3 py-1.5 rounded font-medium whitespace-nowrap ${
              activeTab === 'templates' ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-400'
            }`}
          >
            Templates
          </button>
          <button
            onClick={() => setActiveTab('preferences')}
            className={`px-3 py-1.5 rounded font-medium whitespace-nowrap ${
              activeTab === 'preferences' ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-400'
            }`}
          >
            Settings
          </button>
        </div>
      </div>
    </header>
  );
};
