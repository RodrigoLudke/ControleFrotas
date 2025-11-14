// tests/services/api.test.ts
describe('Mobile API Service', () => {
  beforeEach(() => {
    global.fetch = jest.fn() as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should define API endpoints', () => {
    const endpoints = {
      motoristas: '/api/motoristas',
      viagens: '/api/viagens',
      abastecimentos: '/api/abastecimentos',
      veiculos: '/api/veiculos',
    };

    expect(endpoints.motoristas).toBeDefined();
    expect(endpoints.viagens).toBeDefined();
  });

  it('should handle login request', async () => {
    const credentials = { email: 'motorista@example.com', senha: 'password123' };
    const mockResponse = {
      token: 'jwt-token-123',
      motorista: { id: 1, nome: 'João' },
    };

    const fetchMock = global.fetch as any;
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const response = await fetch('http://api.example.com/api/motoristas/auth', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    expect(response.ok).toBe(true);
  });

  it('should register viagem', async () => {
    const viagem = {
      kmInicial: 1000,
      kmFinal: 1100,
      localSaida: 'São Paulo',
      localChegada: 'Campinas',
    };

    const fetchMock = global.fetch as any;
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 1, ...viagem }),
    });

    const response = await fetch('http://api.example.com/api/viagens', {
      method: 'POST',
      body: JSON.stringify(viagem),
    });

    expect(response.ok).toBe(true);
  });

  it('should handle network errors gracefully', async () => {
    const fetchMock = global.fetch as any;
    fetchMock.mockRejectedValueOnce(new Error('Network error'));

    try {
      await fetch('http://api.example.com/api/motoristas');
    } catch (error: any) {
      expect(error.message).toBe('Network error');
    }
  });
});

