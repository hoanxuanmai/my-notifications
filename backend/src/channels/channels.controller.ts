import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ChannelsService } from './channels.service';
import { CreateChannelDto } from './dto/create-channel.dto';
import { UpdateChannelDto } from './dto/update-channel.dto';
import { AddChannelMemberDto } from './dto/add-channel-member.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserPublic } from '../common/types/user.types';

@Controller('channels')
@UseGuards(JwtAuthGuard)
export class ChannelsController {
  constructor(private readonly channelsService: ChannelsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() createChannelDto: CreateChannelDto,
    @CurrentUser() user: UserPublic,
  ) {
    return this.channelsService.create(createChannelDto, user.id);
  }

  @Get()
  findAll(@CurrentUser() user: UserPublic) {
    return this.channelsService.findAll(user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: UserPublic) {
    return this.channelsService.findOne(id, user.id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateChannelDto: UpdateChannelDto,
    @CurrentUser() user: UserPublic,
  ) {
    return this.channelsService.update(id, updateChannelDto, user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @CurrentUser() user: UserPublic) {
    return this.channelsService.remove(id, user.id);
  }

  @Post(':id/members')
  @HttpCode(HttpStatus.CREATED)
  addMember(
    @Param('id') id: string,
    @Body() body: AddChannelMemberDto,
    @CurrentUser() user: UserPublic,
  ) {
    return this.channelsService.addMember(id, body.email, user.id);
  }

  @Get(':id/members')
  getMembers(@Param('id') id: string, @CurrentUser() user: UserPublic) {
    return this.channelsService.getMembers(id, user.id);
  }

  @Delete(':id/members/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeMember(
    @Param('id') id: string,
    @Param('userId') memberUserId: string,
    @CurrentUser() user: UserPublic,
  ) {
    return this.channelsService.removeMember(id, memberUserId, user.id);
  }
}

