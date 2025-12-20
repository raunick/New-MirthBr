import React, { useState, useEffect } from 'react';
import { Node } from 'reactflow';
import { AlertCircle, Save, X, RotateCcw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ChannelSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    nodes: Node[];
    onSave: (errorDestinationId: string | undefined, maxRetries: number) => void;
    currentErrorDestinationId?: string;
    currentMaxRetries?: number;
}

export default function ChannelSettingsModal({
    isOpen,
    onClose,
    nodes,
    onSave,
    currentErrorDestinationId,
    currentMaxRetries = 3
}: ChannelSettingsModalProps) {
    const [selectedErrorDest, setSelectedErrorDest] = useState<string>('none');
    const [maxRetries, setMaxRetries] = useState<number>(3);

    // Get all destination type nodes
    const destinationNodes = nodes.filter(n => {
        const type = n.type || '';
        return ['fileWriter', 'httpSender', 'databaseWriter', 'tcpSender', 'luaDestination'].includes(type);
    });

    useEffect(() => {
        if (isOpen) {
            setSelectedErrorDest(currentErrorDestinationId || 'none');
            setMaxRetries(currentMaxRetries);
        }
    }, [isOpen, currentErrorDestinationId, currentMaxRetries]);

    const handleSave = () => {
        onSave(
            selectedErrorDest === 'none' ? undefined : selectedErrorDest,
            maxRetries
        );
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            {/* Content */}
            <div className="relative bg-[var(--background)] border border-[var(--glass-border)] rounded-xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in duration-200 overflow-hidden">
                <div className="p-6 border-b border-[var(--glass-border)] flex justify-between items-center bg-[var(--background-secondary)]/50">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                        Channel Settings
                    </h2>
                    <button onClick={onClose} className="text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-8 max-h-[70vh] overflow-y-auto">
                    {/* Retry Settings Section */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-[var(--primary)]">
                            <RotateCcw size={18} />
                            <h3 className="text-sm font-semibold uppercase tracking-wider">Retry Strategy</h3>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-[var(--foreground)]">
                                Maximum Retries
                            </label>
                            <p className="text-xs text-[var(--foreground-muted)]">
                                How many times to retry a failed message before moving it to DLQ or discarding.
                            </p>
                            <div className="flex items-center gap-4">
                                <input
                                    type="range"
                                    min="0"
                                    max="10"
                                    step="1"
                                    value={maxRetries}
                                    onChange={(e) => setMaxRetries(parseInt(e.target.value))}
                                    className="flex-1 accent-[var(--primary)]"
                                />
                                <input
                                    type="number"
                                    min="0"
                                    max="50"
                                    value={maxRetries}
                                    onChange={(e) => setMaxRetries(parseInt(e.target.value) || 0)}
                                    className="w-16 bg-[var(--background-secondary)] border border-[var(--glass-border)] rounded px-2 py-1 text-sm text-center outline-none focus:border-[var(--primary)]"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-[var(--glass-border)]" />

                    {/* DLQ Settings Section */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-red-400">
                            <AlertCircle size={18} />
                            <h3 className="text-sm font-semibold uppercase tracking-wider">Dead Letter Queue</h3>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-[var(--foreground)]">
                                Error Destination
                            </label>
                            <p className="text-xs text-[var(--foreground-muted)]">
                                Select a destination to route messages that fail processing (ERROR status).
                            </p>

                            <select
                                className="w-full bg-[var(--background-secondary)] border border-[var(--glass-border)] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50 appearance-none bg-no-repeat bg-[right_1rem_center] cursor-pointer"
                                value={selectedErrorDest}
                                onChange={(e) => setSelectedErrorDest(e.target.value)}
                            >
                                <option value="none">-- No DLQ (Discard on Error) --</option>
                                {destinationNodes.map(node => (
                                    <option key={node.id} value={node.id}>
                                        {node.data.label || node.type}
                                    </option>
                                ))}
                            </select>
                            {destinationNodes.length === 0 && (
                                <Alert variant="warning" className="mt-2 text-xs">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription>
                                        No destination nodes found in the flow. Add a file writer or sender to enable DLQ.
                                    </AlertDescription>
                                </Alert>
                            )}
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-[var(--glass-border)] flex justify-end gap-3 bg-[var(--background-secondary)]/50">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg border border-[var(--glass-border)] hover:bg-[var(--glass-bg)] transition-colors text-sm font-medium"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-6 py-2 rounded-lg bg-[var(--primary)] text-white hover:opacity-90 transition-all shadow-lg shadow-[var(--primary)]/20 flex items-center gap-2 text-sm font-medium"
                    >
                        <Save size={16} /> Save Settings
                    </button>
                </div>
            </div>
        </div>
    );
}

