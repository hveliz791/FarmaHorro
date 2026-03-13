import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsPositive } from 'class-validator';

export class CreateCompraDetalleDto {
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
}
