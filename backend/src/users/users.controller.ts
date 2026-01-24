import { UserDeliveryChannelsRepository } from '../common/repositories/user-delivery-channels.repository';
import { DeliveryChannelType } from '../common/enums/delivery-channel.enum';
import { UAParser } from 'ua-parser-js';
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
  Query,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserPublic } from '../common/types/user.types';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly userDeliveryChannelsRepository: UserDeliveryChannelsRepository,
  ) { }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll() {
    return this.usersService.findAll();
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMe(@CurrentUser() user: UserPublic) {
    return user;
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }

  @Get('me/webpush-devices')
  @UseGuards(JwtAuthGuard)
  async getMyWebpushDevices(@CurrentUser() user: UserPublic) {
    const webpushDevices =
      await this.userDeliveryChannelsRepository.findWebPushByUserIdWithFilter(
        user.id,
      );
    // Parse user agent if available
    return webpushDevices.map((d) => {
      let ua, os, browser;
      try {
        if (d.config && d.config.userAgent) {
          const parser = new UAParser();
          parser.setUA(d.config.userAgent);
          const parsed = parser.getResult();
          ua = d.config.userAgent;
          os =
            parsed.os && parsed.os.name
              ? `${parsed.os.name} - ${parsed.os.version}`
              : undefined;
          browser =
            parsed.browser && parsed.browser.name
              ? `${parsed.browser.name} - ${parsed.browser.version}`
              : undefined;
        }
      } catch { }
      return {
        id: d.id,
        createdAt: d.createdAt,
        updateAt: d.updatedAt,
        userAgent: ua,
        os,
        browser,
      };
    });
  }

  @Delete('me/webpush-devices/:id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteMyWebpushDevice(
    @CurrentUser() user: UserPublic,
    @Param('id') id: string,
  ) {
    const device = await this.userDeliveryChannelsRepository.findById(id);
    if (
      !device ||
      device.userId !== user.id ||
      device.type !== DeliveryChannelType.WEB_PUSH
    ) {
      // Not found or not owned by user
      return;
    }
    await this.userDeliveryChannelsRepository.delete(id);
  }
}
