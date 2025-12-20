'use client';

import { useState } from 'react';
import { ArrowLeft, Book, RefreshCw, Shield, Layers, Code2, FileJson, Server, Zap, AlertCircle, CheckCircle2, Clock, Hash, Copy, Check } from 'lucide-react';
import Link from 'next/link';

interface DocSection {
    id: string;
    title: string;
    icon: React.ElementType;
}

const sections: DocSection[] = [
    { id: 'overview', title: 'Visão Geral', icon: Book },
    { id: 'deduplication', title: 'Deduplicação', icon: Shield },
    { id: 'retry', title: 'Retry Automático', icon: RefreshCw },
    { id: 'message-flow', title: 'Fluxo de Mensagens', icon: Layers },
    { id: 'nodes', title: 'Nodes Disponíveis', icon: Zap },
    { id: 'lua', title: 'Scripts Lua', icon: Code2 },
    { id: 'hl7', title: 'HL7 Parser', icon: FileJson },
    { id: 'api', title: 'API Reference', icon: Server },
];

function CodeBlock({ code, language = 'lua' }: { code: string; language?: string }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="relative group">
            <pre className="bg-[var(--background)] border border-[var(--glass-border)] rounded-lg p-4 overflow-x-auto text-sm font-mono">
                <code className="text-[var(--foreground-muted)]">{code}</code>
            </pre>
            <button
                onClick={handleCopy}
                className="absolute top-2 right-2 p-2 rounded-md bg-[var(--background-secondary)] opacity-0 group-hover:opacity-100 transition-opacity"
                title="Copiar código"
            >
                {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
            </button>
        </div>
    );
}

function InfoBox({ type, title, children }: { type: 'info' | 'warning' | 'success'; title: string; children: React.ReactNode }) {
    const styles = {
        info: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
        warning: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400',
        success: 'bg-green-500/10 border-green-500/20 text-green-400',
    };

    const icons = {
        info: AlertCircle,
        warning: Clock,
        success: CheckCircle2,
    };

    const Icon = icons[type];

    return (
        <div className={`border rounded-lg p-4 my-4 ${styles[type]}`}>
            <h4 className="flex items-center gap-2 font-medium mb-2">
                <Icon size={16} />
                {title}
            </h4>
            <div className="text-sm opacity-90">{children}</div>
        </div>
    );
}

export default function DocsPage() {
    const [activeSection, setActiveSection] = useState('overview');

    const scrollToSection = (id: string) => {
        setActiveSection(id);
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    return (
        <div className="h-screen flex flex-col bg-[var(--background)] text-[var(--foreground)] font-[family-name:var(--font-geist-sans)] overflow-hidden">
            {/* Header */}
            <header className="shrink-0 glass border-b border-[var(--glass-border)]">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-4">
                    <Link href="/" className="p-2 hover:bg-[var(--glass-border)] rounded-full transition-colors">
                        <ArrowLeft size={20} />
                    </Link>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] flex items-center justify-center">
                            <Book size={20} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold">Documentação MirthBR</h1>
                            <p className="text-xs text-[var(--foreground-muted)]">Guia completo do sistema de integração</p>
                        </div>
                    </div>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
                {/* Sidebar Navigation */}
                <aside className="w-64 shrink-0 overflow-y-auto border-r border-[var(--glass-border)] py-6 px-4 hidden lg:block">
                    <nav className="space-y-1">
                        {sections.map((section) => (
                            <button
                                key={section.id}
                                onClick={() => scrollToSection(section.id)}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${activeSection === section.id
                                    ? 'bg-[var(--primary)]/10 text-[var(--primary)] border-l-2 border-[var(--primary)]'
                                    : 'text-[var(--foreground-muted)] hover:bg-[var(--glass-bg)] hover:text-[var(--foreground)]'
                                    }`}
                            >
                                <section.icon size={16} />
                                {section.title}
                            </button>
                        ))}
                    </nav>
                </aside>

                {/* Main Content */}
                <main className="flex-1 overflow-y-auto px-8 py-8">
                    {/* Overview */}
                    <section id="overview" className="mb-16">
                        <h2 className="text-3xl font-bold mb-4 gradient-text">Visão Geral</h2>
                        <p className="text-[var(--foreground-muted)] text-lg leading-relaxed mb-6">
                            O <strong>MirthBR</strong> é um motor de integração de alta performance para processamento de mensagens healthcare.
                            Ele permite criar fluxos visuais para receber, transformar e enviar mensagens HL7, FHIR e formatos customizados.
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
                            <div className="glass p-4 rounded-xl border border-[var(--glass-border)]">
                                <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center mb-3">
                                    <Zap size={20} className="text-green-500" />
                                </div>
                                <h3 className="font-semibold mb-1">Alta Performance</h3>
                                <p className="text-sm text-[var(--foreground-muted)]">Backend em Rust para máxima velocidade e baixo consumo de memória.</p>
                            </div>
                            <div className="glass p-4 rounded-xl border border-[var(--glass-border)]">
                                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center mb-3">
                                    <Layers size={20} className="text-blue-500" />
                                </div>
                                <h3 className="font-semibold mb-1">Editor Visual</h3>
                                <p className="text-sm text-[var(--foreground-muted)]">Crie fluxos arrastando e conectando nodes, sem código complexo.</p>
                            </div>
                            <div className="glass p-4 rounded-xl border border-[var(--glass-border)]">
                                <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center mb-3">
                                    <Shield size={20} className="text-purple-500" />
                                </div>
                                <h3 className="font-semibold mb-1">Confiabilidade</h3>
                                <p className="text-sm text-[var(--foreground-muted)]">Persistência, retry automático e deduplicação garantem entrega de mensagens.</p>
                            </div>
                        </div>
                    </section>

                    {/* Deduplication */}
                    <section id="deduplication" className="mb-16">
                        <h2 className="text-3xl font-bold mb-4">🛡️ Deduplicação</h2>
                        <p className="text-[var(--foreground-muted)] leading-relaxed mb-6">
                            O sistema de deduplicação evita que a mesma mensagem seja processada múltiplas vezes.
                            Isso é essencial para garantir a integridade dos dados em cenários de retry ou reenvio.
                        </p>

                        <h3 className="text-xl font-semibold mb-3">Como funciona?</h3>
                        <div className="space-y-4 mb-6">
                            <div className="flex gap-4 items-start">
                                <div className="w-8 h-8 rounded-full bg-[var(--primary)]/10 flex items-center justify-center shrink-0">
                                    <Hash size={14} className="text-[var(--primary)]" />
                                </div>
                                <div>
                                    <h4 className="font-medium">1. Hash do Conteúdo</h4>
                                    <p className="text-sm text-[var(--foreground-muted)]">Cada mensagem recebe um hash único baseado no seu conteúdo.</p>
                                </div>
                            </div>
                            <div className="flex gap-4 items-start">
                                <div className="w-8 h-8 rounded-full bg-[var(--primary)]/10 flex items-center justify-center shrink-0">
                                    <Shield size={14} className="text-[var(--primary)]" />
                                </div>
                                <div>
                                    <h4 className="font-medium">2. Verificação</h4>
                                    <p className="text-sm text-[var(--foreground-muted)]">Antes de processar, o sistema verifica se o hash já existe no banco.</p>
                                </div>
                            </div>
                            <div className="flex gap-4 items-start">
                                <div className="w-8 h-8 rounded-full bg-[var(--primary)]/10 flex items-center justify-center shrink-0">
                                    <Clock size={14} className="text-[var(--primary)]" />
                                </div>
                                <div>
                                    <h4 className="font-medium">3. TTL (Time To Live)</h4>
                                    <p className="text-sm text-[var(--foreground-muted)]">Os hashes expiram após um período configurável (default: 24h).</p>
                                </div>
                            </div>
                        </div>

                        <InfoBox type="success" title="Cenário: Mensagem Corrigida">
                            Se você enviar uma mensagem que falhou e depois enviar uma versão <strong>corrigida</strong> (com conteúdo diferente),
                            o sistema irá processá-la normalmente porque o <strong>hash será diferente</strong>.
                            O "Message is duplicate, skipping" que aparece nos logs é apenas o RetryWorker tentando reprocessar
                            a mensagem antiga que falhou - e sendo corretamente ignorado.
                        </InfoBox>

                        <InfoBox type="warning" title="Limpeza no Deploy (Facilidade de Teste)">
                            Para facilitar o desenvolvimento, <strong>toda vez que você faz um Deploy/Redeploy de um canal</strong>,
                            a memória de deduplicação dele é <strong>limpa</strong>.
                            <br /><br />
                            Isso permite que você teste o mesmo payload repetidamente após alterar a lógica do canal, sem ser bloqueado pela deduplicação antiga.
                        </InfoBox>

                        <InfoBox type="info" title="Comportamento dos Logs">
                            <ul className="list-disc list-inside space-y-1">
                                <li><code className="text-xs bg-[var(--background)] px-1 rounded">Message skipped: Duplicate detected</code> = Duplicidade detectada (Skip)</li>
                                <li><code className="text-xs bg-[var(--background)] px-1 rounded">Message Processed Successfully</code> = Processamento com sucesso</li>
                                <li><code className="text-xs bg-[var(--background)] px-1 rounded">HTTP Message persisted to disk</code> = Nova mensagem salva</li>
                            </ul>
                        </InfoBox>
                    </section>

                    {/* Retry */}
                    <section id="retry" className="mb-16">
                        <h2 className="text-3xl font-bold mb-4">🔄 Retry Automático</h2>
                        <p className="text-[var(--foreground-muted)] leading-relaxed mb-6">
                            Quando uma mensagem falha no processamento, ela não é perdida. O sistema de retry automático
                            tenta reprocessar mensagens com erro periodicamente.
                        </p>

                        <h3 className="text-xl font-semibold mb-3">Fluxo de Retry</h3>
                        <div className="glass p-6 rounded-xl border border-[var(--glass-border)] mb-6">
                            <div className="flex items-center justify-between text-sm">
                                <div className="text-center">
                                    <div className="w-12 h-12 rounded-full bg-yellow-500/10 flex items-center justify-center mx-auto mb-2">
                                        <AlertCircle size={20} className="text-yellow-500" />
                                    </div>
                                    <span className="text-[var(--foreground-muted)]">Erro</span>
                                </div>
                                <div className="flex-1 border-t border-dashed border-[var(--glass-border)] mx-4" />
                                <div className="text-center">
                                    <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-2">
                                        <Clock size={20} className="text-blue-500" />
                                    </div>
                                    <span className="text-[var(--foreground-muted)]">Aguarda</span>
                                </div>
                                <div className="flex-1 border-t border-dashed border-[var(--glass-border)] mx-4" />
                                <div className="text-center">
                                    <div className="w-12 h-12 rounded-full bg-[var(--primary)]/10 flex items-center justify-center mx-auto mb-2">
                                        <RefreshCw size={20} className="text-[var(--primary)]" />
                                    </div>
                                    <span className="text-[var(--foreground-muted)]">Retry</span>
                                </div>
                                <div className="flex-1 border-t border-dashed border-[var(--glass-border)] mx-4" />
                                <div className="text-center">
                                    <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-2">
                                        <CheckCircle2 size={20} className="text-green-500" />
                                    </div>
                                    <span className="text-[var(--foreground-muted)]">Sucesso</span>
                                </div>
                            </div>
                        </div>

                        <InfoBox type="warning" title="Limite de Retries">
                            Por padrão, o sistema tenta até <strong>3 retries</strong> antes de mover a mensagem para a
                            Dead Letter Queue (DLQ). Você pode configurar isso nas opções do canal.
                        </InfoBox>

                        <h3 className="text-xl font-semibold mb-3 mt-6">Retry Manual</h3>
                        <p className="text-[var(--foreground-muted)] mb-4">
                            Você também pode forçar um retry manual através da página de mensagens ou via API:
                        </p>
                        <CodeBlock
                            code={`POST /api/messages/{id}/retry
Authorization: Bearer your-api-key`}
                            language="http"
                        />
                    </section>

                    {/* Message Flow */}
                    <section id="message-flow" className="mb-16">
                        <h2 className="text-3xl font-bold mb-4">📨 Fluxo de Mensagens</h2>
                        <p className="text-[var(--foreground-muted)] leading-relaxed mb-8">
                            Entenda como uma mensagem flui através do sistema desde a entrada até a saída.
                        </p>

                        {/* Visual Flow Diagram */}
                        <div className="glass p-8 rounded-xl border border-[var(--glass-border)] mb-8 overflow-x-auto">
                            <div className="flex flex-col md:flex-row items-center justify-between min-w-[700px] gap-4">

                                {/* Step 1: Source */}
                                <div className="flex flex-col items-center gap-3 relative group">
                                    <div className="w-16 h-16 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform duration-300">
                                        <Server size={32} className="text-green-500" />
                                    </div>
                                    <div className="text-center">
                                        <h4 className="font-bold text-sm">1. Input</h4>
                                        <p className="text-[10px] text-[var(--foreground-muted)] uppercase tracking-wider">Listener</p>
                                    </div>
                                </div>

                                {/* Arrow */}
                                <div className="h-[2px] w-full bg-gradient-to-r from-green-500/20 to-blue-500/20 relative flex items-center justify-center">
                                    <div className="absolute bg-[var(--background)] px-2">
                                        <ArrowLeft size={16} className="rotate-180 text-[var(--foreground-muted)]/50" />
                                    </div>
                                </div>

                                {/* Step 2: Persist */}
                                <div className="flex flex-col items-center gap-3 relative group">
                                    <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform duration-300">
                                        <FileJson size={32} className="text-blue-500" />
                                    </div>
                                    <div className="text-center">
                                        <h4 className="font-bold text-sm">2. Persist</h4>
                                        <p className="text-[10px] text-[var(--foreground-muted)] uppercase tracking-wider">DB Pending</p>
                                    </div>
                                </div>

                                {/* Arrow */}
                                <div className="h-[2px] w-full bg-gradient-to-r from-blue-500/20 to-purple-500/20 relative flex items-center justify-center">
                                    <div className="absolute bg-[var(--background)] px-2">
                                        <ArrowLeft size={16} className="rotate-180 text-[var(--foreground-muted)]/50" />
                                    </div>
                                </div>

                                {/* Step 3: Dedup */}
                                <div className="flex flex-col items-center gap-3 relative group">
                                    <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform duration-300">
                                        <Shield size={32} className="text-purple-500" />
                                    </div>
                                    <div className="text-center">
                                        <h4 className="font-bold text-sm">3. Dedup</h4>
                                        <p className="text-[10px] text-[var(--foreground-muted)] uppercase tracking-wider">Hash Check</p>
                                    </div>
                                </div>

                                {/* Arrow */}
                                <div className="h-[2px] w-full bg-gradient-to-r from-purple-500/20 to-orange-500/20 relative flex items-center justify-center">
                                    <div className="absolute bg-[var(--background)] px-2">
                                        <ArrowLeft size={16} className="rotate-180 text-[var(--foreground-muted)]/50" />
                                    </div>
                                </div>

                                {/* Step 4: Process */}
                                <div className="flex flex-col items-center gap-3 relative group">
                                    <div className="w-16 h-16 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform duration-300">
                                        <Zap size={32} className="text-orange-500" />
                                    </div>
                                    <div className="text-center">
                                        <h4 className="font-bold text-sm">4. Process</h4>
                                        <p className="text-[10px] text-[var(--foreground-muted)] uppercase tracking-wider">Transformer</p>
                                    </div>
                                </div>

                                {/* Arrow */}
                                <div className="h-[2px] w-full bg-gradient-to-r from-orange-500/20 to-red-500/20 relative flex items-center justify-center">
                                    <div className="absolute bg-[var(--background)] px-2">
                                        <ArrowLeft size={16} className="rotate-180 text-[var(--foreground-muted)]/50" />
                                    </div>
                                </div>

                                {/* Step 5: Dispatch */}
                                <div className="flex flex-col items-center gap-3 relative group">
                                    <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform duration-300">
                                        <Layers size={32} className="text-red-500" />
                                    </div>
                                    <div className="text-center">
                                        <h4 className="font-bold text-sm">5. Output</h4>
                                        <p className="text-[10px] text-[var(--foreground-muted)] uppercase tracking-wider">Destination</p>
                                    </div>
                                </div>

                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-4 rounded-lg bg-[var(--background-secondary)] border border-[var(--glass-border)] hover:border-green-500/30 transition-colors">
                                <div className="flex items-center gap-2 mb-2">
                                    <Server size={18} className="text-green-500" />
                                    <h4 className="font-semibold text-sm">1. Entrada</h4>
                                </div>
                                <p className="text-xs text-[var(--foreground-muted)]">
                                    O Listener (HTTP, TCP, File, DB) recebe a mensagem crua.
                                </p>
                            </div>

                            <div className="p-4 rounded-lg bg-[var(--background-secondary)] border border-[var(--glass-border)] hover:border-blue-500/30 transition-colors">
                                <div className="flex items-center gap-2 mb-2">
                                    <FileJson size={18} className="text-blue-500" />
                                    <h4 className="font-semibold text-sm">2. Persistência</h4>
                                </div>
                                <p className="text-xs text-[var(--foreground-muted)]">
                                    Mensagem salva em disco com status PENDING para garantir durabilidade.
                                </p>
                            </div>

                            <div className="p-4 rounded-lg bg-[var(--background-secondary)] border border-[var(--glass-border)] hover:border-purple-500/30 transition-colors">
                                <div className="flex items-center gap-2 mb-2">
                                    <Shield size={18} className="text-purple-500" />
                                    <h4 className="font-semibold text-sm">3. Deduplicação</h4>
                                </div>
                                <p className="text-xs text-[var(--foreground-muted)]">
                                    Se o hash já existir e TTL não expirou, retorna "Duplicate detected".
                                </p>
                            </div>

                            <div className="p-4 rounded-lg bg-[var(--background-secondary)] border border-[var(--glass-border)] hover:border-orange-500/30 transition-colors">
                                <div className="flex items-center gap-2 mb-2">
                                    <Zap size={18} className="text-orange-500" />
                                    <h4 className="font-semibold text-sm">4. Processamento</h4>
                                </div>
                                <p className="text-xs text-[var(--foreground-muted)]">
                                    Parsers, Scripts Lua e Filtros transformam o conteúdo.
                                </p>
                            </div>

                            <div className="p-4 rounded-lg bg-[var(--background-secondary)] border border-[var(--glass-border)] hover:border-red-500/30 transition-colors">
                                <div className="flex items-center gap-2 mb-2">
                                    <Layers size={18} className="text-red-500" />
                                    <h4 className="font-semibold text-sm">5. Saída</h4>
                                </div>
                                <p className="text-xs text-[var(--foreground-muted)]">
                                    Destination envia para o sistema externo. Status final: SENT ou ERROR.
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* Nodes */}
                    <section id="nodes" className="mb-16">
                        <h2 className="text-3xl font-bold mb-4">⚡ Nodes Disponíveis</h2>
                        <p className="text-[var(--foreground-muted)] leading-relaxed mb-6">
                            Os nodes são os blocos de construção dos seus fluxos de integração. Arraste-os da barra lateral
                            e conecte-os no canvas para criar pipelines.
                        </p>

                        <h3 className="text-xl font-semibold mb-4 text-green-400">Sources (Entrada)</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
                            {[
                                { name: 'HTTP Listener', desc: 'Recebe requisições HTTP/REST. Configure porta e path.' },
                                { name: 'TCP Listener', desc: 'Recebe conexões TCP com suporte a MLLP para HL7.' },
                                { name: 'File Reader', desc: 'Monitora diretório e processa arquivos novos.' },
                                { name: 'Database Poller', desc: 'Executa query periodicamente para buscar novos registros.' },
                                { name: 'Test Node', desc: 'Injeta mensagens manualmente para testes.' },
                            ].map((node) => (
                                <div key={node.name} className="glass p-3 rounded-lg border border-green-500/20">
                                    <h4 className="font-medium text-green-400">{node.name}</h4>
                                    <p className="text-xs text-[var(--foreground-muted)]">{node.desc}</p>
                                </div>
                            ))}
                        </div>

                        <h3 className="text-xl font-semibold mb-4 text-purple-400">Processors (Transformação)</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
                            {[
                                { name: 'Lua Script', desc: 'Execute código Lua para transformar mensagens.' },
                                { name: 'HL7 Parser', desc: 'Converte HL7 v2.x para JSON estruturado.' },
                                { name: 'Message Filter', desc: 'Filtra mensagens baseado em condições Lua.' },
                                { name: 'Content Router', desc: 'Roteia para diferentes destinos baseado em regras.' },
                                { name: 'Field Mapper', desc: 'Mapeia campos entre formatos diferentes.' },
                            ].map((node) => (
                                <div key={node.name} className="glass p-3 rounded-lg border border-purple-500/20">
                                    <h4 className="font-medium text-purple-400">{node.name}</h4>
                                    <p className="text-xs text-[var(--foreground-muted)]">{node.desc}</p>
                                </div>
                            ))}
                        </div>

                        <h3 className="text-xl font-semibold mb-4 text-blue-400">Destinations (Saída)</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {[
                                { name: 'HTTP Sender', desc: 'Envia requisições HTTP POST/PUT para APIs.' },
                                { name: 'File Writer', desc: 'Escreve mensagens em arquivos no sistema.' },
                                { name: 'Database Writer', desc: 'Insere registros em banco de dados.' },
                                { name: 'TCP Sender', desc: 'Envia via TCP com suporte a MLLP.' },
                            ].map((node) => (
                                <div key={node.name} className="glass p-3 rounded-lg border border-blue-500/20">
                                    <h4 className="font-medium text-blue-400">{node.name}</h4>
                                    <p className="text-xs text-[var(--foreground-muted)]">{node.desc}</p>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Lua */}
                    <section id="lua" className="mb-16">
                        <h2 className="text-3xl font-bold mb-4">📜 Scripts Lua</h2>
                        <p className="text-[var(--foreground-muted)] leading-relaxed mb-6">
                            Use Lua para transformar mensagens de forma flexível. O sistema disponibiliza variáveis
                            e funções especiais para facilitar o processamento.
                        </p>

                        <h3 className="text-xl font-semibold mb-3">Variáveis Disponíveis</h3>
                        <div className="overflow-x-auto mb-6">
                            <table className="w-full text-sm">
                                <thead className="bg-[var(--background-secondary)]">
                                    <tr>
                                        <th className="px-4 py-2 text-left">Variável</th>
                                        <th className="px-4 py-2 text-left">Tipo</th>
                                        <th className="px-4 py-2 text-left">Descrição</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--glass-border)]">
                                    <tr>
                                        <td className="px-4 py-2 font-mono text-[var(--primary)]">msg.content</td>
                                        <td className="px-4 py-2">string</td>
                                        <td className="px-4 py-2 text-[var(--foreground-muted)]">Conteúdo da mensagem</td>
                                    </tr>
                                    <tr>
                                        <td className="px-4 py-2 font-mono text-[var(--primary)]">msg.id</td>
                                        <td className="px-4 py-2">string</td>
                                        <td className="px-4 py-2 text-[var(--foreground-muted)]">UUID da mensagem</td>
                                    </tr>
                                    <tr>
                                        <td className="px-4 py-2 font-mono text-[var(--primary)]">msg.origin</td>
                                        <td className="px-4 py-2">string</td>
                                        <td className="px-4 py-2 text-[var(--foreground-muted)]">Origem da mensagem (ex: "HTTP :8080")</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <h3 className="text-xl font-semibold mb-3">Exemplo: Transformação Simples</h3>
                        <CodeBlock code={`-- Transformar mensagem para uppercase
msg.content = string.upper(msg.content)
return msg`} />

                        <h3 className="text-xl font-semibold mb-3 mt-6">Exemplo: Validação com Erro</h3>
                        <CodeBlock code={`-- Validar campos obrigatórios
local json = require("json")
local data = json.decode(msg.content)

if not data.patient_id then
    error("Patient ID is required")
end

if not data.patient_name then
    error("Patient name is required")
end

return msg`} />

                        <InfoBox type="info" title="Erros em Lua">
                            Quando você usa <code>error()</code> em Lua, a mensagem de erro é retornada ao cliente
                            e a mensagem é marcada com status ERROR para retry posterior.
                        </InfoBox>
                    </section>

                    {/* HL7 */}
                    <section id="hl7" className="mb-16">
                        <h2 className="text-3xl font-bold mb-4">🏥 HL7 Parser</h2>
                        <p className="text-[var(--foreground-muted)] leading-relaxed mb-6">
                            O HL7 Parser converte mensagens HL7 v2.x para JSON estruturado, facilitando o processamento
                            e integração com sistemas modernos.
                        </p>

                        <h3 className="text-xl font-semibold mb-3">Entrada HL7</h3>
                        <CodeBlock code={`MSH|^~\\&|SENDING_APP|SENDING_FACILITY|RECEIVING_APP|RECEIVING_FACILITY|20231217120000||ADT^A01|123456|P|2.5
PID|1||12345^^^Hospital^MR||Doe^John^A||19800101|M|||123 Main St^^City^ST^12345
PV1|1|I|ICU^101^1`} />

                        <h3 className="text-xl font-semibold mb-3 mt-6">Saída JSON</h3>
                        <CodeBlock code={`{
  "MSH": {
    "field_separator": "|",
    "encoding_characters": "^~\\\\&",
    "sending_application": "SENDING_APP",
    "sending_facility": "SENDING_FACILITY",
    "message_type": "ADT^A01",
    "message_control_id": "123456"
  },
  "PID": {
    "patient_id": "12345",
    "patient_name": "Doe^John^A",
    "birth_date": "19800101",
    "sex": "M"
  },
  "PV1": {
    "patient_class": "I",
    "assigned_location": "ICU^101^1"
  }
}`} language="json" />

                        <h3 className="text-xl font-semibold mb-3 mt-6">Uso em Lua</h3>
                        <CodeBlock code={`-- Acessar módulo HL7
local hl7 = require("hl7")

-- Parsear mensagem
local parsed = hl7.parse(msg.content)

-- Acessar campos
local patient_id = parsed.PID.patient_id
local patient_name = parsed.PID.patient_name

-- Criar JSON de saída
local json = require("json")
msg.content = json.encode({
    id = patient_id,
    name = patient_name,
    timestamp = os.date("%Y-%m-%dT%H:%M:%S")
})

return msg`} />
                    </section>

                    {/* API Reference */}
                    <section id="api" className="mb-16">
                        <h2 className="text-3xl font-bold mb-4">🔌 API Reference</h2>
                        <p className="text-[var(--foreground-muted)] leading-relaxed mb-6">
                            Todas as chamadas à API requerem autenticação via header <code>Authorization: Bearer {'<API_KEY>'}</code>.
                        </p>

                        <h3 className="text-xl font-semibold mb-3">Endpoints Principais</h3>
                        <div className="space-y-4">
                            <div className="glass p-4 rounded-lg border border-[var(--glass-border)]">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded font-mono">GET</span>
                                    <code className="text-sm">/api/health</code>
                                </div>
                                <p className="text-sm text-[var(--foreground-muted)]">Verifica se o backend está online.</p>
                            </div>

                            <div className="glass p-4 rounded-lg border border-[var(--glass-border)]">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded font-mono">GET</span>
                                    <code className="text-sm">/api/channels</code>
                                </div>
                                <p className="text-sm text-[var(--foreground-muted)]">Lista todos os canais deployados.</p>
                            </div>

                            <div className="glass p-4 rounded-lg border border-[var(--glass-border)]">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded font-mono">POST</span>
                                    <code className="text-sm">/api/channels</code>
                                </div>
                                <p className="text-sm text-[var(--foreground-muted)]">Deploya um novo canal com a configuração fornecida.</p>
                            </div>

                            <div className="glass p-4 rounded-lg border border-[var(--glass-border)]">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded font-mono">DELETE</span>
                                    <code className="text-sm">/api/channels/{'{id}'}</code>
                                </div>
                                <p className="text-sm text-[var(--foreground-muted)]">Remove e para um canal. (Limpa DB e para processos)</p>
                            </div>

                            <div className="glass p-4 rounded-lg border border-[var(--glass-border)]">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded font-mono">GET</span>
                                    <code className="text-sm">/api/messages</code>
                                </div>
                                <p className="text-sm text-[var(--foreground-muted)]">Lista mensagens com filtros opcionais (channel_id, status, limit).</p>
                            </div>

                            <div className="glass p-4 rounded-lg border border-[var(--glass-border)]">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded font-mono">POST</span>
                                    <code className="text-sm">/api/messages/{'{id}'}/retry</code>
                                </div>
                                <p className="text-sm text-[var(--foreground-muted)]">Força retry de uma mensagem específica.</p>
                            </div>

                            <div className="glass p-4 rounded-lg border border-[var(--glass-border)]">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded font-mono">POST</span>
                                    <code className="text-sm">/api/channels/{'{id}'}/stop</code>
                                </div>
                                <p className="text-sm text-[var(--foreground-muted)]">Para um canal específico.</p>
                            </div>

                            <div className="glass p-4 rounded-lg border border-[var(--glass-border)]">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded font-mono">GET</span>
                                    <code className="text-sm">/api/logs</code>
                                </div>
                                <p className="text-sm text-[var(--foreground-muted)]">Retorna os últimos logs do sistema.</p>
                            </div>
                        </div>
                    </section>

                    {/* Lua */}
                    <section id="lua" className="mb-16">
                        <h2 className="text-3xl font-bold mb-4">📜 Scripts Lua</h2>
                        <p className="text-[var(--foreground-muted)] leading-relaxed mb-6">
                            Use Lua para transformar mensagens de forma flexível. O sistema disponibiliza variáveis
                            e funções especiais para facilitar o processamento.
                        </p>

                        <h3 className="text-xl font-semibold mb-3">Variáveis Disponíveis</h3>
                        <div className="overflow-x-auto mb-6">
                            <table className="w-full text-sm">
                                <thead className="bg-[var(--background-secondary)]">
                                    <tr>
                                        <th className="px-4 py-2 text-left">Variável</th>
                                        <th className="px-4 py-2 text-left">Tipo</th>
                                        <th className="px-4 py-2 text-left">Descrição</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--glass-border)]">
                                    <tr>
                                        <td className="px-4 py-2 font-mono text-[var(--primary)]">msg.content</td>
                                        <td className="px-4 py-2">string</td>
                                        <td className="px-4 py-2 text-[var(--foreground-muted)]">Conteúdo da mensagem</td>
                                    </tr>
                                    <tr>
                                        <td className="px-4 py-2 font-mono text-[var(--primary)]">msg.id</td>
                                        <td className="px-4 py-2">string</td>
                                        <td className="px-4 py-2 text-[var(--foreground-muted)]">UUID da mensagem</td>
                                    </tr>
                                    <tr>
                                        <td className="px-4 py-2 font-mono text-[var(--primary)]">msg.origin</td>
                                        <td className="px-4 py-2">string</td>
                                        <td className="px-4 py-2 text-[var(--foreground-muted)]">Origem da mensagem (ex: "HTTP :8080")</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <h3 className="text-xl font-semibold mb-3">Exemplo: Transformação Simples</h3>
                        <CodeBlock code={`-- Transformar mensagem para uppercase
msg.content = string.upper(msg.content)
return msg`} />

                        <h3 className="text-xl font-semibold mb-3 mt-6">Exemplo: Validação com Erro</h3>
                        <CodeBlock code={`-- Validar campos obrigatórios
local json = require("json")
local data = json.decode(msg.content)

if not data.patient_id then
    error("Patient ID is required")
end

if not data.patient_name then
    error("Patient name is required")
end

return msg`} />

                        <InfoBox type="info" title="Erros em Lua">
                            Quando você usa <code>error()</code> em Lua, a mensagem de erro é retornada ao cliente
                            e a mensagem é marcada com status ERROR para retry posterior.
                        </InfoBox>
                    </section>

                    {/* HL7 */}
                    <section id="hl7" className="mb-16">
                        <h2 className="text-3xl font-bold mb-4">🏥 HL7 Parser</h2>
                        <p className="text-[var(--foreground-muted)] leading-relaxed mb-6">
                            O HL7 Parser converte mensagens HL7 v2.x para JSON estruturado, facilitando o processamento
                            e integração com sistemas modernos.
                        </p>

                        <h3 className="text-xl font-semibold mb-3">Entrada HL7</h3>
                        <CodeBlock code={`MSH|^~\\&|SENDING_APP|SENDING_FACILITY|RECEIVING_APP|RECEIVING_FACILITY|20231217120000||ADT^A01|123456|P|2.5
PID|1||12345^^^Hospital^MR||Doe^John^A||19800101|M|||123 Main St^^City^ST^12345
PV1|1|I|ICU^101^1`} />

                        <h3 className="text-xl font-semibold mb-3 mt-6">Saída JSON</h3>
                        <CodeBlock code={`{
  "MSH": {
    "field_separator": "|",
    "encoding_characters": "^~\\\\&",
    "sending_application": "SENDING_APP",
    "sending_facility": "SENDING_FACILITY",
    "message_type": "ADT^A01",
    "message_control_id": "123456"
  },
  "PID": {
    "patient_id": "12345",
    "patient_name": "Doe^John^A",
    "birth_date": "19800101",
    "sex": "M"
  },
  "PV1": {
    "patient_class": "I",
    "assigned_location": "ICU^101^1"
  }
}`} language="json" />

                        <h3 className="text-xl font-semibold mb-3 mt-6">Uso em Lua</h3>
                        <CodeBlock code={`-- Acessar módulo HL7
local hl7 = require("hl7")

-- Parsear mensagem
local parsed = hl7.parse(msg.content)

-- Acessar campos
local patient_id = parsed.PID.patient_id
local patient_name = parsed.PID.patient_name

-- Criar JSON de saída
local json = require("json")
msg.content = json.encode({
    id = patient_id,
    name = patient_name,
    timestamp = os.date("%Y-%m-%dT%H:%M:%S")
})

return msg`} />
                    </section>

                    {/* API Reference */}
                    <section id="api" className="mb-16">
                        <h2 className="text-3xl font-bold mb-4">🔌 API Reference</h2>
                        <p className="text-[var(--foreground-muted)] leading-relaxed mb-6">
                            Todas as chamadas à API requerem autenticação via header <code>Authorization: Bearer {'<API_KEY>'}</code>.
                        </p>

                        <h3 className="text-xl font-semibold mb-3">Endpoints Principais</h3>
                        <div className="space-y-4">
                            <div className="glass p-4 rounded-lg border border-[var(--glass-border)]">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded font-mono">GET</span>
                                    <code className="text-sm">/api/health</code>
                                </div>
                                <p className="text-sm text-[var(--foreground-muted)]">Verifica se o backend está online.</p>
                            </div>

                            <div className="glass p-4 rounded-lg border border-[var(--glass-border)]">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded font-mono">GET</span>
                                    <code className="text-sm">/api/channels</code>
                                </div>
                                <p className="text-sm text-[var(--foreground-muted)]">Lista todos os canais deployados.</p>
                            </div>

                            <div className="glass p-4 rounded-lg border border-[var(--glass-border)]">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded font-mono">POST</span>
                                    <code className="text-sm">/api/channels</code>
                                </div>
                                <p className="text-sm text-[var(--foreground-muted)]">Deploya um novo canal com a configuração fornecida.</p>
                            </div>

                            <div className="glass p-4 rounded-lg border border-[var(--glass-border)]">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded font-mono">GET</span>
                                    <code className="text-sm">/api/messages</code>
                                </div>
                                <p className="text-sm text-[var(--foreground-muted)]">Lista mensagens com filtros opcionais (channel_id, status, limit).</p>
                            </div>

                            <div className="glass p-4 rounded-lg border border-[var(--glass-border)]">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded font-mono">POST</span>
                                    <code className="text-sm">/api/messages/{'{id}'}/retry</code>
                                </div>
                                <p className="text-sm text-[var(--foreground-muted)]">Força retry de uma mensagem específica.</p>
                            </div>

                            <div className="glass p-4 rounded-lg border border-[var(--glass-border)]">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded font-mono">POST</span>
                                    <code className="text-sm">/api/channels/{'{id}'}/stop</code>
                                </div>
                                <p className="text-sm text-[var(--foreground-muted)]">Para um canal específico.</p>
                            </div>

                            <div className="glass p-4 rounded-lg border border-[var(--glass-border)]">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded font-mono">GET</span>
                                    <code className="text-sm">/api/logs</code>
                                </div>
                                <p className="text-sm text-[var(--foreground-muted)]">Retorna os últimos logs do sistema.</p>
                            </div>
                        </div>
                    </section>

                    {/* Footer */}
                    <footer className="border-t border-[var(--glass-border)] pt-8 mt-16 text-center text-sm text-[var(--foreground-muted)]">
                        <p>MirthBR - Healthcare Integration Engine</p>
                        <p className="mt-1">Versão 1.0.0 • Documentação atualizada em {new Date().toLocaleDateString('pt-BR')}</p>
                    </footer>
                </main>
            </div>
        </div>
    );
}
