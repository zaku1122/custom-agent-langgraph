import {
  Controller,
  Post,
  Get,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PdfService, PDF_CONFIG } from './pdf.service';
import { PdfQueryDto, SummarizeDto, ChunkingConfig } from './dto/pdf.dto';
import type { Response } from 'express';

@Controller('pdf')
export class PdfController {
  constructor(private readonly pdfService: PdfService) {}

  // ============================================================================
  // PDF UPLOAD
  // ============================================================================

  /**
   * POST /pdf/upload - Upload a PDF file
   * Content-Type: multipart/form-data
   * Body: file (PDF)
   * Query params: chunkSize, overlap (optional, for experimentation)
   */
  @Post('upload')
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
    fileFilter: (req, file, cb) => {
      if (file.mimetype !== 'application/pdf') {
        cb(new BadRequestException('Only PDF files are allowed'), false);
      } else {
        cb(null, true);
      }
    },
  }))
  async uploadPdf(
    @UploadedFile() file: Express.Multer.File,
    @Query('chunkSize') chunkSize?: string,
    @Query('overlap') overlap?: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    
    const config: Partial<ChunkingConfig> = {};
    if (chunkSize) config.chunkSize = parseInt(chunkSize, 10);
    if (overlap) config.overlap = parseInt(overlap, 10);
    
    return this.pdfService.uploadAndProcess(file, config);
  }

  // ============================================================================
  // PDF QUERY (Non-streaming)
  
  /**
   * POST /pdf/query - Query a PDF document
   * Body: { documentId, query, selectedText?, selectedPage? }
   */
  @Post('query')
  async queryPdf(@Body() dto: PdfQueryDto) {
    return this.pdfService.queryDocument(dto);
  }

  // ============================================================================
  // PDF QUERY (Streaming)
  // ============================================================================

  /**
   * POST /pdf/query/stream - Query with streaming response
   * Returns SSE stream
   */
  @Post('query/stream')
  async queryPdfStream(@Body() dto: PdfQueryDto, @Res() res: Response) {
    res.set({
      'Cache-Control': 'no-cache',
      'Content-Type': 'text/event-stream',
      Connection: 'keep-alive',
    });
    res.flushHeaders();

    try {
      const stream = this.pdfService.streamQueryDocument(dto);

      for await (const chunk of stream) {
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      }

      res.write(`event: done\ndata: {}\n\n`);
      res.end();
    } catch (err) {
      console.error('PDF query stream error:', err);
      res.write(`event: error\ndata: ${JSON.stringify({ error: String(err) })}\n\n`);
      res.end();
    }
  }

  // ============================================================================
  // DOCUMENT MANAGEMENT
  // ============================================================================

  /**
   * GET /pdf/documents - List all uploaded documents
   */
  @Get('documents')
  listDocuments() {
    return this.pdfService.listDocuments();
  }

  /**
   * GET /pdf/documents/:id - Get document info
   */
  
  @Get('documents/:id')
  getDocument(@Param('id') id: string) {
    const document = this.pdfService.getDocument(id);
    if (!document) {
      throw new BadRequestException('Document not found');
    }
    return {
      id: document.id,
      name: document.originalName,
      pages: document.totalPages,
      chunks: document.totalChunks,
      uploadedAt: document.uploadedAt,
    };
  }

  /**
   * GET /pdf/documents/:id/text - Get full document text
   */
  @Get('documents/:id/text')
  getDocumentText(@Param('id') id: string) {
    return { text: this.pdfService.getDocumentText(id) };
  }

  /**
   * GET /pdf/documents/:id/summary - Get document summary
   */
  @Get('documents/:id/summary')
  getDocumentSummary(@Param('id') id: string) {
    return { summary: this.pdfService.getDocumentSummary(id) };
  }

  /**
   * DELETE /pdf/documents/:id - Delete a document
   */
  @Delete('documents/:id')
  deleteDocument(@Param('id') id: string) {
    const deleted = this.pdfService.deleteDocument(id);
    return { success: deleted, message: deleted ? 'Document deleted' : 'Document not found' };
  }

  // ============================================================================
  // MAP-REDUCE SUMMARIZATION
  // ============================================================================

  /**
   * POST /pdf/summarize - Summarize document or selected text
   * Body: { documentId, selectedText? }
   */
  @Post('summarize')
  async summarize(@Body() dto: SummarizeDto) {
    return this.pdfService.summarize(dto);
  }

  /**
   * POST /pdf/summarize/stream - Stream summarization with progress
   */
  @Post('summarize/stream')
  async summarizeStream(@Body() dto: SummarizeDto, @Res() res: Response) {
    res.set({
      'Cache-Control': 'no-cache',
      'Content-Type': 'text/event-stream',
      Connection: 'keep-alive',
    });
    res.flushHeaders();

    try {
      res.write(`data: ${JSON.stringify({ type: 'progress', message: 'Starting summarization...' })}\n\n`);
      
      const result = await this.pdfService.summarize(dto);
      
      for (const cs of result.chunkSummaries) {
        res.write(`data: ${JSON.stringify({ type: 'chunk_summary', chunkId: cs.chunkId, summary: cs.summary, pageNumber: cs.pageNumber })}\n\n`);
      }
      
      res.write(`data: ${JSON.stringify({ 
        type: 'final_summary', 
        summary: result.summary, 
        sources: result.sources,
        processingTime: result.processingTime 
      })}\n\n`);
      res.write(`event: done\ndata: {}\n\n`);
      res.end();
    } catch (err) {
      console.error('Summarization stream error:', err);
      res.write(`event: error\ndata: ${JSON.stringify({ error: String(err) })}\n\n`);
      res.end();
    }
  }

  // ============================================================================
  // CONFIGURATION (For experimentation)
  // ============================================================================

  /**
   * GET /pdf/config - Get current PDF processing config
   */
  @Get('config')
  getConfig() {
    return this.pdfService.getConfig();
  }

  /**
   * PATCH /pdf/config - Update PDF processing config
   * Body: Partial config updates
   */
  @Patch('config')
  updateConfig(@Body() updates: Partial<typeof PDF_CONFIG>) {
    return this.pdfService.updateConfig(updates);
  }

  // ============================================================================
  // CONVERSATION SESSIONS (Short-Term Memory)
  // ============================================================================

  /**
   * GET /pdf/sessions - List all active conversation sessions
   */
  @Get('sessions')
  listSessions() {
    return this.pdfService.listSessions();
  }

  /**
   * GET /pdf/sessions/:id - Get session details including conversation history
   */
  @Get('sessions/:id')
  getSession(@Param('id') id: string) {
    const session = this.pdfService.getSession(id);
    if (!session) {
      throw new BadRequestException('Session not found');
    }
    return session;
  }

  /**
   * DELETE /pdf/sessions/:id - Delete a conversation session
   */
  @Delete('sessions/:id')
  deleteSession(@Param('id') id: string) {
    const deleted = this.pdfService.deleteSession(id);
    return { success: deleted, message: deleted ? 'Session deleted' : 'Session not found' };
  }

  /**
   * DELETE /pdf/documents/:id/sessions - Clear all sessions for a document
   */
  @Delete('documents/:id/sessions')
  clearDocumentSessions(@Param('id') id: string) {
    const cleared = this.pdfService.clearDocumentSessions(id);
    return { success: true, message: `Cleared ${cleared} sessions` };
  }

  /**
   * GET /pdf/health - Health check
   */
  @Get('health')
  health() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'pdf',
      config: this.pdfService.getConfig(),
      activeSessions: this.pdfService.listSessions().length,
    };
  }
}
