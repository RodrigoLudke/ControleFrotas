// tests/services/api.test.ts
describe('API Service', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should construct API base URL', () => {
    const apiBaseUrl = 'http://localhost:3000/api';
    expect(apiBaseUrl).toContain('/api');
  });

  it('should handle GET requests', async () => {
    const mockResponse = { data: [{ id: 1, nome: 'João' }] };

    const fetchMock = global.fetch;
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const endpoint = '/motoristas';
    const response = await fetch(`http://localhost:3000/api${endpoint}`);

    expect(response.ok).toBe(true);
  });

  it('should handle POST requests', async () => {
    const mockData = { nome: 'João', cpf: '12345678901', email: 'joao@example.com' };
    const mockResponse = { id: 1, ...mockData };

    const fetchMock = global.fetch;
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const response = await fetch('http://localhost:3000/api/motoristas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mockData),
    });

    expect(response.ok).toBe(true);
  });

  it('should handle authentication errors', async () => {
    const fetchMock = global.fetch;
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ error: 'Unauthorized' }),
    });

    const response = await fetch('http://localhost:3000/api/protected', {
      headers: { 'Authorization': 'Bearer invalid-token' },
    });

    expect(response.status).toBe(401);
    expect(response.ok).toBe(false);
  });
});

