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
import { CreateTransferenciaDto } from './dto/create-transferencia.dto';
import { UpdateTransferenciaDto } from './dto/update-transferencia.dto';
import { TransferenciasService } from './transferencias.service';

@UseGuards(AuthGuard('jwt'))
@Controller('transferencias')
export class TransferenciasController {
  constructor(private readonly transferenciasService: TransferenciasService) {}

  @Roles('SUPER_ADMIN', 'ADMIN', 'BODEGA', 'SYSTEM_OWNER')
  @Post()
  create(@Req() req: any, @Body() dto: CreateTransferenciaDto) {
    return this.transferenciasService.create(dto, req.user);
  }

  @Roles('SUPER_ADMIN', 'ADMIN', 'BODEGA', 'SYSTEM_OWNER')
  @Get()
  findAll(@Req() req: any) {
    return this.transferenciasService.findAll(req.user);
  }

  @Roles('SUPER_ADMIN', 'ADMIN', 'BODEGA', 'SYSTEM_OWNER')
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.transferenciasService.findOne(id, req.user);
  }

  @Roles('SUPER_ADMIN', 'SYSTEM_OWNER')
  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTransferenciaDto,
  ) {
    return this.transferenciasService.update(id, dto);
  }

  // ✅ Aceptar (sin body)
  @Roles('SUPER_ADMIN', 'ADMIN', 'BODEGA', 'SYSTEM_OWNER')
  @Put(':id/aceptar')
  aceptar(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.transferenciasService.aceptar(id, req.user);
  }

  // ✅ Rechazar (body opcional con motivo string)
  @Roles('SUPER_ADMIN', 'ADMIN', 'BODEGA', 'SYSTEM_OWNER')
  @Put(':id/rechazar')
  rechazar(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
    @Body() body: { motivo?: string },
  ) {
    return this.transferenciasService.rechazar(id, req.user, body?.motivo);
  }
}
