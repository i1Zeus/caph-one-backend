import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';
import { InviteUserDto } from './dto/invite-user.dto';

@Injectable()
export class AdminInvitationsService {
  constructor(private prisma: PrismaService) {}

  async invite(orgId: string, dto: InviteUserDto) {
    // 1. Verify organization exists and is active
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
    });
    if (!org || org.isDeleted || !org.isActive) {
      throw new NotFoundException('Organization not found or inactive.');
    }

    // 2. Verify email is not already registered
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });
    if (existingUser && !existingUser.isDeleted) {
      throw new BadRequestException('A user with this email already exists.');
    }

    // 3. Create a unique invitation token
    const token = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Valid for 7 days

    const invitation = await this.prisma.invitationToken.create({
      data: {
        token,
        email: dto.email.toLowerCase().trim(),
        organizationId: orgId,
        roleIds: dto.roleIds,
        expiresAt,
      },
      include: {
        organization: true,
      },
    });

    // Clean up roles array mapping
    const roles = await this.prisma.role.findMany({
      where: { id: { in: dto.roleIds } },
      select: { name: true },
    });

    return {
      message: 'Invitation token generated successfully.',
      invitation: {
        id: invitation.id,
        email: invitation.email,
        token: invitation.token,
        organizationName: invitation.organization.name,
        expiresAt: invitation.expiresAt,
        roles: roles.map((r) => r.name),
        signupUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/signup?token=${token}`,
      },
    };
  }

  async findAll() {
    return this.prisma.invitationToken.findMany({
      where: {
        isUsed: false,
        expiresAt: { gt: new Date() },
      },
      include: {
        organization: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async revoke(id: string) {
    const invite = await this.prisma.invitationToken.findUnique({
      where: { id },
    });
    if (!invite) {
      throw new NotFoundException('Invitation not found.');
    }

    // Deleting invitation acts as revocation
    return this.prisma.invitationToken.delete({
      where: { id },
    });
  }
}
