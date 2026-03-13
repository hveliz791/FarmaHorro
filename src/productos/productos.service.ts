import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Categoria } from '../categorias/entities/categoria.entity';
import { CreateProductoDto } from './dto/create-producto.dto';
import { UpdateProductoDto } from './dto/update-producto.dto';
import { Producto } from './entities/producto.entity';

type FindAllPosParams = {
  search?: string;
  sucursalId?: number;
  limit?: number;
  offset?: number;
};

@Injectable()
export class ProductosService {
  constructor(
    @InjectRepository(Producto)
    private readonly productoRepo: Repository<Producto>,
    @InjectRepository(Categoria)
    private readonly categoriaRepo: Repository<Categoria>,
  ) {}

  async create(dto: CreateProductoDto): Promise<Producto> {
    let categoria: Categoria | null = null;

    if (dto.categoriaId) {
      categoria = await this.categoriaRepo.findOne({
        where: { id: dto.categoriaId },
      });
      if (!categoria) {
        throw new BadRequestException(
          `Categoría con id ${dto.categoriaId} no existe`,
        );
      }
    }

    const producto = this.productoRepo.create({
      nombre: dto.nombre,
      descripcion: dto.descripcion ?? null,
      codigo: dto.codigo ?? null,
      precioCompra: dto.precioCompra,
      precioVenta: dto.precioVenta,
      activo: dto.activo ?? true,
      categoria,
    });

    return this.productoRepo.save(producto);
  }

  /**
   * ✅ Endpoint optimizado para POS:
   * - No trae productosSucursales completos
   * - Calcula stockSucursal (solo 1 sucursal)
   * - Search + paginación
   */
  async findAllPos(params: FindAllPosParams) {
  const limit = Number.isFinite(params.limit)
    ? Math.min(Math.max(params.limit!, 1), 200)
    : 60;

  const offset = Number.isFinite(params.offset)
    ? Math.max(params.offset!, 0)
    : 0;

  const sucursalId = params.sucursalId;

  if (
    sucursalId !== undefined &&
    (!Number.isInteger(sucursalId) || sucursalId <= 0)
  ) {
    throw new BadRequestException('sucursalId inválido');
  }

  const qb = this.productoRepo
    .createQueryBuilder('p')
    .leftJoinAndSelect('p.categoria', 'c')
    .where('p.activo = true');

  // 🔎 Search por nombre o código
  if (params.search) {
    const term = `%${params.search.toLowerCase()}%`;
    qb.andWhere(
      `(LOWER(p.nombre) LIKE :term OR LOWER(COALESCE(p.codigo, '')) LIKE :term)`,
      { term },
    );
  }

  // ✅ CLAVE: LEFT JOIN filtrado en el ON (para que salgan también stock 0)
  if (sucursalId) {
    qb.leftJoin(
      'p.productosSucursales',
      'ps',
      'ps.activo = true AND ps.sucursalId = :sucursalId',
      { sucursalId },
    ).addSelect('COALESCE(ps.stock, 0)', 'stockSucursal');
  } else {
    qb.addSelect('0', 'stockSucursal');
  }

  // ✅ evita duplicados al contar/listar (por si hay joins)
  qb.distinct(true);

  qb.orderBy('p.nombre', 'ASC').take(limit).skip(offset);

  const [entities, total] = await qb.getManyAndCount();
  const raw = await qb.getRawMany();

  const data = entities.map((p, i) => ({
    id: p.id,
    nombre: p.nombre,
    codigo: p.codigo,
    precioVenta: p.precioVenta,
    categoria: p.categoria ? { id: p.categoria.id, nombre: p.categoria.nombre } : null,
    stockSucursal: Number(raw[i]?.stockSucursal ?? 0),
  }));

  return {
    data,
    meta: { total, limit, offset },
  };
}


  // ✅ Detalle completo (para edición / admin)
  async findOne(id: number): Promise<Producto> {
    const producto = await this.productoRepo.findOne({
      where: { id },
      relations: [
        'categoria',
        'productosSucursales',
        'productosSucursales.sucursal',
      ],
    });
    if (!producto) {
      throw new NotFoundException(`Producto con id ${id} no encontrado`);
    }
    return producto;
  }

  async update(id: number, dto: UpdateProductoDto): Promise<Producto> {
    const producto = await this.findOne(id);

    if (dto.categoriaId !== undefined) {
      if (dto.categoriaId === null) {
        producto.categoria = null;
      } else {
        const categoria = await this.categoriaRepo.findOne({
          where: { id: dto.categoriaId },
        });
        if (!categoria) {
          throw new BadRequestException(
            `Categoría con id ${dto.categoriaId} no existe`,
          );
        }
        producto.categoria = categoria;
      }
    }

    if (dto.nombre !== undefined) producto.nombre = dto.nombre;
    if (dto.descripcion !== undefined) producto.descripcion = dto.descripcion;
    if (dto.codigo !== undefined) producto.codigo = dto.codigo;
    if (dto.precioCompra !== undefined)
      producto.precioCompra = dto.precioCompra;
    if (dto.precioVenta !== undefined) producto.precioVenta = dto.precioVenta;
    if (dto.activo !== undefined) producto.activo = dto.activo;

    return this.productoRepo.save(producto);
  }

  async remove(id: number): Promise<void> {
    const producto = await this.findOne(id);
    producto.activo = false;
    await this.productoRepo.save(producto);
  }

  async findAllAdmin(): Promise<Producto[]> {
  return this.productoRepo.find({
    where: { activo: true }, // o quita esto si quieres ver también inactivos
    relations: ['categoria'],
    order: { nombre: 'ASC' },
  });
}

}
