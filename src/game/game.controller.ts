import { Controller, Post, Body, Get, Param, ParseIntPipe, Delete, Patch } from '@nestjs/common';
import { GameService } from './game.service';
import { CreateGameDto } from './dto/create-game.dto';
import { ApiBody, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';


@ApiTags('Games')
@Controller('games')
export class GameController {
  constructor(private readonly gameService: GameService) {}

  @Post(":playerId")
  @ApiOperation({ summary: 'Create a new game' })
  
  createGame(@Param('playerId', ParseIntPipe) playerId: number) {
    return this.gameService.createGame(playerId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all games' })
  getGames() {
    return this.gameService.getGames();
  }
  @Get(':id')
  @ApiOperation({ summary: 'Get game by ID' })
  getGameById(@Param('id', ParseIntPipe) id: number) {
    return this.gameService.getGameById(id);
  }
@Post(':id/start')
@ApiOperation({ summary: 'Start a game' })
startGame(@Param('id', ParseIntPipe) id: number,@Param('playerId', ParseIntPipe) playerId: number) {
  return this.gameService.startGame(id, playerId);
}

@Post(':id/finish')
@ApiOperation({ summary: 'Finish a game' })
finishGame(@Param('id', ParseIntPipe) id: number) {
  return this.gameService.finishGame(id);
}


    @Delete(':id')
    @ApiOperation({ summary: 'Delete a game' })
    @ApiParam({ name: 'id', type: Number })
    deleteGame(@Param('id', ParseIntPipe) id: number) {
        return this.gameService.deleteGame(id);
    }



@Get(':id/result')
@ApiOperation({ summary: 'Get game result' })
getGameResult(@Param('id', ParseIntPipe) id: number) {
    

  return this.gameService.getGameResult(id);
}
@Delete('')
@ApiOperation({ summary: 'Delete all games' })
deleteAllGames() {
  return this.gameService.deleteAllGames();
}


}