import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateProveedorDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  nit?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  nombre: string;

  @IsString()
  @IsOptional()
  @MaxLength(150)
  contacto?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  telefono?: string;

  @IsEmail()
  @IsOptional()
  @MaxLength(150)
  correo?: string;

  @IsString()
  @IsOptional()
  direccion?: string;

  @IsBoolean()
  @IsOptional()
  activo?: boolean;
}
