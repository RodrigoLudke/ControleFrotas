
-----

# Backend - Controle de Frotas

Este diretório contém o código-fonte do servidor backend para o sistema de Controle de Frotas. Ele é responsável por gerenciar a lógica de negócio, a autenticação de usuários e a comunicação com o banco de dados, fornecendo uma API RESTful para o painel web administrativo e o aplicativo móvel.

## Tecnologias Utilizadas

O backend é construído com as seguintes tecnologias e ferramentas:

* **[Node.js](https://nodejs.org/)**: Ambiente de execução JavaScript no servidor.
* **[Express](https://expressjs.com/)**: Framework web para a construção da API.
* **[Prisma](https://www.prisma.io/)**: ORM (Object-Relational Mapper) para facilitar a interação com o banco de dados.
* **[PostgreSQL](https://www.postgresql.org/)**: Sistema de gerenciamento de banco de dados relacional.
* **[Docker](https://www.docker.com/)**: Plataforma para desenvolvimento, envio e execução de aplicações em contêineres.
* **[JSON Web Tokens (JWT)](https://jwt.io/)**: Para gerenciamento de autenticação e sessões seguras.
* **[Bcrypt](https://www.npmjs.com/package/bcrypt)**: Para hashing de senhas.
* **[CORS](https://www.npmjs.com/package/cors)**: Para habilitar o compartilhamento de recursos entre diferentes origens.

## Pré-requisitos

Antes de iniciar, garanta que você tenha os seguintes softwares instalados:

* [Node.js](https://nodejs.org/) (versão 18 ou superior)
* [Docker](https://www.docker.com/) e [Docker Compose](https://docs.docker.com/compose/)

## Guia de Instalação e Execução

Siga os passos abaixo para configurar e executar o backend em seu ambiente local.

### 1\. Instalação das Dependências

Navegue até o diretório `backend` e instale as dependências do Node.js:

```bash
cd backend
npm install
```

### 2\. Configuração do Banco de Dados

O banco de dados PostgreSQL é gerenciado via Docker Compose.

1.  **Crie e inicie o contêiner do banco de dados:**

    ```bash
    docker-compose up -d
    ```

    Este comando irá baixar a imagem do PostgreSQL e criar um contêiner com um banco de dados chamado `controle-frota`, conforme definido no arquivo `docker-compose.yaml`.

2.  **Aplique o Schema do Banco de Dados:**

    O Prisma utilizará o arquivo `prisma/schema.prisma` para criar as tabelas no banco de dados. Execute o seguinte comando para aplicar as migrações:

    ```bash
    npx prisma migrate dev
    ```

    Isso também irá gerar o Prisma Client, que é usado para interagir com o banco de dados na aplicação.

### 3\. Execução do Servidor

Após configurar o banco de dados, inicie o servidor em modo de desenvolvimento:

```bash
npm run dev
```

O servidor será iniciado e estará escutando na porta `3000`. Agora, ele está pronto para receber requisições do painel web e do aplicativo móvel.

## Scripts Disponíveis

Os seguintes scripts estão disponíveis no arquivo `package.json`:

* `npm run dev`: Inicia o servidor em modo de desenvolvimento usando `nodemon`, que reinicia o servidor automaticamente a cada alteração nos arquivos.
* `npm start`: Inicia o servidor em modo de produção.

## Estrutura do Banco de Dados

O schema do banco de dados é definido em `prisma/schema.prisma` e inclui os seguintes modelos:

* **`User`**: Armazena informações dos usuários (motoristas e administradores), incluindo credenciais de login.
* **`Veiculo`**: Armazena detalhes sobre os veículos da frota, como placa, modelo e ano.
* **`Viagem`**: Registra as viagens realizadas, incluindo data/hora de início e fim, quilometragem e o veículo utilizado.
* **`UserVeiculo`**: Tabela de associação que define quais motoristas estão autorizados a dirigir quais veículos.
* **`RefreshToken`**: Armazena os tokens de atualização (refresh tokens) para o sistema de autenticação, permitindo a renovação de sessões.

## API Endpoints

A API está estruturada em rotas, localizadas no diretório `routes/`. Abaixo estão os principais endpoints disponíveis:

* **Autenticação**

    * `POST /login`: Autentica um usuário e retorna um `accessToken` e um `refreshToken`.
    * `POST /refresh`: Gera um novo `accessToken` a partir de um `refreshToken` válido.
    * `POST /logout`: Invalida um `refreshToken`.

* **Motoristas (`/motoristas`)**

    * `GET /`: Retorna uma lista de todos os motoristas.
    * `POST /`: Cria um novo motorista.

* **Veículos (`/veiculos`)**

    * `GET /`: Retorna uma lista de todos os veículos.
    * `POST /`: Cria um novo veículo.

* **Viagens (`/viagens`)**

    * `GET /`: Retorna uma lista de todas as viagens.
    * `POST /`: Cria um novo registro de viagem.

**Observação:** A maioria dos endpoints requer um token de autenticação JWT válido no cabeçalho `Authorization` da requisição.

-----