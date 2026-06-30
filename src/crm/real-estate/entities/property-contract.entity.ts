import { PropertyContract as PrismaPropertyContract } from '@prisma/client';

export class PropertyContract implements PrismaPropertyContract {
  id: number;
  contractNumber: string | null;
  propertyId: number;
  leadId: string;
  requestId: number | null;
  contractType: any;
  contractAmount: any;
  startDate: Date;
  endDate: Date | null;
  status: any;
  documents: string[];
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
  firstPartyName: string | null;
  firstPartyAddress: string | null;
  firstPartyIdNumber: string | null;
  firstPartyPhone: string | null;
  secondPartyName: string | null;
  secondPartyAddress: string | null;
  secondPartyIdNumber: string | null;
  secondPartyPhone: string | null;
  propertyTypeDetails: string | null;
  propertyArea: any;
  propertyDistrict: string | null;
  propertySequence: string | null;
  downpayment: any;
  remainingAmount: any;
  firstPartyPenalty: any;
  secondPartyPenalty: any;
  dischargeFeesResponsibility: string | null;
  allFeesResponsibility: string | null;
  additionalClauses: string | null;

  contractAmountInWriting: string | null;
  rentDuration: string | null;
  rentPaymentTerms: string | null;
  rentRefusalTerms: string | null;
  securityDeposit: any;
  rentBreachPenalty: any;
  rentFeesResponsibility: string | null;
  chamberOfCommerceStamp: boolean;
  agreementDate: Date | null;

  // Computed fields (not in schema)
  canComplete?: boolean;
}
