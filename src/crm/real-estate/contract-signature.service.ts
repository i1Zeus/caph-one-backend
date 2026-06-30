import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateContractSignatureDto, UpdateContractSignatureDto } from './dto';
import { ContractSignature } from './entities';

@Injectable()
export class ContractSignatureService {
  constructor(private prisma: PrismaService) {}

  async create(
    createSignatureDto: CreateContractSignatureDto,
  ): Promise<ContractSignature> {
    // Verify contract exists
    const contract = await this.prisma.propertyContract.findFirst({
      where: { id: createSignatureDto.contractId, isDeleted: false },
    });
    if (!contract) {
      throw new NotFoundException('Contract not found');
    }

    // Set order index if not provided
    if (!createSignatureDto.orderIndex) {
      const lastSignature = await this.prisma.contractSignature.findFirst({
        where: { contractId: createSignatureDto.contractId, isDeleted: false },
        orderBy: { orderIndex: 'desc' },
      });
      createSignatureDto.orderIndex = lastSignature
        ? lastSignature.orderIndex + 1
        : 1;
    }

    const { contractId, ...signatureData } = createSignatureDto;

    const signature = await this.prisma.contractSignature.create({
      data: {
        ...signatureData,
        orderIndex: signatureData.orderIndex!, // Already set above
        contract: {
          connect: { id: contractId },
        },
        isRequired: createSignatureDto.isRequired ?? true,
        isSigned: true, // Always true when creating
      },
    });

    return signature;
  }

  async findAll(contractId?: number): Promise<ContractSignature[]> {
    const where: any = { isDeleted: false };
    if (contractId) {
      where.contractId = contractId;
    }

    return this.prisma.contractSignature.findMany({
      where,
      orderBy: { orderIndex: 'asc' },
    });
  }

  async findOne(id: number): Promise<ContractSignature> {
    const signature = await this.prisma.contractSignature.findFirst({
      where: { id, isDeleted: false },
      include: {
        contract: {
          select: {
            id: true,
            contractNumber: true,
            contractType: true,
          },
        },
      },
    });

    if (!signature) {
      throw new NotFoundException('Signature not found');
    }

    return signature;
  }

  async update(
    id: number,
    updateSignatureDto: UpdateContractSignatureDto,
  ): Promise<ContractSignature> {
    // Check if signature exists
    const existingSignature = await this.findOne(id);

    const signature = await this.prisma.contractSignature.update({
      where: { id },
      data: updateSignatureDto,
    });

    return signature;
  }

  async remove(id: number): Promise<void> {
    const signature = await this.findOne(id);

    await this.prisma.contractSignature.update({
      where: { id },
      data: { isDeleted: true },
    });
  }

  // Get signatures for a specific contract
  async getContractSignatures(
    contractId: number,
  ): Promise<ContractSignature[]> {
    return this.findAll(contractId);
  }

  // Check if contract can be completed (all required signatures present)
  async canCompleteContract(contractId: number): Promise<boolean> {
    const requiredSignatures = await this.prisma.contractSignature.findMany({
      where: {
        contractId,
        isRequired: true,
        isDeleted: false,
      },
    });

    if (requiredSignatures.length === 0) {
      return true; // No required signatures
    }

    // All required signatures must be signed
    return requiredSignatures.every((sig) => sig.isSigned);
  }
}
