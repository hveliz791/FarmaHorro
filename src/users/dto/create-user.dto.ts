import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength
} from 'class-validator';
import type { UserRole } from '../entities/user.entity';

const ROLES: UserRole[] = [
  'SYSTEM_OWNER',
  'SUPER_ADMIN',
  'ADMIN',
  'VENTAS',
  'COMPRAS',
  'BODEGA',
  'GERENCIA',
];

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  nombre: string;

  @IsString()
  @MaxLength(150)
  email: string;

  @IsString()
  @MinLength(6)
  @MaxLength(50)
  password: string;

  @IsIn(ROLES as unknown as string[])
  rol: UserRole;

  // ✅ SUPER_ADMIN puede mandarla, ADMIN NO (se fuerza en el service)
  @IsOptional()
  @Transform(({ value }) => (value === '' || value === null ? undefined : value))
  @Type(() => Number)
  @IsInt()
  @Min(1)
  sucursalId?: number;

  @IsBoolean()
  @IsOptional()
  activo?: boolean;
}
