import { TenantPrismaService } from 'src/prisma/tenant-prisma.service';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreatePosTerminalDto,
  SessionQueryDto,
  UpdatePosTerminalDto,
} from './dto';
import { PosSessionsService } from './pos-sessions.service';

@Injectable()
export class PosTerminalsService {
  constructor(
    private prisma: PrismaService, private tenantPrisma: TenantPrismaService,
    private posSessionsService: PosSessionsService,
  ) {}

  /**
   * Generate slug from POS name
   * - If Arabic: Generate sequential slug like "pos-1", "pos-2", etc.
   * - If not Arabic: Convert to lowercase, replace spaces with hyphens, limit to 10 chars
   */
  private async generateSlug(
    name: string,
    excludeId?: number,
  ): Promise<string> {
    // Check if name contains Arabic characters (Unicode range \u0600-\u06FF)
    const arabicRegex = /[\u0600-\u06FF]/;
    const hasArabic = arabicRegex.test(name);

    if (hasArabic) {
      // For Arabic names, use sequential numbering: pos-1, pos-2, etc.
      const existingCount = await this.tenantPrisma.client.pOS.count({
        where: {
          isDeleted: false,
          ...(excludeId ? { id: { not: excludeId } } : {}),
        },
      });

      let slug = `pos-${existingCount + 1}`;
      let counter = 1;

      // Ensure uniqueness
      while (true) {
        const existing = await this.tenantPrisma.client.pOS.findFirst({
          where: {
            slug,
            isDeleted: false,
            ...(excludeId ? { id: { not: excludeId } } : {}),
          },
        });

        if (!existing) {
          break;
        }

        slug = `pos-${existingCount + 1 + counter}`;
        counter++;
      }

      return slug;
    } else {
      // For non-Arabic names, convert to slug format
      let slug = name
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/[^a-z0-9-]/g, '') // Remove special characters, keep only alphanumeric and hyphens
        .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
        .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens

      // Limit to 10 characters
      if (slug.length > 10) {
        slug = slug.substring(0, 10);
        // Remove trailing hyphen if truncated
        slug = slug.replace(/-$/, '');
      }

      // Ensure slug is not empty
      if (!slug) {
        slug = 'pos-terminal';
      }

      // Ensure uniqueness
      let uniqueSlug = slug;
      let counter = 1;
      while (true) {
        const existing = await this.tenantPrisma.client.pOS.findFirst({
          where: {
            slug: uniqueSlug,
            isDeleted: false,
            ...(excludeId ? { id: { not: excludeId } } : {}),
          },
        });

        if (!existing) {
          break;
        }

        // Append counter to make it unique, but keep within 10 char limit
        const suffix = `-${counter}`;
        const maxBaseLength = 10 - suffix.length;
        uniqueSlug = slug.substring(0, maxBaseLength) + suffix;
        counter++;
      }

      return uniqueSlug;
    }
  }

  /**
   * Create a new POS terminal
   */
  async createTerminal(createDto: CreatePosTerminalDto) {
    // Check for duplicate name
    const existing = await this.tenantPrisma.client.pOS.findFirst({
      where: {
        name: createDto.name,
        isDeleted: false,
      },
    });

    if (existing) {
      throw new BadRequestException(
        'POS terminal with this name already exists',
      );
    }

    // Generate slug automatically from name
    const slug = await this.generateSlug(createDto.name);

    return this.tenantPrisma.client.pOS.create({
      data: {
        name: createDto.name,
        slug,
        location: createDto.location,
        printFormat: createDto.printFormat || 'RECEIPT',
        isActive: createDto.isActive !== undefined ? createDto.isActive : true,
      },
    });
  }

  /**
   * Update a POS terminal
   */
  async updateTerminal(id: number, updateDto: UpdatePosTerminalDto) {
    const pos = await this.tenantPrisma.client.pOS.findUnique({
      where: { id },
    });

    if (!pos || pos.isDeleted) {
      throw new NotFoundException('POS terminal not found');
    }

    // Check for duplicate name if updating name
    if (updateDto.name) {
      const existing = await this.tenantPrisma.client.pOS.findFirst({
        where: {
          name: updateDto.name,
          id: { not: id },
          isDeleted: false,
        },
      });

      if (existing) {
        throw new BadRequestException(
          'POS terminal with this name already exists',
        );
      }

      // Regenerate slug when name changes
      const newSlug = await this.generateSlug(updateDto.name, id);
      return this.tenantPrisma.client.pOS.update({
        where: { id },
        data: {
          ...updateDto,
          slug: newSlug,
        },
      });
    }

    return this.tenantPrisma.client.pOS.update({
      where: { id },
      data: updateDto,
    });
  }

  /**
   * Get a single POS terminal
   */
  async getTerminal(id: number) {
    const pos = await this.tenantPrisma.client.pOS.findUnique({
      where: { id },
      include: {
        sessions: {
          where: { isDeleted: false },
          orderBy: { openedAt: 'desc' },
          take: 5,
          include: {
            employee: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    if (!pos || pos.isDeleted) {
      throw new NotFoundException('POS terminal not found');
    }

    return pos;
  }

  /**
   * Get all POS terminals
   */
  async getAllTerminals() {
    return this.tenantPrisma.client.pOS.findMany({
      where: { isDeleted: false },
      orderBy: { createdAt: 'desc' },
      include: {
        sessions: {
          where: {
            status: 'OPEN',
            isDeleted: false,
          },
          include: {
            employee: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Delete a POS terminal (soft delete)
   */
  async deleteTerminal(id: number) {
    const pos = await this.tenantPrisma.client.pOS.findUnique({
      where: { id },
      include: {
        sessions: {
          where: {
            status: 'OPEN',
            isDeleted: false,
          },
        },
      },
    });

    if (!pos || pos.isDeleted) {
      throw new NotFoundException('POS terminal not found');
    }

    if (pos.sessions.length > 0) {
      throw new BadRequestException(
        'Cannot delete POS terminal with open sessions',
      );
    }

    await this.tenantPrisma.client.pOS.update({
      where: { id },
      data: { isDeleted: true },
    });

    return { message: 'POS terminal deleted successfully' };
  }

  /**
   * Get sessions for a specific terminal with pagination and filters
   */
  async getTerminalSessions(id: number, filters: SessionQueryDto) {
    // Verify terminal exists
    const terminal = await this.tenantPrisma.client.pOS.findUnique({
      where: { id },
      select: { id: true, name: true, isDeleted: true },
    });

    if (!terminal || terminal.isDeleted) {
      throw new NotFoundException('POS terminal not found');
    }

    // Use sessions service with posId filter
    const result = await this.posSessionsService.getSessionHistory({
      ...filters,
      posId: id,
    });

    return {
      terminal: {
        id: terminal.id,
        name: terminal.name,
      },
      ...result,
    };
  }
}
