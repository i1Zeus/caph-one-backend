import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import { UsersService } from 'src/users/users.service';
import { DynamicPermissionsService } from './services/dynamic-permissions.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private permissionsService: DynamicPermissionsService,
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
        roles: payload.roles,
        permissions: userPermissions,
      },
    };
  }

  async signup(createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }
}
