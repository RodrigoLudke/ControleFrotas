// jest.setup.js - App Móvel
jest.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: jest.fn().mockResolvedValue(null),
    setItem: jest.fn().mockResolvedValue(null),
    removeItem: jest.fn().mockResolvedValue(null),
    clear: jest.fn().mockResolvedValue(null),
  },
}));

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
  getCurrentPositionAsync: jest.fn().mockResolvedValue({
    coords: {
      latitude: -23.5505,
      longitude: -46.6333,
      altitude: 0,
      accuracy: 10,
      altitudeAccuracy: 0,
      heading: 0,
      speed: 0,
    },
  }),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
    navigate: jest.fn(),
  }),
  useLocalSearchParams: () => ({}),
}));

