"use client";

import React, { useState, DragEvent } from 'react';
import {
    Radio, Network, FileInput, Database,
    Code2, ArrowRightLeft, Filter, GitBranch, FileJson,
    FileText, Globe, PlayCircle,
    Plus, Layers, ChevronDown, ChevronRight,
    // Utility icons
    Wifi, Hash, Type, Variable, MessageSquare,
    Timer, ScrollText, Calculator, Clock, GitMerge
} from 'lucide-react';

interface NodeType {
    type: string;
    label: string;
    icon: React.ElementType;
    color: string;
    description: string;
}

interface NodeCategory {
    name: string;
    color: string;
    nodes: NodeType[];
}

const nodeCategories: NodeCategory[] = [
    {
        name: 'Sources',
        color: 'var(--node-source)',
        nodes: [
            {
                type: 'httpListener',
                label: 'HTTP Listener',
                icon: Radio,
                color: 'var(--node-source)',
                description: 'Receive HTTP requests'
            },
            {
                type: 'tcpListener',
                label: 'TCP Listener',
                icon: Network,
                color: 'var(--node-source-tcp)',
                description: 'Receive TCP connections'
            },
            {
                type: 'fileReader',
                label: 'File Reader',
                icon: FileInput,
                color: 'var(--node-source)',
                description: 'Read from file system'
            },
            {
                type: 'databasePoller',
                label: 'Database Poller',
                icon: Database,
                color: 'var(--node-source-db)',
                description: 'Poll database for new data'
            },
            {
                type: 'testNode',
                label: 'Test Node',
                icon: PlayCircle,
                color: 'var(--primary)',
                description: 'Manual message trigger'
            },
        ]
    },
    {
        name: 'Processors',
        color: 'var(--node-processor)',
        nodes: [
            {
                type: 'luaScript',
                label: 'Lua Script',
                icon: Code2,
                color: 'var(--node-processor)',
                description: 'Transform data with Lua'
            },
            {
                type: 'mapper',
                label: 'Field Mapper',
                icon: ArrowRightLeft,
                color: 'var(--node-processor-mapper)',
                description: 'Map fields between formats'
            },
            {
                type: 'filter',
                label: 'Message Filter',
                icon: Filter,
                color: 'var(--node-processor-filter)',
                description: 'Filter messages by condition'
            },
            {
                type: 'router',
                label: 'Content Router',
                icon: GitBranch,
                color: 'var(--node-processor)',
                description: 'Route to multiple destinations'
            },
            {
                type: 'hl7Parser',
                label: 'HL7 Parser',
                icon: FileJson,
                color: 'var(--node-processor)',
                description: 'Parse and convert HL7'
            },
        ]
    },
    {
        name: 'Destinations',
        color: 'var(--node-destination)',
        nodes: [
            {
                type: 'fileWriter',
                label: 'File Writer',
                icon: FileText,
                color: 'var(--node-destination)',
                description: 'Write to file system'
            },
            {
                type: 'httpSender',
                label: 'HTTP Sender',
                icon: Globe,
                color: 'var(--node-destination-http)',
                description: 'Send HTTP requests'
            },
            {
                type: 'databaseWriter',
                label: 'Database Writer',
                icon: Database,
                color: 'var(--node-destination-db)',
                description: 'Write to database'
            },
            {
                type: 'tcpSender',
                label: 'TCP Sender',
                icon: Network,
                color: 'var(--node-destination)',
                description: 'Send via TCP'
            },
        ]
    },
    {
        name: 'Utilities',
        color: 'var(--warning)',
        nodes: [
            {
                type: 'ipNode',
                label: 'IP Address',
                icon: Wifi,
                color: 'var(--warning)',
                description: 'Configure IP address'
            },
            {
                type: 'portNode',
                label: 'Port',
                icon: Hash,
                color: 'var(--warning)',
                description: 'Configure port number'
            },
            {
                type: 'textNode',
                label: 'Text/Template',
                icon: Type,
                color: 'var(--warning)',
                description: 'Store constant text'
            },
            {
                type: 'variableNode',
                label: 'Variables',
                icon: Variable,
                color: 'var(--warning)',
                description: 'Key-value pairs'
            },
            {
                type: 'commentNode',
                label: 'Comment',
                icon: MessageSquare,
                color: '#fef3c7',
                description: 'Add documentation'
            },
            {
                type: 'delayNode',
                label: 'Delay',
                icon: Timer,
                color: 'var(--warning)',
                description: 'Add wait time'
            },
            {
                type: 'loggerNode',
                label: 'Logger',
                icon: ScrollText,
                color: 'var(--warning)',
                description: 'Log messages'
            },
            {
                type: 'counterNode',
                label: 'Counter',
                icon: Calculator,
                color: 'var(--warning)',
                description: 'Count messages'
            },
            {
                type: 'timestampNode',
                label: 'Timestamp',
                icon: Clock,
                color: 'var(--warning)',
                description: 'Add timestamps'
            },
            {
                type: 'mergeNode',
                label: 'Merge',
                icon: GitMerge,
                color: 'var(--warning)',
                description: 'Combine inputs'
            },
        ]
    },
];

import { useFlowStore } from '@/stores/useFlowStore';

export default function Sidebar() {
    const addNode = useFlowStore((state) => state.addNode);
    const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
        'Sources': true,
        'Processors': true,
        'Destinations': true,
        'Utilities': false,
    });

    const toggleCategory = (name: string) => {
        setExpandedCategories(prev => ({
            ...prev,
            [name]: !prev[name]
        }));
    };

    // Handle drag start for drag and drop
    const onDragStart = (event: DragEvent<HTMLButtonElement>, nodeType: string) => {
        event.dataTransfer.setData('application/reactflow', nodeType);
        event.dataTransfer.effectAllowed = 'move';
    };

    return (
        <aside className="w-72 glass border-r border-[var(--glass-border)] flex flex-col">
            {/* Section Title */}
            <div className="p-4 border-b border-[var(--glass-border)]">
                <div className="flex items-center gap-2 text-[var(--foreground-muted)]">
                    <Layers size={16} />
                    <span className="text-sm font-medium">Node Palette</span>
                    <span className="ml-auto text-xs bg-[var(--primary)]/20 text-[var(--primary)] px-2 py-0.5 rounded-full">
                        {nodeCategories.reduce((acc, cat) => acc + cat.nodes.length, 0)} nodes
                    </span>
                </div>
                <div className="mt-2 text-xs text-[var(--foreground-muted)]">
                    Drag nodes to canvas or click to add
                </div>
            </div>

            {/* Node Categories */}
            <div className="flex-1 overflow-y-auto">
                {nodeCategories.map((category) => (
                    <div key={category.name} className="border-b border-[var(--glass-border)]">
                        {/* Category Header */}
                        <button
                            onClick={() => toggleCategory(category.name)}
                            className="w-full p-3 flex items-center gap-2 hover:bg-[var(--background)]/30 transition-colors"
                        >
                            {expandedCategories[category.name] ? (
                                <ChevronDown size={14} className="text-[var(--foreground-muted)]" />
                            ) : (
                                <ChevronRight size={14} className="text-[var(--foreground-muted)]" />
                            )}
                            <span
                                className="text-xs font-semibold uppercase tracking-wider"
                                style={{ color: category.color }}
                            >
                                {category.name}
                            </span>
                            <span className="ml-auto text-xs text-[var(--foreground-muted)]">
                                {category.nodes.length}
                            </span>
                        </button>

                        {/* Node List */}
                        {expandedCategories[category.name] && (
                            <div className="px-3 pb-3 space-y-2">
                                {category.nodes.map((node) => (
                                    <button
                                        key={node.type}
                                        onClick={() => addNode(node.type)}
                                        draggable
                                        onDragStart={(e) => onDragStart(e, node.type)}
                                        className="w-full p-2.5 glass-card flex items-center gap-3 text-left group cursor-grab active:cursor-grabbing hover:scale-[1.02] transition-transform"
                                    >
                                        <div
                                            className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                                            style={{ backgroundColor: `${node.color}20` }}
                                        >
                                            <node.icon size={18} style={{ color: node.color }} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-medium text-[var(--foreground)] truncate">
                                                {node.label}
                                            </div>
                                            <div className="text-xs text-[var(--foreground-muted)] truncate">
                                                {node.description}
                                            </div>
                                        </div>
                                        <Plus
                                            size={14}
                                            className="opacity-0 group-hover:opacity-100 transition-opacity text-[var(--foreground-muted)] shrink-0"
                                        />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-[var(--glass-border)]">
                <div className="text-xs text-[var(--foreground-muted)] text-center">
                    Drag to canvas or click to add
                </div>
            </div>
        </aside>
    );
}
