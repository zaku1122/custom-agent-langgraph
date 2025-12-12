import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HttpModule } from '@nestjs/axios';
import { ChatModule } from './chat/chat.module';

@Module({
  imports: [HttpModule, ChatModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
