import { useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { BrandingProvider } from "@/contexts/BrandingContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { StaffGuard } from "@/components/guards/StaffGuard";
import { SplashScreen } from "@/components/splash/SplashScreen";
import FeedPage from "./pages/FeedPage";
import PlanningPage from "./pages/PlanningPage";
import InscriptionsPage from "./pages/InscriptionsPage";
import ContactPage from "./pages/ContactPage";
import NotificationsPage from "./pages/NotificationsPage";
import PostDetailPage from "./pages/PostDetailPage";
import EventDetailPage from "./pages/EventDetailPage";
import SettingsPage from "./pages/SettingsPage";
import AuthPage from "./pages/AuthPage";
import StaffPage from "./pages/staff/StaffPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AppContent() {
  const [showSplash, setShowSplash] = useState(() => {
    // Only show splash on first visit of this session
    const hasSeenSplash = sessionStorage.getItem('hasSeenSplash');
    return !hasSeenSplash;
  });

  const handleSplashComplete = () => {
    sessionStorage.setItem('hasSeenSplash', 'true');
    setShowSplash(false);
  };

  if (showSplash) {
    return <SplashScreen onComplete={handleSplashComplete} />;
  }

  return (
    <BrowserRouter basename="/esb-app">
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/" element={<AppLayout><FeedPage /></AppLayout>} />
        <Route path="/planning" element={<AppLayout><PlanningPage /></AppLayout>} />
        <Route path="/inscriptions" element={<AppLayout><InscriptionsPage /></AppLayout>} />
        <Route path="/contact" element={<AppLayout><ContactPage /></AppLayout>} />
        <Route path="/notifications" element={<AppLayout><NotificationsPage /></AppLayout>} />
        <Route path="/settings" element={<AppLayout><SettingsPage /></AppLayout>} />
        <Route path="/posts/:id" element={<AppLayout><PostDetailPage /></AppLayout>} />
        <Route path="/events/:id" element={<AppLayout><EventDetailPage /></AppLayout>} />
        <Route
          path="/staff"
          element={
            <AppLayout>
              <StaffGuard>
                <StaffPage />
              </StaffGuard>
            </AppLayout>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <BrandingProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <AppContent />
        </TooltipProvider>
      </BrandingProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
