import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateProveedorDto } from './dto/create-proveedor.dto';
import { UpdateProveedorDto } from './dto/update-proveedor.dto';
import { Proveedor } from './entities/proveedor.entity';

@Injectable()
export class ProveedoresService {
  constructor(
    @InjectRepository(Proveedor)
    private readonly proveedorRepo: Repository<Proveedor>,
  ) {}

  async create(dto: CreateProveedorDto): Promise<Proveedor> {
    const proveedor = this.proveedorRepo.create({
      ...dto,
      activo: dto.activo ?? true,
    });
    return this.proveedorRepo.save(proveedor);
  }

  async findAll(): Promise<Proveedor[]> {
    return this.proveedorRepo.find({
      where: { activo: true },
      order: { nombre: 'ASC' },
    });
  }

  async findOne(id: number): Promise<Proveedor> {
    const proveedor = await this.proveedorRepo.findOne({ where: { id } });
    if (!proveedor) {
      throw new NotFoundException(`Proveedor con id ${id} no encontrado`);
    }
    return proveedor;
  }

  async update(id: number, dto: UpdateProveedorDto): Promise<Proveedor> {
    const proveedor = await this.findOne(id);
    Object.assign(proveedor, dto);
    return this.proveedorRepo.save(proveedor);
  }

  async remove(id: number): Promise<void> {
    const proveedor = await this.findOne(id);
    proveedor.activo = false;
    await this.proveedorRepo.save(proveedor);
  }

  async findByNit(nit: string): Promise<Proveedor> {
  const proveedor = await this.proveedorRepo.findOne({
    where: { nit: nit.toUpperCase().trim(), activo: true },
  });
  if (!proveedor) throw new NotFoundException(`Proveedor con NIT ${nit} no encontrado`);
  return proveedor;
}

}
