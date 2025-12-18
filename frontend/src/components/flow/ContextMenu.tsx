"use client";

import React, { useCallback } from 'react';
import { Copy, Trash2, Edit3, Play, Clipboard, Layers, X, Rocket } from 'lucide-react';

interface ContextMenuProps {
    id: string;
    type: 'node' | 'edge' | 'pane';
    top?: number;
    left?: number;
    right?: number;
    bottom?: number;
    onClose: () => void;
    onDelete?: (id: string) => void;
    onDuplicate?: (id: string) => void;
    onEdit?: (id: string) => void;
    onTest?: (id: string) => void;
    onCopy?: (id: string) => void;
    onPaste?: () => void;
    onAddNode?: (type: string) => void;
}

const ContextMenu = ({
    id,
    type,
    top,
    left,
    right,
    bottom,
    onClose,
    onDelete,
    onDuplicate,
    onEdit,
    onTest,
    onCopy,
    onPaste,
    onAddNode,
}: ContextMenuProps) => {

    const handleAction = useCallback((action: () => void) => {
        action();
        onClose();
    }, [onClose]);

    const menuStyle: React.CSSProperties = {
        position: 'absolute',
        top: top ?? undefined,
        left: left ?? undefined,
        right: right ?? undefined,
        bottom: bottom ?? undefined,
        zIndex: 1000,
    };

    // Node context menu
    if (type === 'node') {
        return (
            <div
                style={menuStyle}
                className="glass rounded-lg border border-[var(--glass-border)] shadow-xl overflow-hidden min-w-[180px]"
            >
                <div className="p-2 border-b border-[var(--glass-border)] flex items-center justify-between">
                    <span className="text-xs text-[var(--foreground-muted)] font-medium">Node Actions</span>
                    <button
                        onClick={onClose}
                        className="text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors"
                    >
                        <X size={14} />
                    </button>
                </div>
                <div className="p-1">
                    <button
                        onClick={() => handleAction(() => onEdit?.(id))}
                        className="w-full px-3 py-2 flex items-center gap-3 text-sm text-[var(--foreground)] hover:bg-[var(--primary)]/10 rounded-md transition-colors"
                    >
                        <Edit3 size={14} className="text-[var(--primary)]" />
                        Edit Node
                    </button>
                    <button
                        onClick={() => handleAction(() => onDuplicate?.(id))}
                        className="w-full px-3 py-2 flex items-center gap-3 text-sm text-[var(--foreground)] hover:bg-[var(--primary)]/10 rounded-md transition-colors"
                    >
                        <Copy size={14} className="text-[var(--secondary)]" />
                        Duplicate
                    </button>
                    <button
                        onClick={() => handleAction(() => onCopy?.(id))}
                        className="w-full px-3 py-2 flex items-center gap-3 text-sm text-[var(--foreground)] hover:bg-[var(--primary)]/10 rounded-md transition-colors"
                    >
                        <Clipboard size={14} className="text-[var(--foreground-muted)]" />
                        Copy
                    </button>
                    <button
                        onClick={() => handleAction(() => onTest?.(id))}
                        className="w-full px-3 py-2 flex items-center gap-3 text-sm text-[var(--foreground)] hover:bg-[var(--success)]/10 rounded-md transition-colors"
                    >
                        <Play size={14} className="text-[var(--success)]" />
                        Test Node
                    </button>
                    <div className="my-1 border-t border-[var(--glass-border)]" />
                    <button
                        onClick={() => handleAction(() => onDelete?.(id))}
                        className="w-full px-3 py-2 flex items-center gap-3 text-sm text-[var(--error)] hover:bg-[var(--error)]/10 rounded-md transition-colors"
                    >
                        <Trash2 size={14} />
                        Delete Node
                    </button>
                </div>
            </div>
        );
    }

    // Edge context menu
    if (type === 'edge') {
        return (
            <div
                style={menuStyle}
                className="glass rounded-lg border border-[var(--glass-border)] shadow-xl overflow-hidden min-w-[160px]"
            >
                <div className="p-2 border-b border-[var(--glass-border)] flex items-center justify-between">
                    <span className="text-xs text-[var(--foreground-muted)] font-medium">Edge Actions</span>
                    <button
                        onClick={onClose}
                        className="text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors"
                    >
                        <X size={14} />
                    </button>
                </div>
                <div className="p-1">
                    <button
                        onClick={() => handleAction(() => onDelete?.(id))}
                        className="w-full px-3 py-2 flex items-center gap-3 text-sm text-[var(--error)] hover:bg-[var(--error)]/10 rounded-md transition-colors"
                    >
                        <Trash2 size={14} />
                        Delete Connection
                    </button>
                </div>
            </div>
        );
    }

    // Pane (canvas) context menu
    return (
        <div
            style={menuStyle}
            className="glass rounded-lg border border-[var(--glass-border)] shadow-xl overflow-hidden min-w-[200px]"
        >
            <div className="p-2 border-b border-[var(--glass-border)] flex items-center justify-between">
                <span className="text-xs text-[var(--foreground-muted)] font-medium">Canvas Actions</span>
                <button
                    onClick={onClose}
                    className="text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors"
                >
                    <X size={14} />
                </button>
            </div>
            <div className="p-1">
                <div className="px-3 py-1.5 text-xs text-[var(--foreground-muted)] font-medium">Add Node</div>
                <button
                    onClick={() => handleAction(() => onAddNode?.('httpListener'))}
                    className="w-full px-3 py-2 flex items-center gap-3 text-sm text-[var(--foreground)] hover:bg-[var(--node-source)]/10 rounded-md transition-colors"
                >
                    <Layers size={14} className="text-[var(--node-source)]" />
                    HTTP Listener
                </button>
                <button
                    onClick={() => handleAction(() => onAddNode?.('luaScript'))}
                    className="w-full px-3 py-2 flex items-center gap-3 text-sm text-[var(--foreground)] hover:bg-[var(--node-processor)]/10 rounded-md transition-colors"
                >
                    <Layers size={14} className="text-[var(--node-processor)]" />
                    Lua Script
                </button>
                <button
                    onClick={() => handleAction(() => onAddNode?.('fileWriter'))}
                    className="w-full px-3 py-2 flex items-center gap-3 text-sm text-[var(--foreground)] hover:bg-[var(--node-destination)]/10 rounded-md transition-colors"
                >
                    <Layers size={14} className="text-[var(--node-destination)]" />
                    File Writer
                </button>
                <button
                    onClick={() => handleAction(() => onAddNode?.('luaDestination'))}
                    className="w-full px-3 py-2 flex items-center gap-3 text-sm text-[var(--foreground)] hover:bg-[var(--node-destination)]/10 rounded-md transition-colors"
                >
                    <Layers size={14} className="text-[var(--node-destination)]" />
                    Lua Destination
                </button>
                <div className="my-1 border-t border-[var(--glass-border)]" />
                <button
                    onClick={() => handleAction(() => onAddNode?.('deployNode'))}
                    className="w-full px-3 py-2 flex items-center gap-3 text-sm text-[var(--foreground)] hover:bg-[var(--primary)]/10 rounded-md transition-colors"
                >
                    <Rocket size={14} className="text-[var(--primary)]" />
                    Deploy Node
                </button>
                <div className="my-1 border-t border-[var(--glass-border)]" />
                <button
                    onClick={() => handleAction(() => onPaste?.())}
                    className="w-full px-3 py-2 flex items-center gap-3 text-sm text-[var(--foreground)] hover:bg-[var(--primary)]/10 rounded-md transition-colors"
                >
                    <Clipboard size={14} className="text-[var(--foreground-muted)]" />
                    Paste
                </button>
            </div>
        </div>
    );
};

export default ContextMenu;
