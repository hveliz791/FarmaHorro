import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Producto } from '../productos/entities/producto.entity';
import { Sucursal } from '../sucursales/entities/sucursal.entity';
import { CreateProductoSucursalDto } from './dto/create-producto-sucursal.dto';
import { UpdateProductoSucursalDto } from './dto/update-producto-sucursal.dto';
import { ProductoSucursal } from './entities/producto-sucursal.entity';

@Injectable()
export class ProductosSucursalesService {
  constructor(
    @InjectRepository(ProductoSucursal)
    private readonly productoSucursalRepo: Repository<ProductoSucursal>,
    @InjectRepository(Producto)
    private readonly productoRepo: Repository<Producto>,
    @InjectRepository(Sucursal)
    private readonly sucursalRepo: Repository<Sucursal>,
  ) {}

  // Crear registro producto-sucursal
  async create(dto: CreateProductoSucursalDto): Promise<ProductoSucursal> {
    const producto = await this.productoRepo.findOne({
      where: { id: dto.productoId, activo: true },
    });
    if (!producto) throw new NotFoundException('Producto no encontrado');

    const sucursal = await this.sucursalRepo.findOne({
      where: { id: dto.sucursalId, activo: true },
    });
    if (!sucursal) throw new NotFoundException('Sucursal no encontrada');

    // Evitar duplicado
    const existe = await this.productoSucursalRepo.findOne({
      where: {
        producto: { id: dto.productoId },
        sucursal: { id: dto.sucursalId },
      },
    });
    if (existe)
      throw new BadRequestException(
        'Este producto ya está registrado en esta sucursal',
      );

    const registro = this.productoSucursalRepo.create({
      producto,
      sucursal,
      stock: dto.stock ?? 0,
      stockMinimo: dto.stockMinimo ?? 0,
      activo: dto.activo ?? true,
    });

    return this.productoSucursalRepo.save(registro);
  }

  // Obtener inventario de una sucursal
  async findBySucursal(sucursalId: number): Promise<ProductoSucursal[]> {
    return this.productoSucursalRepo.find({
      where: { sucursal: { id: sucursalId }, activo: true },
      relations: ['producto', 'sucursal'],
      order: { id: 'ASC' },
    });
  }

  // Obtener registro específico
  async findOne(id: number): Promise<ProductoSucursal> {
    const registro = await this.productoSucursalRepo.findOne({
      where: { id },
      relations: ['producto', 'sucursal'],
    });
    if (!registro)
      throw new NotFoundException(`Inventario con id ${id} no encontrado`);
    return registro;
  }

  // Ajuste manual (bodega)
  async update(
    id: number,
    dto: UpdateProductoSucursalDto,
  ): Promise<ProductoSucursal> {
    const registro = await this.findOne(id);

    if (dto.stock !== undefined) {
      if (dto.stock < 0)
        throw new BadRequestException('Stock no puede ser negativo');
      registro.stock = dto.stock;
    }

    if (dto.stockMinimo !== undefined) registro.stockMinimo = dto.stockMinimo;
    if (dto.activo !== undefined) registro.activo = dto.activo;

    return this.productoSucursalRepo.save(registro);
  }
}
