import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class CreateVentaDetalleDto {
  @Type(() => Number)
  @IsInt()
  @IsNotEmpty()
  productoId: number;

  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  cantidad: number;

  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  precio: number;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  descuento?: number;
}

export class CreateVentaDto {
  // sucursalId ahora es opcional (se toma del token normalmente)
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sucursalId?: number;

  @IsDateString()
  @IsNotEmpty()
  fecha: string;

  @IsOptional()
  @IsInt()
  clienteId?: number;

  @IsOptional()
  @IsString()
  clienteNombre?: string;

  @IsOptional()
  @IsString()
  clienteNit?: string;

  @IsOptional()
  @IsString()
  formaPago?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  usuarioId?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateVentaDetalleDto)
  detalles: CreateVentaDetalleDto[];
}
