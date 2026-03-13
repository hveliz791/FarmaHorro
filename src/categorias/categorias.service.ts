import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateCategoriaDto } from './dto/create-categoria.dto';
import { UpdateCategoriaDto } from './dto/update-categoria.dto';
import { Categoria } from './entities/categoria.entity';

@Injectable()
export class CategoriasService {
  constructor(
    @InjectRepository(Categoria)
    private readonly categoriaRepo: Repository<Categoria>,
  ) {}

  async create(dto: CreateCategoriaDto): Promise<Categoria> {
    const categoria = this.categoriaRepo.create({
      ...dto,
      activo: dto.activo ?? true,
    });
    return this.categoriaRepo.save(categoria);
  }

  async findAll(): Promise<Categoria[]> {
    return this.categoriaRepo.find({ order: { nombre: 'ASC' } });
  }

  async findOne(id: number): Promise<Categoria> {
    const categoria = await this.categoriaRepo.findOne({ where: { id } });
    if (!categoria) {
      throw new NotFoundException(`Categoría con id ${id} no encontrada`);
    }
    return categoria;
  }

  async update(id: number, dto: UpdateCategoriaDto): Promise<Categoria> {
    const categoria = await this.findOne(id);
    Object.assign(categoria, dto);
    return this.categoriaRepo.save(categoria);
  }

  async remove(id: number): Promise<void> {
    const categoria = await this.findOne(id);
    categoria.activo = false;
    await this.categoriaRepo.save(categoria);
  }
}
