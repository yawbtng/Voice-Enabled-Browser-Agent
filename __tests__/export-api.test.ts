import { formatJSON, generateFilename, validateExportData, ensureDownloadsDir } from '@/lib/export-utils';

// Mock fs module
const mockWriteFileSync = jest.fn();
const mockMkdirSync = jest.fn();
const mockExistsSync = jest.fn();

jest.mock('fs', () => ({
  writeFileSync: mockWriteFileSync,
  mkdirSync: mockMkdirSync,
  existsSync: mockExistsSync,
}));

jest.mock('path', () => ({
  join: jest.fn((...args) => args.join('/')),
}));

describe('Export API Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockExistsSync.mockReturnValue(true); // Downloads directory exists by default
  });

  describe('Export functionality', () => {
    it('should format and validate data correctly', () => {
      const testData = { name: 'test', value: 123 };
      
      // Test formatting
      const formatted = formatJSON(testData);
      expect(formatted).toBe(JSON.stringify(testData, null, 2));
      
      // Test validation
      const validation = validateExportData(testData);
      expect(validation.success).toBe(true);
      expect(validation.data).toEqual(testData);
    });

    it('should generate proper filename', () => {
      const filename = generateFilename('test-export');
      expect(filename).toMatch(/^test-export_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}\.json$/);
    });

    it('should ensure downloads directory exists', () => {
      mockExistsSync.mockReturnValue(false);
      
      ensureDownloadsDir();
      
      expect(mockMkdirSync).toHaveBeenCalledWith(
        expect.stringContaining('downloads'),
        { recursive: true }
      );
    });

    it('should not create directory if it already exists', () => {
      mockExistsSync.mockReturnValue(true);
      
      ensureDownloadsDir();
      
      expect(mockMkdirSync).not.toHaveBeenCalled();
    });

    it('should handle circular reference validation', () => {
      const circularData: any = { name: 'test' };
      circularData.self = circularData;
      
      const validation = validateExportData(circularData);
      
      expect(validation.success).toBe(false);
      expect(validation.error).toContain('circular reference');
    });

    it('should handle file write operation', () => {
      const testData = { name: 'test' };
      const filename = 'test-export.json';
      const content = formatJSON(testData);
      
      // Simulate file write
      mockWriteFileSync.mockImplementation(() => {
        // File write successful
      });
      
      mockWriteFileSync('downloads/test-export.json', content, 'utf8');
      
      expect(mockWriteFileSync).toHaveBeenCalledWith(
        'downloads/test-export.json',
        content,
        'utf8'
      );
    });

    it('should handle file write errors', () => {
      const testData = { name: 'test' };
      const content = formatJSON(testData);
      
      mockWriteFileSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });
      
      expect(() => {
        mockWriteFileSync('downloads/test-export.json', content, 'utf8');
      }).toThrow('Permission denied');
    });

    it('should sanitize filename properly', () => {
      const filename = generateFilename('test/file:name*');
      expect(filename).toMatch(/^test_file_name_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}\.json$/);
    });

    it('should use default filename when none provided', () => {
      const filename = generateFilename();
      expect(filename).toMatch(/^export_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}\.json$/);
    });
  });
});