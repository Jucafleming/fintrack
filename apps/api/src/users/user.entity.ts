import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { GroupMember } from '../groups/group-member.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  name: string;

  @Column({ unique: true, length: 255 })
  email: string;

  @Column()
  passwordHash: string;

  @Column({ nullable: true, type: 'varchar' })
  resetPasswordToken: string | null;

  @Column({ nullable: true, type: 'timestamptz' })
  resetPasswordExpires: Date | null;

  @Column({ nullable: true, type: 'varchar' })
  refreshToken: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => GroupMember, (member) => member.user)
  groupMembers: GroupMember[];
}