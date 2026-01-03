import { Game } from "src/game/game.entity";
import { Column, Entity, Index, ManyToOne, OneToMany, PrimaryGeneratedColumn, Unique } from "typeorm";

@Entity()
@Unique(['secretCode', 'game'])
@Unique(['nickname', 'game'])
@Index(['game', 'isAlive'])
export class Player {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  nickname: string;

  @Column()
  secretCode: string;

  @Column({ default: true })
  isAlive: boolean;

  @ManyToOne(() => Game, game => game.players, { nullable: true, onDelete: 'SET NULL' })
  game: Game |  null;


  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  latitude: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  longitude: number | null;
  @Column({ type: 'timestamp', nullable: true })
  lastLocationUpdate: Date | null;

@ManyToOne(() => Player, { nullable: true, onDelete: 'SET NULL' })
currentTarget: Player | null;

@OneToMany(() => Player, player => player.currentTarget)
    killedPlayers: Player[];
  
  @Column({ default: 0 })
  kills: number;
  @Column({ type: 'boolean', default: false, nullable: true })
  isCreator: boolean | null;


  
}
