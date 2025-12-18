import React, { memo, useCallback } from 'react';
import { Handle, Position, NodeProps, useNodeId } from 'reactflow';
import { GitBranch, Plus, X } from 'lucide-react';
import { useFlowStore } from '@/stores/useFlowStore';
import InlineEdit from '../InlineEdit';

interface Route {
    name: string;
    condition: string;
}

interface RouterData {
    label: string;
    routes: Route[];
}

/**
 * RouterNode - Content router processor
 * Refactored to access store directly (no callback injection)
 */
const RouterNode = ({ data }: NodeProps<RouterData>) => {
    const nodeId = useNodeId();
    const updateNodeData = useFlowStore((state) => state.updateNodeData);

    const routes = data.routes || [
        { name: 'Route A', condition: 'type == "A"' },
        { name: 'Route B', condition: 'type == "B"' },
    ];

    const handleChange = useCallback((field: string, value: any) => {
        if (nodeId) {
            updateNodeData(nodeId, field, value);
        }
    }, [nodeId, updateNodeData]);

    const updateRoute = useCallback((index: number, field: 'name' | 'condition', value: string) => {
        const newRoutes = [...routes];
        newRoutes[index] = { ...newRoutes[index], [field]: value };
        handleChange('routes', newRoutes);
    }, [routes, handleChange]);

    const addRoute = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        handleChange('routes', [...routes, { name: `Route ${routes.length + 1}`, condition: '' }]);
    }, [routes, handleChange]);

    const removeRoute = useCallback((e: React.MouseEvent, index: number) => {
        e.stopPropagation();
        if (routes.length > 1) {
            handleChange('routes', routes.filter((_, i) => i !== index));
        }
    }, [routes, handleChange]);

    const colors = ['#f97316', '#3b82f6', '#22c55e', '#a855f7', '#ec4899'];

    return (
        <div className="flow-node processor px-4 py-3 w-[260px]">
            <Handle
                type="target"
                position={Position.Left}
                className="!w-3 !h-3 !bg-[var(--node-processor)] !border-2 !border-[var(--background)]"
            />

            <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-[var(--node-processor)]/20 flex items-center justify-center">
                    <GitBranch size={20} className="text-[var(--node-processor)]" />
                </div>
                <div className="flex-1">
                    <InlineEdit
                        value={data.label || 'Content Router'}
                        onChange={(v) => handleChange('label', v)}
                        className="text-sm font-semibold text-[var(--foreground)]"
                        displayClassName="hover:text-[var(--primary)] cursor-text"
                        inputClassName="bg-transparent border-b border-[var(--primary)] outline-none w-full"
                    />
                    <div className="text-xs text-[var(--foreground-muted)]">Router</div>
                </div>
            </div>

            <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                {routes.map((route, index) => (
                    <div
                        key={index}
                        className="flex items-center gap-2 p-1.5 rounded-lg bg-[var(--background)]/50 border border-[var(--glass-border)]"
                        style={{ borderLeftColor: colors[index % colors.length], borderLeftWidth: 3 }}
                    >
                        <InlineEdit
                            value={route.name}
                            onChange={(v) => updateRoute(index, 'name', String(v))}
                            className="flex-1 text-xs font-medium"
                            displayClassName="hover:bg-[var(--background)] px-1 rounded cursor-text"
                            inputClassName="bg-[var(--background)] border border-[var(--glass-border)] rounded px-1 w-full outline-none"
                        />
                        <button
                            onClick={(e) => removeRoute(e, index)}
                            className="text-[var(--foreground-muted)] hover:text-[var(--error)] p-0.5"
                        >
                            <X size={12} />
                        </button>
                    </div>
                ))}
            </div>

            <button
                onClick={addRoute}
                className="w-full mt-2 p-1.5 rounded-lg border border-dashed border-[var(--glass-border)] 
                         hover:border-[var(--node-processor)] transition-colors flex items-center justify-center gap-1
                         text-xs text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
            >
                <Plus size={12} />
                Add Route
            </button>

            {routes.map((route, index) => (
                <Handle
                    key={index}
                    type="source"
                    position={Position.Right}
                    id={`route-${index}`}
                    style={{
                        top: `${30 + (index * 20)}%`,
                        background: colors[index % colors.length]
                    }}
                    className="!w-3 !h-3 !border-2 !border-[var(--background)]"
                />
            ))}
        </div>
    );
};

export default memo(RouterNode);

