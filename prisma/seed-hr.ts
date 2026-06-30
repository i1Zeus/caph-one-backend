import { PrismaClient } from '@prisma/client';
import { encrypt } from '../utils/help';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting HR Data Seeding...');

  // Get the default workspace
  const workspace = await prisma.workspace.findFirst({
    where: { slug: 'izeus-erp' },
  });

  if (!workspace) {
    console.error(
      '❌ Default workspace not found. Please run main seed first.',
    );
    return;
  }

  console.log(`✅ Found workspace: ${workspace.name}`);

  // Get super admin user
  const superAdmin = await prisma.user.findFirst({
    where: { email: 'husseinnajah.it@gmail.com' },
  });

  if (!superAdmin) {
    console.error('❌ Super admin user not found. Please run main seed first.');
    return;
  }

  console.log(`✅ Found super admin: ${superAdmin.name}`);

  // Encryption key for salaries (use same key for all demo data)
  const encryptionKey = 'demo-encryption-key-2025';

  // 1. Create Jobs (المسميات الوظيفية)
  console.log('💼 Creating jobs...');

  const jobs = await Promise.all([
    prisma.job.upsert({
      where: { id: 'job-ceo' },
      update: { name: 'المدير التنفيذي', description: 'الإدارة العليا للشركة' },
      create: {
        id: 'job-ceo',
        name: 'المدير التنفيذي',
        description: 'الإدارة العليا للشركة',
      },
    }),
    prisma.job.upsert({
      where: { id: 'job-hr-manager' },
      update: {
        name: 'مدير الموارد البشرية',
        description: 'إدارة شؤون الموظفين',
      },
      create: {
        id: 'job-hr-manager',
        name: 'مدير الموارد البشرية',
        description: 'إدارة شؤون الموظفين',
      },
    }),
    prisma.job.upsert({
      where: { id: 'job-developer' },
      update: { name: 'مطور برمجيات', description: 'تطوير وبرمجة الأنظمة' },
      create: {
        id: 'job-developer',
        name: 'مطور برمجيات',
        description: 'تطوير وبرمجة الأنظمة',
      },
    }),
    prisma.job.upsert({
      where: { id: 'job-designer' },
      update: {
        name: 'مصمم جرافيك',
        description: 'تصميم الواجهات والمواد البصرية',
      },
      create: {
        id: 'job-designer',
        name: 'مصمم جرافيك',
        description: 'تصميم الواجهات والمواد البصرية',
      },
    }),
    prisma.job.upsert({
      where: { id: 'job-accountant' },
      update: { name: 'محاسب', description: 'إدارة الحسابات والمالية' },
      create: {
        id: 'job-accountant',
        name: 'محاسب',
        description: 'إدارة الحسابات والمالية',
      },
    }),
    prisma.job.upsert({
      where: { id: 'job-sales' },
      update: { name: 'موظف مبيعات', description: 'إدارة المبيعات والعملاء' },
      create: {
        id: 'job-sales',
        name: 'موظف مبيعات',
        description: 'إدارة المبيعات والعملاء',
      },
    }),
    prisma.job.upsert({
      where: { id: 'job-support' },
      update: { name: 'الدعم الفني', description: 'تقديم الدعم الفني للعملاء' },
      create: {
        id: 'job-support',
        name: 'الدعم الفني',
        description: 'تقديم الدعم الفني للعملاء',
      },
    }),
  ]);

  console.log(`✅ Created ${jobs.length} jobs`);

  // 2. Create Employees (الموظفين)
  console.log('👥 Creating employees...');

  const employeesData = [
    {
      id: 'emp-001',
      fingerPrintId: 'FP001',
      firstName: 'أحمد',
      lastName: 'محمد',
      phone: '+9647701234501',
      alternatePhone: '+9647801234501',
      dateOfBirth: new Date('1990-05-15'),
      gender: 'MALE' as const,
      address: 'بغداد، الكرادة',
      city: 'بغداد',
      country: 'العراق',
      jobId: 'job-ceo',
      hireDate: new Date('2020-01-01'),
      employmentType: 'FULL_TIME' as const,
      employmentStatus: 'ACTIVE' as const,
      salary: encrypt('2000000', encryptionKey), // 2,000,000 IQD
      currency: 'IQD',
      workingHours: 8,
      daysToWorkPerMonth: 26,
      leavesAllowed: 21,
      workLocation: 'OFFICE' as const,
      shiftType: 'DAY_SHIFT' as const,
      startWorkingTime: new Date('2000-01-01T09:00:00.000Z'),
      endWorkingTime: new Date('2000-01-01T17:00:00.000Z'),
      emergencyContactName: 'فاطمة أحمد',
      emergencyContactPhone: '+9647701234599',
      emergencyContactRelation: 'زوجة',
    },
    {
      id: 'emp-002',
      fingerPrintId: 'FP002',
      firstName: 'سارة',
      lastName: 'علي',
      phone: '+9647701234502',
      alternatePhone: '+9647801234502',
      dateOfBirth: new Date('1992-08-20'),
      gender: 'FEMALE' as const,
      address: 'بغداد، المنصور',
      city: 'بغداد',
      country: 'العراق',
      jobId: 'job-hr-manager',
      hireDate: new Date('2021-03-15'),
      employmentType: 'FULL_TIME' as const,
      employmentStatus: 'ACTIVE' as const,
      salary: encrypt('1500000', encryptionKey), // 1,500,000 IQD
      currency: 'IQD',
      workingHours: 8,
      daysToWorkPerMonth: 26,
      leavesAllowed: 21,
      workLocation: 'OFFICE' as const,
      shiftType: 'DAY_SHIFT' as const,
      startWorkingTime: new Date('2000-01-01T09:00:00.000Z'),
      endWorkingTime: new Date('2000-01-01T17:00:00.000Z'),
      emergencyContactName: 'محمد علي',
      emergencyContactPhone: '+9647701234598',
      emergencyContactRelation: 'والد',
      managerId: 'emp-001', // تقرير للمدير التنفيذي
    },
    {
      id: 'emp-003',
      fingerPrintId: 'FP003',
      firstName: 'محمود',
      lastName: 'حسن',
      phone: '+9647701234503',
      dateOfBirth: new Date('1995-03-10'),
      gender: 'MALE' as const,
      address: 'بغداد، الجادرية',
      city: 'بغداد',
      country: 'العراق',
      jobId: 'job-developer',
      hireDate: new Date('2022-06-01'),
      employmentType: 'FULL_TIME' as const,
      employmentStatus: 'ACTIVE' as const,
      salary: encrypt('1200000', encryptionKey),
      currency: 'IQD',
      workingHours: 8,
      daysToWorkPerMonth: 26,
      leavesAllowed: 21,
      workLocation: 'HYBRID' as const,
      shiftType: 'FLEXIBLE' as const,
      startWorkingTime: new Date('2000-01-01T09:00:00.000Z'),
      endWorkingTime: new Date('2000-01-01T17:00:00.000Z'),
      emergencyContactName: 'زينب محمود',
      emergencyContactPhone: '+9647701234597',
      emergencyContactRelation: 'أم',
      managerId: 'emp-001',
    },
    {
      id: 'emp-004',
      fingerPrintId: 'FP004',
      firstName: 'نور',
      lastName: 'عبدالله',
      phone: '+9647701234504',
      dateOfBirth: new Date('1994-11-25'),
      gender: 'FEMALE' as const,
      address: 'بغداد، الجامعة',
      city: 'بغداد',
      country: 'العراق',
      jobId: 'job-designer',
      hireDate: new Date('2022-09-01'),
      employmentType: 'FULL_TIME' as const,
      employmentStatus: 'ACTIVE' as const,
      salary: encrypt('1100000', encryptionKey),
      currency: 'IQD',
      workingHours: 8,
      daysToWorkPerMonth: 26,
      leavesAllowed: 21,
      workLocation: 'REMOTE' as const,
      shiftType: 'FLEXIBLE' as const,
      startWorkingTime: new Date('2000-01-01T09:00:00.000Z'),
      endWorkingTime: new Date('2000-01-01T17:00:00.000Z'),
      emergencyContactName: 'علي عبدالله',
      emergencyContactPhone: '+9647701234596',
      emergencyContactRelation: 'أب',
      managerId: 'emp-001',
    },
    {
      id: 'emp-005',
      fingerPrintId: 'FP005',
      firstName: 'خالد',
      lastName: 'إبراهيم',
      phone: '+9647701234505',
      dateOfBirth: new Date('1988-07-12'),
      gender: 'MALE' as const,
      address: 'بغداد، الكاظمية',
      city: 'بغداد',
      country: 'العراق',
      jobId: 'job-accountant',
      hireDate: new Date('2021-01-10'),
      employmentType: 'FULL_TIME' as const,
      employmentStatus: 'ACTIVE' as const,
      salary: encrypt('1300000', encryptionKey),
      currency: 'IQD',
      workingHours: 8,
      daysToWorkPerMonth: 26,
      leavesAllowed: 21,
      workLocation: 'OFFICE' as const,
      shiftType: 'DAY_SHIFT' as const,
      startWorkingTime: new Date('2000-01-01T08:30:00.000Z'),
      endWorkingTime: new Date('2000-01-01T16:30:00.000Z'),
      emergencyContactName: 'ليلى خالد',
      emergencyContactPhone: '+9647701234595',
      emergencyContactRelation: 'زوجة',
      managerId: 'emp-001',
    },
    {
      id: 'emp-006',
      fingerPrintId: 'FP006',
      firstName: 'مريم',
      lastName: 'حسين',
      phone: '+9647701234506',
      dateOfBirth: new Date('1996-02-28'),
      gender: 'FEMALE' as const,
      address: 'بغداد، الحارثية',
      city: 'بغداد',
      country: 'العراق',
      jobId: 'job-sales',
      hireDate: new Date('2023-01-15'),
      employmentType: 'FULL_TIME' as const,
      employmentStatus: 'ACTIVE' as const,
      salary: encrypt('1000000', encryptionKey),
      currency: 'IQD',
      workingHours: 8,
      daysToWorkPerMonth: 26,
      leavesAllowed: 18,
      workLocation: 'OFFICE' as const,
      shiftType: 'DAY_SHIFT' as const,
      startWorkingTime: new Date('2000-01-01T09:00:00.000Z'),
      endWorkingTime: new Date('2000-01-01T17:00:00.000Z'),
      emergencyContactName: 'حسين علي',
      emergencyContactPhone: '+9647701234594',
      emergencyContactRelation: 'أخ',
      managerId: 'emp-001',
    },
    {
      id: 'emp-007',
      fingerPrintId: 'FP007',
      firstName: 'عمر',
      lastName: 'صالح',
      phone: '+9647701234507',
      dateOfBirth: new Date('1993-09-18'),
      gender: 'MALE' as const,
      address: 'بغداد، الزعفرانية',
      city: 'بغداد',
      country: 'العراق',
      jobId: 'job-developer',
      hireDate: new Date('2022-08-01'),
      employmentType: 'FULL_TIME' as const,
      employmentStatus: 'ACTIVE' as const,
      salary: encrypt('1250000', encryptionKey),
      currency: 'IQD',
      workingHours: 8,
      daysToWorkPerMonth: 26,
      leavesAllowed: 21,
      workLocation: 'HYBRID' as const,
      shiftType: 'FLEXIBLE' as const,
      startWorkingTime: new Date('2000-01-01T09:00:00.000Z'),
      endWorkingTime: new Date('2000-01-01T17:00:00.000Z'),
      emergencyContactName: 'أمينة عمر',
      emergencyContactPhone: '+9647701234593',
      emergencyContactRelation: 'زوجة',
      managerId: 'emp-003', // يقرير لمحمود (Senior Developer)
    },
    {
      id: 'emp-008',
      fingerPrintId: 'FP008',
      firstName: 'ياسمين',
      lastName: 'كريم',
      phone: '+9647701234508',
      dateOfBirth: new Date('1997-12-05'),
      gender: 'FEMALE' as const,
      address: 'بغداد، الأعظمية',
      city: 'بغداد',
      country: 'العراق',
      jobId: 'job-support',
      hireDate: new Date('2023-04-01'),
      employmentType: 'FULL_TIME' as const,
      employmentStatus: 'ACTIVE' as const,
      salary: encrypt('900000', encryptionKey),
      currency: 'IQD',
      workingHours: 8,
      daysToWorkPerMonth: 26,
      leavesAllowed: 18,
      workLocation: 'OFFICE' as const,
      shiftType: 'DAY_SHIFT' as const,
      startWorkingTime: new Date('2000-01-01T09:00:00.000Z'),
      endWorkingTime: new Date('2000-01-01T17:00:00.000Z'),
      emergencyContactName: 'كريم علي',
      emergencyContactPhone: '+9647701234592',
      emergencyContactRelation: 'والد',
      managerId: 'emp-002', // تقرير لمدير HR
    },
    {
      id: 'emp-009',
      fingerPrintId: 'FP009',
      firstName: 'حسام',
      lastName: 'طارق',
      phone: '+9647701234509',
      dateOfBirth: new Date('1991-04-30'),
      gender: 'MALE' as const,
      address: 'بغداد، البياع',
      city: 'بغداد',
      country: 'العراق',
      jobId: 'job-developer',
      hireDate: new Date('2021-11-01'),
      employmentType: 'FULL_TIME' as const,
      employmentStatus: 'ACTIVE' as const,
      salary: encrypt('1400000', encryptionKey),
      currency: 'IQD',
      workingHours: 8,
      daysToWorkPerMonth: 26,
      leavesAllowed: 21,
      workLocation: 'OFFICE' as const,
      shiftType: 'DAY_SHIFT' as const,
      startWorkingTime: new Date('2000-01-01T09:00:00.000Z'),
      endWorkingTime: new Date('2000-01-01T17:00:00.000Z'),
      emergencyContactName: 'رنا حسام',
      emergencyContactPhone: '+9647701234591',
      emergencyContactRelation: 'زوجة',
      managerId: 'emp-003',
    },
    {
      id: 'emp-010',
      fingerPrintId: 'FP010',
      firstName: 'لينا',
      lastName: 'فاضل',
      phone: '+9647701234510',
      dateOfBirth: new Date('1998-06-14'),
      gender: 'FEMALE' as const,
      address: 'بغداد، الدورة',
      city: 'بغداد',
      country: 'العراق',
      jobId: 'job-sales',
      hireDate: new Date('2023-07-01'),
      employmentType: 'PART_TIME' as const,
      employmentStatus: 'ACTIVE' as const,
      salary: encrypt('700000', encryptionKey),
      currency: 'IQD',
      workingHours: 6,
      daysToWorkPerMonth: 26,
      leavesAllowed: 15,
      workLocation: 'OFFICE' as const,
      shiftType: 'DAY_SHIFT' as const,
      startWorkingTime: new Date('2000-01-01T10:00:00.000Z'),
      endWorkingTime: new Date('2000-01-01T16:00:00.000Z'),
      emergencyContactName: 'فاضل حسن',
      emergencyContactPhone: '+9647701234590',
      emergencyContactRelation: 'والد',
      managerId: 'emp-001',
    },
  ];

  // Create employees one by one
  const employees = [];
  for (const empData of employeesData) {
    const employee = await prisma.employee.upsert({
      where: { id: empData.id },
      update: empData,
      create: empData,
    });
    employees.push(employee);
  }

  console.log(`✅ Created ${employees.length} employees`);

  // 3. Create Attendance Records for Current Month (سجلات الحضور للشهر الحالي)
  console.log('⏰ Creating attendance records for current month...');

  const today = new Date();
  const attendanceYear = today.getFullYear();
  const attendanceMonth = today.getMonth();

  // Get first and last day of current month
  const monthStart = new Date(attendanceYear, attendanceMonth, 1);
  const monthEnd = new Date(attendanceYear, attendanceMonth + 1, 0); // Last day of month

  const attendanceRecords = [];

  console.log(
    `📅 Creating attendance from ${monthStart.toLocaleDateString()} to ${monthEnd.toLocaleDateString()}`,
  );

  // Loop through each day of the current month
  for (let day = 1; day <= monthEnd.getDate(); day++) {
    const date = new Date(attendanceYear, attendanceMonth, day);
    // Set to UTC midnight to avoid timezone issues
    const utcDate = new Date(
      Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
    );

    // Only create for past days and today
    if (date > today) break;

    for (const employee of employees) {
      // 90% attendance rate (10% absent randomly)
      if (Math.random() > 0.9) continue;

      // Get employee's working hours
      const empStartTime = employee.startWorkingTime
        ? new Date(employee.startWorkingTime)
        : null;
      const empEndTime = employee.endWorkingTime
        ? new Date(employee.endWorkingTime)
        : null;

      // Create times for this specific date
      const baseTimeIn = new Date(utcDate);
      const baseTimeOut = new Date(utcDate);

      if (empStartTime) {
        baseTimeIn.setUTCHours(
          empStartTime.getUTCHours(),
          empStartTime.getUTCMinutes(),
          0,
          0,
        );
      } else {
        baseTimeIn.setUTCHours(9, 0, 0, 0);
      }

      if (empEndTime) {
        baseTimeOut.setUTCHours(
          empEndTime.getUTCHours(),
          empEndTime.getUTCMinutes(),
          0,
          0,
        );
      } else {
        baseTimeOut.setUTCHours(17, 0, 0, 0);
      }

      // Add realistic variance:
      // Check-in: -30 to +60 minutes (some early, some late)
      const timeInVariance = Math.floor(Math.random() * 90) - 30;
      baseTimeIn.setMinutes(baseTimeIn.getMinutes() + timeInVariance);

      // Check-out: -15 to +90 minutes (some leave early, some stay late)
      const timeOutVariance = Math.floor(Math.random() * 105) - 15;
      baseTimeOut.setMinutes(baseTimeOut.getMinutes() + timeOutVariance);

      const status =
        employee.workLocation === 'REMOTE'
          ? Math.random() > 0.5
            ? 'REMOTE'
            : 'PRESENT'
          : 'PRESENT';

      // Add only ONE record per employee per day
      attendanceRecords.push({
        employeeId: employee.id,
        date: utcDate,
        status: status as 'PRESENT' | 'REMOTE',
        timeIn: baseTimeIn,
        timeOut: baseTimeOut,
      });
    }
  }

  // Bulk create attendance
  const createdAttendance = await prisma.employeeAttendance.createMany({
    data: attendanceRecords,
    skipDuplicates: true,
  });

  console.log(
    `✅ Created ${createdAttendance.count} attendance records for current month`,
  );

  // 4. Create Leave Requests (طلبات الإجازات)
  console.log('🏖️ Creating leave requests...');

  const leaveRequests = [
    {
      employeeId: 'emp-002',
      leaveType: 'VACATION' as const,
      reason: 'إجازة سنوية',
      startDate: new Date('2025-08-01'),
      endDate: new Date('2025-08-15'),
      status: 'APPROVED' as const,
      approvedById: superAdmin.id,
    },
    {
      employeeId: 'emp-003',
      leaveType: 'SICK' as const,
      reason: 'إجازة مرضية',
      startDate: new Date('2025-07-20'),
      endDate: new Date('2025-07-22'),
      status: 'APPROVED' as const,
      approvedById: superAdmin.id,
    },
    {
      employeeId: 'emp-004',
      leaveType: 'VACATION' as const,
      reason: 'إجازة عائلية',
      startDate: new Date('2025-09-01'),
      endDate: new Date('2025-09-07'),
      status: 'PENDING' as const,
    },
    {
      employeeId: 'emp-006',
      leaveType: 'SICK' as const,
      reason: 'فحوصات طبية',
      startDate: new Date('2025-10-15'),
      endDate: new Date('2025-10-16'),
      status: 'PENDING' as const,
    },
    {
      employeeId: 'emp-007',
      leaveType: 'VACATION' as const,
      reason: 'إجازة سنوية',
      startDate: new Date('2025-12-20'),
      endDate: new Date('2026-01-05'),
      status: 'PENDING' as const,
    },
    {
      employeeId: 'emp-008',
      leaveType: 'MATERNITY' as const,
      reason: 'إجازة أمومة',
      startDate: new Date('2025-11-01'),
      endDate: new Date('2026-01-30'),
      status: 'APPROVED' as const,
      approvedById: superAdmin.id,
    },
  ];

  const createdLeaves = await prisma.leave.createMany({
    data: leaveRequests,
    skipDuplicates: true,
  });

  console.log(`✅ Created ${createdLeaves.count} leave requests`);

  // 5. Create Salary Records (سجلات الرواتب)
  console.log('💰 Creating salary records...');

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const salaryRecords = [];

  // Create salary records for last 3 months
  for (let monthOffset = 0; monthOffset < 3; monthOffset++) {
    let targetMonth = currentMonth - monthOffset;
    let targetYear = currentYear;

    if (targetMonth <= 0) {
      targetMonth += 12;
      targetYear -= 1;
    }

    const monthStart = new Date(targetYear, targetMonth - 1, 1);
    const monthEnd = new Date(targetYear, targetMonth, 0);

    for (const employee of employees) {
      // Only create for active employees
      if (employee.employmentStatus !== 'ACTIVE') continue;

      salaryRecords.push({
        employeeId: employee.id,
        amount: employee.salary!, // Already encrypted
        currency: employee.currency!,
        currentYear: targetYear,
        currentMonth: targetMonth,
        startDate: monthStart,
        endDate: monthEnd,
        paidById: superAdmin.id,
        // Mark first 2 months as paid, current month as unpaid
        isSalaryGet: monthOffset >= 1,
      });
    }
  }

  const createdSalaries = await prisma.salary.createMany({
    data: salaryRecords,
    skipDuplicates: true,
  });

  console.log(`✅ Created ${createdSalaries.count} salary records`);

  // Summary
  console.log('');
  console.log('🎉 HR Data Seeding Completed Successfully!');
  console.log('');
  console.log('📋 Summary:');
  console.log(`💼 Jobs created: ${jobs.length}`);
  console.log(`👥 Employees created: ${employees.length}`);
  console.log(`⏰ Attendance records: ${createdAttendance.count}`);
  console.log(`🏖️ Leave requests: ${createdLeaves.count}`);
  console.log(`💰 Salary records: ${createdSalaries.count}`);
  console.log('');
  console.log('🔑 Encryption Key for Salaries: demo-encryption-key-2025');
  console.log('');
  console.log('📊 Employee Breakdown:');
  console.log('  - المدير التنفيذي: 1');
  console.log('  - مدير الموارد البشرية: 1');
  console.log('  - مطور برمجيات: 3');
  console.log('  - مصمم جرافيك: 1');
  console.log('  - محاسب: 1');
  console.log('  - موظف مبيعات: 2');
  console.log('  - الدعم الفني: 1');
  console.log('');
  console.log('✅ HR System is now ready with demo data!');
}

main()
  .catch((e) => {
    console.error('❌ Error during HR seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
