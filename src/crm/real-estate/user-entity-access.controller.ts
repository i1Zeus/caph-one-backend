import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Auth } from '../../auth';
import { CreateUserEntityAccessDto, UpdateUserEntityAccessDto } from './dto';
import { UserEntityAccessService } from './user-entity-access.service';

@Controller('crm/user-entity-access')
@Auth() // Require authentication
export class UserEntityAccessController {
  constructor(
    private readonly userEntityAccessService: UserEntityAccessService,
  ) {}

  @Post()
  @Auth('create', 'userEntityAccess') // Require userEntityAccess:create or admin:all
  create(@Body() createDto: CreateUserEntityAccessDto) {
    return this.userEntityAccessService.create(createDto);
  }

  @Get()
  @Auth('read', 'userEntityAccess') // Require userEntityAccess:read or admin:all
  findAll(
    @Query('userId') userId?: string,
    @Query('entityType') entityType?: string,
  ) {
    const filters: any = {};
    if (userId) filters.userId = userId;
    if (entityType) filters.entityType = entityType;

    return this.userEntityAccessService.findAll(filters);
  }

  @Get('user/:userId')
  @Auth('read', 'userEntityAccess')
  findByUserId(@Param('userId') userId: string) {
    return this.userEntityAccessService.findByUserId(userId);
  }

  @Get('entity-type/:entityType')
  @Auth('read', 'userEntityAccess')
  findByEntityType(@Param('entityType') entityType: string) {
    return this.userEntityAccessService.findByEntityType(entityType as any);
  }

  @Get(':id')
  @Auth('read', 'userEntityAccess')
  findOne(@Param('id') id: string) {
    return this.userEntityAccessService.findOne(id);
  }

  @Patch('user/:userId')
  @Auth('update', 'userEntityAccess')
  update(
    @Param('userId') userId: string,
    @Body() updateDto: UpdateUserEntityAccessDto,
  ) {
    return this.userEntityAccessService.update(userId, updateDto);
  }

  @Delete(':id')
  @Auth('delete', 'userEntityAccess')
  remove(@Param('id') id: string) {
    return this.userEntityAccessService.remove(id);
  }
}
