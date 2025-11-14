# Product Requirements Document (PRD)
## Controle de Frotas

**Versão:** 1.0  
**Data:** 14 de Novembro de 2024  
**Status:** Em Desenvolvimento  
**Proprietário do Produto:** [Equipe de Desenvolvimento]

---

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Objetivos do Produto](#objetivos-do-produto)
3. [Escopo](#escopo)
4. [Arquitetura do Sistema](#arquitetura-do-sistema)
5. [Requisitos Funcionais](#requisitos-funcionais)
6. [Requisitos Não-Funcionais](#requisitos-não-funcionais)
7. [Fluxos de Usuário](#fluxos-de-usuário)
8. [Modelo de Dados](#modelo-de-dados)
9. [APIs e Integrações](#apis-e-integrações)
10. [Cronograma](#cronograma)
11. [Riscos e Mitigações](#riscos-e-mitigações)
12. [Métricas de Sucesso](#métricas-de-sucesso)

---

## 🎯 Visão Geral

**Controle de Frotas** é uma plataforma integrada para gerenciamento completo de frotas de veículos. O sistema permite que empresas otimizem suas operações logísticas através de:

- Rastreamento e controle de veículos em tempo real
- Gerenciamento de motoristas e suas documentações
- Registro e análise de viagens
- Monitoramento de abastecimento e custos
- Agendamento e acompanhamento de manutenções
- Sistema de alertas automáticos
- Dashboards analíticos para tomada de decisão

### Público-Alvo

- **Administradores de Frotas**: Gerenciam toda a frota através do painel web
- **Motoristas**: Registram viagens e atividades via aplicativo móvel
- **Gestores Operacionais**: Monitoram métricas e relatórios

---

## 🎯 Objetivos do Produto

### Objetivos Primários

1. **Centralizar Informações**: Consolidar dados de frotas em uma plataforma única
2. **Otimizar Custos**: Reduzir despesas com combustível, manutenção e operações
3. **Aumentar Eficiência**: Melhorar utilização de veículos e rota de motoristas
4. **Melhorar Segurança**: Rastrear localização e histórico de motoristas
5. **Facilitar Compliance**: Manter registros de documentações e manutenções

### Objetivos Secundários

1. **Escalabilidade**: Sistema preparado para crescimento de frota
2. **Usabilidade**: Interface intuitiva para usuários técnicos e não-técnicos
3. **Confiabilidade**: Disponibilidade 99.5% para operações críticas
4. **Integração**: Suporte para futuras integrações com terceiros

---

## 📊 Escopo

### In-Scope (Incluído)

#### MVP - Fase 1
- [x] Gerenciamento básico de veículos (CRUD)
- [x] Gerenciamento de motoristas com documentações
- [x] Registro de viagens com odômetro inicial e final
- [x] Rastreamento de abastecimento
- [x] Registros de manutenção preventiva
- [x] Sistema de alertas (prioridades: Alta, Média, Baixa)
- [x] Painel administrativo web
- [x] Aplicativo móvel para motoristas
- [x] Autenticação com JWT

#### Fase 2 (Roadmap)
- [ ] Relatórios avançados com exportação
- [ ] Análise de eficiência de combustível
- [ ] Integração com GPS em tempo real
- [ ] Sistema de notificações push
- [ ] Previsão de manutenção com IA
- [ ] Integração com sistemas contábeis

### Out-of-Scope

- Gerenciamento de carga/frete
- Controle de acesso físico a garagens
- Integração com seguros
- Sistema de billing/faturamento

---

## 🏗️ Arquitetura do Sistema

### Componentes Principais

```
┌─────────────────────────────────────────────────────────────┐
│                     Camada de Apresentação                  │
├─────────────────────┬───────────────────────────────────────┤
│  Painel Web Admin   │   Aplicativo Móvel (Expo/RN)         │
│  (React + Vite)    │   (iOS/Android)                       │
└──────────┬──────────┴────────────────┬──────────────────────┘
           │                           │
           │      HTTPS/REST API       │
           │                           │
┌──────────▼──────────────────────────▼──────────────────────┐
│              Camada de API (Backend)                        │
├───────────────────────────────────────────────────────────┤
│  Node.js + Express                                         │
│  - Autenticação & Autorização (JWT)                       │
│  - Validação de Dados                                     │
│  - Lógica de Negócio                                      │
│  - Tratamento de Erros                                   │
└──────────┬───────────────────────────────────────────────┘
           │
           │   SQL/ORM
           │
┌──────────▼───────────────────────────────────────────────┐
│           Camada de Dados                                │
├───────────────────────────────────────────────────────────┤
│  - PostgreSQL (Banco Relacional)                         │
│  - Prisma ORM                                            │
│  - Migrations & Schemas                                  │
└───────────────────────────────────────────────────────────┘
```

### Stack Tecnológico

| Camada | Tecnologia | Versão | Propósito |
|--------|-----------|--------|-----------|
| **Backend** | Node.js | 18+ | Runtime JavaScript |
| | Express | 5.0+ | Framework HTTP |
| | Prisma | 6.14+ | ORM TypeScript |
| | PostgreSQL | 12+ | Banco de Dados |
| | JWT | 9.0+ | Autenticação |
| | bcrypt | 6.0+ | Hash de Senhas |
| **Web Admin** | React | 19.0 | UI Framework |
| | TypeScript | 5+ | Type Safety |
| | Vite | Latest | Build Tool |
| | Tailwind CSS | 3+ | Styling |
| | shadcn/ui | Latest | Component Library |
| **Mobile** | Expo | 53+ | React Native Framework |
| | React Native | 0.79+ | Mobile Framework |
| | TypeScript | 5+ | Type Safety |
| | AsyncStorage | 2.2+ | Local Storage |
| | expo-location | 18+ | GPS Services |

---

## ✨ Requisitos Funcionais

### RF1: Gerenciamento de Veículos

#### RF1.1 - Criar Veículo
- **Descrição**: Administrador pode registrar novos veículos na frota
- **Ator**: Administrador
- **Pré-condição**: Usuário autenticado como ADMIN
- **Fluxo Principal**:
  1. Acessa página de registrar veículo
  2. Preenche dados: placa, modelo, ano, cor, chassi, renavam, capacidade
  3. Sistema valida unicidade de placa, chassi e renavam
  4. Salva veículo com status "disponível"
  5. Exibe confirmação de sucesso
- **Campos Obrigatórios**: Placa, Modelo, Ano, Cor, Chassi, Renavam, Capacidade
- **Campos Opcionais**: Marca, Seguradora, Apólice, Observações
- **Validações**: 
  - Placa única (formato: ABC1234)
  - Chassi único
  - Renavam único
  - Ano >= 1990
  - Capacidade > 0

#### RF1.2 - Listar Veículos
- **Descrição**: Visualizar todos os veículos da frota
- **Ator**: Administrador, Gestor
- **Exibição**: Tabela com paginação (25 veículos/página)
- **Colunas**: Placa, Modelo, Ano, Status, Quilometragem, Combustível, Ações
- **Filtros**: Status (disponível, manutencao, indisponível), Combustível (gasolina, diesel, gnv)
- **Ordenação**: Placa (A-Z), Data Compra, Quilometragem

#### RF1.3 - Atualizar Veículo
- **Descrição**: Modificar dados de um veículo existente
- **Ator**: Administrador
- **Campos Editáveis**: Quilometragem, Status, Seguradora, Observações
- **Campos Não-Editáveis**: Placa, Chassi, Renavam (após criação)
- **Fluxo**:
  1. Clica em editar em um veículo
  2. Modifica campos permitidos
  3. Salva alterações
  4. Sistema registra auditoria da mudança

#### RF1.4 - Deletar Veículo
- **Descrição**: Remover veículo do sistema
- **Ator**: Administrador
- **Restrição**: Pode deletar apenas veículos sem viagens ativas
- **Confirmação**: Requer dupla confirmação
- **Auditoria**: Registra quem deletou e quando

#### RF1.5 - Visualizar Detalhes do Veículo
- **Descrição**: Ver informações completas de um veículo
- **Exibição**:
  - Dados gerais (placa, modelo, ano, cor)
  - Dados técnicos (chassi, renavam, capacidade)
  - Seguro (seguradora, apólice, validade)
  - Status operacional
  - Histórico de quilometragem
  - Viagens recentes
  - Manutenções programadas
  - Alertas ativos

---

### RF2: Gerenciamento de Motoristas

#### RF2.1 - Criar Motorista
- **Descrição**: Registrar novo motorista na base
- **Ator**: Administrador
- **Campos Obrigatórios**:
  - Nome completo
  - CPF (único)
  - RG (único)
  - Data de Nascimento
  - CNH (número, categoria, validade)
  - Email
  - Telefone
- **Campos Opcionais**: Endereço, Data de Contratação, Salário, Observações
- **Validações**:
  - CPF válido e único
  - RG único
  - CNH com validade futura
  - Email em formato válido
  - Telefone em formato válido
- **Restrição**: Motorista deve ter no mínimo 18 anos

#### RF2.2 - Listar Motoristas
- **Descrição**: Visualizar todos os motoristas cadastrados
- **Exibição**: Tabela com paginação
- **Colunas**: Nome, CPF, CNH, Status, Data Contratação, Telefone, Ações
- **Filtros**: Status (ativo, inativo, afastado), Categoria CNH
- **Busca**: Por nome, CPF, CNH

#### RF2.3 - Atualizar Motorista
- **Descrição**: Modificar dados de motorista
- **Campos Editáveis**: Telefone, Endereço, Status, Salário, Observações
- **Campos Não-Editáveis**: CPF, RG (após criação)
- **Validação de CNH**: Sistema alerta se CNH vencer em 60 dias

#### RF2.4 - Visualizar Perfil Motorista
- **Exibição**:
  - Dados pessoais
  - Documentação (CPF, RG, CNH com status de validade)
  - Viagens realizadas (últimas 10)
  - Média de km/dia
  - Alertas associados
  - Histórico de manutenções

---

### RF3: Gerenciamento de Viagens

#### RF3.1 - Registrar Viagem (Web Admin)
- **Ator**: Administrador
- **Campos**:
  - Motorista (dropdown)
  - Veículo (dropdown)
  - Data/Hora Saída
  - Local Saída
  - Destino Final
  - **Odômetro Inicial (kmInicial)** - Obrigatório
  - Observações
- **Validações**:
  - Veículo disponível na data
  - Motorista sem outra viagem na mesma data
  - kmInicial > 0
- **Estado Inicial**: ATIVA

#### RF3.2 - Registrar Viagem (App Móvel)
- **Ator**: Motorista
- **Fluxo**:
  1. Abre app e vai para "Registrar Viagem"
  2. Seleciona veículo (atribuído ao motorista)
  3. Define destino
  4. Insere **Odômetro Inicial**
  5. Sistema captura GPS (latitude/longitude)
  6. Se offline: salva em AsyncStorage
  7. Ao voltar online: sincroniza com backend
- **Campos**:
  - Veículo
  - Destino
  - Odômetro Inicial
  - Localização (GPS)
- **Validação**: kmInicial > quilometragem anterior

#### RF3.3 - Finalizar Viagem
- **Ator**: Web Admin ou Motorista
- **Campos**:
  - Data/Hora Chegada
  - **Odômetro Final (kmFinal)**
  - Status (CONCLUIDA, CANCELADA)
- **Cálculo Automático**: 
  - Distância = kmFinal - kmInicial
  - Duração = Hora Chegada - Hora Saída
- **Validações**:
  - kmFinal > kmInicial
  - kmFinal >= quilometragem anterior do veículo
- **Atualização**: Quilometragem do veículo atualizada para kmFinal

#### RF3.4 - Listar Viagens
- **Exibição**: 
  - Tabela com paginação
  - Colunas: Motorista, Veículo, Data Saída, Destino, kmInicial, kmFinal, Distância, Status
- **Filtros**: Status, Data, Motorista, Veículo
- **Ordenação**: Data (recentes primeiro)

#### RF3.5 - Visualizar Detalhes Viagem
- **Exibição**:
  - Dados da viagem
  - Distância percorrida
  - Tempo total
  - Rota (se GPS disponível)
  - Consumo estimado de combustível
  - Custo estimado

---

### RF4: Gerenciamento de Abastecimento

#### RF4.1 - Registrar Abastecimento
- **Ator**: Administrador ou Motorista (via app)
- **Campos Obrigatórios**:
  - Veículo
  - Data do Abastecimento
  - Quilometragem (ao abastecer)
  - Litros
  - Valor
  - Tipo de Combustível
- **Campos Opcionais**: Combustível (gasolina/diesel/gnv), Observações
- **Validações**:
  - Quilometragem >= quilometragem anterior
  - Litros > 0
  - Valor > 0

#### RF4.2 - Cálculo de Eficiência
- **Fórmula**: km/L = Quilometragem desde último abastecimento / Litros
- **Exibição**: Mostrar em dashboard com histórico
- **Alerta**: Se km/L < 5 (consumo suspeito)

#### RF4.3 - Listar Abastecimentos
- **Filtros**: Veículo, Data, Tipo Combustível
- **Exibição**: Data, Veículo, Quilometragem, Litros, Valor, km/L, Observações

#### RF4.4 - Análise de Custos
- **Métricas**:
  - Gasto total por veículo (mês)
  - Gasto total por motorista
  - km/L médio
  - Custo por km

---

### RF5: Gerenciamento de Manutenções

#### RF5.1 - Registrar Manutenção
- **Ator**: Administrador
- **Campos Obrigatórios**:
  - Veículo
  - Data da Manutenção
  - Tipo (troca óleo, revisão, pneu, reparo, etc)
  - Descrição
  - Quilometragem
  - Valor
- **Campos Opcionais**: Mecânico, Oficina, Observações
- **Validações**: Quilometragem >= quilometragem anterior

#### RF5.2 - Agendar Manutenção Preventiva
- **Ator**: Administrador
- **Critérios**:
  - A cada 10.000 km (revisão)
  - A cada 5.000 km (troca de óleo)
  - Anualmente (inspeção)
- **Acionamento**: Sistema cria alerta automaticamente

#### RF5.3 - Listar Manutenções
- **Filtros**: Veículo, Tipo, Data, Status
- **Exibição**: Tipo, Data, Veículo, Quilometragem, Custo

#### RF5.4 - Histórico de Manutenção
- **Por Veículo**: Mostrar todas as manutenções desde compra
- **Análise**: Custo total de manutenção por veículo

---

### RF6: Sistema de Alertas

#### RF6.1 - Criar Alerta
- **Ator**: Sistema (automático) ou Administrador (manual)
- **Campos**:
  - Veículo
  - Tipo (MANUTENCAO_PREVENTIVA, REVISAO_AGENDADA, CNH_VENCENDO, SEGURO_VENCENDO, COMBUSTIVEL_BAIXO)
  - Prioridade (ALTA, MEDIA, BAIXA)
  - Descrição
  - Data do Alerta
- **Prioridades**:
  - ALTA: Requer ação imediata (CNH vencida, seguro vencido)
  - MEDIA: Requer ação em breve (manutenção próxima)
  - BAIXA: Informativo (próxima manutenção preventiva)

#### RF6.2 - Alertas Automáticos
- **Disparo Automático**:
  - CNH vencerá em 60 dias
  - Seguro vencerá em 30 dias
  - Próxima revisão em 1.000 km
  - Quilometragem atinge x (configurável)
- **Sincronização**: Diária às 6h da manhã

#### RF6.3 - Gerenciar Alertas
- **Listar**: Mostrar alertas ativos com filtro por prioridade
- **Marcar como Resolvido**: Pode ser marcado quando ação é completada
- **Excluir**: Remover alertas resolvidos

#### RF6.4 - Visualizar Alertas
- **Dashboard**: Widget mostrando alertas críticos (ALTA)
- **Notificações**: Push notification no app móvel (fase 2)

---

### RF7: Autenticação e Autorização

#### RF7.1 - Login
- **Fluxo**:
  1. Usuário insere email e senha
  2. Sistema valida credenciais
  3. Se válido: gera JWT token
  4. Token armazenado no cliente (localStorage/AsyncStorage)
- **Validação**: Email e senha obrigatórios
- **Erro**: "Credenciais inválidas" (genérico por segurança)
- **Duração Token**: 24 horas

#### RF7.2 - Refresh Token
- **Endpoint**: POST /refresh
- **Requer**: JWT válido
- **Retorna**: Novo JWT válido
- **TTL Novo Token**: 24 horas

#### RF7.3 - Autorização por Role
- **Roles**:
  - ADMIN: Acesso total ao sistema
  - USER: Acesso limitado (motorista - apenas seus dados)
  - GESTOR: Acesso a relatórios (fase 2)
- **Validação**: Cada endpoint valida role necessária

#### RF7.4 - Logout
- **Ação**: Cliente remove token do localStorage/AsyncStorage
- **Backend**: Opcional registrar logout

---

### RF8: Dashboard e Relatórios

#### RF8.1 - Dashboard Principal (Web Admin)
- **Widgets**:
  - Total de veículos (com status)
  - Viagens ativas
  - Alertas críticos
  - Gasto total do mês
  - km média por dia
  - Consumo de combustível
- **Gráficos**:
  - Viagens por semana (linha)
  - Custo por veículo (barra)
  - Status da frota (pizza)

#### RF8.2 - Dashboard Motorista (App Móvel)
- **Widgets**:
  - Veículo atribuído
  - Próxima viagem
  - Alertas pessoais
  - Estatísticas (viagens mês, km total)

#### RF8.3 - Relatórios (Fase 2)
- Viagens por período
- Custos operacionais
- Performance de motoristas
- Consumo de combustível
- Manutenções realizadas

---

## 🔧 Requisitos Não-Funcionais

### RNF1: Performance

| Métrica | Alvo | Aceitável |
|---------|------|-----------|
| Tempo de Resposta API (p95) | < 200ms | < 500ms |
| Tempo de Carregamento (First Contentful Paint) | < 1.5s | < 3s |
| Throughput API | 1000+ req/s | 500+ req/s |
| Latência de Banco de Dados | < 50ms | < 100ms |

### RNF2: Confiabilidade

- **Disponibilidade**: 99.5% uptime (máx 3.6h downtime/mês)
- **MTTR** (Mean Time To Repair): < 15 minutos
- **MTBF** (Mean Time Between Failures): > 720 horas
- **Backup**: Diário com retenção de 30 dias

### RNF3: Segurança

- **Criptografia**: TLS 1.3 para dados em trânsito
- **Senhas**: Hashing com bcrypt (custo 10+)
- **JWT**: HS256 ou RS256 para tokens
- **CORS**: Whitelist de domínios
- **Rate Limiting**: 100 req/min por IP
- **Validação**: Todos os inputs validados server-side

### RNF4: Escalabilidade

- **Arquitetura**: Stateless backend (permite horizontal scaling)
- **Database**: Connection pooling (até 20 conexões)
- **Cache**: Redis para sessões (fase 2)
- **Load Balancing**: Suporte para múltiplas instâncias

### RNF5: Usabilidade

- **Responsividade**: Funciona em desktop, tablet, mobile
- **Acessibilidade**: Cumprimento WCAG 2.1 AA
- **Idioma**: Português Brasileiro
- **Tempo de Aprendizado**: Usuário novo operacional em < 2 horas

### RNF6: Manutenibilidade

- **Código**: ESLint + Prettier (padronização)
- **Testes**: Coverage mínimo 70%
- **Documentação**: JSDoc em funções críticas
- **Versionamento**: Semver para releases

### RNF7: Conformidade

- **Logs**: Auditoria de operações críticas (CRUD em veículos/motoristas)
- **LGPD**: Direito ao esquecimento, consentimento para dados pessoais
- **Backup**: Retenção mínima de 30 dias

---

## 👥 Fluxos de Usuário

### Fluxo 1: Admin Registra Novo Veículo

```
Admin → Sistema
  1. Login (email/senha)
  2. Navegação → Veículos
  3. Clica "Novo Veículo"
  4. Preenche formulário (placa, modelo, ano, etc)
  5. Clica "Salvar"
  6. Validação no backend
     - Se OK: Veículo criado, exibe confirmação
     - Se erro: Exibe mensagem de erro
  7. Admin redirecionado para lista de veículos
  8. Novo veículo aparece na tabela
```

### Fluxo 2: Motorista Registra Viagem (App Móvel)

```
Motorista → Aplicativo
  1. Abre app
  2. Autenticação (se necessária)
  3. Vai para aba "Registrar Viagem"
  4. Seleciona veículo (atribuído)
  5. Insere destino
  6. Insere odômetro inicial
  7. Toca "Iniciar Viagem"
  8. Sistema captura GPS
  9. Se online: Envia para backend, exibe "Viagem iniciada"
     Se offline: Salva em AsyncStorage, exibe "Será sincronizado"
  10. Motorista viaja...
  11. Ao chegar, vai para "Encerrar Viagem"
  12. Insere odômetro final
  13. Sistema calcula distância
  14. Toca "Finalizar"
  15. Se online: Envia para backend
      Se offline: Salva localmente
  16. Exibe confirmação
```

### Fluxo 3: Admin Visualiza Dashboard

```
Admin → Sistema
  1. Login e autenticação
  2. Acessa painel principal
  3. Dashboard carrega com:
     - Total de veículos
     - Viagens ativas
     - Alertas críticos
     - Gráficos de custos
  4. Admin pode:
     - Clicar em card para ver detalhes
     - Aplicar filtros
     - Exportar dados (fase 2)
```

### Fluxo 4: Sistema Gera Alerta Automático

```
Sistema (Batch Job)
  1. Diariamente às 6h
  2. Verifica todas as manutenções:
     - Se próxima em < 1.000 km: Cria alerta MEDIA
  3. Verifica CNH de motoristas:
     - Se vence em < 60 dias: Cria alerta ALTA
  4. Verifica seguro de veículos:
     - Se vence em < 30 dias: Cria alerta ALTA
  5. Novos alertas aparecem para Admin no dashboard
```

---

## 📦 Modelo de Dados

### Diagrama ER Simplificado

```
┌─────────────┐        ┌──────────────┐
│    User     │        │   Veiculo    │
├─────────────┤    ┌───┤──────────────┤
│ id (PK)     │    │   │ id (PK)      │
│ email (UK)  │    │ N │ placa (UK)   │
│ senha       │    │   │ modelo       │
│ nome        │    │   │ ano          │
│ cpf (UK)    │◄───┘   │ quilometragem│
│ rg (UK)     │        └──────────────┘
│ cnh (UK)    │
│ telefone    │
│ role        │
└─────────────┘
     │
     │ 1:N
     ▼
┌─────────────┐
│   Viagem    │
├─────────────┤
│ id (PK)     │
│ userId (FK) │
│ veiculoId(FK)
│ dataSaida   │
│ dataChegada │
│ kmInicial   │
│ kmFinal     │
│ finalidade  │
└─────────────┘

┌─────────────┐
│Abastecimento│
├─────────────┤
│ id (PK)     │
│ veiculoId(FK)
│ data        │
│ quilometragem
│ litros      │
│ valor       │
│ combustivel │
└─────────────┘

┌─────────────┐
│ Manutencao  │
├─────────────┤
│ id (PK)     │
│ veiculoId(FK)
│ data        │
│ tipo        │
│ descricao   │
│ quilometragem
│ valor       │
└─────────────┘

┌─────────────┐
│    Alerta   │
├─────────────┤
│ id (PK)     │
│ veiculoId(FK)
│ tipo        │
│ prioridade  │
│ descricao   │
│ status      │
│ dataAlerta  │
└─────────────┘
```

### Tabelas Principais

#### Users
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  senha VARCHAR(255) NOT NULL,
  nome VARCHAR(255),
  cpf VARCHAR(11) UNIQUE,
  rg VARCHAR(20) UNIQUE,
  cnh VARCHAR(20) UNIQUE,
  validadeCnh DATE,
  telefone VARCHAR(20),
  endereco TEXT,
  dataContratacao DATE,
  salario DECIMAL(10,2),
  observacoes TEXT,
  status VARCHAR(50) DEFAULT 'ativo',
  dataNascimento DATE,
  latitude FLOAT,
  longitude FLOAT,
  lastLocationUpdate TIMESTAMP,
  role VARCHAR(50) DEFAULT 'USER',
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW()
);
```

#### Veiculos
```sql
CREATE TABLE veiculos (
  id SERIAL PRIMARY KEY,
  placa VARCHAR(10) UNIQUE NOT NULL,
  marca VARCHAR(100),
  modelo VARCHAR(100) NOT NULL,
  ano INT NOT NULL,
  cor VARCHAR(50),
  chassi VARCHAR(50) UNIQUE NOT NULL,
  renavam VARCHAR(50) UNIQUE NOT NULL,
  capacidade INT,
  quilometragem INT,
  combustivel VARCHAR(50),
  valorCompra DECIMAL(10,2),
  dataCompra DATE,
  seguradora VARCHAR(100),
  apoliceSeguro VARCHAR(50),
  validadeSeguro DATE,
  observacoes TEXT,
  status VARCHAR(50) DEFAULT 'disponivel',
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW()
);
```

#### Viagens
```sql
CREATE TABLE viagens (
  id SERIAL PRIMARY KEY,
  userId INT NOT NULL REFERENCES users(id),
  veiculoId INT NOT NULL REFERENCES veiculos(id),
  dataSaida TIMESTAMP NOT NULL,
  dataChegada TIMESTAMP,
  finalidade TEXT,
  kmInicial INT NOT NULL,
  kmFinal INT,
  status VARCHAR(50) DEFAULT 'ATIVA',
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW()
);
```

---

## 🔗 APIs e Integrações

### Endpoints Principais

#### Autenticação
```
POST /auth/login
  Body: { email, senha }
  Response: { token, expiresIn }

POST /refresh
  Headers: { Authorization: Bearer <token> }
  Response: { token, expiresIn }
```

#### Veículos
```
GET /veiculos                    # Listar todos
GET /veiculos/:id                # Obter um
POST /veiculos                   # Criar
PUT /veiculos/:id                # Atualizar
DELETE /veiculos/:id             # Deletar
```

#### Motoristas
```
GET /motoristas                  # Listar
GET /motoristas/:id              # Obter
POST /motoristas                 # Criar
PUT /motoristas/:id              # Atualizar
DELETE /motoristas/:id           # Deletar
```

#### Viagens
```
GET /viagens                     # Listar
GET /viagens/:id                 # Obter
POST /viagens                    # Criar
PUT /viagens/:id                 # Atualizar/Finalizar
DELETE /viagens/:id              # Deletar
```

#### Abastecimentos
```
GET /abastecimentos              # Listar
GET /abastecimentos/veiculo/:id  # Por veículo
POST /abastecimentos             # Criar
```

#### Manutenções
```
GET /manutencoes                 # Listar
POST /manutencoes                # Criar
GET /manutencoes/veiculo/:id     # Por veículo
```

#### Alertas
```
GET /alertas                     # Listar
GET /alertas/prioridade/:nivel   # Por prioridade
POST /alertas                    # Criar
PUT /alertas/:id                 # Marcar resolvido
DELETE /alertas/:id              # Deletar
```

### Integrações Futuras (Roadmap)

- **Google Maps API**: Rastreamento de rota em tempo real
- **Twilio**: SMS para alertas críticos
- **Stripe**: Processamento de pagamentos (se necessário)
- **Sentry**: Monitoramento de erros
- **DataDog**: Observabilidade e APM

---

## 📅 Cronograma

### Fase 1: MVP (3-4 meses)

| Sprint | Duração | Objetivo |
|--------|---------|----------|
| Sprint 1 | 2 semanas | Setup inicial + autenticação |
| Sprint 2 | 2 semanas | CRUD Veículos + Motoristas |
| Sprint 3 | 2 semanas | Viagens (registro + finalização) |
| Sprint 4 | 2 semanas | Abastecimento + Manutenção |
| Sprint 5 | 2 semanas | Sistema de Alertas |
| Sprint 6 | 1 semana | Dashboard + Testes |
| Sprint 7 | 1 semana | App Móvel (básico) |
| Sprint 8 | 1 semana | Polimento + Deploy |

### Fase 2: Enhancements (2-3 meses)

- [ ] Relatórios avançados com exportação
- [ ] Integração com Google Maps (GPS real-time)
- [ ] Push Notifications
- [ ] IA para previsão de manutenção
- [ ] Integração com sistemas contábeis

### Fase 3: Scale (3-6 meses)

- [ ] Multi-tenancy
- [ ] API pública para integrações
- [ ] Mobile app avançada (offline-first)
- [ ] Sistema de notificações (SMS, Email)

---

## ⚠️ Riscos e Mitigações

### Risco 1: Complexidade da Integração GPS

**Severidade**: Alta  
**Probabilidade**: Média

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| GPS não funciona em offline | Viagem não registra localização | Implementar fallback com AsyncStorage |
| Dados GPS imprecisos | Rotas incorretas | Usar Google Maps API (fase 2) |
| Bateria do celular | App consome muita bateria | Otimizar interval de captura GPS |

**Plano de Ação**:
1. Testar GPS em múltiplos dispositivos
2. Implementar modo low-battery
3. Usar expo-location com otimizações

---

### Risco 2: Performance em Grande Escala

**Severidade**: Alta  
**Probabilidade**: Média (futuro)

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| Lentidão com muitos registros | Usuários frustrados | Implementar paginação + cache |
| Banco crescendo muito | Storage elevado | Implementar archiving de dados antigos |

**Plano de Ação**:
1. Profiling regular com APM (Datadog)
2. Otimizar queries com índices
3. Implementar Redis cache (fase 2)

---

### Risco 3: Perda de Dados Offline

**Severidade**: Alta  
**Probabilidade**: Baixa

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| Usuário apaga app com dados não sincronizados | Perda de viagens | Alertar usuário antes de sync |
| Corrupção de AsyncStorage | Dados inacessíveis | Regular backups locais |

**Plano de Ação**:
1. Implementar confirmação de sync
2. Backup automático a cada 6h
3. Testes de sincronização robustos

---

### Risco 4: Segurança de Dados

**Severidade**: Crítica  
**Probabilidade**: Baixa

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| Vazamento de dados de motoristas | Conformidade LGPD | Encriptação em repouso |
| Senhas fracas | Acesso não autorizado | Validação de força de senha |
| JWT comprometido | Acesso fraudulento | Implementar refresh token |

**Plano de Ação**:
1. Auditorias de segurança trimestral
2. Implementar 2FA (fase 2)
3. Conformidade LGPD desde o início

---

## 📊 Métricas de Sucesso

### Métricas de Negócio

| Métrica | Meta | Período |
|---------|------|---------|
| Taxa de Adoção | 80% usuários ativos | 6 meses |
| Redução de Custo | -15% custo operacional | 1 ano |
| Eficiência de Frota | +20% km/dia | 6 meses |
| Redução de Absentismo | -10% | 6 meses |

### Métricas Técnicas

| Métrica | Meta | Status |
|---------|------|--------|
| Uptime | 99.5% | Contínuo |
| Response Time (p95) | < 200ms | Contínuo |
| Taxa de Erro | < 0.1% | Contínuo |
| Test Coverage | > 70% | Por release |

### Métricas de Qualidade

| Métrica | Meta | Status |
|---------|------|--------|
| SLA de Suporte | 24h resposta | Contínuo |
| NPS (Net Promoter Score) | > 50 | Trimestral |
| Churn Rate | < 5% | Mensal |
| User Satisfaction | > 4.5/5 | Trimestral |

---

## 📋 Critérios de Aceitação

Para cada feature ser considerada "Pronta":

- [ ] Requisitos funcionais implementados
- [ ] Testes unitários (coverage > 80%)
- [ ] Testes de integração passando
- [ ] Code review aprovado
- [ ] Documentação atualizada
- [ ] Performance aceitável (< 500ms)
- [ ] Segurança validada
- [ ] Testado em múltiplos navegadores/dispositivos

---

## 📞 Aprovação

| Papel | Nome | Data | Assinatura |
|------|------|------|-----------|
| Product Owner | [Nome] | [Data] | _________ |
| Tech Lead | [Nome] | [Data] | _________ |
| Design Lead | [Nome] | [Data] | _________ |
| Stakeholder | [Nome] | [Data] | _________ |

---

## 📚 Referências e Anexos

- [Documento de Arquitetura](./ARCHITECTURE.md)
- [Guia de Estilo](./STYLE_GUIDE.md)
- [Roadmap Detalhado](./ROADMAP.md)
- [Glossário de Termos](./GLOSSARY.md)

---

**Documento Versão 1.0**  
**Última Atualização:** 14 de Novembro de 2024  
**Próxima Revisão:** 14 de Dezembro de 2024


