import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { DocumentLoaderService } from './services/document-loader.service';
import { DocumentController } from './controllers/document.controller';

@Module({
  controllers: [ChatController, DocumentController],
  providers: [ChatService, DocumentLoaderService],
  exports: [ChatService, DocumentLoaderService],
})
export class ChatModule {}
