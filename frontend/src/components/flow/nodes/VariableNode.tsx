import React, { memo, useState } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Variable, Plus, Trash2 } from 'lucide-react';
import InlineEdit from '../InlineEdit';

interface VariableEntry {
    key: string;
    value: string;
}

interface VariableNodeData {
    label: string;
    variables: VariableEntry[];
    onDataChange?: (field: string, value: any) => void;
}

const VariableNode = ({ data, id }: NodeProps<VariableNodeData>) => {
    const variables = data.variables || [];

    const handleChange = (field: string, value: any) => {
        data.onDataChange?.(field, value);
    };

    const addVariable = () => {
        const newVariables = [...variables, { key: 'newKey', value: '' }];
        handleChange('variables', newVariables);
    };

    const removeVariable = (index: number) => {
        const newVariables = variables.filter((_, i) => i !== index);
        handleChange('variables', newVariables);
    };

    const updateVariable = (index: number, field: 'key' | 'value', value: string) => {
        const newVariables = variables.map((v, i) =>
            i === index ? { ...v, [field]: value } : v
        );
        handleChange('variables', newVariables);
    };

    return (
        <div className="flow-node utility px-4 py-3 w-[280px] border-l-4" style={{ borderLeftColor: 'var(--warning)' }}>
            <Handle
                type="target"
                position={Position.Left}
                className="!w-3 !h-3 !bg-[var(--warning)] !border-2 !border-[var(--background)]"
            />

            <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-[var(--warning)]/20 flex items-center justify-center">
                    <Variable size={20} className="text-[var(--warning)]" />
                </div>
                <div className="flex-1">
                    <InlineEdit
                        value={data.label || 'Variables'}
                        onChange={(v) => handleChange('label', v)}
                        className="text-sm font-semibold text-[var(--foreground)]"
                        displayClassName="hover:text-[var(--primary)] cursor-text"
                        inputClassName="bg-transparent border-b border-[var(--primary)] outline-none w-full"
                    />
                    <div className="text-xs text-[var(--foreground-muted)]">{variables.length} variables</div>
                </div>
            </div>

            <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {variables.map((variable, index) => (
                    <div key={index} className="p-2 rounded-lg bg-[var(--background)]/50 border border-[var(--glass-border)] flex items-center gap-2">
                        <input
                            value={variable.key}
                            onChange={(e) => updateVariable(index, 'key', e.target.value)}
                            placeholder="key"
                            className="flex-1 text-xs font-mono bg-transparent border-b border-[var(--glass-border)] text-[var(--warning)] outline-none"
                        />
                        <span className="text-xs text-[var(--foreground-muted)]">=</span>
                        <input
                            value={variable.value}
                            onChange={(e) => updateVariable(index, 'value', e.target.value)}
                            placeholder="value"
                            className="flex-1 text-xs font-mono bg-transparent border-b border-[var(--glass-border)] text-[var(--foreground)] outline-none"
                        />
                        <button
                            onClick={() => removeVariable(index)}
                            className="text-[var(--error)] hover:bg-[var(--error)]/10 p-1 rounded"
                        >
                            <Trash2 size={12} />
                        </button>
                    </div>
                ))}
            </div>

            <button
                onClick={addVariable}
                className="mt-2 w-full p-2 rounded-lg bg-[var(--background)]/50 border border-dashed border-[var(--glass-border)] 
                         hover:border-[var(--warning)] transition-colors flex items-center justify-center gap-2
                         text-xs text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
            >
                <Plus size={12} />
                Add Variable
            </button>

            <Handle
                type="source"
                position={Position.Right}
                className="!w-3 !h-3 !bg-[var(--warning)] !border-2 !border-[var(--background)]"
            />
        </div>
    );
};

export default memo(VariableNode);
