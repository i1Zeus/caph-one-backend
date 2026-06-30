export interface SalaryCalculationResult {
  employeeId: string;
  employeeName: string;
  baseSalary: number;
  workingHoursRequired: number;
  workingHoursActual: number;
  salaryPerHour: number;
  calculatedAmount: number;
  latePenalty: number;
  overtimeBonus: number;
  finalAmount: number;
  attendanceDays: number;
  presentDays: number;
  absentDays: number;
  lateHours: number;
  overtimeHours: number;
  currency: string;
  year: number;
  month: number;
}

export interface SalarySlipGenerationResult {
  successful: SalaryCalculationResult[];
  failed: { employeeId: string; employeeName: string; reason: string }[];
  totalEmployees: number;
  successCount: number;
  failureCount: number;
}
