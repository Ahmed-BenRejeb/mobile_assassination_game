import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';
import { IsNull } from 'typeorm';

export class CreateGameDto {

  @ApiProperty({ example: '123456' })
  @IsString()
  code: string;


  
  


  
}
