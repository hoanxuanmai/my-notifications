import { IsEmail } from 'class-validator';

export class AddChannelMemberDto {
  @IsEmail()
  email: string;
}
