/**
 * Utility functions for glob pattern matching.
 */

const REGEX_ANY_NON_SLASH_CHARACTERS = '[^/]*';
const REGEX_START_ANCHOR = '^';
const REGEX_END_ANCHOR = '$';

/**
 * Escapes special regex characters in a string.
 */
function escapeRegexSpecialChars(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Converts a glob pattern to a regular expression.
 * Supports wildcard (*) matching for single path segments (does not match slashes).
 * 
 * @example
 * globToRegex('release/*') => /^release\/[^/]*$/
 * globToRegex('main') => /^main$/
 */
export function globToRegex(pattern: string): RegExp {
  // Escape all special regex characters except the wildcard
  const escaped = escapeRegexSpecialChars(pattern);
  
  // Replace escaped wildcards with regex pattern for any non-slash characters
  // This ensures * matches a single path segment, not multiple levels
  const regexPattern = escaped
    .replace(/\\\*/g, REGEX_ANY_NON_SLASH_CHARACTERS);
  
  // Anchor the pattern to match the entire string
  const anchoredPattern = REGEX_START_ANCHOR + regexPattern + REGEX_END_ANCHOR;
  
  return new RegExp(anchoredPattern);
}

/**
 * Tests if a string matches a glob pattern.
 * 
 * @example
 * matchesGlob('release/v1.0', 'release/*') => true
 * matchesGlob('main', 'main') => true
 * matchesGlob('develop', 'main') => false
 */
export function matchesGlob(text: string, pattern: string): boolean {
  const regex = globToRegex(pattern);
  return regex.test(text);
}

