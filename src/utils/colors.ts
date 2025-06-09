// Simple color generation utility
export const generateUserColor = (name: string): string => {
  // Simple hash function to generate consistent colors
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Convert to HSL for better color distribution
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 70%, 50%)`;
};
