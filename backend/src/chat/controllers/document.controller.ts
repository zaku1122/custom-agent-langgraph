import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  Body,
  Get,
  Param,
  Delete,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentLoaderService, LoadedDocument } from '../services/document-loader.service';
import type { Response } from 'express';

// In-memory document storage (use Redis/DB in production)
const documentStore = new Map<string, LoadedDocument>();

@Controller('documents')
export class DocumentController {
  constructor(private readonly documentLoader: DocumentLoaderService) {}

  /**
   * Upload and process any supported document type
   * Supports: PDF, DOCX, TXT, MD, CSV, PNG, JPG, WEBP, GIF
   */
  @Post('upload')
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
  }))
  async uploadDocument(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Load and process document
    const doc = await this.documentLoader.loadDocument(file);
    
    // Generate document ID
    const documentId = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    // Store document
    documentStore.set(documentId, doc);

    // Analyze document
    const analysis = await this.documentLoader.analyzeDocument(doc);

    return {
      success: true,
      documentId,
      filename: doc.filename,
      type: doc.type,
      pageCount: doc.pageCount,
      contentLength: doc.content.length,
      analysis,
      preview: doc.content.substring(0, 500) + (doc.content.length > 500 ? '...' : ''),
    };
  }

  /**
   * Query uploaded document
   */
  @Post('query')
  async queryDocument(@Body() body: { documentId: string; query: string }) {
    const doc = documentStore.get(body.documentId);
    
    if (!doc) {
      throw new BadRequestException('Document not found. Please upload again.');
    }

    const answer = await this.documentLoader.queryDocument(doc, body.query);

    return {
      success: true,
      answer,
      documentId: body.documentId,
      documentType: doc.type,
    };
  }

  /**
   * Stream query response
   */
  @Post('query/stream')
  async streamQuery(
    @Body() body: { documentId: string; query: string },
    @Res() res: Response,
  ) {
    const doc = documentStore.get(body.documentId);
    
    if (!doc) {
      res.status(400).json({ error: 'Document not found' });
      return;
    }

    res.set({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    res.flushHeaders();

    try {
      // Send document info
      res.write(`data: ${JSON.stringify({ 
        type: 'info', 
        content: { documentType: doc.type, filename: doc.filename } 
      })}\n\n`);

      // Stream answer
      const stream = this.documentLoader.streamQueryDocument(doc, body.query);
      
      for await (const chunk of stream) {
        res.write(`data: ${JSON.stringify({ type: 'text_chunk', content: chunk })}\n\n`);
      }

      res.write(`event: done\ndata: {}\n\n`);
      res.end();
    } catch (error: any) {
      res.write(`event: error\ndata: ${JSON.stringify({ error: error.message })}\n\n`);
      res.end();
    }
  }

  /**
   * Get document info
   */
  @Get(':id')
  async getDocument(@Param('id') id: string) {
    const doc = documentStore.get(id);
    
    if (!doc) {
      throw new BadRequestException('Document not found');
    }

    return {
      documentId: id,
      filename: doc.filename,
      type: doc.type,
      pageCount: doc.pageCount,
      contentLength: doc.content.length,
      preview: doc.content.substring(0, 500),
    };
  }

  /**
   * Delete document
   */
  @Delete(':id')
  async deleteDocument(@Param('id') id: string) {
    const deleted = documentStore.delete(id);
    
    return {
      success: deleted,
      message: deleted ? 'Document deleted' : 'Document not found',
    };
  }

  /**
   * List all uploaded documents
   */
  @Get()
  async listDocuments() {
    const documents = Array.from(documentStore.entries()).map(([id, doc]) => ({
      documentId: id,
      filename: doc.filename,
      type: doc.type,
      contentLength: doc.content.length,
    }));

    return {
      count: documents.length,
      documents,
    };
  }

  /**
   * Get supported file types
   */
  @Get('supported/types')
  getSupportedTypes() {
    return {
      extensions: this.documentLoader.getSupportedExtensions(),
      accept: '.pdf,.docx,.doc,.txt,.md,.csv,.png,.jpg,.jpeg,.webp,.gif',
    };
  }
}

