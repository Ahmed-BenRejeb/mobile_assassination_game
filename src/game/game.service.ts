import { BadRequestException, forwardRef, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { Game, GameStatus } from './game.entity';
import { CreateGameDto } from './dto/create-game.dto';
import { Player } from 'src/player/player.entity';
import { GameGateway } from './game.gateway';

@Injectable()
export class GameService {
  constructor(
    @InjectRepository(Game)
    private gameRepository: Repository<Game>,
    @InjectRepository(Player)
private playerRepository: Repository<Player>,
@Inject(forwardRef(() => GameGateway)) 
    private gameGateway: GameGateway,

  ) {}

  async createGame(playerId: number): Promise<Game> {

    const game = this.gameRepository.create({
      code: this.generateGameCode(),
    });
    const player = await this.playerRepository.findOne({ where: { id: playerId } });
    if (!player) {
      throw new NotFoundException('Player not found');
    }
    if (player.game) {
      throw new BadRequestException('Player is already in a game');
    }

    player.isCreator = true;
    player.game = game;
    await this.playerRepository.save(player); 
    return this.gameRepository.save(game);
  }

  async getGames() {
    return this.gameRepository.find({
        order: { createdAt: 'DESC' },
        relations: ['winner', 'players'],
    });
  }
  async getGameById(id: number) {

    const game= await this.gameRepository.findOne({where:{id}, relations: ['winner', 'players']});
    if (!game) {
        throw new NotFoundException('Game not found');
        }
    return game;
  }
  async updateGameStatus(id: number, status: string) {
    const game = await this.gameRepository.findOne({where:{id}});
    if (!game) {
        throw new NotFoundException('Game not found');
    }
    if (game.status ==GameStatus.FINISHED) {
        throw new BadRequestException('Cannot change status of a finished game');
    } else {
      game.status = status as any;
      return this.gameRepository.save(game);
    }

    
  } 

    async startGame(id: number,playerId: number) {
  const game = await this.getGameOrFail(id);

  if (game.status !== GameStatus.WAITING) {
    throw new BadRequestException('Game already started');
  }

 

  
    const players = await this.playerRepository.find({
      where: { game: { id: game.id }, isAlive: true },
    });
    if (players.length < 4) throw new BadRequestException('Not enough players');
    if (!players.find(p => p.id === playerId && p.isCreator)) {
        throw new BadRequestException('Only the game creator can start the game');
    }
    
    const shuffled = players.sort(() => Math.random() - 0.5);
    for (let i = 0; i < shuffled.length; i++) {
      shuffled[i].currentTarget = shuffled[(i + 1) % shuffled.length];
    }
    await this.playerRepository.save(shuffled);
     game.status = GameStatus.RUNNING;
    game.startedAt = new Date();
    await this.gameRepository.save(game);
    this.gameGateway.notifyGameStarted(id, game);


    return game;
  }

    async finishGame(id: number) {
    const game = await this.getGameOrFail(id);
    
    if (game.status !== GameStatus.RUNNING) {
        throw new BadRequestException('Game is not running');
    }
    const alivePlayers = await this.playerRepository.find({
  where: { game: { id: game.id }, isAlive: true },
});

  if (alivePlayers.length !== 1) {
    throw new BadRequestException(`Cannot finish game with ${alivePlayers.length} players alive`);
  } 
        const winner = alivePlayers[0];
        game.status = GameStatus.FINISHED;
        game.finishedAt = new Date();
        game.winner = winner;
        await this.gameRepository.save(game);
        const players = await this.playerRepository.find({
          where: { game: { id: game.id } },
        });
        for (const player of players) {
            player.game = null;
        }
        await this.playerRepository.save(players);
        this.gameGateway.notifyGameFinished(id, winner);

        return { game, winner};
    

    }
    private async getGameOrFail(id: number): Promise<Game> {
    const game = await this.gameRepository.findOne({ where: { id } });
    if (!game) {
        throw new NotFoundException('Game not found');
    }
    return game;
    }





    async deleteGame(id: number) {
        const game = await this.getGameById(id);
        return this.gameRepository.remove(game);    
    }
    async getGameResult(gameId: number) {
    const game = await this.getGameOrFail(gameId);
    if (!game)  {
        throw new NotFoundException('Game not found');
    }
    if (game.status !== GameStatus.FINISHED) {
        throw new BadRequestException('Game is not finished yet');
    }

    return this.gameRepository.findOne({
        where: { id: gameId },
        relations: ['winner'],
    });
    }
    async deleteAllGames() {
        const games = await this.gameRepository.find({ select: ['id'] });
        if (games.length > 0) {
            const ids = games.map(g => g.id);
            await this.gameRepository.delete(ids);
        }
        return { message: 'All games deleted' };
  }


    private generateGameCode(): string {
    const result = Math.floor(100000 + Math.random() * 900000).toString();
    return result;
}

}

