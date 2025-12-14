import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { FileJson } from 'lucide-react';
import InlineEdit from '../InlineEdit';

interface HL7ParserData {
    label: string;
    inputFormat: string;
    outputFormat: string;
    onDataChange?: (field: string, value: string | number) => void;
}

const formatOptions = [
    { value: 'hl7v2', label: 'HL7 v2.x' },
    { value: 'hl7v3', label: 'HL7 v3' },
    { value: 'fhir', label: 'FHIR JSON' },
    { value: 'json', label: 'JSON' },
    { value: 'xml', label: 'XML' },
];

const HL7ParserNode = ({ data, id }: NodeProps<HL7ParserData>) => {
    const handleChange = (field: string, value: string | number) => {
        data.onDataChange?.(field, value);
    };

    return (
        <div className="flow-node processor px-4 py-3 w-[260px]">
            <Handle
                type="target"
                position={Position.Left}
                className="!w-3 !h-3 !bg-[var(--node-processor)] !border-2 !border-[var(--background)]"
            />

            <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-[var(--node-processor)]/20 flex items-center justify-center">
                    <FileJson size={20} className="text-[var(--node-processor)]" />
                </div>
                <div className="flex-1">
                    <InlineEdit
                        value={data.label || 'HL7 Parser'}
                        onChange={(v) => handleChange('label', v)}
                        className="text-sm font-semibold text-[var(--foreground)]"
                        displayClassName="hover:text-[var(--primary)] cursor-text"
                        inputClassName="bg-transparent border-b border-[var(--primary)] outline-none w-full"
                    />
                    <div className="text-xs text-[var(--foreground-muted)]">Format Converter</div>
                </div>
            </div>

            <div className="space-y-2">
                <div className="p-2 rounded-lg bg-[var(--background)]/50 border border-[var(--glass-border)]">
                    <div className="text-xs text-[var(--foreground-muted)] mb-1">Input Format</div>
                    <InlineEdit
                        value={data.inputFormat || 'hl7v2'}
                        onChange={(v) => handleChange('inputFormat', v)}
                        type="select"
                        options={formatOptions}
                        className="text-sm font-semibold text-[var(--node-processor)]"
                        displayClassName="hover:bg-[var(--background)] px-2 py-0.5 rounded cursor-pointer"
                        inputClassName="bg-[var(--background)] border border-[var(--node-processor)] rounded px-2 py-0.5 w-full outline-none"
                    />
                </div>

                <div className="flex justify-center">
                    <div className="text-[var(--foreground-muted)]">↓</div>
                </div>

                <div className="p-2 rounded-lg bg-[var(--background)]/50 border border-[var(--glass-border)]">
                    <div className="text-xs text-[var(--foreground-muted)] mb-1">Output Format</div>
                    <InlineEdit
                        value={data.outputFormat || 'fhir'}
                        onChange={(v) => handleChange('outputFormat', v)}
                        type="select"
                        options={formatOptions}
                        className="text-sm font-semibold text-[var(--success)]"
                        displayClassName="hover:bg-[var(--background)] px-2 py-0.5 rounded cursor-pointer"
                        inputClassName="bg-[var(--background)] border border-[var(--success)] rounded px-2 py-0.5 w-full outline-none"
                    />
                </div>
            </div>

            <Handle
                type="source"
                position={Position.Right}
                className="!w-3 !h-3 !bg-[var(--node-processor)] !border-2 !border-[var(--background)]"
            />
        </div>
    );
};

export default memo(HL7ParserNode);
