import React from 'react';
import { Handle, Position } from 'reactflow';
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

export function DeployNode({ id, data }: DeployNodeProps) {
    const deployStatus = useFlowStore((state) => state.deployStatus[id] || 'initial');
    const channelStatus = useFlowStore((state) => state.channelStatus);
    const executeDeploy = useFlowStore((state) => state.executeDeploy);
    const toggleChannelStatus = useFlowStore((state) => state.toggleChannelStatus);
    const deleteNode = useFlowStore((state) => state.deleteNode);

    const isRunning = channelStatus === 'online';
    const isDeploying = deployStatus === 'loading';

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
        if (confirm('Are you sure you want to delete this channel deployment node?')) {
            deleteNode(id);
        }
    };

    // Determine status for BaseNode
    let nodeStatus: 'idle' | 'loading' | 'success' | 'error' = 'idle';
    if (deployStatus === 'loading') nodeStatus = 'loading';
    if (deployStatus === 'success' || channelStatus === 'online') nodeStatus = 'success';
    if (deployStatus === 'error') nodeStatus = 'error';

    return (
        <NodeStatusIndicator status={nodeStatus} variant="border">
            <BaseNode
                category="utility"
                status={nodeStatus}
                width="300px" // Slightly wider
                className={`border-2 shadow-lg transition-colors ${isRunning ? 'border-emerald-500 shadow-emerald-500/20' :
                        deployStatus === 'error' ? 'border-red-500' : 'border-[var(--primary)]'
                    }`}
            // We construct the internals manually using subcomponents
            >
                {/* Override standard BaseNode children */}

                <BaseNodeHeader
                    icon={<Rocket size={16} className={isRunning ? 'text-emerald-500' : ''} />}
                    label={data.label || "Channel Terminal"}
                    subtitle={isRunning ? "Running" : "Stopped"}
                />

                <BaseNodeContent className="flex flex-col gap-2 min-h-[60px] justify-center text-center">
                    <p className="text-xs text-[var(--foreground-muted)]">
                        {isRunning
                            ? "Channel is active and processing messages."
                            : "Connect flow here and deploy to activate."}
                    </p>
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
                            disabled={isRunning || isDeploying}
                            className={`p-1.5 rounded-md transition-colors ${isRunning ? 'opacity-50 cursor-not-allowed text-emerald-500' : 'hover:bg-[var(--glass-bg)] hover:text-emerald-500'
                                }`}
                            title="Start Channel"
                        >
                            <Play size={18} fill={isRunning ? "currentColor" : "none"} />
                        </button>

                        <button
                            onClick={handlePause}
                            disabled={!isRunning || isDeploying}
                            className={`p-1.5 rounded-md transition-colors ${!isRunning ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[var(--glass-bg)] hover:text-amber-500'
                                }`}
                            title="Pause Channel"
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
