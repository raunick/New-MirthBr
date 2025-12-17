import React, { useState, useEffect } from 'react';
import { Node } from 'reactflow';
import { AlertCircle, Save, X } from 'lucide-react';

interface ChannelSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    nodes: Node[];
    onSave: (errorDestinationId: string | undefined) => void;
    currentErrorDestinationId?: string;
}

export default function ChannelSettingsModal({
    isOpen,
    onClose,
    nodes,
    onSave,
    currentErrorDestinationId
}: ChannelSettingsModalProps) {
    const [selectedErrorDest, setSelectedErrorDest] = useState<string>('none');

    // Get all destination type nodes
    const destinationNodes = nodes.filter(n => {
        const type = n.type || '';
        return ['fileWriter', 'httpSender', 'databaseWriter', 'tcpSender'].includes(type);
    });

    useEffect(() => {
        if (isOpen) {
            setSelectedErrorDest(currentErrorDestinationId || 'none');
        }
    }, [isOpen, currentErrorDestinationId]);

    const handleSave = () => {
        onSave(selectedErrorDest === 'none' ? undefined : selectedErrorDest);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

            {/* Content */}
            <div className="relative bg-[var(--background)] border border-[var(--glass-border)] rounded-xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in duration-200">
                <div className="p-6 border-b border-[var(--glass-border)] flex justify-between items-center">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                        Channel Settings
                    </h2>
                    <button onClick={onClose} className="text-[var(--foreground-muted)] hover:text-[var(--foreground)]">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-[var(--foreground-muted)] flex items-center gap-2">
                            <AlertCircle size={16} className="text-red-400" />
                            Dead Letter Queue (Error Destination)
                        </label>
                        <p className="text-xs text-[var(--foreground-muted)] mb-2">
                            Select a destination to route messages that fail processing (ERROR status).
                        </p>

                        <select
                            className="w-full bg-[var(--background-secondary)] border border-[var(--glass-border)] rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50"
                            value={selectedErrorDest}
                            onChange={(e) => setSelectedErrorDest(e.target.value)}
                        >
                            <option value="none">-- No DLQ (Discard on Error) --</option>
                            {destinationNodes.map(node => (
                                <option key={node.id} value={node.id}>
                                    {node.data.label || node.type} (ID: {node.id.substring(0, 6)}...)
                                </option>
                            ))}
                        </select>
                        {destinationNodes.length === 0 && (
                            <p className="text-xs text-yellow-500 mt-1">
                                No destination nodes found in the flow. Add a file writer or sender to enable DLQ.
                            </p>
                        )}
                    </div>
                </div>

                <div className="p-6 border-t border-[var(--glass-border)] flex justify-end gap-2 bg-[var(--background-secondary)]/30">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg border border-[var(--glass-border)] hover:bg-[var(--glass-bg)] transition-colors text-sm font-medium"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-4 py-2 rounded-lg bg-[var(--primary)] text-white hover:opacity-90 transition-opacity flex items-center gap-2 text-sm font-medium"
                    >
                        <Save size={16} /> Save Config
                    </button>
                </div>
            </div>
        </div>
    );
}
