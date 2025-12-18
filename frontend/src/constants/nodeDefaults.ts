import { NodeData } from '@/types/node';

export const nodeDefaults: Record<string, NodeData> = {
    httpListener: { label: 'HTTP Listener', port: 1234, path: '/' },
    tcpListener: { label: 'TCP Listener', port: 9090 },
    fileReader: { label: 'File Reader', path: '/data/input', pattern: '*.txt' },
    databasePoller: { label: 'Database Poller', query: 'SELECT * FROM messages', interval: 60 },
    // Processors
    luaScript: { label: 'Lua Script', code: '-- Your code here\nreturn msg.content' },
    mapper: { label: 'Field Mapper', mappings: [{ source: 'field1', target: 'newField1' }] },
    filter: { label: 'Message Filter', condition: 'msg.type == "HL7"' },
    router: { label: 'Content Router', routes: [{ name: 'Route A', condition: '' }] },
    hl7Parser: { label: 'HL7 Parser', inputFormat: 'hl7v2', outputFormat: 'fhir' },
    // Destinations
    fileWriter: { label: 'File Writer', path: './output', filename: '${timestamp}.txt' },
    httpSender: { label: 'HTTP Sender', url: 'https://api.example.com', method: 'POST' },
    databaseWriter: { label: 'Database Writer', table: 'messages', mode: 'insert' },
    tcpSender: { label: 'TCP Sender', host: '127.0.0.1', port: 9000 },
    // Special
    testNode: { label: 'Test Node', payloadType: 'hl7', payload: 'MSH|^~\\&|...' },
    deployNode: { label: 'Channel Terminal' },
    // Utility Nodes
    ipNode: { label: 'IP Address', ip: '127.0.0.1', subnet: '255.255.255.0' },
    portNode: { label: 'Port', port: 1234, protocol: 'TCP' },
    textNode: { label: 'Text', text: '', isTemplate: false },
    variableNode: { label: 'Variables', variables: [] },
    commentNode: { label: 'Comment', text: 'Add notes here...', color: '#fef3c7' },
    delayNode: { label: 'Delay', delay: 1000, unit: 'ms' },
    loggerNode: { label: 'Logger', level: 'info', prefix: '' },
    counterNode: { label: 'Counter', count: 0, resetInterval: 0 },
    timestampNode: { label: 'Timestamp', field: 'timestamp', format: 'ISO' },
    mergeNode: { label: 'Merge', mode: 'first', separator: '' },
};
