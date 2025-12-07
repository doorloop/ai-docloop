import { matchesGlob, globToRegex } from '../glob';

describe('glob utilities', () => {
  describe('matchesGlob', () => {
    it('should match exact strings', () => {
      expect(matchesGlob('main', 'main')).toBe(true);
      expect(matchesGlob('develop', 'main')).toBe(false);
    });

    it('should match wildcard patterns', () => {
      expect(matchesGlob('release/v1.0', 'release/*')).toBe(true);
      expect(matchesGlob('release/v1.0.0', 'release/*')).toBe(true);
      expect(matchesGlob('release/v1.0/beta', 'release/*')).toBe(false); // Only one level
      expect(matchesGlob('main', 'release/*')).toBe(false);
    });

    it('should handle multiple wildcards', () => {
      expect(matchesGlob('release/v1.0', 'release/*')).toBe(true);
      expect(matchesGlob('feature/new-feature', 'feature/*')).toBe(true);
    });

    it('should match patterns with special characters', () => {
      expect(matchesGlob('release/v1.0.0', 'release/*')).toBe(true);
      expect(matchesGlob('release/v1-0', 'release/*')).toBe(true);
    });
  });

  describe('globToRegex', () => {
    it('should convert simple glob to regex', () => {
      const regex = globToRegex('main');
      expect(regex.test('main')).toBe(true);
      expect(regex.test('main-branch')).toBe(false);
    });

    it('should convert wildcard glob to regex', () => {
      const regex = globToRegex('release/*');
      expect(regex.test('release/v1.0')).toBe(true);
      expect(regex.test('release/v1.0.0')).toBe(true);
      expect(regex.test('release/v1.0/beta')).toBe(false);
      expect(regex.test('main')).toBe(false);
    });

    it('should escape special regex characters', () => {
      const regex = globToRegex('release/v1.0');
      expect(regex.test('release/v1.0')).toBe(true);
      expect(regex.test('release/v1x0')).toBe(false); // Dot should be literal
    });
  });
});

