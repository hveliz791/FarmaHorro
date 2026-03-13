import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';
import { Cliente } from './entities/cliente.entity';

@Injectable()
export class ClientesService {
  constructor(
    @InjectRepository(Cliente)
    private readonly clienteRepo: Repository<Cliente>,
  ) {}

  async create(dto: CreateClienteDto): Promise<Cliente> {
    dto.nit = dto.nit.toUpperCase().trim();

    // ❌ No permitimos registrar clientes con NIT CF/C/F
    if (dto.nit === 'CF' || dto.nit === 'C/F') {
      throw new BadRequestException(
        'El NIT "CF" / "C/F" está reservado para ventas a consumidor final. ' +
          'No se debe registrar como cliente en el catálogo.',
      );
    }

    // Validar que el NIT no exista (para cualquier otro NIT)
    const exists = await this.clienteRepo.findOne({
      where: { nit: dto.nit },
    });
    if (exists) {
      throw new BadRequestException('El NIT ya está registrado');
    }

    const cliente = this.clienteRepo.create(dto);
    return this.clienteRepo.save(cliente);
  }

  async findAll(): Promise<Cliente[]> {
    return this.clienteRepo.find({
      order: { nombre: 'ASC' },
    });
  }

  async findOne(id: number): Promise<Cliente> {
    const cliente = await this.clienteRepo.findOne({ where: { id } });
    if (!cliente) throw new NotFoundException('Cliente no encontrado');
    return cliente;
  }

  async findByNIT(nit: string): Promise<Cliente | null> {
    nit = nit.toUpperCase().trim();
    const cliente = await this.clienteRepo.findOne({ where: { nit } });
    return cliente || null;
  }

  async search(term: string): Promise<Cliente[]> {
    term = term.toUpperCase().trim();
    return this.clienteRepo.find({
      where: [
        { nombre: Like(`%${term}%`) },
        { nit: Like(`%${term}%`) },
      ],
      order: { nombre: 'ASC' },
      take: 20, // Para autocompletar POS
    });
  }

  async update(id: number, dto: UpdateClienteDto): Promise<Cliente> {
    const cliente = await this.findOne(id);

    if (dto.nit) {
      dto.nit = dto.nit.toUpperCase().trim();

      //No permitimos cambiar o poner NIT CF/C/F
      if (dto.nit === 'CF' || dto.nit === 'C/F') {
        throw new BadRequestException(
          'El NIT "CF" / "C/F" está reservado para ventas a consumidor final. ' +
            'No se debe usar en el catálogo de clientes.',
        );
      }

      // Si cambió el NIT, validamos duplicado
      if (dto.nit !== cliente.nit) {
        const exists = await this.clienteRepo.findOne({
          where: { nit: dto.nit },
        });
        if (exists) {
          throw new BadRequestException('El NIT ya está registrado');
        }
      }
    }

    Object.assign(cliente, dto);

    return this.clienteRepo.save(cliente);
  }

  async remove(id: number): Promise<void> {
    const cliente = await this.findOne(id);
    cliente.activo = false;
    await this.clienteRepo.save(cliente);
  }
}
