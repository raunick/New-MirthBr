"use client";

import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import FlowCanvas from "@/components/flow/FlowCanvas";
import { useState, useCallback, useEffect } from "react";
import { ReactFlowProvider } from "reactflow";
import LogViewer from "@/components/dashboard/LogViewer";
import MetricsDashboard from "@/components/dashboard/MetricsDashboard";
import MessageInjectorModal from "@/components/tools/MessageInjectorModal";
import LoginPage from "@/components/auth/LoginPage";
import AuthProvider from "@/components/auth/AuthProvider";
import { useAuthStore } from "@/stores/useAuthStore";

function MainApp() {
  const [isConnected] = useState(true);
  const [lastDeployStatus, setLastDeployStatus] = useState<'success' | 'error' | 'idle'>('idle');
  const [isLogsOpen, setIsLogsOpen] = useState(false);
  const [isInjectorOpen, setIsInjectorOpen] = useState(false);

  const [isMetricsOpen, setIsMetricsOpen] = useState(false);

  const handleDeploySuccess = useCallback(() => {
    setLastDeployStatus('success');
    setTimeout(() => setLastDeployStatus('idle'), 5000);
  }, []);

  const handleDeployError = useCallback(() => {
    setLastDeployStatus('error');
    setTimeout(() => setLastDeployStatus('idle'), 5000);
  }, []);

  return (
    <ReactFlowProvider>
      <div className="h-screen w-screen flex flex-col overflow-hidden">
        <Header
          isConnected={isConnected}
          lastDeployStatus={lastDeployStatus}
          onToggleLogs={() => setIsLogsOpen(!isLogsOpen)}
          onToggleMetrics={() => setIsMetricsOpen(!isMetricsOpen)}
          onTestChannel={() => setIsInjectorOpen(true)}
        />

        <div className="flex-1 flex overflow-hidden relative">
          <Sidebar />

          <main className="flex-1 relative">
            <FlowCanvas
              onDeploySuccess={handleDeploySuccess}
              onDeployError={handleDeployError}
            />
            <LogViewer isOpen={isLogsOpen} onClose={() => setIsLogsOpen(false)} />
            <MetricsDashboard isOpen={isMetricsOpen} onClose={() => setIsMetricsOpen(false)} />
            <MessageInjectorModal isOpen={isInjectorOpen} onClose={() => setIsInjectorOpen(false)} />
          </main>
        </div>
      </div>
    </ReactFlowProvider>
  );
}

export default function Home() {
  const { isAuthenticated, checkSession, logout } = useAuthStore();
  const [isClient, setIsClient] = useState(false);
  const [showLogin, setShowLogin] = useState(true);

  // Handle hydration
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Check session on mount
  useEffect(() => {
    if (isClient) {
      const sessionValid = checkSession();
      setShowLogin(!sessionValid);
    }
  }, [isClient, checkSession]);

  // Handle logout (from session expiry or manual)
  const handleLogout = useCallback(() => {
    logout();
    setShowLogin(true);
  }, [logout]);

  // Handle successful login
  const handleLoginSuccess = useCallback(() => {
    setShowLogin(false);
  }, []);

  // Prevent hydration mismatch
  if (!isClient) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[var(--background)]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary)]" />
      </div>
    );
  }

  // Show login if not authenticated
  if (showLogin || !isAuthenticated) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  // Show main app with auth provider
  return (
    <AuthProvider onLogout={handleLogout}>
      <MainApp />
    </AuthProvider>
  );
}

