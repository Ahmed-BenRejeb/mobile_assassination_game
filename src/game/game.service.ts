import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Game } from './game.entity';
import { CreateGameDto } from './dto/create-game.dto';

@Injectable()
export class GameService {
  constructor(
    @InjectRepository(Game)
    private gameRepository: Repository<Game>,
  ) {}

  async createGame(dto: CreateGameDto) {
    const game = this.gameRepository.create({
      name: dto.name,
      code: Math.random().toString(36).substring(2, 8).toUpperCase(),
    });
    return this.gameRepository.save(game);
  }

  async getGames() {
    return this.gameRepository.find();
  }
}