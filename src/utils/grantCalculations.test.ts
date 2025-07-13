import {
  calculateHourlyRate,
  generatePeriodIntervals,
  calculatePeriodTotals,
  calculateGrantPeriodResults,
  calculateCostTypeResults,
  formatCurrency,
  formatHours,
} from './grantCalculations';
import { PeriodType, GrantCalculationInput } from '../models/grantDashboard';

describe('grantCalculations', () => {
  describe('calculateHourlyRate', () => {
    it('should calculate hourly rate correctly', () => {
      const annualGross = 52000;
      const expectedHourlyRate = 52000 / (260 * 8); // 25
      expect(calculateHourlyRate(annualGross)).toBe(expectedHourlyRate);
    });

    it('should handle zero annual gross', () => {
      expect(calculateHourlyRate(0)).toBe(0);
    });
  });

  describe('generatePeriodIntervals', () => {
    it('should generate monthly intervals correctly', () => {
      const startDate = '2024-01-01';
      const endDate = '2024-03-31';
      const periods = generatePeriodIntervals(startDate, endDate, 'monthly');

      expect(periods).toHaveLength(3);
      expect(periods[0].label).toBe('Jan 2024');
      expect(periods[0].id).toBe('2024-01');
      expect(periods[1].label).toBe('Feb 2024');
      expect(periods[2].label).toBe('Mar 2024');
    });

    it('should generate quarterly intervals correctly', () => {
      const startDate = '2024-01-01';
      const endDate = '2024-12-31';
      const periods = generatePeriodIntervals(startDate, endDate, 'quarterly');

      expect(periods).toHaveLength(4);
      expect(periods[0].label).toBe('Q1 2024');
      expect(periods[0].id).toBe('2024-Q1');
      expect(periods[1].label).toBe('Q2 2024');
      expect(periods[2].label).toBe('Q3 2024');
      expect(periods[3].label).toBe('Q4 2024');
    });
  });

  describe('calculatePeriodTotals', () => {
    const mockTimeSlots = [
      {
        userId: 'user1',
        date: '2024-01-15',
        grantId: 'grant1',
        hoursAllocated: 8,
      },
      {
        userId: 'user2',
        date: '2024-01-20',
        grantId: 'grant1',
        hoursAllocated: 6,
      },
      {
        userId: 'user1',
        date: '2024-02-10',
        grantId: 'grant1',
        hoursAllocated: 4,
      },
    ];

    const mockIndividuals = [
      { PK: 'user1', AnnualGross: 52000 },
      { PK: 'user2', AnnualGross: 41600 },
    ];

    it('should calculate period totals correctly', () => {
      const periodStart = new Date('2024-01-01');
      const periodEnd = new Date('2024-01-31');

      const result = calculatePeriodTotals(
        mockTimeSlots,
        mockIndividuals,
        'grant1',
        periodStart,
        periodEnd
      );

      expect(result.totalHours).toBe(14); // 8 + 6
      // user1: 8 hours * 25/hour = 200
      // user2: 6 hours * 20/hour = 120
      expect(result.totalValue).toBe(320);
    });

    it('should return zero for periods with no data', () => {
      const periodStart = new Date('2024-03-01');
      const periodEnd = new Date('2024-03-31');

      const result = calculatePeriodTotals(
        mockTimeSlots,
        mockIndividuals,
        'grant1',
        periodStart,
        periodEnd
      );

      expect(result.totalHours).toBe(0);
      expect(result.totalValue).toBe(0);
    });
  });

  describe('calculateGrantPeriodResults', () => {
    const mockInput: GrantCalculationInput = {
      grantId: 'grant1',
      timeSlots: [
        {
          userId: 'user1',
          date: '2024-01-15',
          grantId: 'grant1',
          hoursAllocated: 8,
        },
      ],
      individuals: [{ PK: 'user1', AnnualGross: 52000 }],
      periodType: 'monthly' as PeriodType,
      dateRange: {
        startDate: '2024-01-01',
        endDate: '2024-02-29',
      },
    };

    it('should calculate grant period results', () => {
      const results = calculateGrantPeriodResults(mockInput);

      expect(results).toHaveLength(2); // Jan and Feb
      expect(results[0].periodLabel).toBe('Jan 2024');
      expect(results[0].totalHours).toBe(8);
      expect(results[0].totalValue).toBe(200); // 8 * 25
      expect(results[1].totalHours).toBe(0);
      expect(results[1].totalValue).toBe(0);
    });
  });

  describe('calculateCostTypeResults', () => {
    const mockInput: GrantCalculationInput = {
      grantId: 'grant1',
      timeSlots: [
        {
          userId: 'user1',
          date: '2024-01-15',
          grantId: 'grant1',
          hoursAllocated: 8,
        },
      ],
      individuals: [{ PK: 'user1', AnnualGross: 52000 }],
      periodType: 'monthly' as PeriodType,
      dateRange: {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      },
    };

    it('should calculate cost type results with Staff having data', () => {
      const results = calculateCostTypeResults(mockInput);

      expect(results).toHaveLength(6); // All cost types
      
      const staffResult = results.find(r => r.costType === 'Staff');
      expect(staffResult?.totalHours).toBe(8);
      expect(staffResult?.totalValue).toBe(200);

      const overheadsResult = results.find(r => r.costType === 'Overheads');
      expect(overheadsResult?.totalHours).toBe(0);
      expect(overheadsResult?.totalValue).toBe(0);
    });
  });

  describe('formatCurrency', () => {
    it('should format currency correctly', () => {
      expect(formatCurrency(1234.56)).toBe('£1,234.56');
      expect(formatCurrency(0)).toBe('£0.00');
      expect(formatCurrency(1000000)).toBe('£1,000,000.00');
    });
  });

  describe('formatHours', () => {
    it('should format hours correctly', () => {
      expect(formatHours(8)).toBe('8.0h');
      expect(formatHours(8.5)).toBe('8.5h');
      expect(formatHours(0)).toBe('0.0h');
    });
  });
});
