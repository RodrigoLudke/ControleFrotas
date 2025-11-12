-----

# Controle de Frotas

O projeto Controle de Frotas é um sistema completo para gerenciamento de frotas de veículos, projetado para otimizar a logística e o monitoramento de operações. Ele é composto por um painel administrativo web, um aplicativo móvel para motoristas e um backend robusto para centralizar as operações.

## Arquitetura do Projeto

O sistema é dividido em três componentes principais:

* `backend`: O servidor responsável por toda a lógica de negócio, comunicação com o banco de dados e exposição de uma API para os clientes (painel web e aplicativo móvel).
* `painelWebAdmin`: Uma aplicação web para administradores, permitindo o gerenciamento de motoristas, veículos e a visualização de relatórios e dashboards.
* `appMobile`: Um aplicativo móvel para os motoristas, onde eles podem registrar suas viagens e consultar informações relevantes.

## Tecnologias Utilizadas

Cada parte do projeto utiliza um conjunto de tecnologias modernas para garantir um desenvolvimento eficiente e escalável:

| Componente | Tecnologias Principais |
| :--- | :--- |
| **Backend** | Node.js, Express, Prisma, PostgreSQL, Docker |
| **Painel Web Admin** | React, TypeScript, Vite, Tailwind CSS, shadcn-ui |
| **Aplicativo Móvel** | Expo, React Native, TypeScript |

## Pré-requisitos

Antes de começar, certifique-se de ter as seguintes ferramentas instaladas em seu ambiente de desenvolvimento:

* [Node.js](https://nodejs.org/) (versão 18 ou superior)
* [Docker](https://www.docker.com/) e [Docker Compose](https://docs.docker.com/compose/)
* [Git](https://git-scm.com/)

## Configuração do Ambiente de Desenvolvimento

Siga os passos abaixo para configurar e executar o projeto completo em seu ambiente local.

### 1\. Clonar o Repositório

Primeiro, clone o repositório do projeto para a sua máquina local:

```bash
git clone https://github.com/seu-usuario/controlefrotas.git
cd controlefrotas
```

### 2\. Configurar e Executar o Backend

O backend é o coração do sistema, então vamos começar por ele.

1.  **Acesse o diretório do backend:**

    ```bash
    cd backend
    ```

2.  **Instale as dependências:**

    ```bash
    npm install
    ```

3.  **Inicie o banco de dados com Docker:**

    ```bash
    docker-compose up -d
    ```

4.  **Execute as migrações do banco de dados com o Prisma:**

    ```bash
    npx prisma migrate dev
    ```

5.  **Inicie o servidor de desenvolvimento:**

    ```bash
    npm run dev
    ```

O servidor backend estará rodando em `http://localhost:3000`.

### 3\. Configurar e Executar o Painel Web Admin

Com o backend rodando, agora vamos configurar o painel administrativo.

1.  **Acesse o diretório do painel web:**

    ```bash
    cd ../painelWebAdmin
    ```

2.  **Instale as dependências:**

    ```bash
    npm install
    ```

3.  **Inicie o servidor de desenvolvimento:**

    ```bash
    npm run dev
    ```

O painel web estará acessível em `http://localhost:5173`.

### 4\. Configurar e Executar o Aplicativo Móvel

Por último, vamos configurar o aplicativo móvel.

1.  **Acesse o diretório do aplicativo móvel:**

    ```bash
    cd ../appMobile
    ```

2.  **Instale as dependências:**

    ```bash
    npm install
    ```

3.  **Inicie o servidor de desenvolvimento do Expo:**

    ```bash
    npx expo start
    ```

Isso abrirá o Metro Bundler no seu navegador. Você pode então usar o aplicativo Expo Go no seu smartphone para escanear o QR code e executar o aplicativo.

## Estrutura de Diretórios

A estrutura de diretórios do projeto é organizada da seguinte forma:

```
/
├── appMobile/         # Código-fonte do aplicativo móvel (React Native/Expo)
├── backend/           # Código-fonte do servidor (Node.js/Express)
└── painelWebAdmin/    # Código-fonte do painel administrativo (React/Vite)
```

Cada diretório é um projeto independente, com suas próprias dependências e scripts, o que facilita a manutenção e o desenvolvimento de cada parte do sistema.

---

--
