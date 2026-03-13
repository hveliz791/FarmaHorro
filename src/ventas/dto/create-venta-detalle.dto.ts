import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsOptional, IsPositive } from 'class-validator';

export class CreateVentaDetalleDto {
  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  productoId: number;

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  cantidad: number;

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  precio: number;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  descuento?: number;
}
