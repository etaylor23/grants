/**
 * Generates a consistent color for a given name using a hash-based approach.
 * This function ensures the same name always produces the same color across the app.
 *
 * @param name - The name to generate a color for
 * @returns A hex color string (e.g., "#FF6B6B")
 */
export const generateConsistentColor = (name: string): string => {
  // Curated palette of visually appealing colors that work well for calendar events
  // These colors have good contrast and are distinguishable from each other
  const colorPalette = [
    "#FF6B6B", // Coral Red
    "#4ECDC4", // Teal
    "#45B7D1", // Sky Blue
    "#96CEB4", // Mint Green
    "#FFEAA7", // Warm Yellow
    "#DDA0DD", // Plum
    "#98D8C8", // Seafoam
    "#F7DC6F", // Golden Yellow
    "#BB8FCE", // Lavender
    "#85C1E9", // Light Blue
    "#F8C471", // Peach
    "#82E0AA", // Light Green
    "#F1948A", // Salmon
    "#85C1E9", // Powder Blue
    "#D7BDE2", // Light Purple
    "#A9DFBF", // Pale Green
    "#F9E79F", // Cream Yellow
    "#D5A6BD", // Dusty Rose
    "#A3E4D7", // Aqua
    "#FAD7A0", // Champagne
  ];

  // Create a simple but effective hash function
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    const char = name.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  // Use absolute value and modulo to get a consistent index
  const colorIndex = Math.abs(hash) % colorPalette.length;
  return colorPalette[colorIndex];
};

// Legacy function aliases for backward compatibility
export const generateUserColor = generateConsistentColor;
export const generatePastelColor = generateConsistentColor;
