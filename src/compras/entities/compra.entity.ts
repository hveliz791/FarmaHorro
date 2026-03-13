import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Proveedor } from '../../proveedores/entities/proveedor.entity';
import { Sucursal } from '../../sucursales/entities/sucursal.entity';
import { CompraDetalle } from '../entities/compra-detalle.entity';

@Entity('compras')
export class Compra {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Proveedor, { onDelete: 'RESTRICT' })
  proveedor: Proveedor;

    @Column({ type: 'varchar', length: 50, nullable: true })
  formaPago: string | null;

  @ManyToOne(() => Sucursal, { onDelete: 'RESTRICT' })
  sucursal: Sucursal;

  @Column({ type: 'numeric', precision: 14, scale: 2 })
  total: number;

  @Column({ type: 'timestamp' })
  fecha: Date;

  // Más adelante lo ligaremos a Usuario (auth)
  @Column({ name: 'usuario_id', type: 'int', nullable: true })
  usuarioId: number | null;

  @Column({ default: false })
  anulada: boolean;

  @OneToMany(() => CompraDetalle, (detalle) => detalle.compra, {
    cascade: true,
  })
  detalles: CompraDetalle[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
