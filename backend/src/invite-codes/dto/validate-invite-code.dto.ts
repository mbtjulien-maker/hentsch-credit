import { IsString, MaxLength, MinLength } from 'class-validator';

export class ValidateInviteCodeDto {
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  code: string;
}
