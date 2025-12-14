"use client";

import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import FlowCanvas from "@/components/flow/FlowCanvas";
import { useState, useCallback } from "react";
import { ReactFlowProvider } from "reactflow";
import LogViewer from "@/components/dashboard/LogViewer";
import MessageInjectorModal from "@/components/tools/MessageInjectorModal";

export default function Home() {
  const [isConnected] = useState(true);
  const [lastDeployStatus, setLastDeployStatus] = useState<'success' | 'error' | 'idle'>('idle');
  const [isLogsOpen, setIsLogsOpen] = useState(false);
  const [isInjectorOpen, setIsInjectorOpen] = useState(false);

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
            <MessageInjectorModal isOpen={isInjectorOpen} onClose={() => setIsInjectorOpen(false)} />
          </main>
        </div>
      </div>
    </ReactFlowProvider>
  );
}
