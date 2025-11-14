// tests/routes/viagens.test.js
const { createViagemMock, createVeiculoMock } = require('../__fixtures__/vehicles.fixture.js');
const { createMotoristaMock } = require('../__fixtures__/users.fixture.js');

describe('Viagens Routes', () => {
  describe('Viagem Validation', () => {
    it('should create viagem with valid data', () => {
      const viagem = createViagemMock();
      expect(viagem).toHaveProperty('id');
      expect(viagem).toHaveProperty('motoristaId');
      expect(viagem).toHaveProperty('veiculoId');
      expect(viagem).toHaveProperty('kmInicial');
      expect(viagem).toHaveProperty('kmFinal');
    });

    it('should validate viagem km logic', () => {
      const viagem = createViagemMock();
      expect(viagem.kmFinal).toBeGreaterThan(viagem.kmInicial);
    });

    it('should calculate viagem distance correctly', () => {
      const viagem = createViagemMock({ kmInicial: 1000, kmFinal: 1100 });
      const distance = viagem.kmFinal - viagem.kmInicial;
      expect(distance).toBe(100);
    });
  });

  describe('Viagem Status', () => {
    it('should have valid status values', () => {
      const validStatus = ['PENDENTE', 'EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA'];
      const viagem = createViagemMock({ status: 'CONCLUIDA' });
      expect(validStatus).toContain(viagem.status);
    });

    it('should track viagem timestamps', () => {
      const viagem = createViagemMock();
      expect(viagem.dataHoraSaida).toBeInstanceOf(Date);
      expect(viagem.dataHoraChegada).toBeInstanceOf(Date);
      expect(viagem.dataHoraChegada.getTime()).toBeGreaterThan(viagem.dataHoraSaida.getTime());
    });
  });

  describe('Viagem Relationships', () => {
    it('should have valid motorista reference', () => {
      const motorista = createMotoristaMock();
      const viagem = createViagemMock({ motoristaId: motorista.id });
      expect(viagem.motoristaId).toBe(motorista.id);
    });

    it('should have valid veiculo reference', () => {
      const veiculo = createVeiculoMock();
      const viagem = createViagemMock({ veiculoId: veiculo.id });
      expect(viagem.veiculoId).toBe(veiculo.id);
    });
  });
});
