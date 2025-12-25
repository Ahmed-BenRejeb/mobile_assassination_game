import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { Game, GameStatus } from './game.entity';
import { CreateGameDto } from './dto/create-game.dto';

@Injectable()
export class GameService {
  constructor(
    @InjectRepository(Game)
    private gameRepository: Repository<Game>,
  ) {}

  async createGame() {
    const game = this.gameRepository.create({
      code: this.generateGameCode(),
    });
    return this.gameRepository.save(game);
  }

  async getGames() {
    return this.gameRepository.find();
  }
  async getGameById(id: number) {

    const game= await this.gameRepository.findOne({where:{id}});
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

    async startGame(id: number) {
  const game = await this.getGameOrFail(id);

  if (game.status !== GameStatus.WAITING) {
    throw new BadRequestException('Game already started');
  }

  game.status = GameStatus.RUNNING;
  game.startedAt = new Date();
  return this.gameRepository.save(game);
}

    async finishGame(id: number) {
    const game = await this.getGameOrFail(id);

    if (game.status !== GameStatus.RUNNING) {
        throw new BadRequestException('Game is not running');
    }

    game.status = GameStatus.FINISHED;
    game.finishedAt = new Date();
    return this.gameRepository.save(game);
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





    
    private generateGameCode(): string {
    const result = Math.floor(100000 + Math.random() * 900000).toString();
    return result;
}
}

