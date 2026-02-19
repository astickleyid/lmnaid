import React, { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { PostCreator } from './components/PostCreator';
import { ChatView } from './components/ChatView';
import { DocViewer } from './components/DocViewer';
import { ExploreView } from './components/ExploreView';
import { CreateServerModal } from './components/CreateServerModal';
import { EditProfileModal } from './components/EditProfileModal';
import { IntegrationStoreModal } from './components/IntegrationStoreModal';
import { DeveloperConsole } from './components/DeveloperConsole';
import { ProfileView } from './components/ProfileView';
import { NotificationProvider, useNotification } from './components/NotificationSystem';
import { NotificationPanel } from './components/NotificationPanel';
import { ThemeEditor } from './components/ThemeEditor';
import { SplashScreen } from './components/SplashScreen';
import { GoLiveModal } from './components/GoLiveModal';
import { MobileBottomNav } from './components/MobileBottomNav';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';
import { BrowserCompatibilityWarning } from './components/BrowserCompatibilityWarning';
import { SafariHTTPSGuide } from './components/SafariHTTPSGuide';
import { Post, TabOption, Channel, ThemeConfig, HeaderConfig } from './types';
import { useModal } from './src/hooks/useModal';
import { useUserStore, useServerStore, usePostStore, useUIStore } from './src/stores';

const AppContent = () => {
  const { addNotification } = useNotification();
  
  // Zustand stores
  const user = useUserStore(state => state.user);
  const updateUser = useUserStore(state => state.updateUser);
  const posts = usePostStore(state => state.posts);
  const addPost = usePostStore(state => state.addPost);
  const loadMorePosts = usePostStore(state => state.loadMorePosts);
  const setLoadingMore = usePostStore(state => state.setLoadingMore);
  const servers = useServerStore(state => state.servers);
  const dmServer = useServerStore(state => state.dmServer);
  const activeServerId = useServerStore(state => state.activeServerId);
  const setActiveServer = useServerStore(state => state.setActiveServer);
  const addServer = useServerStore(state => state.addServer);
  const activeView = useUIStore(state => state.activeView);
  const setActiveView = useUIStore(state => state.setActiveView);
  const activeTab = useUIStore(state => state.activeTab);
  const setActiveTab = useUIStore(state => state.setActiveTab);
  
  // Local UI state
  const [showDocs, setShowDocs] = useState(false);
  const [themeConfig, setThemeConfig] = useState<ThemeConfig>({
      primaryColor: '192 132 252',
      backgroundColor: '0 0 0',
      surfaceColor: '10 10 12',
      iconStyle: 'standard',
      presetName: 'Custom'
  });

  // Header State
  const [headerConfig, setHeaderConfig] = useState<HeaderConfig>({
      title: 'Profile',
      variant: 'default'
  });
  
  // Sidebar state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Modals using useModal hook
  const postModal = useModal();
  const serverModal = useModal();
  const editProfileModal = useModal();
  const integrationModal = useModal();
  const goLiveModal = useModal();
  const themeEditorModal = useModal();
  
  // Swipe Gestures
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const touchEndY = useRef<number | null>(null);
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    touchEndX.current = null;
    touchEndY.current = null;
    touchStartX.current = e.targetTouches[0].clientX;
    touchStartY.current = e.targetTouches[0].clientY;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
    touchEndY.current = e.targetTouches[0].clientY;
  };

  const onTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current || !touchStartY.current || !touchEndY.current) return;
    
    const xDistance = touchStartX.current - touchEndX.current;
    const yDistance = Math.abs(touchStartY.current - touchEndY.current);
    const isLeftSwipe = xDistance > minSwipeDistance;
    const isRightSwipe = xDistance < -minSwipeDistance;

    // Ensure horizontal swipe is dominant to avoid interfering with scrolling
    if (Math.abs(xDistance) > yDistance) {
        // Swipe Left to Close (if open)
        if (isLeftSwipe && isSidebarOpen) {
            setIsSidebarOpen(false);
        }
        
        // Swipe Right to Open (from left edge)
        if (isRightSwipe && !isSidebarOpen && touchStartX.current < 60) {
            setIsSidebarOpen(true);
        }
    }
  };

  const handleCreatePost = (content: string, image?: string, scheduledDate?: Date) => {
    const newPost: Post = {
      id: Date.now().toString(),
      author: user,
      content,
      timestamp: scheduledDate 
        ? `🗓️ ${scheduledDate.toLocaleDateString([], {month: 'short', day: 'numeric'})} @ ${scheduledDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`
        : 'Just now',
      likes: 0,
      comments: 0,
      image: image
    };
    addPost(newPost);
    addNotification('success', 'Post Created', scheduledDate ? 'Your post has been scheduled.' : 'Your post is now live.');
  };

  const handleLoadMorePosts = async () => {
    setLoadingMore(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    const morePosts: Post[] = Array.from({ length: 3 }).map((_, i) => ({
      id: `auto-post-${Date.now()}-${i}`,
      author: user,
      content: `Scroll update: Checking out the infinite feed implementation. Post number ${posts.length + i + 1}.`,
      timestamp: 'A while ago',
      likes: Math.floor(Math.random() * 500),
      comments: Math.floor(Math.random() * 50),
      image: Math.random() > 0.8 ? `https://picsum.photos/seed/${Date.now() + i}/600/400` : undefined
    }));
    loadMorePosts(morePosts);
    setLoadingMore(false);
  };

  const handleEditProfile = () => editProfileModal.open();

  const handleSaveProfile = (updatedUser: typeof user) => {
    updateUser(updatedUser);
    addNotification('success', 'Profile Updated', 'Your changes have been saved.');
  };

  const handleCreateServer = (name: string, type: string, iconUrl?: string, customIconId?: string, features?: any) => {
    const timestamp = Date.now();
    let newChannels: Channel[] = [{ id: `c-${timestamp}-1`, name: 'general', type: 'text' }];
    
    // Logic Fix: Add channels based on selected features
    if (features) {
        if (features.aiEnabled) {
            newChannels.push({ id: `app-${timestamp}-ai`, name: 'Fresh Squeeze AI', type: 'app', appType: 'ai' });
        }
        if (features.lemonHubLinked) {
            newChannels.push({ id: `app-${timestamp}-board`, name: 'Project Board', type: 'app', appType: 'board' });
        }
        // Add logic for other features as needed
    }
    
    const newServer = {
      id: `server-${timestamp}`,
      name: name || 'New Server',
      iconUrl: iconUrl || 'https://picsum.photos/seed/server-' + timestamp + '/100/100',
      channels: newChannels,
      features: features || { aiEnabled: false, communityEnabled: false, lemonHubLinked: false }
    };
    addServer(newServer);
    addNotification('success', 'Server Created', `${name} is ready to go!`);
  };

  const handleInstallIntegration = (app: any, serverId: string) => {
      const updatedServers = servers.map(s => {
          if (s.id === serverId) {
              return {
                  ...s,
                  channels: [{ id: `app-${Date.now()}`, name: app.name, type: 'app' as const, appType: app.id }, ...s.channels]
              };
          }
          return s;
      });
      useServerStore.setState({ servers: updatedServers });
      integrationModal.close();
      addNotification('success', 'App Installed', `${app.name} has been added to your server.`);
  };

  const handleCreateChannel = (serverId: string, channelName: string, type: Channel['type']) => {
      const updatedServers = servers.map(s => {
          if (s.id === serverId) {
              const newChannel: Channel = {
                  id: `ch-${Date.now()}`,
                  name: channelName,
                  type: type
              };
              return { ...s, channels: [...s.channels, newChannel] };
          }
          return s;
      });
      useServerStore.setState({ servers: updatedServers });
      addNotification('success', 'Channel Created', `#${channelName} has been created.`);
  };

  const handleServerSelect = (serverId: string) => {
      setActiveServer(serverId);
      setActiveView('server');
      setIsSidebarOpen(false);
  };

  const handleDmSelect = () => {
      setActiveServer('dm-home');
      setActiveView('dm');
      setIsSidebarOpen(false);
  };
  
  const handleDevPortalSelect = () => {
      setActiveServer(servers[0]?.id || '');
      setActiveView('dev-console');
      setIsSidebarOpen(false);
  };

  const handleExploreSelect = () => {
    setActiveServer(null);
    setActiveView('explore');
    setIsSidebarOpen(false);
  };

  const activeServer = activeView === 'server' ? servers.find(s => s.id === activeServerId) : null;

  return (
    <div 
      className="flex h-[100dvh] w-full bg-black text-zinc-100 font-sans selection:bg-primary/30 overflow-hidden relative safe-top"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <Sidebar 
          activeView={activeView} 
          servers={servers}
          user={user}
          activeServerId={activeServerId}
          onNavigateProfile={() => { setActiveView('profile'); setActiveServer(null); setIsSidebarOpen(false); }}
          onNavigateDMs={handleDmSelect}
          onNavigateDevPortal={handleDevPortalSelect}
          onNavigateExplore={handleExploreSelect}
          onSelectServer={handleServerSelect}
          onCreateServer={() => serverModal.open()}
          onOpenDocs={() => setShowDocs(true)}
          onOpenThemeEditor={() => themeEditorModal.open()}
          onOpenGoLive={() => { goLiveModal.open(); setIsSidebarOpen(false); }}
          isOpen={isSidebarOpen}
          onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
          onClose={() => setIsSidebarOpen(false)}
      />
      
      {/* Shift Main Content to the right when sidebar is present on desktop */}
      <main className="flex-1 flex flex-col h-full w-full relative z-0 md:pl-[72px] pb-[68px] md:pb-0">
         <Header 
            onToggleMobileNav={() => setIsSidebarOpen(!isSidebarOpen)} 
            isOpen={isSidebarOpen}
            config={headerConfig}
         />
         
         {/* Global Browser Compatibility Warning */}
         <div className="px-4 pt-4 md:px-6 md:pt-6">
           <SafariHTTPSGuide />
           <BrowserCompatibilityWarning />
         </div>
         
         <div className="flex-1 overflow-hidden relative w-full h-full">
            {activeView === 'profile' && (
                <ProfileView 
                    user={user}
                    posts={posts}
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    onEditProfile={handleEditProfile}
                    onCreatePost={() => postModal.open()}
                    onToggleMobileNav={() => setIsSidebarOpen(!isSidebarOpen)}
                    onLoadMore={handleLoadMorePosts}
                    setHeader={setHeaderConfig}
                />
            )}
            {activeView === 'explore' && (
                <ExploreView 
                    onToggleMobileNav={() => setIsSidebarOpen(!isSidebarOpen)}
                    onJoinServer={(name, type) => handleCreateServer(name, type)}
                    setHeader={setHeaderConfig}
                />
            )}
            {activeView === 'dev-console' && (
                <DeveloperConsole setHeader={setHeaderConfig} />
            )}
            {activeView === 'dm' && (
                <ChatView 
                    key="dm-view"
                    currentUser={user}
                    server={dmServer}
                    isMobileNavOpen={isSidebarOpen}
                    onToggleMobileNav={() => setIsSidebarOpen(!isSidebarOpen)}
                    setHeader={setHeaderConfig}
                />
            )}
            {activeView === 'server' && activeServer && (
                <ChatView 
                    key={activeServer.id} 
                    currentUser={user} 
                    server={activeServer} 
                    isMobileNavOpen={isSidebarOpen}
                    onToggleMobileNav={() => setIsSidebarOpen(!isSidebarOpen)}
                    onOpenIntegrations={() => integrationModal.open()}
                    onCreateChannel={(name, type) => handleCreateChannel(activeServer.id, name, type)}
                    onOpenGoLive={() => goLiveModal.open()}
                    setHeader={setHeaderConfig}
                />
            )}
         </div>
      </main>

      {showDocs && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in p-4 md:p-12">
           <div className="w-full h-full max-w-7xl nebula-glass shadow-2xl rounded-2xl overflow-hidden relative animate-fade-in-up">
              <DocViewer onClose={() => setShowDocs(false)} setHeader={setHeaderConfig} />
           </div>
        </div>
      )}

      <NotificationPanel />
      
      {/* Mobile Bottom Navigation */}
      <MobileBottomNav
        activeView={activeView}
        onNavigateProfile={() => { setActiveView('profile'); setActiveServer(null); setIsSidebarOpen(false); }}
        onNavigateDMs={handleDmSelect}
        onNavigateExplore={handleExploreSelect}
        onOpenGoLive={() => goLiveModal.open()}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        userAvatar={user.avatarUrl}
      />
      
      {/* PWA Install Prompt */}
      <PWAInstallPrompt />

      <PostCreator isOpen={postModal.isOpen} onClose={() => postModal.close()} onPost={handleCreatePost} />
      <CreateServerModal isOpen={serverModal.isOpen} onClose={() => serverModal.close()} onCreate={handleCreateServer} />
      <EditProfileModal isOpen={editProfileModal.isOpen} onClose={() => editProfileModal.close()} currentUser={user} onSave={handleSaveProfile} />
      <IntegrationStoreModal isOpen={integrationModal.isOpen} onClose={() => integrationModal.close()} onInstall={handleInstallIntegration} />
      <GoLiveModal isOpen={goLiveModal.isOpen} onClose={() => goLiveModal.close()} />
      <ThemeEditor 
          isOpen={themeEditorModal.isOpen} 
          onClose={() => themeEditorModal.close()} 
          config={themeConfig} 
          onUpdate={setThemeConfig} 
      />
    </div>
  );
};

const App = () => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate initial asset loading/boot time
    const timer = setTimeout(() => {
        setIsLoading(false);
    }, 2800); // Wait for animation to complete

    return () => clearTimeout(timer);
  }, []);

  return (
    <NotificationProvider>
        <AnimatePresence>
            {isLoading && <SplashScreen key="splash" />}
        </AnimatePresence>
        {!isLoading && (
            <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                transition={{ duration: 0.5 }}
                className="h-full w-full"
            >
                <AppContent />
            </motion.div>
        )}
    </NotificationProvider>
  );
};

export default App;