import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InvoiceTemplateType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateInvoiceTemplateDto, UpdateInvoiceTemplateDto } from './dto';

@Injectable()
export class InvoiceTemplatesService {
  constructor(private prisma: PrismaService) {}

  async create(createInvoiceTemplateDto: CreateInvoiceTemplateDto) {
    // Check if template with this type already exists
    const existing = await this.prisma.invoiceTemplate.findUnique({
      where: { type: createInvoiceTemplateDto.type },
    });

    if (existing) {
      if (!existing.isDeleted) {
        // Update existing template instead of creating new one (upsert behavior)
        return this.update(existing.id, createInvoiceTemplateDto);
      } else {
        // If exists but deleted, restore it
        return this.prisma.invoiceTemplate.update({
          where: { id: existing.id },
          data: {
            ...createInvoiceTemplateDto,
            isDeleted: false,
          },
        });
      }
    }

    // Create new template
    return this.prisma.invoiceTemplate.create({
      data: createInvoiceTemplateDto,
    });
  }

  async findAll() {
    return this.prisma.invoiceTemplate.findMany({
      where: { isDeleted: false },
      orderBy: { type: 'asc' },
    });
  }

  async findByType(type: InvoiceTemplateType) {
    const template = await this.prisma.invoiceTemplate.findUnique({
      where: { type },
    });

    if (!template || template.isDeleted) {
      return null;
    }

    return template;
  }

  async findOne(id: number) {
    const template = await this.prisma.invoiceTemplate.findUnique({
      where: { id },
    });

    if (!template || template.isDeleted) {
      throw new NotFoundException(`Invoice template with ID ${id} not found`);
    }

    return template;
  }

  async update(id: number, updateInvoiceTemplateDto: UpdateInvoiceTemplateDto) {
    // Check if template exists
    const existing = await this.findOne(id);

    // If type is being changed, check if new type already exists
    if (
      updateInvoiceTemplateDto.type &&
      updateInvoiceTemplateDto.type !== existing.type
    ) {
      const typeExists = await this.prisma.invoiceTemplate.findUnique({
        where: { type: updateInvoiceTemplateDto.type },
      });

      if (typeExists && typeExists.id !== id && !typeExists.isDeleted) {
        throw new BadRequestException(
          `Template with type ${updateInvoiceTemplateDto.type} already exists`,
        );
      }
    }

    return this.prisma.invoiceTemplate.update({
      where: { id },
      data: updateInvoiceTemplateDto,
    });
  }

  async remove(id: number) {
    // Soft delete
    await this.findOne(id); // Will throw if not found

    return this.prisma.invoiceTemplate.update({
      where: { id },
      data: { isDeleted: true },
    });
  }
}
