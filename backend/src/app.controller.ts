import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getRoot() {
    return {
      name: 'Notification Service',
      status: 'OK',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    };
  }
}
