import {
    IsBoolean,
    IsEmail,
    IsNotEmpty,
    IsOptional,
    IsString,
    MaxLength,
} from 'class-validator';

export class CreateClienteDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  nombre: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  nit: string; // Validaremos CF o números al guardar

  @IsString()
  @IsOptional()
  @MaxLength(200)
  direccion?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  telefono?: string;

  @IsEmail()
  @IsOptional()
  @MaxLength(150)
  correo?: string;

  @IsBoolean()
  @IsOptional()
  activo?: boolean;
}
