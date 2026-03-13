import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Producto } from '../../productos/entities/producto.entity';
import { Compra } from './compra.entity';

@Entity('compras_detalles')
export class CompraDetalle {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Compra, (compra) => compra.detalles, {
    onDelete: 'CASCADE',
  })
  compra: Compra;

  @ManyToOne(() => Producto, { onDelete: 'RESTRICT' })
  producto: Producto;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  cantidad: number;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  precio: number;
}
