// tests/__fixtures__/users.fixture.js
function createMotoristaMock(overrides = {}) {
  return {
    id: '123e4567-e89b-12d3-a456-426614174000',
    nome: 'João Silva',
    cpf: '12345678901',
    email: 'joao@example.com',
    telefone: '11999999999',
    dataNascimento: new Date('1990-01-15'),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

const API_KEY =

function createAuthTokenMock() {
  return {
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEyM2U0NTY3LWU4OWItMTJkMy1hNDU2LTQyNjYxNDE3NDAwMCIsImlhdCI6MTcwMDAwMDAwMH0.test', //NOSONAR
    motorista: createMotoristaMock(),
  };
}

function createInvalidMotoristaMock() {
  return {
    nome: '',
    cpf: 'invalid-cpf',
    email: 'not-an-email',
  };
}

module.exports = {
  createMotoristaMock,
  createAuthTokenMock,
  createInvalidMotoristaMock,
};

