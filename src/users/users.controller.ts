// src/users/users.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from 'src/auth/roles.decorator';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * ✅ Roles asignables para el frontend
   * - Nunca expone SYSTEM_OWNER
   */
  @Roles('SYSTEM_OWNER', 'SUPER_ADMIN', 'ADMIN')
  @Get('roles/assignable')
  getAssignableRoles(@Req() req: any) {
    return this.usersService.getAssignableRoles(req.user);
  }

  /**
   * Crear usuarios:
   * - SYSTEM_OWNER: puede crear cualquier rol (incluyendo SYSTEM_OWNER)
   * - SUPER_ADMIN: crea roles operativos (NO SYSTEM_OWNER)
   * - ADMIN: solo crea usuarios para su sucursal y NO puede crear ADMIN/SUPER_ADMIN/SYSTEM_OWNER
   */
  @Roles('SYSTEM_OWNER', 'SUPER_ADMIN', 'ADMIN')
  @Post()
  create(@Req() req: any, @Body() dto: CreateUserDto): Promise<User> {
    return this.usersService.create(dto, req.user);
  }

  /**
   * Listar usuarios:
   * - SYSTEM_OWNER / SUPER_ADMIN: todos
   * - ADMIN/GERENCIA: solo su sucursal
   */
  @Roles('SYSTEM_OWNER', 'SUPER_ADMIN', 'ADMIN', 'GERENCIA')
  @Get()
  findAll(@Req() req: any): Promise<User[]> {
    return this.usersService.findAll(req.user);
  }

  /**
   * Ver usuario:
   * - SYSTEM_OWNER / SUPER_ADMIN: cualquiera
   * - ADMIN/GERENCIA: solo si es de su sucursal
   */
  @Roles('SYSTEM_OWNER', 'SUPER_ADMIN', 'ADMIN', 'GERENCIA')
  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
  ): Promise<User> {
    return this.usersService.findOne(id, req.user);
  }

  /**
   * Actualizar usuario:
   * - SYSTEM_OWNER / SUPER_ADMIN / ADMIN (con reglas en service)
   */
  @Roles('SYSTEM_OWNER', 'SUPER_ADMIN', 'ADMIN')
  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
    @Req() req: any,
  ): Promise<User> {
    return this.usersService.update(id, dto, req.user);
  }

  /**
   * Desactivar usuario:
   * - SYSTEM_OWNER / SUPER_ADMIN / ADMIN (con reglas en service)
   */
  @Roles('SYSTEM_OWNER', 'SUPER_ADMIN', 'ADMIN')
  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    await this.usersService.remove(id, req.user);
    return { message: `Usuario ${id} desactivado correctamente` };
  }
}