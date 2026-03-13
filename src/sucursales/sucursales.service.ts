import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateSucursalDto } from './dto/create-sucursal.dto';
import { UpdateSucursalDto } from './dto/update-sucursal.dto';
import { Sucursal } from './entities/sucursal.entity';

@Injectable()
export class SucursalesService {
  constructor(
    @InjectRepository(Sucursal)
    private readonly sucursalRepo: Repository<Sucursal>,
  ) {}

  async create(dto: CreateSucursalDto): Promise<Sucursal> {
    const sucursal = this.sucursalRepo.create({
      ...dto,
      activo: dto.activo ?? true,
    });
    return this.sucursalRepo.save(sucursal);
  }

  async findAll(): Promise<Sucursal[]> {
    return this.sucursalRepo.find({
      order: { id: 'ASC' },
    });
  }

  async findOne(id: number): Promise<Sucursal> {
    const sucursal = await this.sucursalRepo.findOne({ where: { id } });
    if (!sucursal) {
      throw new NotFoundException(`Sucursal con id ${id} no encontrada`);
    }
    return sucursal;
  }

  async update(id: number, dto: UpdateSucursalDto): Promise<Sucursal> {
    const sucursal = await this.findOne(id);
    Object.assign(sucursal, dto);
    return this.sucursalRepo.save(sucursal);
  }

  async remove(id: number): Promise<void> {
    const sucursal = await this.findOne(id);
    // Soft delete: solo la marcamos inactiva
    sucursal.activo = false;
    await this.sucursalRepo.save(sucursal);
  }
}
