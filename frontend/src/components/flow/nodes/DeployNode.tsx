import React from 'react';
import { BaseNode, BaseNodeHeader, BaseNodeContent, BaseNodeFooter, NodeStatusIndicator } from './BaseNode';
import { useFlowStore } from '@/stores/useFlowStore';
import { Button } from '@/components/ui/button';
import { Rocket, Play, Pause, Trash } from 'lucide-react';

interface DeployNodeProps {
    id: string;
    data: {
        label?: string;
    };
}

/**
 * DeployNode - UI Control Panel Node (No Connections)
 * 
 * This is a floating control panel within the canvas that allows:
 * - Deploy: Saves the flow and activates the channel simultaneously
 * - Start: Starts a paused channel
 * - Pause: Pauses a running channel
 * - Delete: Removes this control panel node
 * 
 * This node does NOT have connection handles - it's a pure UI element.
 */
export function DeployNode({ id, data }: DeployNodeProps) {
    const deployStatus = useFlowStore((state) => state.deployStatus[id] || 'initial');
    const channelStatus = useFlowStore((state) => state.channelStatus);
    const deployErrorMessage = useFlowStore((state) => state.deployErrorMessage);
    const executeDeploy = useFlowStore((state) => state.executeDeploy);
    const toggleChannelStatus = useFlowStore((state) => state.toggleChannelStatus);
    const deleteNode = useFlowStore((state) => state.deleteNode);

    const isRunning = channelStatus === 'online';
    const isDeploying = deployStatus === 'loading';
    // Channel must be deployed before Start/Pause can work
    const hasDeployed = deployStatus === 'success';
    const hasError = deployStatus === 'error';

    const handleStart = async (e: React.MouseEvent) => {
        e.stopPropagation();
        await toggleChannelStatus(id, 'online');
    };

    const handlePause = async (e: React.MouseEvent) => {
        e.stopPropagation();
        await toggleChannelStatus(id, 'offline');
    };

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm('Are you sure you want to delete this control panel?')) {
            deleteNode(id);
        }
    };

    // Determine status for NodeStatusIndicator
    let nodeStatus: 'idle' | 'loading' | 'success' | 'error' = 'idle';
    if (deployStatus === 'loading') nodeStatus = 'loading';
    if (deployStatus === 'success' || channelStatus === 'online') nodeStatus = 'success';
    if (deployStatus === 'error') nodeStatus = 'error';

    return (
        <NodeStatusIndicator status={nodeStatus} variant="border">
            <BaseNode
                category="utility"
                status={nodeStatus}
                width="300px"
                className={`border-2 shadow-lg transition-colors ${isRunning ? 'border-emerald-500 shadow-emerald-500/20' :
                    deployStatus === 'error' ? 'border-red-500' : 'border-[var(--primary)]'
                    }`}
            >
                {/* No Handle components - This is a UI-only control panel */}

                <BaseNodeHeader
                    icon={<Rocket size={16} className={isRunning ? 'text-emerald-500' : hasError ? 'text-red-500' : ''} />}
                    label={data.label || "Control Panel"}
                    subtitle={isRunning ? "Online" : hasError ? "Error" : "Offline"}
                />

                <BaseNodeContent className="flex flex-col gap-2 min-h-[60px] justify-center text-center">
                    {/* Error feedback display */}
                    {hasError && deployErrorMessage ? (
                        <div className="bg-red-500/10 p-2 rounded border border-red-500/30">
                            <p className="text-[10px] text-red-400 font-mono leading-tight break-words">
                                {deployErrorMessage}
                            </p>
                        </div>
                    ) : (
                        <p className="text-xs text-[var(--foreground-muted)]">
                            {isRunning
                                ? "Channel is active and processing messages."
                                : hasError
                                    ? "Deployment failed. Check error above."
                                    : "Click Deploy to save and activate the channel."}
                        </p>
                    )}
                </BaseNodeContent>

                <BaseNodeFooter className="flex flex-col gap-3">
                    <Button
                        onClick={() => executeDeploy(id)}
                        disabled={isDeploying}
                        className={`w-full nodrag flex items-center justify-center gap-2 ${isRunning ? 'bg-emerald-600 hover:bg-emerald-700' : ''
                            }`}
                        variant={isRunning ? "default" : "secondary"}
                    >
                        {isDeploying ? 'Deploying...' : isRunning ? 'Update Deployment' : 'Deploy & Save'}
                    </Button>

                    <div className="flex justify-around pt-1">
                        <button
                            onClick={handleStart}
                            disabled={isRunning || isDeploying || !hasDeployed}
                            className={`p-1.5 rounded-md transition-colors ${isRunning || !hasDeployed ? 'opacity-50 cursor-not-allowed text-emerald-500' : 'hover:bg-[var(--glass-bg)] hover:text-emerald-500'
                                }`}
                            title={hasDeployed ? "Start Channel" : "Deploy first to enable"}
                        >
                            <Play size={18} fill={isRunning ? "currentColor" : "none"} />
                        </button>

                        <button
                            onClick={handlePause}
                            disabled={!isRunning || isDeploying || !hasDeployed}
                            className={`p-1.5 rounded-md transition-colors ${!isRunning || !hasDeployed ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[var(--glass-bg)] hover:text-amber-500'
                                }`}
                            title={hasDeployed ? "Pause Channel" : "Deploy first to enable"}
                        >
                            <Pause size={18} fill={!isRunning ? "none" : "currentColor"} />
                        </button>

                        <button
                            onClick={handleDelete}
                            className="p-1.5 rounded-md transition-colors hover:bg-[var(--glass-bg)] hover:text-red-500"
                            title="Delete Node"
                        >
                            <Trash size={18} />
                        </button>
                    </div>
                </BaseNodeFooter>
            </BaseNode>
        </NodeStatusIndicator>
    );
}

export default DeployNode;
