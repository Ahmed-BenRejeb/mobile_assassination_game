import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Player } from './player.entity';
import { EntityManager, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Game, GameStatus } from 'src/game/game.entity';
import { DataSource } from 'typeorm';


@Injectable()
export class PlayerService {
    constructor(
    @InjectRepository(Player)
    private playerRepository: Repository<Player>,
    @InjectRepository(Game)
    private gameRepository: Repository<Game>,
    private dataSource: DataSource,
  ) {}

  async getPlayers(gameId: number): Promise<Player[]> {
    const game = await this.gameRepository.findOne({ where: { id: gameId } });
    if (!game) {
      throw new NotFoundException('Game not found');
    }
    return this.playerRepository.find({
    where: {game: {id:gameId}},
    relations: ['game', 'currentTarget'],
    select: ['id', 'nickname', 'kills', 'isAlive', 'secretCode'], // Arja3 fasakh l secret code mba3d 
  });
  }

  async changePlayerNickname( gameId: number|null, playerId: number, newNickname: string) {
    const player = await this.playerRepository.findOne({ where: { id: playerId }, relations: ['game'] });
    if (!player) {
      throw new NotFoundException('Player not found');
    }
      if (player.game) {
    const existingPlayer = await this.playerRepository.findOne({
      where: { game: { id: player.game.id }, nickname: newNickname },
    });
    
    if (existingPlayer && existingPlayer.id !== playerId) {
      throw new BadRequestException('Nickname already taken in this game');
    }
  }
    player.nickname = newNickname;
    return this.playerRepository.save(player);
  }
    

  async joinGame(gameId: number, nickname: string) 
  {
  const game = await this.gameRepository.findOne({ where: { id: gameId } });
  if (!game) throw new NotFoundException('Game not found');
  if (game.status !== GameStatus.WAITING)
    throw new BadRequestException('Cannot join a game that has started');
  const existingPlayer = await this.playerRepository.findOne({
    where: { game: { id: gameId }, nickname },
  });
  if (existingPlayer) {
    throw new BadRequestException('Nickname already taken in this game');
  }
  let code: string = '';
    let exists = true;
  
while (exists) {
  code = Math.floor(100000 + Math.random() * 900000).toString();
  const existingPlayer = await this.playerRepository.findOne({ 
    where: { game: { id: gameId }, secretCode: code } 
  });
  exists = !!existingPlayer; // convert to boolean
}


  const player = this.playerRepository.create({
    nickname,
    secretCode: code,
    game,
    isAlive: true,
  });

  return this.playerRepository.save(player);
}

async assignInitialTargets(gameId: number) {
  const players = await this.playerRepository.find({
    where: { game: { id: gameId }, isAlive: true },
  });

  if (players.length < 4) throw new BadRequestException('Not enough players');

  // Shuffle players randomly
  const shuffled = players.sort(() => Math.random() - 0.5);

  // Assign targets in a circular way
  for (let i = 0; i < shuffled.length; i++) {
    shuffled[i].currentTarget = shuffled[(i + 1) % shuffled.length];
  }

  await this.playerRepository.save(shuffled);
}



async killTarget(killerId: number, targetCode: string) {

  const queryRunner = this.dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();
  try {
    const manager = queryRunner.manager;
    const killer = await manager.findOne(Player, {
    where: { id: killerId },
    relations: ['game', 'currentTarget', 'currentTarget.currentTarget'],
  });


     if (!killer) throw new NotFoundException('Player not found');
      if (!killer.game) throw new BadRequestException('Player is not in a game');
      if (!killer.isAlive) throw new BadRequestException('You are dead and cannot kill targets');

  const target = await manager.findOne(Player, {
      where: { secretCode: targetCode, game: { id: killer.game.id } },
      relations: ['currentTarget'],
    });


  if (!target || !target.isAlive)
    throw new BadRequestException('Invalid target');
  if (killer.currentTarget == null)
    throw new BadRequestException('You have no assigned target');

  if (killer.currentTarget.id !== target.id)
    throw new BadRequestException('This is not your assigned target');

  // Inherit kills
  killer.kills += 1 + target.kills;

  // Update killer's target
  killer.currentTarget = target.currentTarget;

  // Mark target as dead
  target.isAlive = false;
  target.currentTarget = null;

  await manager.save([killer, target]);

  // Update other affected players
  await this.reassignTargetsForDead(target.id,killer.game.id,manager);
  const alivePlayers = await manager.count(Player,{
where: { game: { id: killer.game.id }, isAlive: true },
});

  if (alivePlayers === 1) {
  const game = killer.game; 
  game.status = GameStatus.FINISHED;
  game.finishedAt = new Date();
  game.winner = killer;
  await manager.save(game);

  return {
    message: 'Game finished',
    winner: killer,
  };
}


    await queryRunner.commitTransaction();
    
  return { message: 'Target eliminated', killer, target };
  } catch (error) {
    await queryRunner.rollbackTransaction();
    throw error;
  } finally {
    await queryRunner.release();
  }
 }


async reassignTargetsForDead(deadPlayerId: number,gameId:number,manager?: EntityManager) {
  const repo = manager ? manager.getRepository(Player) : this.playerRepository;
  const allPlayers = await repo.find({
    where: { game: { id: gameId } },
    relations: ['currentTarget'] // Load 1 level deep is enough if you have the whole list
  });

  const playerMap = new Map<number, Player>();
  allPlayers.forEach(p => playerMap.set(p.id, p));

  const hunter = allPlayers.find(p => p.currentTarget?.id === deadPlayerId);

  if (hunter) {

    let nextCandidateId = playerMap.get(deadPlayerId)?.currentTarget?.id;
    let visited = new Set<number>([hunter.id, deadPlayerId]);


    while (nextCandidateId) {
      const candidate = playerMap.get(nextCandidateId);

      if (!candidate) {
        hunter.currentTarget = null;
        break;
      }

      if (candidate.isAlive && candidate.id !== hunter.id) {
        hunter.currentTarget = candidate;
        break;
      }


      if (visited.has(candidate.id)) {
        hunter.currentTarget = null; // Everyone else is dead
        break;
      }
      visited.add(candidate.id);

      nextCandidateId = candidate.currentTarget?.id;
    }

    if (!nextCandidateId) {
        hunter.currentTarget = null;
    }

    await repo.save(hunter);
  }
}
async createStandalonePlayer(nickname: string) {
    const player = this.playerRepository.create({
      nickname,
      isAlive: true,
      secretCode: Math.floor(100000 + Math.random() * 900000).toString(),
      // No game, no target
    });
    return this.playerRepository.save(player);
  }


  async deletePlayer(gameId: number, id: number) {
    const player = await this.playerRepository.findOne({ where: { id, game: { id: gameId } } });
    if (!player) {
      throw new NotFoundException('Player not found');
    }
    return this.playerRepository.remove(player);
  }
  async deleteAllPlayers(gameId: number) {
       const players = await this.playerRepository.find({ where: { game: { id: gameId } }, select: ['id'] });
        if (players.length > 0) {
            const ids = players.map(p => p.id);
            await this.playerRepository.delete(ids);
        }
        return { message: 'All players deleted' };
  }
  async getAllPlayers(): Promise<Player[]> {
    return this.playerRepository.find({
    relations: ['game', 'currentTarget'],
    select: ['id', 'nickname', 'kills', 'isAlive', 'secretCode'], // Arja3 fasakh l secret code mba3d
  });
  }

  async getAlivePlayers(gameId: number): Promise<Player[]> {
    const game = await this.gameRepository.findOne({ where: { id: gameId } });
    if (!game) {
      throw new NotFoundException('Game not found');
    }
    return this.playerRepository.find({
    where: { game: { id: gameId }, isAlive: true },
    select: ['id', 'nickname', 'kills', 'isAlive'], 
  });
  }

  async getLeaderboard(gameId: number): Promise<Player[]> {
    const game = await this.gameRepository.findOne({ where: { id: gameId } });
    if (!game) {
      throw new NotFoundException('Game not found');
    }
    return this.playerRepository.find({
    where: { game: { id: gameId } },
    order: { kills: 'DESC' },
    select: ['id', 'nickname', 'kills'], 
  });
  }
  async joinStandaloneGame(playerId: number, gameId: number) {
  // Check if game exists and is joinable
  const game = await this.gameRepository.findOne({ where: { id: gameId } });
  if (!game) throw new NotFoundException('Game not found');
  if (game.status !== GameStatus.WAITING)
    throw new BadRequestException('Cannot join a game that has started');

  // Check if player exists
  const player = await this.playerRepository.findOne({ 
    where: { id: playerId },
    relations: ['game']
  });
  if (!player) throw new NotFoundException('Player not found');

  // Check if player is already in a game
  if (player.game) {
    throw new BadRequestException('Player is already in a game');
  }

  // Check if nickname is unique in the target game
  const existingPlayer = await this.playerRepository.findOne({
    where: { game: { id: gameId }, nickname: player.nickname },
  });
  if (existingPlayer) {
    throw new BadRequestException('Nickname already taken in this game');
  }

  // Generate unique secret code for this game
  let code: string = '';
  let exists = true;
  
  while (exists) {
    code = Math.floor(100000 + Math.random() * 900000).toString();
    const existingCode = await this.playerRepository.findOne({ 
      where: { game: { id: gameId }, secretCode: code } 
    });
    exists = !!existingCode;
  }

  // Assign player to game
  player.game = game;
  player.secretCode = code;
  player.isAlive = true;

  return this.playerRepository.save(player);
}
  async deleteEveryone() {
  const players = await this.playerRepository.find({ select: ['id'] });
  if (players.length > 0) {
    const ids = players.map(p => p.id);
    await this.playerRepository.delete(ids);
  }
  return { message: 'All players deleted' };
}



private readonly PROXIMITY_THRESHOLD = 50; // 50 meters

  // Update player location
  async updateLocation(playerId: number, latitude: number, longitude: number) {
    const player = await this.playerRepository.findOne({
      where: { id: playerId },
      relations: ['game', 'currentTarget'],
    });

    if (!player) {
      throw new NotFoundException('Player not found');
    }

    if (!player.game) {
      throw new BadRequestException('Player is not in a game');
    }

    // Update location
    player.latitude = latitude;
    player.longitude = longitude;
    player.lastLocationUpdate = new Date();
    await this.playerRepository.save(player);

    // Check proximity to target
    let targetDistance ;
    let targetNearby = false;


    if (player.currentTarget?.latitude && player.currentTarget?.longitude) {
      targetDistance = this.calculateDistance(
        latitude,
        longitude,
        player.currentTarget.latitude,
        player.currentTarget.longitude,
      );
      targetNearby = targetDistance <= this.PROXIMITY_THRESHOLD;
    }

     
    return {
      message: 'Location updated',
      location: { latitude, longitude },
      proximity: {
        targetNearby,
        targetDistance: targetDistance ? Math.round(targetDistance) : null,
        
      },
    };
  }

  // Check proximity without updating location
  async checkProximity(playerId: number) {
    const player = await this.playerRepository.findOne({
      where: { id: playerId },
      relations: ['currentTarget'],
    });

    if (!player) {
      throw new NotFoundException('Player not found');
    }

    if (!player.latitude || !player.longitude) {
      throw new BadRequestException('Player location not set');
    }

    let targetDistance ;
    let targetNearby = false;

    if (player.currentTarget?.latitude && player.currentTarget?.longitude) {
      targetDistance = this.calculateDistance(
        player.latitude,
        player.longitude,
        player.currentTarget.latitude,
        player.currentTarget.longitude,
      );
      targetNearby = targetDistance <= this.PROXIMITY_THRESHOLD;
    }

  

    return {
      targetNearby,
      targetDistance: targetDistance ? Math.round(targetDistance) : null,
      targetLocation: player.currentTarget?.latitude && player.currentTarget?.longitude
        ? {
            latitude: player.currentTarget.latitude,
            longitude: player.currentTarget.longitude,
          }
        : null,
      
    };
  }

  // Haversine formula - calculate distance between two GPS coordinates
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }










}


