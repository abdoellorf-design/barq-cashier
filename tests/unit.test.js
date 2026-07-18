// Mock utility functions for testing
const normalizePhoneForWhatsApp = (phone) => {
  let digits = phone.replace(/\D/g, '');
  if (digits.startsWith('0')) {
    digits = '20' + digits.slice(1);
  }
  if (!digits.endsWith('@c.us')) {
    digits = `${digits}@c.us`;
  }
  return digits;
};

const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

describe('Utility Functions Tests', () => {
  describe('normalizePhoneForWhatsApp', () => {
    test('should convert Egyptian phone format to WhatsApp format', () => {
      const input = '01001234567';
      const result = normalizePhoneForWhatsApp(input);
      
      expect(result).toBe('201001234567@c.us');
    });

    test('should handle phone with leading zero', () => {
      const input = '0501234567';
      const result = normalizePhoneForWhatsApp(input);
      
      expect(result).toContain('@c.us');
      expect(result).toContain('20');
    });

    test('should remove all non-digits', () => {
      const input = '+20-500-1234-567';
      const result = normalizePhoneForWhatsApp(input);
      
      expect(result).toMatch(/^\d+@c\.us$/);
    });

    test('should add @c.us suffix', () => {
      const input = '201001234567';
      const result = normalizePhoneForWhatsApp(input);
      
      expect(result).toBe('201001234567@c.us');
    });
  });

  describe('generateVerificationCode', () => {
    test('should generate a 6-digit code', () => {
      const code = generateVerificationCode();
      
      expect(code).toHaveLength(6);
      expect(code).toMatch(/^\d{6}$/);
    });

    test('should generate different codes', () => {
      const codes = new Set();
      
      for (let i = 0; i < 10; i++) {
        codes.add(generateVerificationCode());
      }
      
      expect(codes.size).toBeGreaterThan(1);
    });

    test('should generate codes in valid range', () => {
      for (let i = 0; i < 100; i++) {
        const code = parseInt(generateVerificationCode());
        expect(code).toBeGreaterThanOrEqual(100000);
        expect(code).toBeLessThanOrEqual(999999);
      }
    });
  });
});

describe('Data Validation Tests', () => {
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePrice = (price) => {
    return !isNaN(price) && price > 0;
  };

  const validateOrderItems = (items) => {
    return Array.isArray(items) && items.length > 0;
  };

  test('validateEmail should accept valid emails', () => {
    expect(validateEmail('test@example.com')).toBe(true);
    expect(validateEmail('user@domain.co.uk')).toBe(true);
  });

  test('validateEmail should reject invalid emails', () => {
    expect(validateEmail('invalid-email')).toBe(false);
    expect(validateEmail('test@')).toBe(false);
    expect(validateEmail('@example.com')).toBe(false);
  });

  test('validatePrice should accept positive numbers', () => {
    expect(validatePrice(99.99)).toBe(true);
    expect(validatePrice(1)).toBe(true);
    expect(validatePrice(0.01)).toBe(true);
  });

  test('validatePrice should reject invalid prices', () => {
    expect(validatePrice(0)).toBe(false);
    expect(validatePrice(-10)).toBe(false);
    expect(validatePrice('not a number')).toBe(false);
  });

  test('validateOrderItems should accept valid arrays', () => {
    expect(validateOrderItems([{ id: 1, qty: 2 }])).toBe(true);
    expect(validateOrderItems([{ id: 1 }])).toBe(true);
  });

  test('validateOrderItems should reject invalid arrays', () => {
    expect(validateOrderItems([])).toBe(false);
    expect(validateOrderItems('not an array')).toBe(false);
    expect(validateOrderItems(null)).toBe(false);
  });
});

describe('Business Logic Tests', () => {
  const calculateOrderTotal = (items) => {
    return items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const applyDiscount = (total, discountPercent) => {
    if (discountPercent < 0 || discountPercent > 100) {
      throw new Error('Invalid discount percentage');
    }
    return total * (1 - discountPercent / 100);
  };

  const calculateTax = (amount, taxRate) => {
    return amount * (taxRate / 100);
  };

  test('calculateOrderTotal should sum item prices correctly', () => {
    const items = [
      { price: 100, quantity: 2 },
      { price: 50, quantity: 1 },
      { price: 25, quantity: 4 }
    ];

    const result = calculateOrderTotal(items);
    expect(result).toBe(350);
  });

  test('applyDiscount should calculate discount correctly', () => {
    const discounted = applyDiscount(100, 10);
    expect(discounted).toBe(90);
  });

  test('applyDiscount should handle 0% discount', () => {
    expect(applyDiscount(100, 0)).toBe(100);
  });

  test('applyDiscount should throw on invalid discount', () => {
    expect(() => applyDiscount(100, -10)).toThrow();
    expect(() => applyDiscount(100, 150)).toThrow();
  });

  test('calculateTax should calculate tax correctly', () => {
    const tax = calculateTax(100, 5);
    expect(tax).toBe(5);
  });

  test('calculateTax should handle various tax rates', () => {
    expect(calculateTax(1000, 10)).toBe(100);
    expect(calculateTax(500, 20)).toBe(100);
  });
});

describe('Error Handling Tests', () => {
  const safeJsonParse = (jsonString) => {
    try {
      return JSON.parse(jsonString);
    } catch (error) {
      return null;
    }
  };

  const retryOperation = async (operation, maxRetries = 3) => {
    let lastError;
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        await new Promise(resolve => setTimeout(resolve, 100 * (i + 1)));
      }
    }
    throw lastError;
  };

  test('safeJsonParse should parse valid JSON', () => {
    const result = safeJsonParse('{"key": "value"}');
    expect(result).toEqual({ key: 'value' });
  });

  test('safeJsonParse should return null for invalid JSON', () => {
    const result = safeJsonParse('invalid json');
    expect(result).toBeNull();
  });

  test('retryOperation should retry on failure', async () => {
    let attempts = 0;
    const operation = async () => {
      attempts++;
      if (attempts < 2) {
        throw new Error('Temporary error');
      }
      return 'success';
    };

    const result = await retryOperation(operation);
    expect(result).toBe('success');
    expect(attempts).toBe(2);
  });

  test('retryOperation should fail after max retries', async () => {
    const operation = async () => {
      throw new Error('Permanent error');
    };

    await expect(retryOperation(operation, 2)).rejects.toThrow();
  });
});
