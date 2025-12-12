import { Controller, Post, Body, Get, Query, Res } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatMessageDto } from './dto/chat.dto';
import type { Response } from 'express';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  /**
   * POST /chat - Non-streaming endpoint
   * Accepts: { "message": "your message", "conversationHistory": [...] }
   */
  @Post()
  async chat(@Body() chatMessageDto: ChatMessageDto) {
    return this.chatService.chat(chatMessageDto);
  }

  /**
   * GET /chat/stream - SSE streaming endpoint
   * Query params: ?message=your+message
   */
  @Get('stream')
  async stream(@Query('message') message: string, @Res() res: Response) {
    res.set({
      'Cache-Control': 'no-cache',
      'Content-Type': 'text/event-stream',
      Connection: 'keep-alive',
    });
    res.flushHeaders();

    const chatMessageDto: ChatMessageDto = {
      message,
      conversationHistory: [],
    };

    try {
      const stream = this.chatService.chatStream(chatMessageDto);

      for await (const chunk of stream) {
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      }

      res.write(`event: done\ndata: {}\n\n`);
      res.end();
    } catch (err) {
      console.error('Stream error:', err);
      res.write(`event: error\ndata: ${JSON.stringify({ error: String(err) })}\n\n`);
      res.end();
    }
  }

  /**
   * POST /chat/stream - Alternative POST streaming endpoint
   * Accepts JSON body
   */
  @Post('stream')
  async streamPost(@Body() chatMessageDto: ChatMessageDto, @Res() res: Response) {
    res.set({
      'Cache-Control': 'no-cache',
      'Content-Type': 'text/event-stream',
      Connection: 'keep-alive',
    });
    res.flushHeaders();

    try {
      const stream = this.chatService.chatStream(chatMessageDto);

      for await (const chunk of stream) {
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      }

      res.write(`event: done\ndata: {}\n\n`);
      res.end();
    } catch (err) {
      console.error('Stream error:', err);
      res.write(`event: error\ndata: ${JSON.stringify({ error: String(err) })}\n\n`);
      res.end();
    }
  }

  /**
   * GET /chat/health - Health check
   */
  @Get('health')
  health() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'chat',
    };
  }
}