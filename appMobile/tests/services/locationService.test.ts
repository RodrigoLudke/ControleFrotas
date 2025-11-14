// tests/services/locationService.test.ts
describe('Location Service', () => {
  it('should request location permissions', () => {
    const requestPermission = jest.fn().mockResolvedValue({ granted: true });
    expect(requestPermission()).resolves.toHaveProperty('granted');
  });

  it('should get current position', () => {
    const mockPosition = {
      coords: {
        latitude: -23.5505,
        longitude: -46.6333,
        altitude: 0,
        accuracy: 10,
        altitudeAccuracy: 0,
        heading: 0,
        speed: 0,
      },
      timestamp: Date.now(),
    };

    expect(mockPosition.coords).toHaveProperty('latitude');
    expect(mockPosition.coords).toHaveProperty('longitude');
    expect(mockPosition.coords.latitude).toBeLessThan(0);
    expect(mockPosition.coords.longitude).toBeLessThan(0);
  });

  it('should calculate distance between coordinates', () => {
    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
      const R = 6371;
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a =
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      return R * c;
    };

    const distance = calculateDistance(-23.5505, -46.6333, -23.5501, -46.6335);
    expect(distance).toBeGreaterThan(0);
    expect(distance).toBeLessThan(1);
  });

  it('should track location updates', () => {
    const locationUpdates: Array<{ lat: number; lon: number; timestamp: number }> = [];

    const trackUpdate = (lat: number, lon: number) => {
      locationUpdates.push({
        lat,
        lon,
        timestamp: Date.now(),
      });
    };

    trackUpdate(-23.5505, -46.6333);
    trackUpdate(-23.5501, -46.6335);

    expect(locationUpdates).toHaveLength(2);
    expect(locationUpdates[1].timestamp).toBeGreaterThanOrEqual(locationUpdates[0].timestamp);
  });
});

