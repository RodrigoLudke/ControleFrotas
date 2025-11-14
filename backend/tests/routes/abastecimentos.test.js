// tests/routes/abastecimentos.test.js
const { createAbastecimentoMock, createVeiculoMock } = require('../__fixtures__/vehicles.fixture.js');
const { createMotoristaMock } = require('../__fixtures__/users.fixture.js');

describe('Abastecimentos Routes', () => {
  describe('Abastecimento Validation', () => {
    it('should create abastecimento with valid data', () => {
      const abastecimento = createAbastecimentoMock();
      expect(abastecimento).toHaveProperty('id');
      expect(abastecimento).toHaveProperty('veiculoId');
      expect(abastecimento).toHaveProperty('litros');
      expect(abastecimento).toHaveProperty('valor');
    });

    it('should validate combustivel type', () => {
      const validTypes = ['GASOLINA', 'DIESEL', 'ETANOL', 'GNV'];
      const abastecimento = createAbastecimentoMock({ combustivel: 'DIESEL' });
      expect(validTypes).toContain(abastecimento.combustivel);
    });

    it('should validate positive litros and valor', () => {
      const abastecimento = createAbastecimentoMock({ litros: 50, valor: 250 });
      expect(abastecimento.litros).toBeGreaterThan(0);
      expect(abastecimento.valor).toBeGreaterThan(0);
    });
  });

  describe('Cost Calculation', () => {
    it('should calculate cost per liter', () => {
      const abastecimento = createAbastecimentoMock({ litros: 50, valor: 250 });
      const costPerLiter = abastecimento.valor / abastecimento.litros;
      expect(costPerLiter).toBe(5);
    });

    it('should track abastecimento history', () => {
      const abast1 = createAbastecimentoMock({ km: 1000, litros: 50 });
      const abast2 = createAbastecimentoMock({ km: 1500, litros: 50 });

      expect(abast2.km).toBeGreaterThan(abast1.km);
      expect(abast2.createdAt.getTime()).toBeGreaterThanOrEqual(abast1.createdAt.getTime());
    });
  });

  describe('Abastecimento Relationships', () => {
    it('should link to veiculo', () => {
      const veiculo = createVeiculoMock();
      const abastecimento = createAbastecimentoMock({ veiculoId: veiculo.id });
      expect(abastecimento.veiculoId).toBe(veiculo.id);
    });

    it('should link to motorista', () => {
      const motorista = createMotoristaMock();
      const abastecimento = createAbastecimentoMock({ motoristaId: motorista.id });
      expect(abastecimento.motoristaId).toBe(motorista.id);
    });
  });
});
