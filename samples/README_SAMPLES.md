# 📂 Exemplos de Canais MirthBR

Esta pasta contém exemplos profissionais de configuração de canais para o MirthBR. Use estes exemplos como referência para criar seus próprios fluxos de integração.

---

## 📋 Lista de Exemplos

| Arquivo | Descrição | Nível |
|---------|-----------|-------|
| `basic_http_to_file.json` | Fluxo simples: HTTP → Lua (uppercase) → File | Iniciante |
| `hospital_flow.json` | Conversão HL7 para JSON | Iniciante |
| `hl7_admission_complete.json` | Pipeline completo de admissão hospitalar | Intermediário |
| `lab_results_pipeline.json` | Processamento de resultados laboratoriais com alertas críticos | Intermediário |
| `test_node_examples.json` | Payloads de exemplo para Test Node | Referência |
| `multiprotocol_integration.json` | Hub multi-protocolo (TCP, HTTP, File, DB) | Avançado |

---

## 🚀 Como Usar os Exemplos

### 1. Carregar no Editor Visual

1. Abra o MirthBR em [http://localhost:3000](http://localhost:3000)
2. Use o botão "Import" para carregar qualquer arquivo `.json`
3. O fluxo será renderizado automaticamente no canvas

### 2. Importar via API

```bash
# Importar um canal diretamente via API
curl -X POST http://localhost:3001/api/channels \
  -H "Content-Type: application/json" \
  -d @samples/hl7_admission_complete.json
```

### 3. Copiar Processadores Lua

Os scripts Lua contidos nos exemplos podem ser copiados e adaptados para seus próprios canais.

---

## 📖 Descrição Detalhada dos Exemplos

### 🏥 `hl7_admission_complete.json`

Pipeline completo para processamento de mensagens ADT^A01 (admissão hospitalar):

```
HTTP Listener (8081/hl7/admission)
    │
    ├── Log Entrada (auditoria)
    │
    ├── HL7 Parser (HL7 → JSON)
    │
    ├── Validador de Dados (PID, PV1)
    │
    ├── Enriquecimento (metadados)
    │
    └── Destinos
        ├── File Writer (backup local)
        └── HTTP Sender (sistema EHR)
```

**Funcionalidades demonstradas:**
- Parsing de HL7 v2
- Validação de campos obrigatórios
- Enriquecimento de dados
- Múltiplos destinos

---

### 🔬 `lab_results_pipeline.json`

Pipeline para processamento de resultados laboratoriais (ORU^R01):

```
TCP Listener (2575/MLLP)
    │
    ├── Gerador de ACK
    │
    ├── HL7 to JSON
    │
    ├── Verificador de Críticos
    │   (detecta valores fora do normal)
    │
    ├── Formatador de Saída
    │
    └── Destinos
        ├── Database Writer (LIS)
        ├── File Writer (arquivo)
        └── HTTP Webhook (alertas críticos)
```

**Funcionalidades demonstradas:**
- Recepção TCP/MLLP
- Parsing de OBR/OBX
- Detecção de valores críticos
- Alertas condicionais

---

### 🧪 `test_node_examples.json`

Arquivo de referência com payloads de teste para todos os formatos suportados:

#### Formatos HL7

| Exemplo | Tipo | Descrição |
|---------|------|-----------|
| `hl7_adt_a01` | ADT^A01 | Admissão de paciente |
| `hl7_adt_a03` | ADT^A03 | Alta de paciente |
| `hl7_oru_r01` | ORU^R01 | Resultado de laboratório normal |
| `hl7_oru_critical` | ORU^R01 | Resultado crítico (K+ alto) |

#### Formatos JSON

| Exemplo | Descrição |
|---------|-----------|
| `json_patient` | Cadastro de paciente (FHIR-like) |
| `json_order` | Pedido de exame |

#### Outros Formatos

| Exemplo | Formato | Descrição |
|---------|---------|-----------|
| `xml_dicom_worklist` | XML | DICOM Worklist Entry |
| `csv_patients_batch` | CSV | Importação em lote |
| `soap_pacs_query` | SOAP | Consulta PACS |
| `rest_api_webhook` | REST/JSON | Webhook de evento |

**Como usar com Test Node:**

1. Adicione um **Test Node** ao seu fluxo
2. Expanda o nó clicando nele
3. Selecione o formato desejado no dropdown
4. Cole o payload do exemplo
5. Escolha o modo (Internal ou HTTP)
6. Clique em "Send Test"

---

### 🔌 `multiprotocol_integration.json`

Hub de integração demonstrando múltiplos protocolos:

```
┌─────────────────────────────────────────────────────────────┐
│                   Integration Hub                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  TCP (2575/MLLP) ─────┐                                     │
│                       │                                      │
│  HTTP (8080/REST) ────┼──────► Message Queue                │
│                       │        Database                      │
│  File Reader (CSV) ───┤        HTTP Webhooks                │
│                       │        File Archive                  │
│  Database Poller ─────┘                                     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Canais incluídos:**
- `channel-tcp-hl7`: Receptor HL7 via TCP/MLLP
- `channel-http-rest`: Gateway REST API
- `channel-file-csv`: Importador de CSV
- `channel-db-poller`: Poller de banco de dados

---

## 🛠️ Scripts Lua Comuns

### Parse de HL7 para JSON

```lua
local hl7 = require('hl7')
local json = require('json')

local json_output = hl7.to_json(msg.content)
log.info('HL7 convertido para JSON')

return json_output
```

### Validação de Campos

```lua
local json = require('json')
local data = json.decode(msg.content)

if not data.PID or not data.PID[3] then
    log.error('ID do paciente ausente')
    return nil
end

return msg.content
```

### Enriquecimento com Metadados

```lua
local json = require('json')
local data = json.decode(msg.content)

data['_metadata'] = {
    processedAt = os.date('%Y-%m-%dT%H:%M:%SZ'),
    processedBy = 'MirthBR',
    channelId = 'my-channel-001'
}

return json.encode(data)
```

### Detecção de Resultados Críticos

```lua
local json = require('json')
local data = json.decode(msg.content)

if data.OBX then
    for i, obx in ipairs(data.OBX) do
        if obx[8] == 'HH' or obx[8] == 'LL' then
            log.warn('CRÍTICO: ' .. obx[3] .. ' = ' .. obx[5])
        end
    end
end

return msg.content
```

---

## 📞 Suporte

Para dúvidas ou contribuições, abra uma issue no repositório ou consulte a documentação completa no `README.md` principal.
