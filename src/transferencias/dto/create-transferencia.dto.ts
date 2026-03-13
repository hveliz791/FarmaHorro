import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
} from 'class-validator';
import { CreateTransferenciaDetalleDto } from './create-transferencia-detalle.dto';

export class CreateTransferenciaDto {
  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  sucursalOrigenId: number;

  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  sucursalDestinoId: number;

  @IsDateString()
  @IsNotEmpty()
  fecha: string;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  usuarioId?: number;

  @IsArray()
  @IsNotEmpty()
  detalles: CreateTransferenciaDetalleDto[];
}
