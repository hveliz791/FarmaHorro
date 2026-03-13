import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Producto } from '../../productos/entities/producto.entity';
import { Sucursal } from '../../sucursales/entities/sucursal.entity';

@Entity('productos_sucursales')
@Unique(['producto', 'sucursal']) // Evita duplicados producto–sucursal
export class ProductoSucursal {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Producto, (producto) => producto.productosSucursales, {
    onDelete: 'CASCADE',
  })
  producto: Producto;

  @ManyToOne(() => Sucursal, { onDelete: 'CASCADE' })
  sucursal: Sucursal;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  stock: number;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  stockMinimo: number;

  @Column({ default: true })
  activo: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
