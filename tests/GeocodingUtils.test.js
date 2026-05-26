const GeocodingUtils = require('../utils/GeocodingUtils');

describe('GeocodingUtils.validateCoordinates', () => {
  test('valid coordinates returns true', () => {
    expect(GeocodingUtils.validateCoordinates(-7.2575, 112.7521)).toBe(true);
  });

  test('lat out of range returns false', () => {
    expect(GeocodingUtils.validateCoordinates(-91, 112)).toBe(false);
    expect(GeocodingUtils.validateCoordinates(91, 112)).toBe(false);
  });

  test('lon out of range returns false', () => {
    expect(GeocodingUtils.validateCoordinates(-7, -181)).toBe(false);
    expect(GeocodingUtils.validateCoordinates(-7, 181)).toBe(false);
  });

  test('non-numeric values returns false', () => {
    expect(GeocodingUtils.validateCoordinates('abc', 112)).toBe(false);
    expect(GeocodingUtils.validateCoordinates(-7, 'xyz')).toBe(false);
  });

  test('boundary values are valid', () => {
    expect(GeocodingUtils.validateCoordinates(90, 180)).toBe(true);
    expect(GeocodingUtils.validateCoordinates(-90, -180)).toBe(true);
    expect(GeocodingUtils.validateCoordinates(0, 0)).toBe(true);
  });
});

describe('GeocodingUtils.isWithinIndonesia', () => {
  test('Surabaya coordinates returns true', () => {
    expect(GeocodingUtils.isWithinIndonesia(-7.2575, 112.7521)).toBe(true);
  });

  test('Jakarta coordinates returns true', () => {
    expect(GeocodingUtils.isWithinIndonesia(-6.2088, 106.8456)).toBe(true);
  });

  test('Coordinates outside Indonesia returns false', () => {
    expect(GeocodingUtils.isWithinIndonesia(35.6762, 139.6503)).toBe(false); // Tokyo
    expect(GeocodingUtils.isWithinIndonesia(40.7128, -74.0060)).toBe(false); // New York
  });

  test('Boundary of Indonesia is valid', () => {
    expect(GeocodingUtils.isWithinIndonesia(6, 141)).toBe(true);
    expect(GeocodingUtils.isWithinIndonesia(-11, 95)).toBe(true);
  });
});

describe('GeocodingUtils.calculateDistance', () => {
  test('distance from same point is 0', () => {
    const dist = GeocodingUtils.calculateDistance(-7.25, 112.75, -7.25, 112.75);
    expect(dist).toBe(0);
  });

  test('distance between Surabaya and Jakarta is roughly 650-700 km', () => {
    const dist = GeocodingUtils.calculateDistance(
      -7.2575, 112.7521,  // Surabaya
      -6.2088, 106.8456   // Jakarta
    );
    expect(dist).toBeGreaterThan(600);
    expect(dist).toBeLessThan(750);
  });

  test('distance is always positive', () => {
    const dist = GeocodingUtils.calculateDistance(-7, 112, -6, 106);
    expect(dist).toBeGreaterThan(0);
  });
});

describe('GeocodingUtils.extractProvinceFromAddress', () => {
  test('extracts last part of address as province', () => {
    const address = 'Jl. Darmo, Surabaya, Jawa Timur';
    expect(GeocodingUtils.extractProvinceFromAddress(address)).toBe('Jawa Timur');
  });

  test('single word address returns itself', () => {
    expect(GeocodingUtils.extractProvinceFromAddress('Jakarta')).toBe('Jakarta');
  });

  test('null address returns null', () => {
    expect(GeocodingUtils.extractProvinceFromAddress(null)).toBe(null);
  });

  test('empty string returns empty string or null', () => {
    const result = GeocodingUtils.extractProvinceFromAddress('');
    expect(result === null || result === '').toBe(true);
  });
});
