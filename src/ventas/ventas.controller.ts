import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Req,
  UseGuards
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/roles.decorator';
import { CreateVentaDto } from './dto/create-venta.dto';
import { UpdateVentaDto } from './dto/update-venta.dto';
import { VentasService } from './ventas.service';

@UseGuards(AuthGuard('jwt')) // 👈 todas las rutas de ventas requieren JWT
@Controller('ventas')
export class VentasController {
  constructor(private readonly ventasService: VentasService) {}

  @Roles('SUPER_ADMIN', 'SYSTEM_OWNER')
@Get('dashboard-global')
dashboardGlobal(@Req() req: any, @Query('fecha') fecha: string, @Query('sucursalId') sucursalId?: string) {
  const sid = sucursalId ? Number(sucursalId) : undefined;
  return this.ventasService.dashboardGlobal(req.user, fecha, sid);
}



  // (Opcional) Si querés endpoints sueltos para probar:
  // GET /ventas/reporte/total-diario-por-fecha?fecha=2026-01-14&sucursalId=2
  @Roles('SUPER_ADMIN', 'SYSTEM_OWNER')
  @Get('reporte/total-diario-por-fecha')
  totalDiarioPorFecha(
    @Req() req: any,
    @Query('fecha') fecha: string,
    @Query('sucursalId') sucursalId?: string,
  ) {
    const sid = sucursalId ? Number(sucursalId) : undefined;
    return this.ventasService.totalDiarioPorFecha(req.user, fecha, sid);
  }

  // GET /ventas/reporte/total-mensual-por-fecha?fecha=2026-01-14&sucursalId=2
  @Roles('SUPER_ADMIN', 'SYSTEM_OWNER')
  @Get('reporte/total-mensual-por-fecha')
  totalMensualPorFecha(
    @Req() req: any,
    @Query('fecha') fecha: string,
    @Query('sucursalId') sucursalId?: string,
  ) {
    const sid = sucursalId ? Number(sucursalId) : undefined;
    return this.ventasService.totalMensualPorFecha(req.user, fecha, sid);
  }

  /**
   * Crear venta desde el POS
   * SUPER_ADMIN / ADMIN / VENTAS / SYSTEM_OWNER pueden crear ventas
   */
  @Roles('SUPER_ADMIN', 'ADMIN', 'VENTAS', 'SYSTEM_OWNER')
  @Post()
  create(@Req() req: any, @Body() dto: CreateVentaDto) {
    // 👇 La sucursal y el usuario vienen DEL TOKEN, no del frontend
    const sucursalId = req.user.sucursalId;
    const usuarioId = req.user.userId;

    return this.ventasService.create(dto, sucursalId, usuarioId);
  }

  /**
   * Listado de ventas.
   * (Por ahora sin filtro por sucursal; se puede mejorar luego.)
   */
  @Roles('SUPER_ADMIN', 'ADMIN', 'VENTAS', 'GERENCIA', 'SYSTEM_OWNER')
  @Get()
  findAll() {
    return this.ventasService.findAll();
  }

  /**
   * Ver venta por ID
   */
  @Roles('SUPER_ADMIN', 'ADMIN', 'VENTAS', 'GERENCIA', 'SYSTEM_OWNER')
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.ventasService.findOne(id);
  }

  /**
   * Actualizar datos simples de la venta (ej. formaPago)
   * Dejo esto solo para SUPER_ADMIN de momento.
   */
  @Roles('SUPER_ADMIN', 'SYSTEM_OWNER')
  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateVentaDto,
  ) {
    return this.ventasService.update(id, dto);
  }

  /**
   * Anular venta:
   * - Usa el user del token para validar sucursal/rol.
   * - Llama al service que revierte inventario + kardex.
   */
  @Roles('SUPER_ADMIN', 'ADMIN', 'VENTAS', 'SYSTEM_OWNER')
  @Put(':id/anular')
  anular(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.ventasService.anular(id, req.user);
  }

//* endpoint de reportes

 @Roles('SUPER_ADMIN', 'ADMIN', 'GERENCIA', 'SYSTEM_OWNER')
  @Get('resumen/diario')
  resumenDiario(
    @Req() req: any,
    @Query('sucursalId') sucursalId?: number,
  ) {
    return this.ventasService.totalDiario(req.user, sucursalId);
  }

  // =========================
  // 📊 RESUMEN MENSUAL
  // =========================
  @Roles('SUPER_ADMIN', 'ADMIN', 'GERENCIA', 'SYSTEM_OWNER')
  @Get('resumen/mensual')
  resumenMensual(
    @Req() req: any,
    @Query('sucursalId') sucursalId?: number,
  ) {
    return this.ventasService.totalMensual(req.user, sucursalId);
  }

  // =========================
  // 👤 VENTAS POR USUARIO
  // =========================
  @Roles('SUPER_ADMIN', 'ADMIN', 'GERENCIA', 'SYSTEM_OWNER')
  @Get('resumen/por-usuario')
  ventasPorUsuario(
    @Req() req: any,
    @Query('sucursalId') sucursalId?: number,
  ) {
    return this.ventasService.ventasPorUsuario(req.user, sucursalId);
  }

}

