// Generate a consistent hex color based on a string hash
export const generateUserColor = (name: string): string => {
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    const char = name.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Convert hash to positive number and generate RGB values
  const positiveHash = Math.abs(hash);
  
  // Generate RGB values with good contrast and saturation
  const hue = positiveHash % 360;
  const saturation = 60 + (positiveHash % 30); // 60-90%
  const lightness = 45 + (positiveHash % 20); // 45-65%
  
  // Convert HSL to RGB
  const hslToRgb = (h: number, s: number, l: number) => {
    h /= 360;
    s /= 100;
    l /= 100;
    
    const a = s * Math.min(l, 1 - l);
    const f = (n: number) => {
      const k = (n + h * 12) % 12;
      return l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    };
    
    return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
  };
  
  const [r, g, b] = hslToRgb(hue, saturation, lightness);
  
  // Convert to hex
  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

// Get a lighter version of the color for backgrounds
export const getLighterColor = (color: string, opacity: number = 0.3): string => {
  // Convert hex to RGB
  const hex = color.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};
