/**
 * Edit Distance Service
 *
 * Implements Levenshtein distance algorithm to compare original and modified text,
 * determining the level of customization for draft messages.
 *
 * Customization Levels:
 * - untouched: 0-2% changed
 * - light: 2-20% changed
 * - heavy: 20%+ changed
 * - custom: No original draft (fully custom message)
 */

/**
 * Calculate Levenshtein distance between two strings
 * Uses dynamic programming for O(m*n) time complexity
 */
function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;

  // Create 2D array for dynamic programming
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));

  // Initialize first column (deletions)
  for (let i = 0; i <= m; i++) {
    dp[i][0] = i;
  }

  // Initialize first row (insertions)
  for (let j = 0; j <= n; j++) {
    dp[0][j] = j;
  }

  // Fill the matrix
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1]; // No operation needed
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1, // Deletion
          dp[i][j - 1] + 1, // Insertion
          dp[i - 1][j - 1] + 1 // Substitution
        );
      }
    }
  }

  return dp[m][n];
}

/**
 * Normalize text for comparison
 * - Lowercase
 * - Trim whitespace
 * - Normalize multiple spaces to single space
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

export type CustomizationLevel = 'untouched' | 'light' | 'heavy' | 'custom';

export interface EditDistanceResult {
  distance: number;
  percentageChanged: number;
  customizationLevel: CustomizationLevel;
}

/**
 * Calculate edit distance and determine customization level
 *
 * @param original - Original draft text
 * @param modified - Modified draft text
 * @returns Edit distance metrics and customization level
 */
export function calculateEditDistance(
  original: string,
  modified: string
): EditDistanceResult {
  // Normalize both strings for fair comparison
  const normalizedOriginal = normalizeText(original);
  const normalizedModified = normalizeText(modified);

  // Calculate Levenshtein distance
  const distance = levenshteinDistance(normalizedOriginal, normalizedModified);

  // Calculate percentage changed relative to the longer string
  const maxLength = Math.max(normalizedOriginal.length, normalizedModified.length);
  const percentageChanged = maxLength > 0 ? (distance / maxLength) * 100 : 0;

  // Determine customization level based on thresholds
  let customizationLevel: CustomizationLevel;
  if (percentageChanged <= 2) {
    customizationLevel = 'untouched';
  } else if (percentageChanged <= 20) {
    customizationLevel = 'light';
  } else {
    customizationLevel = 'heavy';
  }

  return {
    distance,
    percentageChanged,
    customizationLevel,
  };
}

/**
 * Quick check if text is untouched (0-2% changed)
 * Useful for fast validation without full calculation
 */
export function isUntouched(original: string, modified: string): boolean {
  const result = calculateEditDistance(original, modified);
  return result.percentageChanged <= 2;
}

/**
 * Calculate customization level only (skips detailed metrics)
 * Optimized for cases where only the level is needed
 */
export function getCustomizationLevel(
  original: string,
  modified: string
): CustomizationLevel {
  const result = calculateEditDistance(original, modified);
  return result.customizationLevel;
}
