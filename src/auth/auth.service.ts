import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from 'src/prisma/prisma.service';
import { TenantPrismaService } from 'src/prisma/tenant-prisma.service';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import { UsersService } from 'src/users/users.service';
import { DynamicPermissionsService } from './services/dynamic-permissions.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private permissionsService: DynamicPermissionsService,
    private prisma: PrismaService,
    private tenantPrisma: TenantPrismaService,
  ) {}

  async validateUser(username: string, pass: string): Promise<any> {
    const user = await this.usersService.findByEmail(username);
    console.log('user', user);
    if (user && (await bcrypt.compare(pass, user.password))) {
      console.log('user', user);
      const { ...result } = user;
      return result;
    }
    console.log('user', null);
    return null;
  }

  async login(user: any) {
    // Validate organization status for non-superadmins
    if (!user.isSuperAdmin) {
      if (!user.organizationId) {
        throw new ForbiddenException(
          'You are not assigned to any organization.',
        );
      }
      const org = await this.tenantPrisma.client.organization.findUnique({
        where: { id: user.organizationId },
      });
      if (!org || org.isDeleted || !org.isActive) {
        throw new ForbiddenException('Your organization has been deactivated.');
      }
    }

    // Get user roles and permissions
    const userRoles = await this.permissionsService.getUserRoles(user.id);
    const userPermissions = await this.permissionsService.getUserPermissions(
      user.id,
    );

    const payload = {
      email: user.email,
      sub: user.id,
      name: user.name,
      phone: user.phone,
      tenantId: user.organizationId,
      isSuperAdmin: user.isSuperAdmin,
      roles: userRoles.map((ur) => ({
        id: ur.role.id,
        name: ur.role.name,
        description: ur.role.description,
      })),
      permissions: userPermissions,
    };

    console.log('user login payload:', payload);
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        isSuperAdmin: user.isSuperAdmin,
        tenantId: user.organizationId,
        roles: payload.roles,
        permissions: userPermissions,
      },
    };
  }

  async signup(createUserDto: CreateUserDto & { invitationToken?: string }) {
    if (!createUserDto.invitationToken) {
      throw new BadRequestException(
        'A valid invitation token is required to sign up.',
      );
    }

    // Validate invitation token
    const invitation =
      await this.tenantPrisma.client.invitationToken.findUnique({
        where: { token: createUserDto.invitationToken },
        include: { organization: true },
      });

    if (!invitation) {
      throw new BadRequestException('Invalid invitation token.');
    }
    if (invitation.isUsed) {
      throw new BadRequestException('Invitation token has already been used.');
    }
    if (invitation.expiresAt < new Date()) {
      throw new BadRequestException('Invitation token has expired.');
    }
    if (
      invitation.email.toLowerCase().trim() !==
      createUserDto.email.toLowerCase().trim()
    ) {
      throw new BadRequestException('Invitation email does not match.');
    }
    if (
      !invitation.organization.isActive ||
      invitation.organization.isDeleted
    ) {
      throw new ForbiddenException(
        'The organization for this invitation is deactivated.',
      );
    }

    // Create user scoped to the organization and assign roles
    const user = await this.usersService.create({
      ...createUserDto,
      roleIds: invitation.roleIds,
    });

    // Scopes user to organization
    await this.tenantPrisma.client.user.update({
      where: { id: user.id },
      data: {
        organizationId: invitation.organizationId,
      },
    });

    // Mark invitation as used
    await this.tenantPrisma.client.invitationToken.update({
      where: { id: invitation.id },
      data: {
        isUsed: true,
        usedAt: new Date(),
        usedByUserId: user.id,
      },
    });

    return user;
  }
}
