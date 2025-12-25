import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class CreateGameDto {
  @ApiProperty({ example: 'INSAT Killer Game' })
  @IsString()
  @MinLength(3)
  name: string;
}
