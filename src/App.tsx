import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { NotificationCenter } from './components/NotificationCenter';
import { MigrationStudio } from './components/MigrationStudio';
import { DispatcherLab } from './components/DispatcherLab';
import { SchemaManager } from './components/SchemaManager';
import { SupabaseCliStudio } from './components/SupabaseCliStudio';
import { TemplateManager } from './components/TemplateManager';
import { PreferencesView } from './components/PreferencesView';
import { ConnectModal } from './components/ConnectModal';
import { AuthModal } from './components/AuthModal';
import { ActiveTab, NotificationItem, DeliveryLog, NotificationTemplate, AuthUser } from './types';
import { notificationService } from './services/notificationService';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('inbox');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [deliveryLogs, setDeliveryLogs] = useState<DeliveryLog[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [supabaseConfig, setSupabaseConfig] = useState(notificationService.getSupabaseConfig());
  const [currentUser, setCurrentUser] = useState<AuthUser>(notificationService.getCurrentUser());
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [isConnectModalOpen, setIsConnectModalOpen] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  useEffect(() => {
    // Initial load
    setNotifications(notificationService.getNotifications());
    setDeliveryLogs(notificationService.getDeliveryLogs());
    setUnreadCount(notificationService.getUnreadCount());
    setSoundEnabled(notificationService.getPreferences().soundEnabled);
    setCurrentUser(notificationService.getCurrentUser());

    // Subscribe to real-time events
    const unsubscribe = notificationService.subscribe((updatedNotifications) => {
      setNotifications(updatedNotifications);
      setUnreadCount(notificationService.getUnreadCount());
      setDeliveryLogs(notificationService.getDeliveryLogs());
      setSupabaseConfig(notificationService.getSupabaseConfig());
      setCurrentUser(notificationService.getCurrentUser());
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleToggleSound = () => {
    const nextSound = !soundEnabled;
    setSoundEnabled(nextSound);
    notificationService.updatePreferences({ soundEnabled: nextSound });
  };

  const handleQuickDispatch = async () => {
    await notificationService.dispatchNotification({
      title: 'Realtime Alert: Supabase WAL Event Received',
      message: `A realtime push event was delivered successfully to ${currentUser.email} replacing the NestJS WebSocket Gateway.`,
      type: 'system',
      channel: 'in_app',
      priority: 'high',
      senderName: 'Supabase Realtime Hub',
      senderRole: 'Event Gateway',
      targetUserId: currentUser.recipientId,
    });
  };

  const handleUseTemplate = (template: NotificationTemplate) => {
    setActiveTab('dispatcher');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
      
      {/* Top Main Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        unreadCount={unreadCount}
        config={supabaseConfig}
        soundEnabled={soundEnabled}
        currentUser={currentUser}
        onToggleSound={handleToggleSound}
        onOpenConnectModal={() => setIsConnectModalOpen(true)}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onQuickDispatch={handleQuickDispatch}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {activeTab === 'inbox' && (
          <NotificationCenter
            notifications={notifications}
            unreadCount={unreadCount}
            onNavigateToDispatcher={() => setActiveTab('dispatcher')}
            onNavigateToMigration={() => setActiveTab('migration')}
          />
        )}

        {activeTab === 'migration' && <MigrationStudio />}

        {activeTab === 'dispatcher' && (
          <DispatcherLab
            deliveryLogs={deliveryLogs}
            onDispatched={() => {
              setNotifications(notificationService.getNotifications());
              setDeliveryLogs(notificationService.getDeliveryLogs());
            }}
          />
        )}

        {activeTab === 'schemas' && <SchemaManager />}

        {activeTab === 'cli' && (
          <SupabaseCliStudio onConnectClick={() => setIsConnectModalOpen(true)} />
        )}

        {activeTab === 'templates' && (
          <TemplateManager onUseTemplate={handleUseTemplate} />
        )}

        {activeTab === 'preferences' && <PreferencesView />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-xs text-slate-500 text-center">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            <span><strong>my-notifications-supabase</strong> • Converted from NestJS microservice</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>PostgreSQL 15+</span>
            <span>Supabase Realtime</span>
            <span>Row Level Security (RLS)</span>
            <span>Gemini AI Migration</span>
          </div>
        </div>
      </footer>

      {/* Live Supabase Connection Modal */}
      <ConnectModal
        isOpen={isConnectModalOpen}
        onClose={() => setIsConnectModalOpen(false)}
        onConnected={() => {
          setSupabaseConfig(notificationService.getSupabaseConfig());
        }}
      />

      {/* User Auth & Profile Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={currentUser}
        onUserChanged={(updated) => {
          setCurrentUser(updated);
          setNotifications(notificationService.getNotifications());
        }}
      />
    </div>
  );
}

