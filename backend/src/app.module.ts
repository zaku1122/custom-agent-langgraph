import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HttpModule } from '@nestjs/axios';
import { ChatModule } from './chat/chat.module';
import { PdfModule } from './pdf/pdf.module';

@Module({
  imports: [HttpModule, ChatModule, PdfModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
