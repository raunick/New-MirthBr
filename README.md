# MirthBR - Engine de Integração em Rust

<p align="center">
  <img src="frontend/public/logo.png" alt="MirthBR Logo" width="120" />
</p>

Uma **engine de integração para saúde** de alta performance (alternativa ao Mirth Connect) construída com **Rust** (Backend) e **Next.js/React Flow** (Frontend). Projetada para processar mensagens HL7, FHIR e formatos personalizados com um editor visual baseado em fluxos.

<p align="center">
  <img src="frontend/public/mirthbr-infografico.png" alt="Infográfico MirthBR" width="100%" />
</p>

---

## 🚀 Funcionalidades

### Editor Visual de Fluxos
- **13+ Tipos de Nós**: Origens (Sources), Processadores e Destinos para criar fluxos de integração completos.
- **Edição Inline**: Edite propriedades dos nós diretamente no canvas (portas, caminhos, URLs, etc.).
- **Arrastar e Soltar**: Interface intuitiva impulsionada pelo React Flow.
- **Logs em Tempo Real**: Monitore o processamento de mensagens e erros no visualizador de logs integrado.

### Capacidades de Processamento
- **Parse de HL7 v2**: Conversão automática de mensagens HL7 para JSON.
- **Scripting Lua**: Escreva lógica de transformação personalizada com acesso total aos módulos `json`, `hl7` e logging.
- **Mapeamento de Campos**: Mapeamento visual campo-a-campo entre formatos.
- **Roteamento de Conteúdo**: Roteie mensagens para diferentes destinos com base em condições.

### Performance
- **Runtime Assíncrono**: Construído sobre o runtime Tokio do Rust para I/O não-bloqueante de alto throughput.
- **Canais Concorrentes**: Execute múltiplos canais de integração simultaneamente.
- **Baixa Latência**: Processamento de mensagens em sub-milissegundos.

### Segurança e Confiabilidade
- **Sandboxing Lua**: Execução segura de scripts isolados do sistema operacional.
- **Autenticação Robusta**: Proteção contra força bruta, rate limiting e hashing seguro de senhas.
- **API Segura**: Validação estrita de headers e CORS restritivo.

---

## 📦 Tipos de Nós Disponíveis

### Origens / Sources (4)
| Nó | Descrição | Campos Editáveis |
|------|-------------|-----------------|
| **HTTP Listener** | Recebe requisições HTTP/REST | Port, Path |
| **TCP Listener** | Aceita conexões TCP puras | Port |
| **File Reader** | Monitora arquivos de um diretório | Path, Pattern |
| **Database Poller** | Consulta banco de dados em intervalo | Interval, SQL Query |

### Processadores / Processors (5)
| Nó | Descrição | Campos Editáveis |
|------|-------------|-----------------|
| **HL7 Parser** | Converte HL7 v2 ↔ JSON/FHIR | Input Format, Output Format |
| **Lua Script** | Código de transformação personalizado | Label, Code (modal) |
| **Field Mapper** | Mapeia campos origem → destino | Lista de Mapeamentos |
| **Message Filter** | Filtra por condição | Condition (modal) |
| **Content Router** | Roteia para múltiplas saídas | Lista de Rotas |

### Destinos / Destinations (4)
| Nó | Descrição | Campos Editáveis |
|------|-------------|-----------------|
| **File Writer** | Escreve no sistema de arquivos | Directory, Filename Pattern |
| **HTTP Sender** | Envia requisições HTTP | URL, Method |
| **Database Writer** | Insere/Atualiza banco de dados | Table, Mode, Query |
| **TCP Sender** | Envia via socket TCP | Host, Port |

---

## 🔒 Segurança e Arquitetura

O MirthBR foi atualizado com foco em **Security by Design** e modernização arquitetural:

### Melhorias de Segurança
- **Ambiente Lua Seguro (Sandboxed)**: Scripts de usuário rodam em ambiente isolado, prevenindo acesso não autorizado a arquivos ou rede fora do escopo permitido.
- **Autenticação Completa**: Fluxo de login com gestão de sessão segura, *hashing* de senhas com sal e políticas de complexidade.
- **Proteção de API**: Implementação de *Rate Limiting*, sanitização de logs/inputs e headers de segurança HTTP (OWASP recommendations).

### Evolução Arquitetural
- **Estado Global com Zustand**: O Frontend agora utiliza **Zustand** para gerenciamento de estado, garantindo maior performance e previsibilidade na manipulação de fluxos complexos.
- **Test Node Avançado**: Nova ferramenta de teste que permite tanto injetar mensagens diretamente no pipeline interno quanto realizar requisições HTTP externas para validar endpoints reais.
- **Viewer de Canais Backend**: Interface dedicada para inspeção de canais "Backend-Only" (definidos via código/configuração estática).

---

## 🛠️ Pré-requisitos

- **Rust** 1.70+: [Instalar Rust](https://www.rust-lang.org/tools/install)
- **Node.js** 18+: [Instalar Node.js](https://nodejs.org/)

---

## 🏁 Começando

### 1. Inicie o Backend

```bash
cd backend
cargo run
```

O backend inicia:
- **Servidor API**: `http://localhost:3001`
- **Canal Hello World**: HTTP Listener na porta `8090` (implantado automaticamente)

### 2. Inicie o Frontend

```bash
cd frontend
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000) no seu navegador.

---

## 📖 Guia de Uso

### Criando um Canal

1. **Adicionar Origem**: Clique em um nó de origem (Source) na barra lateral (ex: HTTP Listener).
2. **Configurar Inline**: Clique nos campos para editar (ex: mude a porta para `8080`).
3. **Adicionar Processador**: Adicione um HL7 Parser ou Lua Script para transformar os dados.
4. **Adicionar Destino**: Conecte a um File Writer ou HTTP Sender.
5. **Implantar (Deploy)**: Clique no botão **Deploy Channel**.

### Testando com HL7

```bash
# Envie uma mensagem HL7 para seu canal
curl -X POST http://localhost:8080/api/messages -d 'MSH|^~\&|SENDER|FACILITY|RECEIVER|DEST|202312140800||ADT^A01|12345|P|2.3
PID|||12345||DOE^JOHN||19800101|M'
```

Verifique o arquivo de saída (ex: `./output/${timestamp}.json`) para ver o resultado processado.

### Exemplos de Script Lua

```lua
-- Acessar HL7 parseado como JSON
local data = json.decode(msg.content)
log("Paciente: " .. data["PID"][5])

-- Modificar e retornar
data["processado"] = true
return json.encode(data)
```

```lua
-- Transformação simples
return msg.content:upper()
```

### Módulos Lua Disponíveis

| Módulo | Funções | Descrição |
|--------|-----------|-------------|
| `json` | `encode(val)`, `decode(str)` | Serialização JSON |
| `hl7` | `parse(str)`, `to_json(str)` | Parsing de HL7 v2 |
| `log` | `log(msg)` | Escreve nos logs do sistema |

---

## 🔌 Referência da API

| Endpoint | Método | Descrição |
|----------|--------|-------------|
| `/api/channels` | POST | Implantar uma configuração de canal |
| `/api/channels` | GET | Listar canais ativos |
| `/api/logs` | GET | Obter entradas de log recentes |
| `/api/health` | GET | Verificação de saúde (Health check) |

### Payload de Deploy de Canal

```json
{
  "name": "Meu Canal",
  "enabled": true,
  "source": {
    "type": "http_listener",
    "config": { "port": 8080, "path": "/api/messages" }
  },
  "processors": [
    {
      "id": "proc-1",
      "name": "HL7 Parser",
      "type": "hl7_parser",
      "config": { "inputFormat": "hl7v2", "outputFormat": "json" }
    }
  ],
  "destinations": [
    {
      "id": "dest-1",
      "name": "Saída de Arquivo",
      "type": "file_writer",
      "config": { "path": "./output", "filename": "${timestamp}.json" }
    }
  ]
}
```

---

## 📂 Estrutura do Projeto

```
mirthbr/
├── backend/                 # Servidor Rust Axum
│   ├── src/
│   │   ├── api/            # Handlers da API REST
│   │   ├── engine/         # Gerenciador de canais, listeners, processadores
│   │   ├── lua_helpers/    # Módulos json, hl7, logging para Lua
│   │   └── storage/        # Modelos e persistência
│   └── Cargo.toml
├── frontend/                # Aplicação Next.js
│   ├── src/
│   │   ├── app/            # Páginas e estilos globais
│   │   ├── components/
│   │   │   ├── flow/       # FlowCanvas e componentes dos 13 nós
│   │   │   ├── layout/     # Header, Sidebar
│   │   │   └── editor/     # LuaEditorModal
│   │   └── lib/            # Cliente API, flow-compiler
│   └── package.json
└── README.md
```

---

## 🧪 Arquitetura

```
┌─────────────────────────────────────────────────────────┐
│                     Frontend (Next.js)                   │
│  ┌─────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │ Sidebar │  │  FlowCanvas  │  │  Deploy/Test UI   │  │
│  └─────────┘  └──────────────┘  └───────────────────┘  │
└────────────────────────┬────────────────────────────────┘
                         │ REST API (JSON)
                         ▼
┌─────────────────────────────────────────────────────────┐
│                   Backend (Rust/Axum)                    │
│  ┌──────────────────────────────────────────────────┐  │
│  │               ChannelManager                      │  │
│  │  ┌──────────┐  ┌────────────┐  ┌──────────────┐  │  │
│  │  │ Listener │→ │ Processors │→ │ Destinations │  │  │
│  │  │ (HTTP)   │  │ (HL7, Lua) │  │ (File, HTTP) │  │  │
│  │  └──────────┘  └────────────┘  └──────────────┘  │  │
│  └──────────────────────────────────────────────────┘  │
│                         │                               │
│  ┌──────────────────────┴───────────────────────────┐  │
│  │              Lua Runtime (mlua)                   │  │
│  │   Modules: json, hl7, log                         │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```
---

### Confiabilidade e Recuperação (Roadmap)
- **Guaranteed Delivery**: (Em breve) Sistema de filas persistentes para garantir zero perda de dados.
- **Retry Policy**: Configuração de tentativas automáticas de reenvio para destinos offline.
- **Smart ACKs**: Gestão inteligente de confirmações HL7 (AA/AE/AR).

---

## 🤝 Contribuindo

Contribuições são bem-venidas! Por favor, abra uma issue ou envie um pull request.

---

## 📄 Licença

Licença MIT - veja [LICENSE](LICENSE) para detalhes.
