# 📂 Exemplos de Workflows MirthBR

Esta pasta contém exemplos prontos para importação no editor visual do MirthBR.

---

## 🚀 Como Importar

1. Abra o MirthBR em [http://localhost:3000](http://localhost:3000)
2. Clique no botão **Upload** no canto superior direito
3. Selecione um arquivo `flow_*.json`
4. O fluxo será carregado automaticamente no canvas!

---

## 📁 Arquivos de Flow (Para Importar)

| Arquivo | Descrição | Nós Incluídos |
|---------|-----------|---------------|
| `flow_hl7_admission.json` | Pipeline de admissão hospitalar | Test Node, HTTP Listener, HL7 Parser, Lua Script (2x), File Writer |
| `flow_lab_results.json` | Resultados laboratoriais com alertas críticos | Test Nodes (2x), HTTP Listener, HL7 Parser, Lua Script (2x), File Writer |
| `flow_test_node_examples.json` | Showcase de Test Nodes | Test Nodes (4x: HL7 ADT, ORU, JSON, XML), HTTP Listener, Lua Script, File Writer |
| `flow_dynamic_config.json` | Configuração dinâmica | Port Node, Text Node, IP Node, HTTP Listener, Lua Script, HTTP Sender, File Writer |

---

## 🧪 Usando o Test Node

Cada workflow inclui **Test Nodes** configurados com exemplos. Para testar:

1. Importe um workflow
2. Clique em **Deploy Channel** para ativar o canal
3. Clique no **Test Node** para expandir
4. Selecione o modo:
   - **Internal**: Injeta diretamente no processador
   - **HTTP Request**: Faz uma requisição HTTP real
5. Clique em **Send Test**

### Formatos de Payload Suportados

| Formato | Descrição | Exemplo |
|---------|-----------|---------|
| HL7 | Mensagens HL7 v2.x | ADT^A01, ORU^R01 |
| JSON | Dados estruturados | FHIR Patient |
| XML | Dados XML | DICOM Worklist |
| CSV | Dados tabulares | Importação em lote |
| SOAP | Web Services | Consultas PACS |

---

## 📋 Descrição dos Workflows

### 🏥 flow_hl7_admission.json

**Pipeline completo de admissão hospitalar:**

```
Test Node (HL7 ADT^A01)
         ↓
HTTP Listener (:8081/hl7/admission)
         ↓
HL7 Parser (HL7 → JSON)
         ↓
Validador de Dados (verifica PID, PV1)
         ↓
Enriquecimento (adiciona metadados)
         ↓
File Writer (salva JSON)
```

---

### 🔬 flow_lab_results.json

**Processamento de resultados laboratoriais:**

```
Test Node Normal    Test Node CRÍTICO
    ↘                    ↙
HTTP Listener (:8082/lab/results)
         ↓
HL7 Parser
         ↓
Detector de Críticos (K+, Glicose, etc)
         ↓
Formatador de Saída
         ↓
File Writer
```

O detector de críticos identifica automaticamente:
- `HH`: Muito alto (High High)
- `LL`: Muito baixo (Low Low)

---

### 🧪 flow_test_node_examples.json

**Demonstração de todos os formatos do Test Node:**

- **HL7 ADT^A01**: Admissão de paciente
- **HL7 ORU^R01**: Resultado de laboratório
- **JSON Patient**: Cadastro FHIR-like
- **XML DICOM**: Worklist entry

---

### 🔧 flow_dynamic_config.json

**Demonstração de configuração dinâmica:**

Mostra como usar nós auxiliares para configurar dinamicamente:
- **Port Node**: Define porta reutilizável
- **Text Node**: Define paths e templates
- **IP Node**: Define endereços IP

Templates suportam variáveis: `${Nome do Nó}`

---

## 📄 Outros Arquivos (Referência)

Estes arquivos são no formato de **configuração do backend**, não para importação direta:

| Arquivo | Descrição |
|---------|-----------|
| `basic_http_to_file.json` | Exemplo básico de canal |
| `hospital_flow.json` | Fluxo hospitalar simples |
| `hl7_admission_complete.json` | Configuração detalhada de canal |
| `lab_results_pipeline.json` | Pipeline de laboratório |
| `test_node_examples.json` | Payloads de referência |
| `multiprotocol_integration.json` | Hub multi-protocolo |

---

## 💡 Dicas

1. **Deploy antes de testar**: Sempre faça Deploy do canal antes de usar o Test Node em modo HTTP
2. **Verifique os logs**: Abra o painel de logs para ver o processamento em tempo real
3. **Porta já em uso?**: Mude a porta do HTTP Listener se houver conflito
4. **Copie scripts Lua**: Os scripts são editáveis - clique no ícone de edição para abrir o editor Monaco

---

## 🆘 Solução de Problemas

### "Arquivo de workflow inválido"
- Certifique-se de usar arquivos `flow_*.json` (com `nodes` array)
- Arquivos de configuração de canal não são importáveis diretamente

### "Network Error" no Test Node
- Verifique se o canal foi deployado
- Confirme que a porta está correta e disponível
- Verifique o console do navegador para mais detalhes
