import { formatJSON, generateFilename, validateExportData } from '@/lib/export-utils';

// Mock fs module
jest.mock('fs', () => ({
  writeFileSync: jest.fn(),
  mkdirSync: jest.fn(),
  existsSync: jest.fn(),
}));

describe('Export Utilities', () => {
  describe('formatJSON', () => {
    it('should format data as pretty JSON', () => {
      const data = { name: 'test', value: 123 };
      const result = formatJSON(data);
      
      expect(result).toBe(JSON.stringify(data, null, 2));
    });

    it('should handle null data', () => {
      const result = formatJSON(null);
      expect(result).toBe('null');
    });

    it('should handle undefined data', () => {
      const result = formatJSON(undefined);
      expect(result).toBe('undefined');
    });

    it('should handle complex nested objects', () => {
      const data = {
        users: [
          { id: 1, name: 'John', profile: { age: 30, city: 'NYC' } },
          { id: 2, name: 'Jane', profile: { age: 25, city: 'LA' } }
        ],
        metadata: { total: 2, timestamp: '2025-01-22' }
      };
      
      const result = formatJSON(data);
      const parsed = JSON.parse(result);
      
      expect(parsed).toEqual(data);
      expect(result).toContain('  '); // Should be pretty formatted
    });
  });

  describe('generateFilename', () => {
    it('should generate filename with timestamp', () => {
      const baseName = 'extraction';
      const result = generateFilename(baseName);
      
      expect(result).toMatch(/^extraction_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}\.json$/);
    });

    it('should sanitize filename', () => {
      const baseName = 'test/file:name*';
      const result = generateFilename(baseName);
      
      expect(result).toMatch(/^test_file_name_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}\.json$/);
    });

    it('should handle empty base name', () => {
      const result = generateFilename('');
      
      expect(result).toMatch(/^export_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}\.json$/);
    });

    it('should use default name when baseName is undefined', () => {
      const result = generateFilename(undefined as any);
      
      expect(result).toMatch(/^export_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}\.json$/);
    });
  });

  describe('validateExportData', () => {
    it('should validate valid data', () => {
      const data = { name: 'test', value: 123 };
      const result = validateExportData(data);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual(data);
    });

    it('should reject circular references', () => {
      const data: any = { name: 'test' };
      data.self = data; // Create circular reference
      
      const result = validateExportData(data);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('circular reference');
    });

    it('should handle null data', () => {
      const result = validateExportData(null);
      
      expect(result.success).toBe(true);
      expect(result.data).toBe(null);
    });

    it('should handle undefined data', () => {
      const result = validateExportData(undefined);
      
      expect(result.success).toBe(true);
      expect(result.data).toBe(undefined);
    });

    it('should handle primitive data types', () => {
      const testCases = [
        'string',
        123,
        true,
        false
      ];

      testCases.forEach(data => {
        const result = validateExportData(data);
        expect(result.success).toBe(true);
        expect(result.data).toBe(data);
      });
    });

    it('should handle arrays', () => {
      const data = [1, 2, 3, { nested: 'value' }];
      const result = validateExportData(data);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual(data);
    });
  });
});
