import React, { memo, useState, useCallback } from 'react';
import { Handle, Position, NodeProps, useNodeId } from 'reactflow';
import { FileText, ChevronDown, ChevronRight, Settings2, HelpCircle } from 'lucide-react';
import { useFlowStore } from '@/stores/useFlowStore';
import InlineEdit from '../InlineEdit';
import BaseNode from './BaseNode';

interface FileWriterData {
    label: string;
    path: string;
    filename?: string;
    append?: boolean;
    encoding?: string;
}

const ENCODING_OPTIONS = ['UTF-8', 'ISO-8859-1', 'ASCII', 'UTF-16'];

/**
 * FileWriterNode - File destination node
 * Refactored to access store directly (no callback injection)
 */
const FileWriterNode = ({ data }: NodeProps<FileWriterData>) => {
    const nodeId = useNodeId();
    const updateNodeData = useFlowStore((state) => state.updateNodeData);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [showTemplateHelp, setShowTemplateHelp] = useState(false);

    const handleChange = useCallback((field: string, value: string | number | boolean) => {
        if (nodeId) {
            updateNodeData(nodeId, field, value);
        }
    }, [nodeId, updateNodeData]);

    return (
        <BaseNode
            category="destination"
            icon={<FileText size={20} />}
            label={data.label || 'File Writer'}
            subtitle={data.append ? 'Append Mode' : 'File Destination'}
            className="w-[280px]"
        >
            <div className="space-y-2">
                {/* Directory Config */}
                <div className="p-2 rounded-lg bg-[var(--background)]/50 border border-[var(--glass-border)] group">
                    <div className="text-xs text-[var(--foreground-muted)] mb-1 font-medium group-hover:text-[var(--node-destination)] transition-colors">Directory</div>
                    <InlineEdit
                        value={data.path || './output'}
                        onChange={(v) => handleChange('path', v)}
                        className="text-sm font-mono text-[var(--node-destination)]"
                        displayClassName="hover:bg-[var(--background)] px-1 rounded cursor-text truncate block"
                        inputClassName="bg-[var(--background)] border border-[var(--glass-border)] rounded px-2 py-0.5 w-full outline-none"
                    />
                </div>

                {/* Filename Config */}
                <div className="p-2 rounded-lg bg-[var(--background)]/50 border border-[var(--glass-border)] group">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-[var(--foreground-muted)] font-medium group-hover:text-[var(--primary)] transition-colors">Filename Pattern</span>
                        <button
                            onClick={() => setShowTemplateHelp(!showTemplateHelp)}
                            className="text-[var(--foreground-muted)] hover:text-[var(--primary)]"
                            title="Show available template variables"
                        >
                            <HelpCircle size={12} />
                        </button>
                    </div>
                    <InlineEdit
                        value={data.filename || '${timestamp}.txt'}
                        onChange={(v) => handleChange('filename', v)}
                        placeholder="${timestamp}.txt"
                        className="text-sm font-mono text-[var(--foreground)]"
                        displayClassName="hover:bg-[var(--background)] px-1 rounded cursor-text"
                        inputClassName="bg-[var(--background)] border border-[var(--glass-border)] rounded px-2 py-0.5 w-full outline-none"
                    />
                    {showTemplateHelp && (
                        <div className="mt-2 p-2 bg-[var(--background-secondary)] rounded text-xs text-[var(--foreground-muted)] border border-[var(--glass-border)] animate-in slide-in-from-top-1">
                            <div className="font-medium mb-1 text-[var(--foreground)]">Available Variables:</div>
                            <code className="block text-[10px]">{'${timestamp}'} - ISO timestamp</code>
                            <code className="block text-[10px]">{'${uuid}'} - Unique ID</code>
                            <code className="block text-[10px]">{'${date}'} - YYYY-MM-DD</code>
                            <code className="block text-[10px]">{'${time}'} - HH-MM-SS</code>
                        </div>
                    )}
                </div>

                {/* Advanced Options */}
                <div className="rounded-lg bg-[var(--background)]/50 border border-[var(--glass-border)] overflow-hidden">
                    <button
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        className="w-full p-2 flex items-center justify-between text-xs text-[var(--foreground-muted)] hover:bg-[var(--glass-bg)] transition-colors"
                    >
                        <span className="flex items-center gap-1 font-medium">
                            <Settings2 size={12} />
                            Advanced Options
                        </span>
                        {showAdvanced ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>

                    {showAdvanced && (
                        <div className="p-2 border-t border-[var(--glass-border)] space-y-2 animate-in slide-in-from-top-1">
                            {/* Append Mode Toggle */}
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-[var(--foreground-muted)]">Append Mode</span>
                                <button
                                    onClick={() => handleChange('append', !data.append)}
                                    className={`w-8 h-4 rounded-full transition-colors relative ${data.append ? 'bg-green-500' : 'bg-[var(--glass-border)]'
                                        }`}
                                    title="Toggle Append Mode"
                                >
                                    <div className={`w-3 h-3 rounded-full bg-white absolute top-0.5 transition-all ${data.append ? 'right-0.5' : 'left-0.5'
                                        }`} />
                                </button>
                            </div>

                            {/* Encoding Dropdown */}
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-[var(--foreground-muted)]">Encoding</span>
                                <select
                                    value={data.encoding || 'UTF-8'}
                                    onChange={(e) => handleChange('encoding', e.target.value)}
                                    className="text-xs bg-[var(--background)] border border-[var(--glass-border)] rounded px-2 py-1 outline-none focus:border-[var(--primary)]"
                                >
                                    {ENCODING_OPTIONS.map(enc => (
                                        <option key={enc} value={enc}>{enc}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </BaseNode>
    );
};

export default memo(FileWriterNode);
