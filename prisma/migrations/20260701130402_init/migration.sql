-- CreateEnum
CREATE TYPE "public"."ClientType" AS ENUM ('CUSTOMER', 'SUPPLIER');

-- CreateEnum
CREATE TYPE "public"."AccountType" AS ENUM ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE');

-- CreateEnum
CREATE TYPE "public"."InvoiceStatus" AS ENUM ('UNPAID', 'PARTIAL', 'PAID', 'CANCELLED', 'OVERDUE');

-- CreateEnum
CREATE TYPE "public"."PaymentType" AS ENUM ('CASH', 'CREDIT', 'CARD', 'BANK_TRANSFER');

-- CreateEnum
CREATE TYPE "public"."TransactionType" AS ENUM ('PAYMENT', 'RECEIPT', 'INVOICE', 'GENERAL');

-- CreateEnum
CREATE TYPE "public"."PartnerType" AS ENUM ('CUSTOMER', 'SUPPLIER', 'BOTH');

-- CreateEnum
CREATE TYPE "public"."TaskStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELED');

-- CreateEnum
CREATE TYPE "public"."TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "public"."WorkspaceRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER', 'VIEWER');

-- CreateEnum
CREATE TYPE "public"."ActivityType" AS ENUM ('CALL', 'MEETING', 'EMAIL', 'WHATSAPP', 'SMS', 'VISIT', 'TASK', 'NOTE', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL_SENT', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST', 'ON_HOLD');

-- CreateEnum
CREATE TYPE "public"."LeaveType" AS ENUM ('VACATION', 'SICK', 'MATERNITY', 'LEAVE', 'HOLIDAY', 'ABSENT', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."LeaveStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "public"."AttendanceStatus" AS ENUM ('PRESENT', 'REMOTE');

-- CreateEnum
CREATE TYPE "public"."DocumentType" AS ENUM ('CONTRACT', 'ID_COPY', 'PASSPORT', 'CERTIFICATE', 'RESUME', 'MEDICAL_REPORT', 'INSURANCE', 'WORK_PERMIT', 'VISA', 'DRIVING_LICENSE', 'BANK_DETAILS', 'TAX_DOCUMENTS', 'POLICE_CLEARANCE', 'REFERENCE_LETTER', 'PERFORMANCE_REVIEW', 'WARNING_LETTER', 'APPRECIATION', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."ActionType" AS ENUM ('VERBAL_WARNING', 'WRITTEN_WARNING', 'FINAL_WARNING', 'SALARY_DEDUCTION', 'SUSPENSION', 'DEMOTION', 'TERMINATION', 'NOTE');

-- CreateEnum
CREATE TYPE "public"."Severity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "public"."ActionCategory" AS ENUM ('BEHAVIORAL', 'ATTENDANCE', 'PERFORMANCE', 'POLICY_VIOLATION', 'SAFETY', 'FINANCIAL', 'MISCONDUCT', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."ActionStatus" AS ENUM ('ACTIVE', 'RESOLVED', 'APPEALED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."RequestType" AS ENUM ('SALARY_ADVANCE', 'CERTIFICATE', 'VACATION_BALANCE', 'SHIFT_CHANGE', 'OVERTIME_APPROVAL', 'EXPENSE_CLAIM', 'TRANSFER_REQUEST', 'RESIGNATION', 'COMPLAINT', 'SUGGESTION', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."RequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."RequestPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "public"."ExitType" AS ENUM ('RESIGNATION', 'TERMINATION', 'RETIREMENT', 'CONTRACT_END', 'MUTUAL_AGREEMENT', 'DEATH', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."BenefitType" AS ENUM ('HEALTH_INSURANCE', 'LIFE_INSURANCE', 'DENTAL_INSURANCE', 'VISION_INSURANCE', 'PENSION', 'BONUS', 'ALLOWANCE', 'TRANSPORTATION', 'HOUSING', 'MEAL_VOUCHER', 'PHONE_ALLOWANCE', 'EDUCATION', 'GYM_MEMBERSHIP', 'STOCK_OPTIONS', 'COMMISSION', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."BenefitFrequency" AS ENUM ('MONTHLY', 'QUARTERLY', 'SEMI_ANNUAL', 'ANNUAL', 'ONE_TIME');

-- CreateEnum
CREATE TYPE "public"."Gender" AS ENUM ('MALE', 'FEMALE');

-- CreateEnum
CREATE TYPE "public"."WorkLocation" AS ENUM ('OFFICE', 'REMOTE', 'HYBRID');

-- CreateEnum
CREATE TYPE "public"."EmploymentType" AS ENUM ('FULL_TIME', 'PART_TIME', 'CONTRACT', 'TEMPORARY', 'INTERN', 'CONSULTANT');

-- CreateEnum
CREATE TYPE "public"."EmploymentStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'TERMINATED', 'ON_LEAVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "public"."ShiftType" AS ENUM ('DAY_SHIFT', 'NIGHT_SHIFT', 'EVENING_SHIFT', 'ROTATING', 'FLEXIBLE');

-- CreateEnum
CREATE TYPE "public"."InvoiceType" AS ENUM ('SALES', 'PURCHASE');

-- CreateEnum
CREATE TYPE "public"."DiscountType" AS ENUM ('FIXED', 'PERCENTAGE');

-- CreateEnum
CREATE TYPE "public"."InvoicePaymentType" AS ENUM ('SALES_INVOICE', 'PURCHASE_INVOICE');

-- CreateEnum
CREATE TYPE "public"."PrintFormat" AS ENUM ('RECEIPT', 'A5', 'A4');

-- CreateEnum
CREATE TYPE "public"."SessionStatus" AS ENUM ('OPEN', 'CLOSED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "public"."WarehouseTransactionType" AS ENUM ('PURCHASE', 'SALE', 'DISPENSE', 'TRANSFER', 'ADJUST', 'DAMAGE', 'ADD', 'RETURN');

-- CreateEnum
CREATE TYPE "public"."UnitType" AS ENUM ('MAIN', 'SMALLER', 'BIGGER');

-- CreateEnum
CREATE TYPE "public"."ProductTrackingType" AS ENUM ('NONE', 'LOT', 'SERIAL');

-- CreateEnum
CREATE TYPE "public"."ProductType" AS ENUM ('PRODUCT', 'SERVICE');

-- CreateEnum
CREATE TYPE "public"."InvoiceTemplateType" AS ENUM ('INVOICE', 'RECEIPT');

-- CreateEnum
CREATE TYPE "public"."SaleType" AS ENUM ('QUOTATION', 'DIRECT');

-- CreateEnum
CREATE TYPE "public"."SaleStatus" AS ENUM ('DRAFT', 'SENT', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'PARTIAL');

-- CreateEnum
CREATE TYPE "public"."SalePaymentStatus" AS ENUM ('PENDING', 'PAID', 'PARTIAL_PAYMENT', 'REFUNDED');

-- CreateEnum
CREATE TYPE "public"."SaleDeliveryStatus" AS ENUM ('DRAFT', 'READY', 'DONE', 'CANCELLED');

-- CreateTable
CREATE TABLE "public"."Workspace" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "slug" TEXT NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."accounting_settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "defaultCustomerAccountId" INTEGER,
    "defaultSupplierAccountId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounting_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."WorkspaceUser" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "public"."WorkspaceRole" NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkspaceUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "img" TEXT,
    "type" "public"."PartnerType",
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Project" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "order" INTEGER DEFAULT 0,
    "workspaceId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "projectStageId" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Task" (
    "id" TEXT NOT NULL,
    "parentId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "isDone" BOOLEAN DEFAULT false,
    "order" INTEGER DEFAULT 0,
    "status" "public"."TaskStatus" NOT NULL DEFAULT 'PENDING',
    "priority" "public"."TaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "projectId" TEXT NOT NULL,
    "taskStageId" TEXT,
    "createdById" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TimeStamp" (
    "id" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "taskId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimeStamp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Comment" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."File" (
    "id" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mimetype" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "projectId" TEXT,
    "taskId" TEXT,
    "commentId" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "File_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ProjectStage" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER DEFAULT 0,
    "description" TEXT,
    "color" TEXT,
    "workspaceId" TEXT NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectStage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TaskStage" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER,
    "color" TEXT,
    "projectId" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskStage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ActionHistory" (
    "id" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "details" JSONB,
    "link" TEXT,
    "performedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActionHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."LoginEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ipAddress" TEXT,
    "device" TEXT,
    "location" TEXT,
    "country" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zip" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoginEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."clients" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "type" "public"."ClientType" NOT NULL DEFAULT 'SUPPLIER',
    "accountId" INTEGER,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."currencies" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "rate" DECIMAL(15,4) NOT NULL DEFAULT 1.0,
    "isMain" BOOLEAN NOT NULL DEFAULT false,
    "decimalPlaces" INTEGER NOT NULL DEFAULT 2,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "currencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."accounts" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "type" "public"."AccountType" NOT NULL,
    "code" TEXT,
    "isCash" BOOLEAN NOT NULL DEFAULT false,
    "currencyId" INTEGER,
    "parentId" INTEGER,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."transactions" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT,
    "transactionType" "public"."TransactionType" NOT NULL DEFAULT 'GENERAL',
    "clientId" INTEGER,
    "salesInvoiceId" INTEGER,
    "purchaseInvoiceId" INTEGER,
    "purchaseReturnInvoiceId" INTEGER,
    "salesReturnInvoiceId" INTEGER,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."transaction_lines" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT,
    "debit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "credit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "accountId" INTEGER NOT NULL,
    "transactionId" INTEGER NOT NULL,
    "clientId" INTEGER,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transaction_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Lead" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER DEFAULT 0,
    "email" TEXT,
    "phone" TEXT,
    "description" TEXT,
    "companyName" TEXT,
    "industry" TEXT,
    "website" TEXT,
    "source" TEXT,
    "salesManId" TEXT,
    "employeeCount" INTEGER,
    "revenue" DOUBLE PRECISION,
    "status" "public"."LeadStatus" NOT NULL DEFAULT 'NEW',
    "isCompany" BOOLEAN NOT NULL DEFAULT false,
    "workspaceId" TEXT NOT NULL,
    "stageId" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."LeadActivity" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "activityType" "public"."ActivityType" NOT NULL,
    "meetingLink" TEXT,
    "activityDate" TIMESTAMP(3) NOT NULL,
    "assignedToId" TEXT,
    "description" TEXT,
    "isDone" BOOLEAN DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeadActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."LeadStage" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER DEFAULT 0,
    "color" TEXT,
    "workspaceId" TEXT NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeadStage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Department" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "parentId" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Employee" (
    "id" TEXT NOT NULL,
    "fingerPrintId" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT,
    "phone" TEXT,
    "alternatePhone" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "gender" "public"."Gender",
    "workingHours" INTEGER DEFAULT 8,
    "daysToWorkPerMonth" INTEGER DEFAULT 26,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT,
    "zipCode" TEXT,
    "startWorkingTime" TIMESTAMP(3),
    "endWorkingTime" TIMESTAMP(3),
    "leavesAllowed" INTEGER DEFAULT 21,
    "jobId" TEXT,
    "departmentId" TEXT,
    "hireDate" TIMESTAMP(3),
    "terminationDate" TIMESTAMP(3),
    "employmentType" "public"."EmploymentType" NOT NULL DEFAULT 'FULL_TIME',
    "employmentStatus" "public"."EmploymentStatus" NOT NULL DEFAULT 'ACTIVE',
    "salary" TEXT,
    "currency" TEXT DEFAULT 'IQD',
    "workLocation" "public"."WorkLocation" DEFAULT 'OFFICE',
    "shiftType" "public"."ShiftType" DEFAULT 'DAY_SHIFT',
    "emergencyContactName" TEXT,
    "emergencyContactPhone" TEXT,
    "emergencyContactRelation" TEXT,
    "managerId" TEXT,
    "userId" TEXT,
    "posPin" TEXT,
    "hasPOSAccess" BOOLEAN NOT NULL DEFAULT false,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EmployeeAttendance" (
    "id" TEXT NOT NULL,
    "sn" INTEGER,
    "employeeId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "status" "public"."AttendanceStatus" NOT NULL DEFAULT 'PRESENT',
    "timeIn" TIMESTAMP(3),
    "timeOut" TIMESTAMP(3),
    "notes" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeAttendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Leave" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "leaveType" "public"."LeaveType" NOT NULL,
    "reason" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "public"."LeaveStatus" NOT NULL DEFAULT 'PENDING',
    "approvedById" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Leave_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Salary" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "amount" TEXT,
    "isSalaryGet" BOOLEAN DEFAULT false,
    "paidById" TEXT,
    "currency" TEXT DEFAULT 'IQD',
    "currentYear" INTEGER,
    "currentMonth" INTEGER,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "isDeleted" BOOLEAN DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Salary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Job" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EmployeeDocument" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "type" "public"."DocumentType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "fileUrl" TEXT NOT NULL,
    "fileKey" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER,
    "mimetype" TEXT,
    "issueDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "uploadedById" TEXT NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DisciplinaryAction" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "type" "public"."ActionType" NOT NULL,
    "severity" "public"."Severity" NOT NULL,
    "category" "public"."ActionCategory" NOT NULL DEFAULT 'BEHAVIORAL',
    "title" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "description" TEXT,
    "actionDate" TIMESTAMP(3) NOT NULL,
    "penalty" TEXT,
    "deductionAmount" DECIMAL(15,2),
    "deductionDays" INTEGER,
    "suspensionDays" INTEGER,
    "evidenceUrl" TEXT,
    "witnessNames" TEXT,
    "status" "public"."ActionStatus" NOT NULL DEFAULT 'ACTIVE',
    "resolvedDate" TIMESTAMP(3),
    "resolvedNotes" TEXT,
    "issuedById" TEXT NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DisciplinaryAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EmployeeRequest" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "type" "public"."RequestType" NOT NULL,
    "priority" "public"."RequestPriority" NOT NULL DEFAULT 'MEDIUM',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "attachments" TEXT[],
    "requestedAmount" DECIMAL(15,2),
    "status" "public"."RequestStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "reviewNotes" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EmployeeExit" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "exitType" "public"."ExitType" NOT NULL,
    "exitDate" TIMESTAMP(3) NOT NULL,
    "lastWorkingDay" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "detailedReason" TEXT,
    "exitInterviewDone" BOOLEAN NOT NULL DEFAULT false,
    "exitInterviewDate" TIMESTAMP(3),
    "feedback" TEXT,
    "rehireEligible" BOOLEAN NOT NULL DEFAULT true,
    "assetReturned" BOOLEAN NOT NULL DEFAULT false,
    "documentsSigned" BOOLEAN NOT NULL DEFAULT false,
    "accessRevoked" BOOLEAN NOT NULL DEFAULT false,
    "exitInterviewCompleted" BOOLEAN NOT NULL DEFAULT false,
    "handoverCompleted" BOOLEAN NOT NULL DEFAULT false,
    "finalSettlement" DECIMAL(15,2),
    "settlementPaid" BOOLEAN NOT NULL DEFAULT false,
    "settlementDate" TIMESTAMP(3),
    "settlementNotes" TEXT,
    "processedBy" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeExit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EmployeeBenefit" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "type" "public"."BenefitType" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "provider" TEXT,
    "policyNumber" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "coverage" TEXT,
    "premium" DECIMAL(15,2),
    "amount" DECIMAL(15,2),
    "frequency" "public"."BenefitFrequency",
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeBenefit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."sales_invoices" (
    "id" SERIAL NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "clientId" INTEGER,
    "totalAmount" DECIMAL(15,2) NOT NULL,
    "paidAmount" DECIMAL(15,2) NOT NULL DEFAULT 0.0,
    "remainingAmount" DECIMAL(15,2) NOT NULL,
    "subtotalBeforeDiscount" DECIMAL(15,2),
    "discount" DECIMAL(15,2) DEFAULT 0,
    "discountType" "public"."DiscountType" DEFAULT 'FIXED',
    "currencyId" INTEGER,
    "status" "public"."InvoiceStatus" NOT NULL DEFAULT 'UNPAID',
    "paymentType" "public"."PaymentType" NOT NULL DEFAULT 'CREDIT',
    "isReturn" BOOLEAN NOT NULL DEFAULT false,
    "originalInvoiceId" INTEGER,
    "description" TEXT,
    "notes" TEXT,
    "dueDate" TIMESTAMP(3),
    "userId" TEXT,
    "isPOS" BOOLEAN NOT NULL DEFAULT false,
    "posSessionId" INTEGER,
    "cashierId" TEXT,
    "printFormat" "public"."PrintFormat" NOT NULL DEFAULT 'RECEIPT',
    "invoiceConfigId" INTEGER,
    "invoiceDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "sales_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."purchase_invoices" (
    "id" SERIAL NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "supplierId" INTEGER NOT NULL,
    "totalAmount" DECIMAL(15,2) NOT NULL,
    "paidAmount" DECIMAL(15,2) NOT NULL DEFAULT 0.0,
    "remainingAmount" DECIMAL(15,2) NOT NULL,
    "subtotalBeforeDiscount" DECIMAL(15,2),
    "discount" DECIMAL(15,2) DEFAULT 0,
    "discountType" "public"."DiscountType" DEFAULT 'FIXED',
    "currencyId" INTEGER,
    "status" "public"."InvoiceStatus" NOT NULL DEFAULT 'UNPAID',
    "paymentType" "public"."PaymentType" NOT NULL DEFAULT 'CREDIT',
    "isReturn" BOOLEAN NOT NULL DEFAULT false,
    "originalInvoiceId" INTEGER,
    "description" TEXT,
    "notes" TEXT,
    "dueDate" TIMESTAMP(3),
    "userId" TEXT,
    "invoiceConfigId" INTEGER,
    "invoiceDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "purchase_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."invoice_accounting_configs" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Default Config',
    "invoiceType" "public"."InvoiceType" NOT NULL,
    "paymentType" "public"."PaymentType" NOT NULL,
    "debitAccountId" INTEGER NOT NULL,
    "creditAccountId" INTEGER NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoice_accounting_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."invoice_payments" (
    "id" SERIAL NOT NULL,
    "invoiceType" "public"."InvoicePaymentType" NOT NULL,
    "salesInvoiceId" INTEGER,
    "purchaseInvoiceId" INTEGER,
    "amount" DECIMAL(15,2) NOT NULL,
    "paymentType" "public"."PaymentType" NOT NULL,
    "accountId" INTEGER NOT NULL,
    "transactionId" INTEGER,
    "notes" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoice_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."pos_terminals" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "location" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "printFormat" "public"."PrintFormat" NOT NULL DEFAULT 'RECEIPT',
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "lockedAt" TIMESTAMP(3),
    "lockedBy" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pos_terminals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."pos_sessions" (
    "id" SERIAL NOT NULL,
    "sessionNumber" TEXT,
    "posId" INTEGER NOT NULL,
    "employeeId" TEXT NOT NULL,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "status" "public"."SessionStatus" NOT NULL DEFAULT 'OPEN',
    "openingBalance" DECIMAL(15,2) NOT NULL,
    "closingBalance" DECIMAL(15,2),
    "expectedCash" DECIMAL(15,2),
    "cashDifference" DECIMAL(15,2),
    "totalSales" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "totalTransactions" INTEGER NOT NULL DEFAULT 0,
    "openingNotes" TEXT,
    "closingNotes" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pos_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Role" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserRole" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Permission" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "resource" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RolePermission" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."sales_invoice_items" (
    "id" SERIAL NOT NULL,
    "invoiceId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "unitId" INTEGER,
    "quantity" DECIMAL(15,3) NOT NULL,
    "unitPrice" DECIMAL(15,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sales_invoice_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."purchase_invoice_items" (
    "id" SERIAL NOT NULL,
    "invoiceId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "unitId" INTEGER,
    "quantity" DECIMAL(15,3) NOT NULL,
    "unitPrice" DECIMAL(15,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_invoice_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."purchase_return_invoices" (
    "id" SERIAL NOT NULL,
    "returnInvoiceNumber" TEXT NOT NULL,
    "purchaseInvoiceId" INTEGER NOT NULL,
    "departmentId" TEXT,
    "totalAmount" DECIMAL(15,2) NOT NULL,
    "netAmount" DECIMAL(15,2) NOT NULL,
    "currencyId" INTEGER,
    "status" "public"."InvoiceStatus" NOT NULL DEFAULT 'PAID',
    "notes" TEXT,
    "returnReason" TEXT,
    "referenceInvoiceNumber" TEXT,
    "userId" TEXT,
    "returnDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "purchase_return_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."purchase_return_invoice_items" (
    "id" SERIAL NOT NULL,
    "returnInvoiceId" INTEGER NOT NULL,
    "originalPurchaseInvoiceItemId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "unitId" INTEGER,
    "quantity" DECIMAL(15,3) NOT NULL,
    "unitPrice" DECIMAL(15,2) NOT NULL,
    "totalPrice" DECIMAL(15,2) NOT NULL,
    "trackingId" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_return_invoice_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."sales_return_invoices" (
    "id" SERIAL NOT NULL,
    "returnInvoiceNumber" TEXT NOT NULL,
    "salesInvoiceId" INTEGER NOT NULL,
    "departmentId" TEXT,
    "totalAmount" DECIMAL(15,2) NOT NULL,
    "netAmount" DECIMAL(15,2) NOT NULL,
    "currencyId" INTEGER,
    "status" "public"."InvoiceStatus" NOT NULL DEFAULT 'PAID',
    "notes" TEXT,
    "returnReason" TEXT,
    "referenceInvoiceNumber" TEXT,
    "userId" TEXT,
    "returnDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "sales_return_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."sales_return_invoice_items" (
    "id" SERIAL NOT NULL,
    "returnInvoiceId" INTEGER NOT NULL,
    "originalSalesInvoiceItemId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "unitId" INTEGER,
    "quantity" DECIMAL(15,3) NOT NULL,
    "unitPrice" DECIMAL(15,2) NOT NULL,
    "totalPrice" DECIMAL(15,2) NOT NULL,
    "trackingId" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sales_return_invoice_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."unit_categories" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "unit_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."units" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "symbol" TEXT,
    "description" TEXT,
    "categoryId" INTEGER NOT NULL,
    "type" "public"."UnitType" NOT NULL DEFAULT 'MAIN',
    "ratio" DECIMAL(15,6) NOT NULL DEFAULT 1.0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."products" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "barcode" TEXT NOT NULL,
    "description" TEXT,
    "type" "public"."ProductType" NOT NULL DEFAULT 'PRODUCT',
    "salesUnitId" INTEGER,
    "purchaseUnitId" INTEGER,
    "purchasePrice" DECIMAL(15,2),
    "salePrice" DECIMAL(15,2),
    "minStockAlert" DECIMAL(15,3),
    "imageUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."product_categories" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."product_category_relations" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_category_relations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."warehouses" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "parentId" INTEGER,
    "location" TEXT,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "warehouses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."stocks" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "warehouseId" INTEGER NOT NULL,
    "reorderLevel" DECIMAL(15,3),
    "quantityReserved" DECIMAL(15,3) NOT NULL DEFAULT 0,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."trackings" (
    "id" SERIAL NOT NULL,
    "stockId" INTEGER NOT NULL,
    "trackingType" "public"."ProductTrackingType" NOT NULL,
    "lotNumber" TEXT,
    "serialNumber" TEXT,
    "batchName" TEXT,
    "storageUnitId" INTEGER,
    "quantity" DECIMAL(15,3) NOT NULL,
    "productionDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "supplierName" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trackings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."warehouse_transactions" (
    "id" SERIAL NOT NULL,
    "type" "public"."WarehouseTransactionType" NOT NULL,
    "fromWarehouseId" INTEGER,
    "toWarehouseId" INTEGER,
    "totalPrice" DECIMAL(15,2),
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    "partyName" TEXT,
    "referenceNumber" TEXT,
    "userId" TEXT,
    "salesInvoiceId" INTEGER,
    "purchaseInvoiceId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "warehouse_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."warehouse_transaction_items" (
    "id" SERIAL NOT NULL,
    "transactionId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "quantity" DECIMAL(15,3) NOT NULL,
    "unitPrice" DECIMAL(15,2),
    "totalPrice" DECIMAL(15,2),
    "trackingId" INTEGER,
    "unitId" INTEGER,
    "itemNote" TEXT,
    "originalSalesInvoiceItemId" INTEGER,
    "originalPurchaseInvoiceItemId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "warehouse_transaction_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."invoice_templates" (
    "id" SERIAL NOT NULL,
    "type" "public"."InvoiceTemplateType" NOT NULL,
    "headerCompanyName" TEXT NOT NULL,
    "headerAddress" TEXT,
    "headerLogoUrl" TEXT,
    "footerText" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoice_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."sales" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "saleType" "public"."SaleType" NOT NULL DEFAULT 'QUOTATION',
    "status" "public"."SaleStatus" NOT NULL DEFAULT 'DRAFT',
    "clientId" INTEGER,
    "warehouseId" INTEGER NOT NULL,
    "dateOrder" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateConfirmed" TIMESTAMP(3),
    "dateCompleted" TIMESTAMP(3),
    "validityDate" TIMESTAMP(3),
    "paymentMethod" TEXT,
    "paymentStatus" "public"."SalePaymentStatus" NOT NULL DEFAULT 'PENDING',
    "amountUntaxed" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "taxRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "amountTax" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "amountTotal" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "discount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "discountType" "public"."DiscountType" NOT NULL DEFAULT 'FIXED',
    "notes" TEXT,
    "userId" TEXT,
    "warehouseTransactionId" INTEGER,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."sale_items" (
    "id" SERIAL NOT NULL,
    "saleId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "quantity" DECIMAL(15,3) NOT NULL,
    "quantityDelivered" DECIMAL(15,3) NOT NULL DEFAULT 0,
    "unitPrice" DECIMAL(15,2) NOT NULL,
    "discount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "discountType" "public"."DiscountType" NOT NULL DEFAULT 'FIXED',
    "subtotal" DECIMAL(15,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sale_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."sale_deliveries" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "saleId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "public"."SaleDeliveryStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "warehouseTransactionId" INTEGER,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sale_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."_ProjectContributors" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ProjectContributors_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "public"."_TaskAssignees" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_TaskAssignees_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "public"."_CommentTaggedUsers" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_CommentTaggedUsers_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Workspace_slug_key" ON "public"."Workspace"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceUser_workspaceId_userId_key" ON "public"."WorkspaceUser"("workspaceId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "public"."User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectStage_workspaceId_order_key" ON "public"."ProjectStage"("workspaceId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "TaskStage_projectId_order_key" ON "public"."TaskStage"("projectId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "currencies_name_key" ON "public"."currencies"("name");

-- CreateIndex
CREATE UNIQUE INDEX "currencies_code_key" ON "public"."currencies"("code");

-- CreateIndex
CREATE UNIQUE INDEX "LeadStage_workspaceId_order_key" ON "public"."LeadStage"("workspaceId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_userId_key" ON "public"."Employee"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_fingerPrintId_key" ON "public"."Employee"("fingerPrintId");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeAttendance_sn_key" ON "public"."EmployeeAttendance"("sn");

-- CreateIndex
CREATE INDEX "EmployeeDocument_employeeId_idx" ON "public"."EmployeeDocument"("employeeId");

-- CreateIndex
CREATE INDEX "EmployeeDocument_type_idx" ON "public"."EmployeeDocument"("type");

-- CreateIndex
CREATE INDEX "EmployeeDocument_expiryDate_idx" ON "public"."EmployeeDocument"("expiryDate");

-- CreateIndex
CREATE INDEX "DisciplinaryAction_employeeId_idx" ON "public"."DisciplinaryAction"("employeeId");

-- CreateIndex
CREATE INDEX "DisciplinaryAction_type_idx" ON "public"."DisciplinaryAction"("type");

-- CreateIndex
CREATE INDEX "DisciplinaryAction_severity_idx" ON "public"."DisciplinaryAction"("severity");

-- CreateIndex
CREATE INDEX "DisciplinaryAction_status_idx" ON "public"."DisciplinaryAction"("status");

-- CreateIndex
CREATE INDEX "DisciplinaryAction_actionDate_idx" ON "public"."DisciplinaryAction"("actionDate");

-- CreateIndex
CREATE INDEX "EmployeeRequest_employeeId_idx" ON "public"."EmployeeRequest"("employeeId");

-- CreateIndex
CREATE INDEX "EmployeeRequest_type_idx" ON "public"."EmployeeRequest"("type");

-- CreateIndex
CREATE INDEX "EmployeeRequest_status_idx" ON "public"."EmployeeRequest"("status");

-- CreateIndex
CREATE INDEX "EmployeeRequest_priority_idx" ON "public"."EmployeeRequest"("priority");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeExit_employeeId_key" ON "public"."EmployeeExit"("employeeId");

-- CreateIndex
CREATE INDEX "EmployeeExit_employeeId_idx" ON "public"."EmployeeExit"("employeeId");

-- CreateIndex
CREATE INDEX "EmployeeExit_exitType_idx" ON "public"."EmployeeExit"("exitType");

-- CreateIndex
CREATE INDEX "EmployeeExit_exitDate_idx" ON "public"."EmployeeExit"("exitDate");

-- CreateIndex
CREATE INDEX "EmployeeBenefit_employeeId_idx" ON "public"."EmployeeBenefit"("employeeId");

-- CreateIndex
CREATE INDEX "EmployeeBenefit_type_idx" ON "public"."EmployeeBenefit"("type");

-- CreateIndex
CREATE INDEX "EmployeeBenefit_isActive_idx" ON "public"."EmployeeBenefit"("isActive");

-- CreateIndex
CREATE INDEX "EmployeeBenefit_endDate_idx" ON "public"."EmployeeBenefit"("endDate");

-- CreateIndex
CREATE UNIQUE INDEX "sales_invoices_invoiceNumber_key" ON "public"."sales_invoices"("invoiceNumber");

-- CreateIndex
CREATE INDEX "sales_invoices_isPOS_posSessionId_idx" ON "public"."sales_invoices"("isPOS", "posSessionId");

-- CreateIndex
CREATE INDEX "sales_invoices_cashierId_idx" ON "public"."sales_invoices"("cashierId");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_invoices_invoiceNumber_key" ON "public"."purchase_invoices"("invoiceNumber");

-- CreateIndex
CREATE INDEX "invoice_payments_salesInvoiceId_idx" ON "public"."invoice_payments"("salesInvoiceId");

-- CreateIndex
CREATE INDEX "invoice_payments_purchaseInvoiceId_idx" ON "public"."invoice_payments"("purchaseInvoiceId");

-- CreateIndex
CREATE INDEX "invoice_payments_paymentType_idx" ON "public"."invoice_payments"("paymentType");

-- CreateIndex
CREATE INDEX "invoice_payments_transactionId_idx" ON "public"."invoice_payments"("transactionId");

-- CreateIndex
CREATE UNIQUE INDEX "pos_terminals_slug_key" ON "public"."pos_terminals"("slug");

-- CreateIndex
CREATE INDEX "pos_sessions_posId_status_idx" ON "public"."pos_sessions"("posId", "status");

-- CreateIndex
CREATE INDEX "pos_sessions_employeeId_idx" ON "public"."pos_sessions"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "public"."Role"("name");

-- CreateIndex
CREATE UNIQUE INDEX "UserRole_userId_roleId_key" ON "public"."UserRole"("userId", "roleId");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_name_key" ON "public"."Permission"("name");

-- CreateIndex
CREATE UNIQUE INDEX "RolePermission_roleId_permissionId_key" ON "public"."RolePermission"("roleId", "permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_return_invoices_returnInvoiceNumber_key" ON "public"."purchase_return_invoices"("returnInvoiceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "sales_return_invoices_returnInvoiceNumber_key" ON "public"."sales_return_invoices"("returnInvoiceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "unit_categories_name_key" ON "public"."unit_categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "units_categoryId_name_key" ON "public"."units"("categoryId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "products_barcode_key" ON "public"."products"("barcode");

-- CreateIndex
CREATE UNIQUE INDEX "product_category_relations_productId_categoryId_key" ON "public"."product_category_relations"("productId", "categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "stocks_productId_warehouseId_key" ON "public"."stocks"("productId", "warehouseId");

-- CreateIndex
CREATE UNIQUE INDEX "trackings_stockId_lotNumber_serialNumber_batchName_key" ON "public"."trackings"("stockId", "lotNumber", "serialNumber", "batchName");

-- CreateIndex
CREATE UNIQUE INDEX "invoice_templates_type_key" ON "public"."invoice_templates"("type");

-- CreateIndex
CREATE UNIQUE INDEX "sales_name_key" ON "public"."sales"("name");

-- CreateIndex
CREATE INDEX "sales_saleType_idx" ON "public"."sales"("saleType");

-- CreateIndex
CREATE INDEX "sales_status_idx" ON "public"."sales"("status");

-- CreateIndex
CREATE INDEX "sales_clientId_idx" ON "public"."sales"("clientId");

-- CreateIndex
CREATE INDEX "sales_dateOrder_idx" ON "public"."sales"("dateOrder");

-- CreateIndex
CREATE INDEX "sale_items_saleId_idx" ON "public"."sale_items"("saleId");

-- CreateIndex
CREATE INDEX "sale_items_productId_idx" ON "public"."sale_items"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "sale_deliveries_name_key" ON "public"."sale_deliveries"("name");

-- CreateIndex
CREATE INDEX "sale_deliveries_saleId_idx" ON "public"."sale_deliveries"("saleId");

-- CreateIndex
CREATE INDEX "sale_deliveries_status_idx" ON "public"."sale_deliveries"("status");

-- CreateIndex
CREATE INDEX "_ProjectContributors_B_index" ON "public"."_ProjectContributors"("B");

-- CreateIndex
CREATE INDEX "_TaskAssignees_B_index" ON "public"."_TaskAssignees"("B");

-- CreateIndex
CREATE INDEX "_CommentTaggedUsers_B_index" ON "public"."_CommentTaggedUsers"("B");
