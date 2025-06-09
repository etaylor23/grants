import { 
  db, 
  Individual, 
  Grant, 
  Workday, 
  WorkdayHours, 
  TimeSlot,
  generateWorkdayKey,
  generateWorkdayHoursKey,
  generateTimeSlotKey,
  DEFAULT_WORKDAY_HOURS
} from './schema';
import { format, eachDayOfInterval, isWeekend, startOfMonth, endOfMonth } from 'date-fns';

// Realistic test data
const INDIVIDUALS: Individual[] = [
  {
    PK: "U-12345",
    FirstName: "Ellis",
    LastName: "Taylor",
    AnnualGross: 48000,
    Pension: 1450,
    NationalIns: 5000
  },
  {
    PK: "U-67890",
    FirstName: "Sarah",
    LastName: "Johnson",
    AnnualGross: 52000,
    Pension: 1560,
    NationalIns: 5200
  },
  {
    PK: "U-11111",
    FirstName: "Michael",
    LastName: "Chen",
    AnnualGross: 45000,
    Pension: 1350,
    NationalIns: 4800
  }
];

const GRANTS: Grant[] = [
  {
    PK: "G-001",
    Title: "Digital Health Innovation Project",
    StartDate: "2024-10-01",
    EndDate: "2025-09-30",
    ManagerUserID: "U-12345"
  },
  {
    PK: "G-002",
    Title: "AI Research Initiative",
    StartDate: "2024-12-01",
    EndDate: "2025-11-30",
    ManagerUserID: "U-67890"
  },
  {
    PK: "G-003",
    Title: "Sustainable Technology Development",
    StartDate: "2025-01-01",
    EndDate: "2025-12-31",
    ManagerUserID: "U-11111"
  },
  {
    PK: "G-004",
    Title: "Machine Learning Platform",
    StartDate: "2025-01-15",
    EndDate: "2025-06-30",
    ManagerUserID: "U-12345"
  },
  {
    PK: "G-005",
    Title: "Cloud Infrastructure Modernization",
    StartDate: "2025-02-01",
    EndDate: "2025-08-31",
    ManagerUserID: "U-67890"
  },
  {
    PK: "G-006",
    Title: "Data Analytics Enhancement",
    StartDate: "2025-01-01",
    EndDate: "2025-04-30",
    ManagerUserID: "U-11111"
  }
];

// Helper function to generate workdays for a date range (excluding weekends)
const generateWorkdaysForPeriod = (startDate: Date, endDate: Date): Record<string, boolean> => {
  const workdays: Record<string, boolean> = {};
  const days = eachDayOfInterval({ start: startDate, end: endDate });
  
  days.forEach(day => {
    const dateStr = format(day, 'yyyy-MM-dd');
    workdays[dateStr] = !isWeekend(day);
  });
  
  return workdays;
};

// Helper function to generate workday hours for a date range
const generateWorkdayHoursForPeriod = (startDate: Date, endDate: Date): Record<string, number> => {
  const hours: Record<string, number> = {};
  const days = eachDayOfInterval({ start: startDate, end: endDate });
  
  days.forEach(day => {
    const dateStr = format(day, 'yyyy-MM-dd');
    if (!isWeekend(day)) {
      hours[dateStr] = DEFAULT_WORKDAY_HOURS;
    }
  });
  
  return hours;
};

// Helper function to generate realistic time slot allocations
const generateTimeSlots = (userId: string, workdays: Record<string, boolean>): TimeSlot[] => {
  const timeSlots: TimeSlot[] = [];
  const workdayDates = Object.keys(workdays).filter(date => workdays[date]);
  
  // Generate allocations for each workday
  workdayDates.forEach((date, index) => {
    const grants = GRANTS.filter(g => date >= g.StartDate && date <= g.EndDate);
    
    if (grants.length === 0) return;
    
    // Create realistic allocation patterns
    const patterns = [
      // Full day on one grant
      () => [{
        grantId: grants[0].PK,
        percent: 100,
        hours: 8
      }],
      // Split between two grants
      () => grants.length >= 2 ? [
        { grantId: grants[0].PK, percent: 60, hours: 4.8 },
        { grantId: grants[1].PK, percent: 40, hours: 3.2 }
      ] : [{ grantId: grants[0].PK, percent: 100, hours: 8 }],
      // Three-way split
      () => grants.length >= 3 ? [
        { grantId: grants[0].PK, percent: 50, hours: 4 },
        { grantId: grants[1].PK, percent: 30, hours: 2.4 },
        { grantId: grants[2].PK, percent: 20, hours: 1.6 }
      ] : [{ grantId: grants[0].PK, percent: 100, hours: 8 }],
      // Partial day (6 hours total)
      () => [{
        grantId: grants[0].PK,
        percent: 75,
        hours: 6
      }]
    ];
    
    // Choose pattern based on day of week and index for variety
    const patternIndex = (index + new Date(date).getDay()) % patterns.length;
    const allocations = patterns[patternIndex]();
    
    // Create time slots
    allocations.forEach(allocation => {
      timeSlots.push({
        PK: userId,
        SK: generateTimeSlotKey(date, allocation.grantId),
        AllocationPercent: allocation.percent,
        HoursAllocated: allocation.hours,
        Date: date,
        GrantID: allocation.grantId,
        UserID: userId
      });
    });
  });
  
  return timeSlots;
};

// Main seeding function
export const seedLocalDynamo = async (): Promise<void> => {
  try {
    console.log('Starting database seeding...');
    
    // Clear existing data
    await db.transaction('rw', [db.individuals, db.grants, db.workdays, db.workdayHours, db.timeslots], async () => {
      await db.individuals.clear();
      await db.grants.clear();
      await db.workdays.clear();
      await db.workdayHours.clear();
      await db.timeslots.clear();
    });
    
    // Seed individuals
    console.log('Seeding individuals...');
    for (const individual of INDIVIDUALS) {
      await db.individuals.put(individual);
    }
    
    // Seed grants
    console.log('Seeding grants...');
    for (const grant of GRANTS) {
      await db.grants.put(grant);
    }
    
    // Generate date ranges for January-February 2025
    const jan2025Start = new Date('2025-01-01');
    const jan2025End = endOfMonth(jan2025Start);
    const feb2025Start = new Date('2025-02-01');
    const feb2025End = endOfMonth(feb2025Start);
    
    // Seed workdays and time slots for each user
    console.log('Seeding workdays and time slots...');
    for (const individual of INDIVIDUALS) {
      // January 2025
      const jan2025Workdays = generateWorkdaysForPeriod(jan2025Start, jan2025End);
      const jan2025Hours = generateWorkdayHoursForPeriod(jan2025Start, jan2025End);
      
      // February 2025
      const feb2025Workdays = generateWorkdaysForPeriod(feb2025Start, feb2025End);
      const feb2025Hours = generateWorkdayHoursForPeriod(feb2025Start, feb2025End);
      
      // Merge all workdays and hours for 2025
      const allWorkdays = { ...jan2025Workdays, ...feb2025Workdays };
      const allHours = { ...jan2025Hours, ...feb2025Hours };
      
      await db.workdays.put({
        PK: individual.PK,
        SK: generateWorkdayKey(individual.PK, 2025),
        Workdays: allWorkdays
      } as Workday);
      
      await db.workdayHours.put({
        PK: individual.PK,
        SK: generateWorkdayHoursKey(individual.PK, 2025),
        Hours: allHours
      } as WorkdayHours);
      
      // Generate time slots
      const timeSlots = generateTimeSlots(individual.PK, allWorkdays);
      for (const timeSlot of timeSlots) {
        await db.timeslots.put(timeSlot);
      }
    }
    
    console.log('Database seeding completed successfully!');
    console.log(`Seeded ${INDIVIDUALS.length} individuals, ${GRANTS.length} grants`);
    
    // Log summary
    const totalTimeSlots = await db.timeslots.count();
    const totalWorkdays = await db.workdays.count();
    console.log(`Generated ${totalWorkdays} workday records and ${totalTimeSlots} time slot allocations`);
    
  } catch (error) {
    console.error('Database seeding failed:', error);
    throw error;
  }
};

// Function to check if database needs seeding
export const isDatabaseEmpty = async (): Promise<boolean> => {
  try {
    const individualCount = await db.individuals.count();
    return individualCount === 0;
  } catch (error) {
    console.error('Error checking database state:', error);
    return true;
  }
};

// Auto-seed on first load
export const initializeDatabase = async (): Promise<void> => {
  try {
    console.log('Initializing IndexedDB database...');

    // Ensure database is open
    await db.open();
    console.log('Database opened successfully');

    const isEmpty = await isDatabaseEmpty();
    console.log('Database empty check:', isEmpty);

    if (isEmpty) {
      console.log('Database is empty, auto-seeding...');
      await seedLocalDynamo();
    } else {
      console.log('Database already contains data, skipping auto-seed');
      // Log current counts for debugging
      const counts = {
        individuals: await db.individuals.count(),
        grants: await db.grants.count(),
        workdays: await db.workdays.count(),
        workdayHours: await db.workdayHours.count(),
        timeslots: await db.timeslots.count(),
      };
      console.log('Current database counts:', counts);
    }
  } catch (error) {
    console.error('Database initialization failed:', error);
    // Try to seed anyway
    console.log('Attempting to seed database anyway...');
    try {
      await seedLocalDynamo();
    } catch (seedError) {
      console.error('Seeding also failed:', seedError);
    }
  }
};
