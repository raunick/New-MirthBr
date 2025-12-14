import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { FileText } from 'lucide-react';
import InlineEdit from '../InlineEdit';

interface FileWriterData {
    label: string;
    path: string;
    filename?: string;
    onDataChange?: (field: string, value: string | number) => void;
}

const FileWriterNode = ({ data, id }: NodeProps<FileWriterData>) => {
    const handleChange = (field: string, value: string | number) => {
        data.onDataChange?.(field, value);
    };

    return (
        <div className="flow-node destination px-4 py-3 w-[260px]">
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
                    <div className="text-xs text-[var(--foreground-muted)]">File Destination</div>
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
                    <div className="text-xs text-[var(--foreground-muted)] mb-1">Filename Pattern</div>
                    <InlineEdit
                        value={data.filename || '${timestamp}.txt'}
                        onChange={(v) => handleChange('filename', v)}
                        placeholder="${timestamp}.txt"
                        className="text-sm font-mono text-[var(--foreground)]"
                        displayClassName="hover:bg-[var(--background)] px-1 rounded cursor-text"
                        inputClassName="bg-[var(--background)] border border-[var(--glass-border)] rounded px-2 py-0.5 w-full outline-none"
                    />
                </div>
            </div>
        </div>
    );
};

export default memo(FileWriterNode);
