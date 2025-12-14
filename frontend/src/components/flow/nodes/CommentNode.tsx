import React, { memo, useState } from 'react';
import { NodeProps } from 'reactflow';
import { MessageSquare } from 'lucide-react';

interface CommentNodeData {
    label: string;
    text: string;
    color: string;
    onDataChange?: (field: string, value: string) => void;
}

const COLORS = [
    { name: 'Yellow', value: '#fef3c7' },
    { name: 'Green', value: '#d1fae5' },
    { name: 'Blue', value: '#dbeafe' },
    { name: 'Pink', value: '#fce7f3' },
    { name: 'Purple', value: '#ede9fe' },
];

const CommentNode = ({ data, id }: NodeProps<CommentNodeData>) => {
    const [isEditing, setIsEditing] = useState(false);
    const backgroundColor = data.color || '#fef3c7';

    const handleChange = (field: string, value: string) => {
        data.onDataChange?.(field, value);
    };

    return (
        <div
            className="rounded-lg shadow-lg min-w-[200px] max-w-[300px] overflow-hidden"
            style={{ backgroundColor }}
        >
            {/* Header */}
            <div className="px-3 py-2 flex items-center gap-2" style={{ backgroundColor: 'rgba(0,0,0,0.1)' }}>
                <MessageSquare size={14} className="text-gray-700" />
                <span className="text-xs font-semibold text-gray-700 flex-1">
                    {data.label || 'Comment'}
                </span>
                <div className="flex gap-1">
                    {COLORS.map((c) => (
                        <button
                            key={c.value}
                            onClick={() => handleChange('color', c.value)}
                            className="w-4 h-4 rounded-full border border-gray-400"
                            style={{ backgroundColor: c.value }}
                            title={c.name}
                        />
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="p-3">
                {isEditing ? (
                    <textarea
                        autoFocus
                        value={data.text || ''}
                        onChange={(e) => handleChange('text', e.target.value)}
                        onBlur={() => setIsEditing(false)}
                        placeholder="Add a comment..."
                        rows={3}
                        className="w-full text-sm bg-white/50 border border-gray-300 rounded p-2 text-gray-800 outline-none resize-none"
                    />
                ) : (
                    <div
                        onClick={() => setIsEditing(true)}
                        className="text-sm text-gray-700 cursor-text min-h-[60px] whitespace-pre-wrap"
                    >
                        {data.text || 'Click to add comment...'}
                    </div>
                )}
            </div>

            {/* Note: Comment nodes have no handles - they are for documentation only */}
        </div>
    );
};

export default memo(CommentNode);
