// tests/__fixtures__/vehicles.fixture.js
function createVeiculoMock(overrides = {}) {
  return {
    id: '123e4567-e89b-12d3-a456-426614174001',
    placa: 'ABC1234',
    marca: 'Volkswagen',
    modelo: 'Delivery 45',
    ano: 2020,
    kmInicial: 0,
    kmAtual: 15000,
    tipoVeiculo: 'CAMINHAO',
    status: 'ATIVO',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function createViagemMock(overrides = {}) {
  return {
    id: '123e4567-e89b-12d3-a456-426614174002',
    motoristaId: '123e4567-e89b-12d3-a456-426614174000',
    veiculoId: '123e4567-e89b-12d3-a456-426614174001',
    kmInicial: 15000,
    kmFinal: 15150,
    localSaida: 'São Paulo',
    localChegada: 'Campinas',
    dataHoraSaida: new Date('2024-01-10T08:00:00'),
    dataHoraChegada: new Date('2024-01-10T09:30:00'),
    status: 'CONCLUIDA',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function createAbastecimentoMock(overrides = {}) {
  return {
    id: '123e4567-e89b-12d3-a456-426614174003',
    veiculoId: '123e4567-e89b-12d3-a456-426614174001',
    motoristaId: '123e4567-e89b-12d3-a456-426614174000',
    combustivel: 'DIESEL',
    litros: 50,
    valor: 250,
    km: 15100,
    data: new Date('2024-01-10'),
    postoAbastecimento: 'Posto ABC',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

module.exports = {
  createVeiculoMock,
  createViagemMock,
  createAbastecimentoMock,
};

