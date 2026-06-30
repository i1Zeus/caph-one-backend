import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PosAuthService {
  constructor(private prisma: PrismaService) {}

  /**
   * Authenticate employee with PIN and employeeId
   */
  async authenticateWithPin(employeeId: string, pin: string) {
    const employee = await this.prisma.employee.findFirst({
      where: {
        id: employeeId,
        posPin: pin,
        hasPOSAccess: true,
        isDeleted: false,
        employmentStatus: 'ACTIVE',
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        hasPOSAccess: true,
        userId: true,
      },
    });

    if (!employee) {
      throw new UnauthorizedException(
        'Invalid employee ID, PIN, or no POS access',
      );
    }

    return employee;
  }

  /**
   * Lock a POS terminal
   */
  async lockPOS(posId: number, employeeId: string) {
    const pos = await this.prisma.pOS.findUnique({
      where: { id: posId },
    });

    if (!pos) {
      throw new NotFoundException('POS terminal not found');
    }

    if (pos.isDeleted) {
      throw new BadRequestException('POS terminal is deleted');
    }

    await this.prisma.pOS.update({
      where: { id: posId },
      data: {
        isLocked: true,
        lockedAt: new Date(),
        lockedBy: employeeId,
      },
    });

    return { message: 'POS locked successfully' };
  }

  /**
   * Unlock POS with PIN and employeeId
   */
  async unlockPOS(posId: number, employeeId: string, pin: string) {
    const pos = await this.prisma.pOS.findUnique({
      where: { id: posId },
    });

    if (!pos) {
      throw new NotFoundException('POS terminal not found');
    }

    if (!pos.isLocked) {
      throw new BadRequestException('POS is not locked');
    }

    // Verify PIN and employeeId
    const employee = await this.authenticateWithPin(employeeId, pin);

    // Unlock POS
    await this.prisma.pOS.update({
      where: { id: posId },
      data: {
        isLocked: false,
        lockedAt: null,
        lockedBy: null,
      },
    });

    return {
      message: 'POS unlocked successfully',
      employee,
    };
  }

  /**
   * Check if POS is locked
   */
  async isPOSLocked(posId: number) {
    const pos = await this.prisma.pOS.findUnique({
      where: { id: posId },
      select: {
        isLocked: true,
        lockedAt: true,
        lockedBy: true,
      },
    });

    if (!pos) {
      throw new NotFoundException('POS terminal not found');
    }

    return {
      isLocked: pos.isLocked,
      lockedAt: pos.lockedAt,
      lockedBy: pos.lockedBy,
    };
  }
}
