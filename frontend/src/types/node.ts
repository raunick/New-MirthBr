
export interface BaseNodeData {
    label: string;
    [key: string]: any; // Allow loose typing for backward compatibility initially
}

export interface HTTPSourceData extends BaseNodeData {
    port: number;
    path?: string;
    cert_path?: string;
    key_path?: string;
}

export interface TCPSourceData extends BaseNodeData {
    port: number;
    cert_path?: string;
    key_path?: string;
}

export interface FileReaderData extends BaseNodeData {
    path: string;
    pattern: string;
}

export interface DatabasePollerData extends BaseNodeData {
    query: string;
    interval: number;
}

export interface LuaScriptData extends BaseNodeData {
    code: string;
}

export interface MapperData extends BaseNodeData {
    mappings: { source: string; target: string }[];
}

export interface FilterData extends BaseNodeData {
    condition: string;
}

export interface RouterData extends BaseNodeData {
    routes: { name: string; condition: string }[];
}

export interface HL7ParserData extends BaseNodeData {
    inputFormat: string;
    outputFormat: string;
}

export interface FileWriterData extends BaseNodeData {
    path: string;
    filename?: string;
    append?: boolean;
    encoding?: string;
}

export interface HTTPSenderData extends BaseNodeData {
    url: string;
    method: string;
}

export interface DatabaseWriterData extends BaseNodeData {
    table: string;
    mode: string;
}

export interface TCPSenderData extends BaseNodeData {
    host: string;
    port: number;
}

export interface TestNodeData extends BaseNodeData {
    payloadType: string;
    payload: string;
    sendMode?: 'inject' | 'http' | 'tcp';
    tcpHost?: string;
    tcpPort?: string;
    tcpTimeout?: string;
}

export interface DeployNodeData extends BaseNodeData {
    // No specific fields yet
}

// Utility nodes
export interface IPNodeData extends BaseNodeData {
    ip: string;
    subnet?: string;
}

export interface PortNodeData extends BaseNodeData {
    port: number;
    protocol?: string;
}

export interface TextNodeData extends BaseNodeData {
    text: string;
    value?: string; // Resolved value
    isTemplate?: boolean;
}

export interface VariableNodeData extends BaseNodeData {
    variables: { key: string; value: string }[];
}

// Union type
export type NodeData =
    | HTTPSourceData
    | TCPSourceData
    | LuaScriptData
    | TestNodeData
    | BaseNodeData;
