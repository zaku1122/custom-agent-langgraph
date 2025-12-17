import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PdfService } from './pdf.service';
import { PdfQueryDto } from './dto/pdf.dto';
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
  async uploadPdf(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    return this.pdfService.uploadAndProcess(file);
  }

  // ============================================================================
  // PDF QUERY (Non-streaming)
  // ============================================================================

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
   * DELETE /pdf/documents/:id - Delete a document
   */
  @Delete('documents/:id')
  deleteDocument(@Param('id') id: string) {
    const deleted = this.pdfService.deleteDocument(id);
    return { success: deleted, message: deleted ? 'Document deleted' : 'Document not found' };
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
    };
  }
}

