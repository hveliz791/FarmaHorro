import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Categoria } from '../../categorias/entities/categoria.entity';
import { ProductoSucursal } from '../../productos-sucursales/entities/producto-sucursal.entity';

@Entity('productos')
export class Producto {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 150 })
  nombre: string;

  @Column({ type: 'text', nullable: true })
  descripcion: string | null;

  @Column({ type: 'varchar', length: 100, unique: true, nullable: true })
  codigo: string | null; // SKU o código interno

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  precioCompra: number;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  precioVenta: number;

  @Column({ default: true })
  activo: boolean;

  @ManyToOne(() => Categoria, (categoria) => categoria.productos, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  categoria: Categoria | null;

  @OneToMany(
    () => ProductoSucursal,
    (productoSucursal) => productoSucursal.producto,
  )
  productosSucursales: ProductoSucursal[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
