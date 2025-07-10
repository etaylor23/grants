// Simple color generation utility
export const generateUserColor = (name: string): string => {
  // Simple hash function to generate consistent colors
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  // Convert to HSL for pastel colors (lower saturation, higher lightness)
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 45%, 70%)`;
};

// Generate pastel color palette for calendar events
export const generatePastelColor = (name: string): string => {
  // Predefined pastel colors for better visual appeal
  const pastelColors = [
    "#FFB3BA", // Light Pink
    "#FFDFBA", // Light Peach
    "#FFFFBA", // Light Yellow
    "#BAFFC9", // Light Green
    "#BAE1FF", // Light Blue
    "#E1BAFF", // Light Purple
    "#FFBAE1", // Light Magenta
    "#C9FFBA", // Light Lime
    "#FFCBA4", // Light Orange
    "#B4E7CE", // Light Mint
    "#F7D794", // Light Gold
    "#DDA0DD", // Light Plum
  ];

  // Simple hash function to select color consistently
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  return pastelColors[Math.abs(hash) % pastelColors.length];
};
