const ValidationUtils = require('../utils/ValidationUtils');

describe('ValidationUtils.validateEmail', () => {
  test('valid email returns no errors', () => {
    expect(ValidationUtils.validateEmail('user@example.com')).toHaveLength(0);
  });

  test('empty email returns error', () => {
    expect(ValidationUtils.validateEmail('')).toContain('Email wajib diisi');
  });

  test('null email returns error', () => {
    expect(ValidationUtils.validateEmail(null)).toContain('Email wajib diisi');
  });

  test('invalid format returns error', () => {
    expect(ValidationUtils.validateEmail('notanemail')).toContain('Format email tidak valid');
  });

  test('email over 254 chars returns error', () => {
    const longEmail = 'a'.repeat(250) + '@b.com';
    expect(ValidationUtils.validateEmail(longEmail)).toContain('Email terlalu panjang (maksimal 254 karakter)');
  });
});

describe('ValidationUtils.validatePassword', () => {
  test('strong password returns no errors', () => {
    expect(ValidationUtils.validatePassword('GatotKota123!')).toHaveLength(0);
  });

  test('empty password returns error', () => {
    expect(ValidationUtils.validatePassword('')).toContain('Password wajib diisi');
  });

  test('password under 8 chars returns error', () => {
    expect(ValidationUtils.validatePassword('Ab1')).toContain('Password minimal 8 karakter');
  });

  test('password without uppercase returns error', () => {
    expect(ValidationUtils.validatePassword('gatotkota123')).toContain('Password perlu huruf besar');
  });

  test('password without lowercase returns error', () => {
    expect(ValidationUtils.validatePassword('GATOTKOTA123')).toContain('Password perlu huruf kecil');
  });

  test('password without number returns error', () => {
    expect(ValidationUtils.validatePassword('GatotKotaAbc')).toContain('Password perlu angka');
  });

  test('weak password returns error', () => {
    expect(ValidationUtils.validatePassword('admin123')).toContain('Password terlalu lemah, gunakan kombinasi yang lebih kuat');
  });
});

describe('ValidationUtils.validateUsername', () => {
  test('valid username returns no errors', () => {
    expect(ValidationUtils.validateUsername('budi_santoso')).toHaveLength(0);
  });

  test('empty username returns no errors (optional field)', () => {
    expect(ValidationUtils.validateUsername('')).toHaveLength(0);
  });

  test('username under 3 chars returns error', () => {
    expect(ValidationUtils.validateUsername('ab')).toContain('Username minimal 3 karakter');
  });

  test('username over 30 chars returns error', () => {
    expect(ValidationUtils.validateUsername('a'.repeat(31))).toContain('Username maksimal 30 karakter');
  });

  test('username with uppercase returns error', () => {
    expect(ValidationUtils.validateUsername('BudiSantoso')).toContain('Username harus menggunakan huruf kecil semua');
  });

  test('username with spaces returns error', () => {
    expect(ValidationUtils.validateUsername('budi santoso')).toContain('Username tidak boleh mengandung spasi');
  });

  test('username starting with number returns error', () => {
    expect(ValidationUtils.validateUsername('1budi')).toContain('Username tidak boleh dimulai dengan angka');
  });
});

describe('ValidationUtils.validatePhone', () => {
  test('valid Indonesian phone returns no errors', () => {
    expect(ValidationUtils.validatePhone('081234567890')).toHaveLength(0);
  });

  test('empty phone returns no errors (optional field)', () => {
    expect(ValidationUtils.validatePhone('')).toHaveLength(0);
  });

  test('invalid phone format returns error', () => {
    expect(ValidationUtils.validatePhone('12345')).toContain('Nomor telepon harus 10-15 digit');
  });
});

describe('ValidationUtils.validateLoginData', () => {
  test('valid login data returns isValid true', () => {
    const result = ValidationUtils.validateLoginData({
      email: 'user@example.com',
      password: 'anypassword'
    });
    expect(result.isValid).toBe(true);
  });

  test('missing email returns isValid false', () => {
    const result = ValidationUtils.validateLoginData({ email: '', password: 'pass' });
    expect(result.isValid).toBe(false);
    expect(result.errors).toHaveProperty('email');
  });

  test('missing password returns isValid false', () => {
    const result = ValidationUtils.validateLoginData({ email: 'user@example.com', password: '' });
    expect(result.isValid).toBe(false);
    expect(result.errors).toHaveProperty('password');
  });
});

describe('ValidationUtils.sanitizeInput', () => {
  test('trims string values', () => {
    const result = ValidationUtils.sanitizeInput({ name: '  Budi  ', age: 25 });
    expect(result.name).toBe('Budi');
    expect(result.age).toBe(25);
  });

  test('non-string values are unchanged', () => {
    const result = ValidationUtils.sanitizeInput({ count: 5, flag: true });
    expect(result.count).toBe(5);
    expect(result.flag).toBe(true);
  });
});
