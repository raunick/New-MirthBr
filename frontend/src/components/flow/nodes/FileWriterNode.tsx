import React, { memo, useState } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { FileText, ChevronDown, ChevronRight, Settings2, HelpCircle } from 'lucide-react';
import InlineEdit from '../InlineEdit';

interface FileWriterData {
    label: string;
    path: string;
    filename?: string;
    append?: boolean;
    encoding?: string;
    onDataChange?: (field: string, value: string | number | boolean) => void;
}

const ENCODING_OPTIONS = ['UTF-8', 'ISO-8859-1', 'ASCII', 'UTF-16'];

const FileWriterNode = ({ data, id }: NodeProps<FileWriterData>) => {
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [showTemplateHelp, setShowTemplateHelp] = useState(false);

    const handleChange = (field: string, value: string | number | boolean) => {
        data.onDataChange?.(field, value);
    };

    return (
        <div className="flow-node destination px-4 py-3 w-[280px]">
            <Handle
                type="target"
                position={Position.Left}
                className="!w-3 !h-3 !bg-[var(--node-destination)] !border-2 !border-[var(--background)]"
            />

            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[var(--node-destination)]/20 flex items-center justify-center">
                    <FileText size={20} className="text-[var(--node-destination)]" />
                </div>
                <div className="flex-1">
                    <InlineEdit
                        value={data.label || 'File Writer'}
                        onChange={(v) => handleChange('label', v)}
                        className="text-sm font-semibold text-[var(--foreground)]"
                        displayClassName="hover:text-[var(--primary)] cursor-text"
                        inputClassName="bg-transparent border-b border-[var(--primary)] outline-none w-full"
                    />
                    <div className="text-xs text-[var(--foreground-muted)]">
                        {data.append ? 'Append Mode' : 'File Destination'}
                    </div>
                </div>
            </div>

            <div className="mt-3 space-y-2">
                <div className="p-2 rounded-lg bg-[var(--background)]/50 border border-[var(--glass-border)]">
                    <div className="text-xs text-[var(--foreground-muted)] mb-1">Directory</div>
                    <InlineEdit
                        value={data.path || './output'}
                        onChange={(v) => handleChange('path', v)}
                        className="text-sm font-mono text-[var(--node-destination)]"
                        displayClassName="hover:bg-[var(--background)] px-1 rounded cursor-text truncate block"
                        inputClassName="bg-[var(--background)] border border-[var(--glass-border)] rounded px-2 py-0.5 w-full outline-none"
                    />
                </div>

                <div className="p-2 rounded-lg bg-[var(--background)]/50 border border-[var(--glass-border)]">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-[var(--foreground-muted)]">Filename Pattern</span>
                        <button
                            onClick={() => setShowTemplateHelp(!showTemplateHelp)}
                            className="text-[var(--foreground-muted)] hover:text-[var(--primary)]"
                            title="Template variables"
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
                        <div className="mt-2 p-2 bg-[var(--background-secondary)] rounded text-xs text-[var(--foreground-muted)] border border-[var(--glass-border)]">
                            <div className="font-medium mb-1">Available Variables:</div>
                            <code className="block">{'${timestamp}'} - ISO timestamp</code>
                            <code className="block">{'${uuid}'} - Unique ID</code>
                            <code className="block">{'${date}'} - YYYY-MM-DD</code>
                            <code className="block">{'${time}'} - HH-MM-SS</code>
                        </div>
                    )}
                </div>

                {/* Advanced Options */}
                <div className="rounded-lg bg-[var(--background)]/50 border border-[var(--glass-border)] overflow-hidden">
                    <button
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        className="w-full p-2 flex items-center justify-between text-xs text-[var(--foreground-muted)] hover:bg-[var(--glass-bg)] transition-colors"
                    >
                        <span className="flex items-center gap-1">
                            <Settings2 size={12} />
                            Advanced Options
                        </span>
                        {showAdvanced ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>

                    {showAdvanced && (
                        <div className="p-2 border-t border-[var(--glass-border)] space-y-2">
                            {/* Append Mode Toggle */}
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-[var(--foreground-muted)]">Append Mode</span>
                                <button
                                    onClick={() => handleChange('append', !data.append)}
                                    className={`w-10 h-5 rounded-full transition-colors relative ${data.append ? 'bg-green-500' : 'bg-[var(--glass-border)]'
                                        }`}
                                >
                                    <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all ${data.append ? 'right-0.5' : 'left-0.5'
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
        </div>
    );
};

export default memo(FileWriterNode);

