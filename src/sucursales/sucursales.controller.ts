import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from 'src/auth/roles.decorator';
import { CreateSucursalDto } from './dto/create-sucursal.dto';
import { UpdateSucursalDto } from './dto/update-sucursal.dto';
import { Sucursal } from './entities/sucursal.entity';
import { SucursalesService } from './sucursales.service';

@UseGuards(AuthGuard('jwt'))
@Controller('sucursales')
export class SucursalesController {
  constructor(private readonly sucursalesService: SucursalesService) {}

  /**
   * Crear sucursal
   * SOLO SYSTEM_OWNER (usuario oculto tuyo)
   */
  @Roles('SYSTEM_OWNER')
  @Post()
  create(@Body() dto: CreateSucursalDto): Promise<Sucursal> {
    return this.sucursalesService.create(dto);
  }

  /**
   * Listar sucursales
   * SYSTEM_OWNER, SUPER_ADMIN, ADMIN, GERENCIA
   */
  @Roles('SYSTEM_OWNER', 'SUPER_ADMIN', 'ADMIN', 'GERENCIA')
  @Get()
  findAll(): Promise<Sucursal[]> {
    return this.sucursalesService.findAll();
  }

  /**
   * Ver una sucursal
   */
  @Roles('SYSTEM_OWNER', 'SUPER_ADMIN', 'ADMIN', 'GERENCIA')
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<Sucursal> {
    return this.sucursalesService.findOne(id);
  }

  /**
   * Actualizar sucursal
   * SOLO SYSTEM_OWNER
   */
  @Roles('SYSTEM_OWNER')
  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSucursalDto,
  ): Promise<Sucursal> {
    return this.sucursalesService.update(id, dto);
  }

  /**
   * Desactivar sucursal
   * SOLO SYSTEM_OWNER
   */
  @Roles('SYSTEM_OWNER')
  @Delete(':id')
  async remove(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ message: string }> {
    await this.sucursalesService.remove(id);
    return { message: `Sucursal ${id} desactivada correctamente` };
  }
}