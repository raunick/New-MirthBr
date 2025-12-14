import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Database, Edit3 } from 'lucide-react';
import InlineEdit from '../InlineEdit';

interface DatabaseWriterData {
    label: string;
    table: string;
    mode: string;
    query?: string;
    onDataChange?: (field: string, value: string | number) => void;
    onEditQuery?: (query: string) => void;
}

const modeOptions = [
    { value: 'insert', label: 'INSERT' },
    { value: 'upsert', label: 'UPSERT' },
    { value: 'update', label: 'UPDATE' },
    { value: 'custom', label: 'Custom SQL' },
];

const DatabaseWriterNode = ({ data, id }: NodeProps<DatabaseWriterData>) => {
    const handleChange = (field: string, value: string | number) => {
        data.onDataChange?.(field, value);
    };

    const isCustomMode = data.mode === 'custom';

    return (
        <div className="flow-node destination-db px-4 py-3 w-[260px]">
            <Handle
                type="target"
                position={Position.Left}
                className="!w-3 !h-3 !bg-[var(--node-destination-db)] !border-2 !border-[var(--background)]"
            />

            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[var(--node-destination-db)]/20 flex items-center justify-center">
                    <Database size={20} className="text-[var(--node-destination-db)]" />
                </div>
                <div className="flex-1">
                    <InlineEdit
                        value={data.label || 'Database Writer'}
                        onChange={(v) => handleChange('label', v)}
                        className="text-sm font-semibold text-[var(--foreground)]"
                        displayClassName="hover:text-[var(--primary)] cursor-text"
                        inputClassName="bg-transparent border-b border-[var(--primary)] outline-none w-full"
                    />
                    <div className="text-xs text-[var(--foreground-muted)]">Database Destination</div>
                </div>
            </div>

            <div className="mt-3 space-y-2">
                <div className="p-2 rounded-lg bg-[var(--background)]/50 border border-[var(--glass-border)]">
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-[var(--foreground-muted)]">Mode</span>
                        <InlineEdit
                            value={data.mode || 'insert'}
                            onChange={(v) => handleChange('mode', v)}
                            type="select"
                            options={modeOptions}
                            className="text-sm font-semibold text-[var(--node-destination-db)]"
                            displayClassName="hover:bg-[var(--background)] px-2 py-0.5 rounded cursor-pointer"
                            inputClassName="bg-[var(--background)] border border-[var(--node-destination-db)] rounded px-2 py-0.5 outline-none"
                        />
                    </div>
                </div>

                {!isCustomMode && (
                    <div className="p-2 rounded-lg bg-[var(--background)]/50 border border-[var(--glass-border)]">
                        <div className="text-xs text-[var(--foreground-muted)] mb-1">Table</div>
                        <InlineEdit
                            value={data.table || 'messages'}
                            onChange={(v) => handleChange('table', v)}
                            className="text-sm font-mono text-[var(--foreground)]"
                            displayClassName="hover:bg-[var(--background)] px-1 rounded cursor-text"
                            inputClassName="bg-[var(--background)] border border-[var(--glass-border)] rounded px-2 py-0.5 w-full outline-none"
                        />
                    </div>
                )}

                {isCustomMode && (
                    <button
                        onClick={() => data.onEditQuery?.(data.query || '')}
                        className="w-full p-2 rounded-lg bg-[var(--background)]/50 border border-[var(--glass-border)] 
                                 hover:border-[var(--node-destination-db)] transition-colors flex items-center justify-center gap-2
                                 text-sm text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
                    >
                        <Edit3 size={14} />
                        Edit SQL Query
                    </button>
                )}
            </div>
        </div>
    );
};

export default memo(DatabaseWriterNode);
