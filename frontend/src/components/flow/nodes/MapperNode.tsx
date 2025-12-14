import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { ArrowRightLeft, Plus, X } from 'lucide-react';
import InlineEdit from '../InlineEdit';

interface Mapping {
    source: string;
    target: string;
}

interface MapperData {
    label: string;
    mappings: Mapping[];
    onDataChange?: (field: string, value: any) => void;
}

const MapperNode = ({ data, id }: NodeProps<MapperData>) => {
    const mappings = data.mappings || [{ source: 'field1', target: 'newField1' }];

    const handleChange = (field: string, value: any) => {
        data.onDataChange?.(field, value);
    };

    const updateMapping = (index: number, field: 'source' | 'target', value: string) => {
        const newMappings = [...mappings];
        newMappings[index] = { ...newMappings[index], [field]: value };
        handleChange('mappings', newMappings);
    };

    const addMapping = (e: React.MouseEvent) => {
        e.stopPropagation();
        handleChange('mappings', [...mappings, { source: '', target: '' }]);
    };

    const removeMapping = (e: React.MouseEvent, index: number) => {
        e.stopPropagation();
        handleChange('mappings', mappings.filter((_, i) => i !== index));
    };

    return (
        <div className="flow-node processor-mapper px-4 py-3 w-[280px]">
            <Handle
                type="target"
                position={Position.Left}
                className="!w-3 !h-3 !bg-[var(--node-processor-mapper)] !border-2 !border-[var(--background)]"
            />

            <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-[var(--node-processor-mapper)]/20 flex items-center justify-center">
                    <ArrowRightLeft size={20} className="text-[var(--node-processor-mapper)]" />
                </div>
                <div className="flex-1">
                    <InlineEdit
                        value={data.label || 'Field Mapper'}
                        onChange={(v) => handleChange('label', v)}
                        className="text-sm font-semibold text-[var(--foreground)]"
                        displayClassName="hover:text-[var(--primary)] cursor-text"
                        inputClassName="bg-transparent border-b border-[var(--primary)] outline-none w-full"
                    />
                    <div className="text-xs text-[var(--foreground-muted)]">Mapper</div>
                </div>
            </div>

            <div className="space-y-2 max-h-[150px] overflow-y-auto pr-1">
                {mappings.slice(0, 3).map((mapping, index) => (
                    <div key={index} className="flex items-center gap-1 p-2 rounded-lg bg-[var(--background)]/50 border border-[var(--glass-border)]">
                        <InlineEdit
                            value={mapping.source}
                            onChange={(v) => updateMapping(index, 'source', String(v))}
                            placeholder="source"
                            className="flex-1 text-xs font-mono"
                            displayClassName="hover:bg-[var(--background)] px-1 rounded cursor-text truncate"
                            inputClassName="bg-[var(--background)] border border-[var(--glass-border)] rounded px-1 w-full outline-none"
                        />
                        <ArrowRightLeft size={12} className="text-[var(--node-processor-mapper)] flex-shrink-0" />
                        <InlineEdit
                            value={mapping.target}
                            onChange={(v) => updateMapping(index, 'target', String(v))}
                            placeholder="target"
                            className="flex-1 text-xs font-mono"
                            displayClassName="hover:bg-[var(--background)] px-1 rounded cursor-text truncate"
                            inputClassName="bg-[var(--background)] border border-[var(--glass-border)] rounded px-1 w-full outline-none"
                        />
                        <button
                            onClick={(e) => removeMapping(e, index)}
                            className="text-[var(--foreground-muted)] hover:text-[var(--error)] p-0.5"
                        >
                            <X size={12} />
                        </button>
                    </div>
                ))}
                {mappings.length > 3 && (
                    <div className="text-xs text-[var(--foreground-muted)] text-center">
                        +{mappings.length - 3} more mappings
                    </div>
                )}
            </div>

            <button
                onClick={addMapping}
                className="w-full mt-2 p-1.5 rounded-lg border border-dashed border-[var(--glass-border)] 
                         hover:border-[var(--node-processor-mapper)] transition-colors flex items-center justify-center gap-1
                         text-xs text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
            >
                <Plus size={12} />
                Add Mapping
            </button>

            <Handle
                type="source"
                position={Position.Right}
                className="!w-3 !h-3 !bg-[var(--node-processor-mapper)] !border-2 !border-[var(--background)]"
            />
        </div>
    );
};

export default memo(MapperNode);
