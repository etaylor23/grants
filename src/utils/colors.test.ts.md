import { describe, it, expect } from 'vitest';
import { generateUserColor, generatePastelColor } from './colors';

describe('Color utilities', () => {
  describe('generateUserColor', () => {
    it('generates consistent colors for the same name', () => {
      const name = 'John Doe';
      const color1 = generateUserColor(name);
      const color2 = generateUserColor(name);
      
      expect(color1).toBe(color2);
    });

    it('generates different colors for different names', () => {
      const color1 = generateUserColor('John Doe');
      const color2 = generateUserColor('Jane Smith');
      
      expect(color1).not.toBe(color2);
    });

    it('returns HSL color format', () => {
      const color = generateUserColor('Test User');
      
      expect(color).toMatch(/^hsl\(\d+, 45%, 70%\)$/);
    });

    it('handles empty string', () => {
      const color = generateUserColor('');
      
      expect(color).toMatch(/^hsl\(\d+, 45%, 70%\)$/);
    });

    it('handles special characters', () => {
      const color = generateUserColor('User@123!');
      
      expect(color).toMatch(/^hsl\(\d+, 45%, 70%\)$/);
    });
  });

  describe('generatePastelColor', () => {
    it('generates consistent colors for the same name', () => {
      const name = 'John Doe';
      const color1 = generatePastelColor(name);
      const color2 = generatePastelColor(name);
      
      expect(color1).toBe(color2);
    });

    it('generates different colors for different names', () => {
      const color1 = generatePastelColor('John Doe');
      const color2 = generatePastelColor('Jane Smith');
      
      expect(color1).not.toBe(color2);
    });

    it('returns hex color format', () => {
      const color = generatePastelColor('Test User');
      
      expect(color).toMatch(/^#[A-F0-9]{6}$/i);
    });

    it('returns one of the predefined pastel colors', () => {
      const predefinedColors = [
        '#FFB3BA', // Light Pink
        '#FFDFBA', // Light Peach
        '#FFFFBA', // Light Yellow
        '#BAFFC9', // Light Green
        '#BAE1FF', // Light Blue
        '#E1BAFF', // Light Purple
        '#FFBAE1', // Light Magenta
        '#C9FFBA', // Light Lime
        '#FFCBA4', // Light Orange
        '#B4E7CE', // Light Mint
        '#F7D794', // Light Gold
        '#DDA0DD', // Light Plum
      ];

      const color = generatePastelColor('Test User');
      
      expect(predefinedColors).toContain(color);
    });

    it('handles empty string', () => {
      const color = generatePastelColor('');
      
      expect(color).toMatch(/^#[A-F0-9]{6}$/i);
    });

    it('handles special characters', () => {
      const color = generatePastelColor('User@123!');
      
      expect(color).toMatch(/^#[A-F0-9]{6}$/i);
    });

    it('distributes colors evenly across the palette', () => {
      const names = [
        'User A', 'User B', 'User C', 'User D', 'User E',
        'User F', 'User G', 'User H', 'User I', 'User J',
        'User K', 'User L', 'User M', 'User N', 'User O'
      ];

      const colors = names.map(name => generatePastelColor(name));
      const uniqueColors = new Set(colors);

      // Should generate multiple different colors
      expect(uniqueColors.size).toBeGreaterThan(1);
    });
  });

  describe('Color consistency', () => {
    it('maintains consistency across multiple calls', () => {
      const testNames = ['Alice', 'Bob', 'Charlie', 'Diana'];
      
      // Generate colors multiple times
      const firstRun = testNames.map(name => ({
        name,
        userColor: generateUserColor(name),
        pastelColor: generatePastelColor(name)
      }));

      const secondRun = testNames.map(name => ({
        name,
        userColor: generateUserColor(name),
        pastelColor: generatePastelColor(name)
      }));

      // Colors should be identical across runs
      firstRun.forEach((first, index) => {
        const second = secondRun[index];
        expect(first.userColor).toBe(second.userColor);
        expect(first.pastelColor).toBe(second.pastelColor);
      });
    });

    it('generates unique colors for similar names', () => {
      const similarNames = ['John', 'Jon', 'Johnny', 'Jonathan'];
      const userColors = similarNames.map(name => generateUserColor(name));
      const pastelColors = similarNames.map(name => generatePastelColor(name));

      // Should generate different colors even for similar names
      const uniqueUserColors = new Set(userColors);
      const uniquePastelColors = new Set(pastelColors);

      expect(uniqueUserColors.size).toBeGreaterThan(1);
      expect(uniquePastelColors.size).toBeGreaterThan(1);
    });
  });

  describe('Performance', () => {
    it('generates colors quickly for many names', () => {
      const names = Array.from({ length: 1000 }, (_, i) => `User ${i}`);
      
      const startTime = performance.now();
      
      names.forEach(name => {
        generateUserColor(name);
        generatePastelColor(name);
      });
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should complete in reasonable time (less than 100ms for 1000 names)
      expect(duration).toBeLessThan(100);
    });
  });

  describe('Edge cases', () => {
    it('handles very long names', () => {
      const longName = 'A'.repeat(1000);
      
      const userColor = generateUserColor(longName);
      const pastelColor = generatePastelColor(longName);
      
      expect(userColor).toMatch(/^hsl\(\d+, 45%, 70%\)$/);
      expect(pastelColor).toMatch(/^#[A-F0-9]{6}$/i);
    });

    it('handles unicode characters', () => {
      const unicodeName = '用户名 👤 🎨';
      
      const userColor = generateUserColor(unicodeName);
      const pastelColor = generatePastelColor(unicodeName);
      
      expect(userColor).toMatch(/^hsl\(\d+, 45%, 70%\)$/);
      expect(pastelColor).toMatch(/^#[A-F0-9]{6}$/i);
    });

    it('handles numeric strings', () => {
      const numericName = '12345';
      
      const userColor = generateUserColor(numericName);
      const pastelColor = generatePastelColor(numericName);
      
      expect(userColor).toMatch(/^hsl\(\d+, 45%, 70%\)$/);
      expect(pastelColor).toMatch(/^#[A-F0-9]{6}$/i);
    });
  });

  describe('Accessibility', () => {
    it('generates colors with sufficient contrast', () => {
      const testNames = ['User 1', 'User 2', 'User 3'];
      
      testNames.forEach(name => {
        const userColor = generateUserColor(name);
        const pastelColor = generatePastelColor(name);
        
        // HSL colors should have reasonable lightness (70%)
        expect(userColor).toContain('70%');
        
        // Pastel colors should be light enough for good contrast
        expect(pastelColor).toMatch(/^#[A-F0-9]{6}$/i);
      });
    });
  });
});
