export class ContractSignature {
  id: number;
  contractId: number;
  signerName: string;
  signerRole: string;
  signerEmail?: string;
  signerPhone?: string;
  signatureUrl: string;
  signedAt: Date;
  ipAddress?: string;
  orderIndex: number;
  isRequired: boolean;
  isSigned: boolean;
  notes?: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}
