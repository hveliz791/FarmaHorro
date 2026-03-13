import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Producto } from '../../productos/entities/producto.entity';
import { Venta } from './venta.entity';

@Entity('ventas_detalles')
export class VentaDetalle {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Venta, (venta) => venta.detalles, {
    onDelete: 'CASCADE',
  })
  venta: Venta;

  @ManyToOne(() => Producto, { onDelete: 'RESTRICT' })
  producto: Producto;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  cantidad: number;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  precio: number;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  descuento: number;
}
