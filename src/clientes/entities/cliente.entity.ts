import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

@Entity('clientes')
@Unique(['nit'])
export class Cliente {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 150 })
  nombre: string;

  @Column({ length: 20 })
  nit: string; // CF o número válido (único)

  @Column({ length: 200, nullable: true })
  direccion: string;

  @Column({ length: 50, nullable: true })
  telefono: string;

  @Column({ length: 150, nullable: true })
  correo: string;

  @Column({ default: true })
  activo: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
