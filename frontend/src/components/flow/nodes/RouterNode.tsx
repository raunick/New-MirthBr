import React, { memo, useCallback, useMemo } from 'react';
import { NodeProps, useNodeId, Position } from 'reactflow';
import { GitBranch, Plus, X } from 'lucide-react';
import { useFlowStore } from '@/stores/useFlowStore';
import InlineEdit from '../InlineEdit';
import BaseNode, { HandleConfig } from './BaseNode';
import './BaseNode.css';

interface Route {
    name: string;
    condition: string;
}

interface RouterData {
    label: string;
    routes: Route[];
}

const ROUTE_COLORS = ['#f97316', '#3b82f6', '#22c55e', '#a855f7', '#ec4899'];

/**
 * RouterNode - Content router processor
 * Refactored to use BaseNode with dynamic sourceHandles
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

    // Generate dynamic source handles from routes
    const sourceHandles: HandleConfig[] = useMemo(() =>
        routes.map((route, index) => ({
            id: `route-${index}`,
            color: ROUTE_COLORS[index % ROUTE_COLORS.length],
            label: route.name,
            style: { top: `${30 + (index * 18)}%` }
        })),
        [routes]
    );

    return (
        <BaseNode
            category="processor"
            icon={<GitBranch size={20} className="text-[var(--node-processor)]" />}
            label={data.label || 'Content Router'}
            subtitle="Router"
            width="260px"
            showSourceHandle={false}  // We use dynamic sourceHandles
            sourceHandles={sourceHandles}
        >
            <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                {routes.map((route, index) => (
                    <div
                        key={index}
                        className="flex items-center gap-2 p-1.5 rounded-lg bg-[var(--background)]/50 border border-[var(--glass-border)]"
                        style={{ borderLeftColor: ROUTE_COLORS[index % ROUTE_COLORS.length], borderLeftWidth: 3 }}
                    >
                        <div
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: ROUTE_COLORS[index % ROUTE_COLORS.length] }}
                        />
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
        </BaseNode>
    );
};

export default memo(RouterNode);
