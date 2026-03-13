import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from 'src/auth/roles.decorator';
import { KardexService } from './kardex.service';

@UseGuards(AuthGuard('jwt'))
@Controller('kardex')
export class KardexController {
  constructor(private readonly kardexService: KardexService) {}

  @Roles('SUPER_ADMIN', 'ADMIN', 'SYSTEM_OWNER')
  @Get('producto/:productoId')
  findByProducto(
    @Param('productoId', ParseIntPipe) productoId: number,
    @Query('sucursalId') sucursalIdQuery: string | undefined,
    @Req() req: any,
  ) {
    const user = req.user;
    let sucursalId: number | undefined;

    if (user.rol === 'SUPER_ADMIN' || user.rol === 'SYSTEM_OWNER') {
      sucursalId = sucursalIdQuery ? parseInt(sucursalIdQuery, 10) : undefined;
    } else {
      sucursalId = user.sucursalId;
    }

    return this.kardexService.findByProducto(productoId, sucursalId);
  }

  @Roles('SUPER_ADMIN', 'ADMIN', 'SYSTEM_OWNER')
  @Get('producto/:productoId/rango')
findByProductoAndRangoFechas(
  @Param('productoId', ParseIntPipe) productoId: number,
  @Query('desde') desde: string,
  @Query('hasta') hasta: string,
  @Query('sucursalId') sucursalId?: string,
) {
  const sucId = sucursalId ? parseInt(sucursalId, 10) : undefined;

  // Normalizamos a inicio de día
  const desdeDate = new Date(`${desde}T00:00:00`);
  const hastaDate = new Date(`${hasta}T00:00:00`);

  // Hacemos el fin EXCLUSIVO sumando 1 día
  hastaDate.setDate(hastaDate.getDate() + 1);

  return this.kardexService.findByProductoAndRangoFechas(
    productoId,
    sucId,
    desdeDate,
    hastaDate,
  );
  }

@Roles('SUPER_ADMIN', 'ADMIN', 'SYSTEM_OWNER')
@Get('rango')
findByRangoFechasGeneral(
  @Query('desde') desde: string,
  @Query('hasta') hasta: string,
  @Query('sucursalId') sucursalIdQuery: string | undefined,
  @Req() req: any,
) {
  const user = req.user;
  let sucursalId: number | undefined;

  if (user.rol === 'SUPER_ADMIN' || user.rol === 'SYSTEM_OWNER') {
    sucursalId = sucursalIdQuery ? parseInt(sucursalIdQuery, 10) : undefined;
  } else {
    sucursalId = user.sucursalId;
  }

  // ⬇⬇⬇ Ajuste importante de fechas
  const desdeDate = new Date(`${desde}T00:00:00`);
  const hastaDate = new Date(`${hasta}T00:00:00`);
  // hacemos el fin EXCLUSIVO sumando 1 día
  hastaDate.setDate(hastaDate.getDate() + 1);

  return this.kardexService.findByRangoFechas(
    sucursalId,
    desdeDate,
    hastaDate,
  );
}

}
