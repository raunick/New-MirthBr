import React, { ReactNode } from 'react';
import { Handle, Position, useNodeId } from 'reactflow';
import { useFlowStore } from '@/stores/useFlowStore';

export type NodeCategory = 'source' | 'processor' | 'destination' | 'utility';
export type NodeStatus = 'idle' | 'loading' | 'success' | 'error';

interface BaseNodeProps {
    children: ReactNode;
    category: NodeCategory;
    status?: NodeStatus;
    icon?: ReactNode;
    label?: string;
    subtitle?: string;
    className?: string;
    showSourceHandle?: boolean;
    showTargetHandle?: boolean;
    sourceHandleId?: string;
    targetHandleId?: string;
    width?: string;
}

const CATEGORY_COLORS: Record<NodeCategory, string> = {
    source: 'var(--node-source)',
    processor: 'var(--node-processor)',
    destination: 'var(--node-destination)',
    utility: 'var(--warning)',
};

const STATUS_CLASSES: Record<NodeStatus, string> = {
    idle: '',
    loading: 'base-node--loading',
    success: 'base-node--success',
    error: 'base-node--error',
};

// Exportable subcomponents for composable nodes (like DeployNode)
export function BaseNodeHeader({
    icon,
    label,
    subtitle,
    categoryColor = 'var(--primary)'
}: {
    icon?: ReactNode;
    label?: string;
    subtitle?: string;
    categoryColor?: string;
}) {
    if (!icon && !label) return null;
    return (
        <div className="base-node__header">
            {icon && (
                <div
                    className="base-node__icon"
                    style={{ backgroundColor: `color-mix(in srgb, ${categoryColor} 20%, transparent)` }}
                >
                    {icon}
                </div>
            )}
            {(label || subtitle) && (
                <div className="base-node__titles">
                    {label && <div className="base-node__label">{label}</div>}
                    {subtitle && <div className="base-node__subtitle">{subtitle}</div>}
                </div>
            )}
        </div>
    );
}

export function BaseNodeContent({ children, className = '' }: { children: ReactNode; className?: string }) {
    return (
        <div className={`base-node__content ${className}`}>
            {children}
        </div>
    );
}

export function BaseNodeFooter({ children, className = '' }: { children: ReactNode; className?: string }) {
    return (
        <div className={`p-2 border-t border-[var(--glass-border)] bg-[var(--glass-bg)]/50 ${className}`}>
            {children}
        </div>
    );
}


export function BaseNode({
    children,
    category,
    status = 'idle',
    icon,
    label,
    subtitle,
    className = '',
    showSourceHandle = true,
    showTargetHandle = true,
    sourceHandleId,
    targetHandleId,
    width = '260px',
}: BaseNodeProps) {
    const nodeId = useNodeId();
    const isSelected = useFlowStore((state) =>
        state.nodes.find(n => n.id === nodeId)?.selected ?? false
    );

    const categoryColor = CATEGORY_COLORS[category];
    const statusClass = STATUS_CLASSES[status];

    return (
        <div
            className={`base-node flow-node ${category} ${statusClass} ${className}`}
            style={{
                width,
                '--node-category-color': categoryColor,
                borderLeftColor: category === 'utility' ? categoryColor : undefined,
            } as React.CSSProperties}
            data-selected={isSelected}
        >
            {/* Status Indicator Dot */}
            <StatusIndicator status={status} />

            {/* Target Handle */}
            {showTargetHandle && (
                <Handle
                    type="target"
                    position={Position.Left}
                    id={targetHandleId}
                    className="!w-3 !h-3 !border-2 !border-[var(--background)]"
                    style={{ backgroundColor: categoryColor }}
                />
            )}

            <BaseNodeHeader icon={icon} label={label} subtitle={subtitle} categoryColor={categoryColor} />

            <BaseNodeContent>
                {children}
            </BaseNodeContent>

            {/* Source Handle */}
            {showSourceHandle && (
                <Handle
                    type="source"
                    position={Position.Right}
                    id={sourceHandleId}
                    className="!w-3 !h-3 !border-2 !border-[var(--background)]"
                    style={{ backgroundColor: categoryColor }}
                />
            )}
        </div>
    );
}

/**
 * StatusIndicator - Standalone status component for custom positioning
 */
export function StatusIndicator({ status }: { status: NodeStatus }) {
    if (status === 'idle') return null;

    return (
        <div className={`base-node__status base-node__status--${status}`} />
    );
}

export function NodeStatusIndicator({ status, variant, children }: { status: NodeStatus, variant?: string, children: ReactNode }) {
    // Wrapper component requested by user, allows wrapping entire node with status border/effect if needed
    // For now just renders children, as our status logic is inside BaseNode or specific components.
    // But user example showed <NodeStatusIndicator status={status}> <BaseNode> ... </NodeStatusIndicator>
    // If we want to support that visual style where the border changes based on status:
    const statusClass = STATUS_CLASSES[status] || '';
    return (
        <div className={`status-wrapper ${statusClass}`}>
            {children}
            {/* If variant='border', we might trust CSS on this class */}
        </div>
    )
}

export default BaseNode;
