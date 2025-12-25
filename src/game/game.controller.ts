import { Controller, Post, Body, Get, Param, ParseIntPipe, Delete, Patch } from '@nestjs/common';
import { GameService } from './game.service';
import { CreateGameDto } from './dto/create-game.dto';
import { ApiBody, ApiParam, ApiTags } from '@nestjs/swagger';


@ApiTags('Games')
@Controller('games')
export class GameController {
  constructor(private readonly gameService: GameService) {}

  @Post()
  createGame() {
    return this.gameService.createGame();
  }

  @Get()
  getGames() {
    return this.gameService.getGames();
  }
  @Get(':id')
  getGameById(@Param('id', ParseIntPipe) id: number) {
    return this.gameService.getGameById(id);
  }
@Post(':id/start')
startGame(@Param('id', ParseIntPipe) id: number) {
  return this.gameService.startGame(id);
}

@Post(':id/finish')
finishGame(@Param('id', ParseIntPipe) id: number) {
  return this.gameService.finishGame(id);
}



    @Delete(':id')
    @ApiParam({ name: 'id', type: Number })
    deleteGame(@Param('id', ParseIntPipe) id: number) {
        return this.gameService.deleteGame(id);
    }
}
