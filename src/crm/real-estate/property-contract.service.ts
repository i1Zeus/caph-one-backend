import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ContractStatus, PropertyStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePropertyContractDto, UpdatePropertyContractDto } from './dto';
import { PropertyContract } from './entities';

@Injectable()
export class PropertyContractService {
  constructor(private prisma: PrismaService) {}

  /**
   * Generate automatic contract number in format CNT-YYYY-XXX
   */
  private async generateContractNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `CNT-${year}-`;

    // Find the highest contract number for this year
    const lastContract = await this.prisma.propertyContract.findFirst({
      where: {
        contractNumber: {
          startsWith: prefix,
        },
        isDeleted: false,
      },
      orderBy: {
        contractNumber: 'desc',
      },
    });

    let sequence = 1;
    if (lastContract && lastContract.contractNumber) {
      // Extract sequence number from last contract (e.g., CNT-2025-001 -> 1)
      const match = lastContract.contractNumber.match(/-(\d+)$/);
      if (match) {
        sequence = parseInt(match[1], 10) + 1;
      }
    }

    // Format sequence with leading zeros (001, 002, etc.)
    const sequenceStr = sequence.toString().padStart(3, '0');
    return `${prefix}${sequenceStr}`;
  }

  async create(
    createPropertyContractDto: CreatePropertyContractDto,
  ): Promise<PropertyContract> {
    // Verify property exists
    const property = await this.prisma.property.findFirst({
      where: { id: createPropertyContractDto.propertyId, isDeleted: false },
    });
    if (!property) {
      throw new NotFoundException('Property not found');
    }

    // Verify lead exists
    const lead = await this.prisma.lead.findFirst({
      where: { id: createPropertyContractDto.leadId, isDeleted: false },
    });
    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    // Generate contract number if not provided
    let contractNumber = createPropertyContractDto.contractNumber;
    if (!contractNumber) {
      contractNumber = await this.generateContractNumber();
    }

    // Check if contract number already exists
    const existingContract = await this.prisma.propertyContract.findFirst({
      where: {
        contractNumber: contractNumber,
        isDeleted: false,
      },
    });
    if (existingContract) {
      throw new ConflictException('Contract number already exists');
    }

    const contract = await this.prisma.propertyContract.create({
      data: {
        ...createPropertyContractDto,
        contractNumber,
        documents: createPropertyContractDto.documents || [],
        status: createPropertyContractDto.status || ContractStatus.DRAFT,
      },
      include: {
        property: true,
        lead: true,
        signatures: {
          where: { isDeleted: false },
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    // Update property status to RESERVED
    await this.prisma.property.update({
      where: { id: createPropertyContractDto.propertyId },
      data: { status: PropertyStatus.RESERVED },
    });

    return contract;
  }

  async findAll(filters?: {
    propertyId?: number;
    leadId?: string;
    status?: ContractStatus;
    contractType?: string;
  }): Promise<PropertyContract[]> {
    const where: any = { isDeleted: false };

    if (filters) {
      if (filters.propertyId) {
        where.propertyId = filters.propertyId;
      }
      if (filters.leadId) {
        where.leadId = filters.leadId;
      }
      if (filters.status) {
        where.status = filters.status;
      }
      if (filters.contractType) {
        where.contractType = filters.contractType;
      }
    }

    const contracts = await this.prisma.propertyContract.findMany({
      where,
      include: {
        property: {
          select: {
            id: true,
            title: true,
            propertyType: true,
            price: true,
            status: true,
          },
        },
        lead: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        invoices: {
          where: { isDeleted: false },
          select: {
            id: true,
            invoiceNumber: true,
            totalAmount: true,
            paidAmount: true,
            remainingAmount: true,
            status: true,
          },
        },
        signatures: {
          where: { isDeleted: false },
          orderBy: { orderIndex: 'asc' },
        },
        attachments: {
          where: { isDeleted: false },
          include: {
            uploadedBy: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate canComplete for each contract
    return contracts.map((contract) => ({
      ...contract,
      canComplete: this.checkCanComplete(contract),
    })) as PropertyContract[];
  }

  async findOne(id: number): Promise<PropertyContract> {
    const contract = await this.prisma.propertyContract.findFirst({
      where: { id, isDeleted: false },
      include: {
        property: true,
        lead: true,
        invoices: {
          where: { isDeleted: false },
          orderBy: { invoiceDate: 'asc' },
        },
        signatures: {
          where: { isDeleted: false },
          orderBy: { orderIndex: 'asc' },
        },
        attachments: {
          where: { isDeleted: false },
          include: {
            uploadedBy: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!contract) {
      throw new NotFoundException(`Property contract with ID ${id} not found`);
    }

    // Calculate canComplete based on signatures
    const canComplete = this.checkCanComplete(contract);

    return {
      ...contract,
      canComplete,
    } as PropertyContract;
  }

  /**
   * Check if contract can be completed
   * All required signatures must be signed
   */
  private checkCanComplete(contract: any): boolean {
    // If no signatures are defined, contract can be completed
    if (!contract.signatures || contract.signatures.length === 0) {
      return true;
    }

    // Check if all required signatures are signed
    const requiredSignatures = contract.signatures.filter(
      (sig: any) => sig.isRequired,
    );
    if (requiredSignatures.length === 0) {
      return true; // No required signatures
    }

    // All required signatures must be signed
    return requiredSignatures.every((sig: any) => sig.isSigned);
  }

  async update(
    id: number,
    updatePropertyContractDto: UpdatePropertyContractDto,
  ): Promise<PropertyContract> {
    // Check if contract exists
    await this.findOne(id);

    // If contract number is being updated, check for duplicates
    if (updatePropertyContractDto.contractNumber) {
      const existingContract = await this.prisma.propertyContract.findFirst({
        where: {
          contractNumber: updatePropertyContractDto.contractNumber,
          isDeleted: false,
          id: { not: id },
        },
      });
      if (existingContract) {
        throw new ConflictException('Contract number already exists');
      }
    }

    const contract = await this.prisma.propertyContract.update({
      where: { id },
      data: updatePropertyContractDto,
      include: {
        property: true,
        lead: true,
        invoices: {
          where: { isDeleted: false },
        },
        signatures: {
          where: { isDeleted: false },
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    return contract;
  }

  async remove(id: number): Promise<PropertyContract> {
    // Check if contract exists
    const contract = await this.findOne(id);

    // Check if contract has invoices
    const invoiceCount = await this.prisma.salesInvoice.count({
      where: { propertyContractId: id },
    });
    if (invoiceCount > 0) {
      throw new ConflictException('Cannot delete a contract that has invoices');
    }

    // Soft delete
    const deletedContract = await this.prisma.propertyContract.update({
      where: { id },
      data: { isDeleted: true },
    });

    return deletedContract;
  }

  // Activate contract
  async activateContract(id: number): Promise<PropertyContract> {
    const contract = await this.findOne(id);

    if (contract.status !== ContractStatus.DRAFT) {
      throw new BadRequestException('Only draft contracts can be activated');
    }

    const updatedContract = await this.prisma.propertyContract.update({
      where: { id },
      data: { status: ContractStatus.ACTIVE },
      include: {
        property: true,
        lead: true,
        signatures: {
          where: { isDeleted: false },
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    // Update property status based on contract type
    const newPropertyStatus =
      contract.contractType === 'SALE' || contract.contractType === 'PURCHASE'
        ? PropertyStatus.SOLD
        : PropertyStatus.RENTED;

    await this.prisma.property.update({
      where: { id: contract.propertyId },
      data: { status: newPropertyStatus },
    });

    // Calculate canComplete
    const canComplete = this.checkCanComplete(updatedContract);

    return {
      ...updatedContract,
      canComplete,
    } as PropertyContract;
  }

  // Complete contract
  async completeContract(id: number): Promise<PropertyContract> {
    const contract = await this.findOne(id);

    if (contract.status !== ContractStatus.ACTIVE) {
      throw new BadRequestException('Only active contracts can be completed');
    }

    // Check if all required signatures are present
    if (!contract.canComplete) {
      throw new BadRequestException(
        'Cannot complete contract: All required signatures must be collected first',
      );
    }

    const updatedContract = await this.prisma.propertyContract.update({
      where: { id },
      data: {
        status: ContractStatus.COMPLETED,
      },
      include: {
        property: true,
        lead: true,
        signatures: {
          where: { isDeleted: false },
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    // Calculate canComplete
    const canComplete = this.checkCanComplete(updatedContract);

    return {
      ...updatedContract,
      canComplete,
    } as PropertyContract;
  }

  // Cancel contract
  async cancelContract(id: number): Promise<PropertyContract> {
    const contract = await this.findOne(id);

    if (contract.status === ContractStatus.COMPLETED) {
      throw new BadRequestException('Cannot cancel a completed contract');
    }

    const updatedContract = await this.prisma.propertyContract.update({
      where: { id },
      data: { status: ContractStatus.CANCELLED },
      include: {
        property: true,
        lead: true,
        signatures: {
          where: { isDeleted: false },
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    // Return property to AVAILABLE status
    await this.prisma.property.update({
      where: { id: contract.propertyId },
      data: { status: PropertyStatus.AVAILABLE },
    });

    // Calculate canComplete
    const canComplete = this.checkCanComplete(updatedContract);

    return {
      ...updatedContract,
      canComplete,
    } as PropertyContract;
  }

  // Get contract statistics
  async getStatistics() {
    const [
      totalContracts,
      activeContracts,
      completedContracts,
      draftContracts,
      totalValue,
      byType,
      byStatus,
    ] = await Promise.all([
      this.prisma.propertyContract.count({ where: { isDeleted: false } }),
      this.prisma.propertyContract.count({
        where: { isDeleted: false, status: ContractStatus.ACTIVE },
      }),
      this.prisma.propertyContract.count({
        where: { isDeleted: false, status: ContractStatus.COMPLETED },
      }),
      this.prisma.propertyContract.count({
        where: { isDeleted: false, status: ContractStatus.DRAFT },
      }),
      this.prisma.propertyContract.aggregate({
        where: {
          isDeleted: false,
          status: { in: [ContractStatus.ACTIVE, ContractStatus.COMPLETED] },
        },
        _sum: { contractAmount: true },
      }),
      this.prisma.propertyContract.groupBy({
        by: ['contractType'],
        where: { isDeleted: false },
        _count: true,
      }),
      this.prisma.propertyContract.groupBy({
        by: ['status'],
        where: { isDeleted: false },
        _count: true,
      }),
    ]);

    return {
      totalContracts,
      activeContracts,
      completedContracts,
      draftContracts,
      totalValue: totalValue._sum.contractAmount || 0,
      byType,
      byStatus,
    };
  }
}
