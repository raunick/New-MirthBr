import { useMemo, useEffect } from 'react';
import { useFlowStore } from '@/stores/useFlowStore';

/**
 * useConfigEdge - Hook to synchronize node data from connected configuration nodes
 * 
 * @param nodeId The ID of the current node
 * @param handleId The target handle ID (e.g., 'config-port')
 * @param field The field in node data to update (e.g., 'port')
 * @param handleChange Callback to update the node data
 * @param typeFilter Optional filter for source node type (e.g., 'portNode')
 */
export const useConfigEdge = (
    nodeId: string,
    handleId: string,
    field: string,
    handleChange: (field: string, value: any) => void,
    typeFilter?: string
) => {
    // Stable selectors
    const edges = useFlowStore((state) => state.edges);
    const nodes = useFlowStore((state) => state.nodes);

    // Memoize the specific edge connection
    const configEdge = useMemo(() =>
        edges.find(e => e.target === nodeId && e.targetHandle === handleId),
        [edges, nodeId, handleId]
    );

    useEffect(() => {
        if (configEdge) {
            const sourceNode = nodes.find(n => n.id === configEdge.source);

            if (sourceNode) {
                if (typeFilter && sourceNode.type !== typeFilter) {
                    return;
                }

                // Try to resolve value from common patterns
                const val = sourceNode.data.value ??
                    sourceNode.data[field] ??
                    sourceNode.data.text ??
                    sourceNode.data.port;

                if (val !== undefined && val !== null) {
                    handleChange(field, val);
                }
            }
        }
    }, [configEdge, nodes, field, handleChange, typeFilter]);
};
