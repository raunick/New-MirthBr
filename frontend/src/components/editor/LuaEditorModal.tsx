"use client";

import React, { useState, useEffect } from "react";
import Editor from "@monaco-editor/react";
import { X, Save, Code2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LuaEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (code: string) => void;
    initialCode: string;
}

export default function LuaEditorModal({ isOpen, onClose, onSave, initialCode }: LuaEditorModalProps) {
    const [code, setCode] = useState(initialCode);

    // Sync code when initialCode changes or modal opens
    useEffect(() => {
        if (isOpen) {
            setCode(initialCode);
        }
    }, [initialCode, isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md">
            <div className="w-[85vw] max-w-4xl h-[80vh] glass-card flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--glass-border)]">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[var(--node-processor)]/20 flex items-center justify-center">
                            <Code2 size={18} className="text-[var(--node-processor)]" />
                        </div>
                        <div>
                            <span className="font-semibold text-[var(--foreground)]">Lua Script Editor</span>
                            <span className="ml-2 text-xs text-[var(--foreground-muted)] bg-[var(--background)]/50 px-2 py-0.5 rounded">
                                processor.lua
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onClose}
                            className="glass border-[var(--glass-border)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--background)]/50"
                        >
                            <X size={16} className="mr-1" /> Cancel
                        </Button>
                        <Button
                            size="sm"
                            onClick={() => onSave(code)}
                            className="bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] hover:opacity-90"
                        >
                            <Save size={16} className="mr-1" /> Save Script
                        </Button>
                    </div>
                </div>

                {/* Editor */}
                <div className="flex-1 bg-[#1e1e1e]">
                    <Editor
                        height="100%"
                        defaultLanguage="lua"
                        value={code}
                        onChange={(value) => setCode(value || "")}
                        theme="vs-dark"
                        options={{
                            minimap: { enabled: true, maxColumn: 80 },
                            fontSize: 14,
                            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                            scrollBeyondLastLine: false,
                            padding: { top: 16 },
                            smoothScrolling: true,
                            cursorBlinking: 'smooth',
                            cursorSmoothCaretAnimation: 'on',
                            renderLineHighlight: 'all',
                            bracketPairColorization: { enabled: true },
                        }}
                    />
                </div>

                {/* Footer */}
                <div className="px-5 py-3 border-t border-[var(--glass-border)] flex items-center justify-between">
                    <div className="text-xs text-[var(--foreground-muted)]">
                        💡 Tip: Use <code className="bg-[var(--background)]/50 px-1 rounded">msg.content</code> to access message data
                    </div>
                    <div className="text-xs text-[var(--foreground-muted)]">
                        Lua 5.4
                    </div>
                </div>
            </div>
        </div>
    );
}
