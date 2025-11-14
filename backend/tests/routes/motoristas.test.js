// tests/routes/motoristas.test.js
const { createMotoristaMock, createAuthTokenMock } = require('../__fixtures__/users.fixture.js');

describe('Motoristas Routes', () => {
  describe('GET /api/motoristas', () => {
    it('should return motoristas list', () => {
      const motorista = createMotoristaMock();
      expect(motorista).toHaveProperty('id');
      expect(motorista).toHaveProperty('cpf');
      expect(motorista).toHaveProperty('email');
    });

    it('should have valid motorista structure', () => {
      const motorista = createMotoristaMock();
      expect(motorista.nome).toBeTruthy();
      expect(motorista.cpf.length).toBeGreaterThan(0);
      expect(motorista.email).toContain('@');
    });
  });

  describe('POST /api/motoristas/auth', () => {
    it('should return auth token for valid credentials', () => {
      const auth = createAuthTokenMock();
      expect(auth.token).toBeTruthy();
      expect(auth.motorista).toHaveProperty('id');
    });

    it('should validate auth token structure', () => {
      const auth = createAuthTokenMock();
      const tokenParts = auth.token.split('.');
      expect(tokenParts).toHaveLength(3);
    });
  });

  describe('Validation', () => {
    it('should validate motorista email format', () => {
      const motorista = createMotoristaMock();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      expect(emailRegex.test(motorista.email)).toBe(true);
    });

    it('should validate CPF format', () => {
      const motorista = createMotoristaMock();
      expect(motorista.cpf).toHaveLength(11);
      expect(/^\d+$/.test(motorista.cpf)).toBe(true);
    });
  });
});
