import {
  db,
  Organisation,
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
import { format, eachDayOfInterval, isWeekend, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';

// Realistic test data
const ORGANISATIONS: Organisation[] = [
  {
    PK: "ORG-001",
    Name: "Optimal Compliance Ltd",
    CompanyNumber: "12345678",
    CreatedDate: "2020-01-15T00:00:00.000Z"
  },
  {
    PK: "ORG-002",
    Name: "Innovation Research Partners",
    CompanyNumber: "87654321",
    CreatedDate: "2019-06-20T00:00:00.000Z"
  },
  {
    PK: "ORG-003",
    Name: "Digital Health Solutions",
    CompanyNumber: "11223344",
    CreatedDate: "2021-03-10T00:00:00.000Z"
  }
];

const INDIVIDUALS: Individual[] = [
  {
    PK: "U-12345",
    FirstName: "Ellis",
    LastName: "Taylor",
    AnnualGross: 48000,
    Pension: 1450,
    NationalIns: 5000,
    OrganisationID: "ORG-001"
  },
  {
    PK: "U-67890",
    FirstName: "Sarah",
    LastName: "Johnson",
    AnnualGross: 52000,
    Pension: 1560,
    NationalIns: 5200,
    OrganisationID: "ORG-002"
  },
  {
    PK: "U-11111",
    FirstName: "Michael",
    LastName: "Chen",
    AnnualGross: 45000,
    Pension: 1350,
    NationalIns: 4800,
    OrganisationID: "ORG-001"
  }
];

// Generate grants with dates relative to current month (June 2024)
const getCurrentMonthGrants = (): Grant[] => {
  const now = new Date();
  const currentMonth = startOfMonth(now);
  const currentYear = now.getFullYear();
  const currentMonthStr = format(currentMonth, 'yyyy-MM');

  return [
    {
      PK: "G-001",
      Title: "Digital Health Innovation Project",
      StartDate: format(subMonths(currentMonth, 2), 'yyyy-MM-dd'), // 2 months ago
      EndDate: format(addMonths(currentMonth, 10), 'yyyy-MM-dd'), // 10 months from now
      ManagerUserID: "U-12345",
      OrganisationID: "ORG-003"
    },
    {
      PK: "G-002",
      Title: "AI Research Initiative",
      StartDate: format(currentMonth, 'yyyy-MM-dd'), // Current month start
      EndDate: format(addMonths(currentMonth, 8), 'yyyy-MM-dd'), // 8 months from now
      ManagerUserID: "U-67890",
      OrganisationID: "ORG-002"
    },
    {
      PK: "G-003",
      Title: "Sustainable Technology Development",
      StartDate: format(subMonths(currentMonth, 1), 'yyyy-MM-dd'), // 1 month ago
      EndDate: format(addMonths(currentMonth, 6), 'yyyy-MM-dd'), // 6 months from now
      ManagerUserID: "U-11111",
      OrganisationID: "ORG-001"
    },
    {
      PK: "G-004",
      Title: "Machine Learning Platform",
      StartDate: format(currentMonth, 'yyyy-MM-15'), // Mid current month
      EndDate: format(addMonths(currentMonth, 3), 'yyyy-MM-dd'), // 3 months from now
      ManagerUserID: "U-12345",
      OrganisationID: "ORG-001"
    },
    {
      PK: "G-005",
      Title: "Cloud Infrastructure Modernization",
      StartDate: format(currentMonth, 'yyyy-MM-01'), // Current month start
      EndDate: format(addMonths(currentMonth, 4), 'yyyy-MM-dd'), // 4 months from now
      ManagerUserID: "U-67890",
      OrganisationID: "ORG-002"
    },
    {
      PK: "G-006",
      Title: "Data Analytics Enhancement",
      StartDate: format(subMonths(currentMonth, 1), 'yyyy-MM-dd'), // 1 month ago
      EndDate: format(addMonths(currentMonth, 2), 'yyyy-MM-dd'), // 2 months from now
      ManagerUserID: "U-11111",
      OrganisationID: "ORG-001"
    }
  ];
};

const GRANTS: Grant[] = getCurrentMonthGrants();

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
    await db.transaction('rw', [db.organisations, db.individuals, db.grants, db.workdays, db.workdayHours, db.timeslots], async () => {
      await db.organisations.clear();
      await db.individuals.clear();
      await db.grants.clear();
      await db.workdays.clear();
      await db.workdayHours.clear();
      await db.timeslots.clear();
    });

    // Seed organisations
    console.log('Seeding organisations...');
    for (const organisation of ORGANISATIONS) {
      await db.organisations.put(organisation);
    }

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
    
    // Generate date ranges for current month and surrounding months
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonthStart = startOfMonth(now);
    const currentMonthEnd = endOfMonth(now);
    const prevMonthStart = startOfMonth(subMonths(now, 1));
    const prevMonthEnd = endOfMonth(subMonths(now, 1));
    const nextMonthStart = startOfMonth(addMonths(now, 1));
    const nextMonthEnd = endOfMonth(addMonths(now, 1));

    // Seed workdays and time slots for each user
    console.log('Seeding workdays and time slots...');
    for (const individual of INDIVIDUALS) {
      // Previous month
      const prevMonthWorkdays = generateWorkdaysForPeriod(prevMonthStart, prevMonthEnd);
      const prevMonthHours = generateWorkdayHoursForPeriod(prevMonthStart, prevMonthEnd);

      // Current month
      const currentMonthWorkdays = generateWorkdaysForPeriod(currentMonthStart, currentMonthEnd);
      const currentMonthHours = generateWorkdayHoursForPeriod(currentMonthStart, currentMonthEnd);

      // Next month
      const nextMonthWorkdays = generateWorkdaysForPeriod(nextMonthStart, nextMonthEnd);
      const nextMonthHours = generateWorkdayHoursForPeriod(nextMonthStart, nextMonthEnd);

      // Merge all workdays and hours for current year
      const allWorkdays = { ...prevMonthWorkdays, ...currentMonthWorkdays, ...nextMonthWorkdays };
      const allHours = { ...prevMonthHours, ...currentMonthHours, ...nextMonthHours };

      await db.workdays.put({
        PK: individual.PK,
        SK: generateWorkdayKey(individual.PK, currentYear),
        Workdays: allWorkdays
      } as Workday);

      await db.workdayHours.put({
        PK: individual.PK,
        SK: generateWorkdayHoursKey(individual.PK, currentYear),
        Hours: allHours
      } as WorkdayHours);
      
      // Generate time slots
      const timeSlots = generateTimeSlots(individual.PK, allWorkdays);
      for (const timeSlot of timeSlots) {
        await db.timeslots.put(timeSlot);
      }
    }
    
    console.log('Database seeding completed successfully!');
    console.log(`Seeded ${ORGANISATIONS.length} organisations, ${INDIVIDUALS.length} individuals, ${GRANTS.length} grants`);

    // Log summary
    const totalTimeSlots = await db.timeslots.count();
    const totalWorkdays = await db.workdays.count();
    const totalOrganisations = await db.organisations.count();
    console.log(`Generated ${totalOrganisations} organisations, ${totalWorkdays} workday records and ${totalTimeSlots} time slot allocations`);
    
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
        organisations: await db.organisations.count(),
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
