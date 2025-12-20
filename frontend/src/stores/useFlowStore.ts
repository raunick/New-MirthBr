import { create } from 'zustand';
import { FlowState } from '../types/store';
import { createNodeSlice } from './slices/nodeSlice';
import { createEdgeSlice } from './slices/edgeSlice';
import { createUISlice } from './slices/uiSlice';
import { createChannelSlice } from './slices/channelSlice';
import { createFlowSlice } from './slices/flowSlice';
import { v4 as uuidv4 } from 'uuid';
import { NodeData } from '@/types/node';
import { Node } from 'reactflow';

// Initial Nodes for demo (retained from original file)
const initialNodes: Node<NodeData>[] = [
    {
        id: 'documentation-node',
        type: 'textNode',
        position: { x: -380, y: -100 },
        data: {
            label: '📋 Documentação do Workflow',
            text: '## HL7 to JSON Workflow\n\n**Objetivo:** Converter mensagens HL7 v2.x para JSON, validar e enriquecer os dados.\n\n### Fluxo de Processamento:\n\n1. **HTTP Receiver** - Recebe mensagens HL7 via HTTP POST na porta 8080\n\n2. **HL7 Parser** - Converte a mensagem HL7 para formato JSON estruturado\n\n3. **Validador** - Valida campos obrigatórios (PID-3, PID-5)\n\n4. **Enriquecimento** - Adiciona metadados do sistema\n\n5. **File Writer** - Salva o JSON no diretório de saída\n\n### Tipos de Mensagem Suportados:\n- ADT^A01 (Admissão)\n- ADT^A02 (Transferência)\n- ADT^A03 (Alta)',
            isTemplate: false,
            value: 'Documentação'
        }
    },
    {
        id: 'source-http',
        type: 'httpListener',
        position: { x: 0, y: 0 },
        data: { label: 'HTTP Receiver', port: 8080, path: '/api/v1/admit', cert_path: '', key_path: '' }
    },
    {
        id: 'parser-hl7',
        type: 'hl7Parser',
        position: { x: 300, y: 0 },
        data: { label: 'HL7 Parser', inputFormat: 'hl7v2', outputFormat: 'json' }
    },
    {
        id: 'dest-file',
        type: 'fileWriter',
        position: { x: 600, y: 0 },
        data: {
            label: 'File Writer',
            path: './output/admissions',
            filename: 'ADMIT_${uuid}.json',
            append: false,
            encoding: 'UTF-8'
        }
    }
];

const initialEdges: any[] = [
    { id: 'e1-2', source: 'source-http', target: 'parser-hl7', animated: true },
    { id: 'e2-3', source: 'parser-hl7', target: 'dest-file', animated: true }
];

export const useFlowStore = create<FlowState>()((...a) => ({
    ...createNodeSlice(...a),
    ...createEdgeSlice(...a),
    ...createUISlice(...a),
    ...createChannelSlice(...a),
    ...createFlowSlice(...a),

    // Overrides for initial state
    nodes: initialNodes,
    edges: initialEdges,
    channelId: uuidv4(),
    callbacks: {},
    setCallback: (name, fn) => a[0]((state) => ({ callbacks: { ...state.callbacks, [name]: fn } })),

    // Explicit exports for backward compatibility if any
}));
