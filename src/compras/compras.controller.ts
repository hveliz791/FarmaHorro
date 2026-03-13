import {
  Body,
  Controller,
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
import { ComprasService } from './compras.service';
import { CreateCompraDto } from './dto/create-compra.dto';
import { UpdateCompraDto } from './dto/update-compra.dto';

@UseGuards(AuthGuard('jwt'))
@Controller('compras')
export class ComprasController {
  constructor(private readonly comprasService: ComprasService) {}

  /**
   * Crear una compra (entrada de inventario)
   * SUPER_ADMIN → puede registrar en cualquier sucursal (indicando sucursalId en el DTO)
   * ADMIN / COMPRAS → solo en su sucursal (se ignora cualquier sucursalId del DTO)
   */
  @Roles('SUPER_ADMIN', 'ADMIN', 'COMPRAS', 'SYSTEM_OWNER')
  @Post()
  create(@Req() req: any, @Body() dto: CreateCompraDto) {
    return this.comprasService.create(dto, req.user);
  }

  /**
   * Listar compras
   * SUPER_ADMIN → ve todas
   * ADMIN / GERENCIA / COMPRAS → solo su sucursal
   */
  @Roles('SUPER_ADMIN', 'ADMIN', 'GERENCIA', 'COMPRAS', 'SYSTEM_OWNER')
  @Get()
  findAll(@Req() req: any) {
    // 👈 AQUÍ ES DONDE ANTES TENÍAS EL PROBLEMA
    return this.comprasService.findAll(req.user);
  }

  /**
   * Ver compra por ID
   * SUPER_ADMIN → puede ver cualquier sucursal
   * ADMIN / GERENCIA / COMPRAS → solo compras de su sucursal
   */
  @Roles('SUPER_ADMIN', 'ADMIN', 'GERENCIA', 'COMPRAS', 'SYSTEM_OWNER')
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.comprasService.findOne(id, req.user);
  }

  /**
   * Actualizar compra (solo campos simples como fecha)
   * Por seguridad lo dejo SOLO para SUPER_ADMIN
   */
  @Roles('SUPER_ADMIN', 'SYSTEM_OWNER')
  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCompraDto,
  ) {
    return this.comprasService.update(id, dto);
  }

  /**
   * Anular compra
   * SUPER_ADMIN → puede anular cualquier compra
   * ADMIN / COMPRAS → solo de su sucursal
   * (La validación de sucursal se hace en el service)
   */
  @Roles('SUPER_ADMIN', 'ADMIN', 'COMPRAS', 'SYSTEM_OWNER')
  @Put(':id/anular')
  anular(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.comprasService.anular(id, req.user);
  }
}
