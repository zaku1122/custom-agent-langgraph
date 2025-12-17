import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PDFParse } from 'pdf-parse';
import { v4 as uuidv4 } from 'uuid';
import {
  PdfDocument,
  PdfChunk,
  PdfQueryDto,
  PdfQueryResponse,
  PdfUploadResponse,
  Citation,
  PdfStreamChunk,
} from './dto/pdf.dto';
import { chatClient, azureConfig } from '../config/azure';

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);
  
  // In-memory storage (in production, use a database + vector store)
  private documents: Map<string, PdfDocument> = new Map();

  // ============================================================================
  // PDF UPLOAD & PROCESSING
  // ============================================================================

  async uploadAndProcess(file: Express.Multer.File): Promise<PdfUploadResponse> {
    this.logger.log(`Processing PDF: ${file.originalname}`);

    if (!file.buffer) {
      throw new BadRequestException('No file buffer provided');
    }

    try {
      // Parse PDF using new pdf-parse v2 API
      const parser = new PDFParse({ data: file.buffer });
      const textResult = await parser.getText();
      const infoResult = await parser.getInfo();
      await parser.destroy();
      
      const documentId = uuidv4();
      const fullText = textResult.text;
      // Get page count - pages is an array in v2
      const totalPages = textResult.pages?.length || infoResult.pages?.length || 1;
      
      const chunks = this.chunkText(fullText, documentId, totalPages);
      
      // Create document
      const document: PdfDocument = {
        id: documentId,
        filename: `${documentId}.pdf`,
        originalName: file.originalname,
        uploadedAt: new Date(),
        totalPages,
        totalChunks: chunks.length,
        chunks,
      };
      
      // Store document
      this.documents.set(documentId, document);
      
      this.logger.log(`PDF processed: ${document.totalChunks} chunks from ${document.totalPages} pages`);

      return {
        success: true,
        documentId,
        filename: file.originalname,
        totalPages: document.totalPages,
        totalChunks: document.totalChunks,
        preview: fullText.substring(0, 500),
        message: `Successfully processed ${file.originalname}`,
      };
    } catch (error: any) {
      this.logger.error(`PDF processing error: ${error.message}`);
      throw new BadRequestException(`Failed to process PDF: ${error.message}`);
    }
  }

  // ============================================================================
  // TEXT CHUNKING
  // ============================================================================

  private chunkText(
    text: string,
    documentId: string,
    totalPages: number,
    chunkSize: number = 1000,
    overlap: number = 200
  ): PdfChunk[] {
    const chunks: PdfChunk[] = [];
    
    // Clean text
    const cleanText = text
      .replace(/\s+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    
    // Estimate characters per page
    const charsPerPage = Math.ceil(cleanText.length / totalPages);
    
    let startChar = 0;
    let chunkIndex = 0;

    while (startChar < cleanText.length) {
      const endChar = Math.min(startChar + chunkSize, cleanText.length);
      
      // Try to end at sentence boundary
      let adjustedEnd = endChar;
      if (endChar < cleanText.length) {
        const lastPeriod = cleanText.lastIndexOf('.', endChar);
        if (lastPeriod > startChar + chunkSize / 2) {
          adjustedEnd = lastPeriod + 1;
        }
      }
      
      const content = cleanText.substring(startChar, adjustedEnd).trim();
      
      // Estimate page number
      const pageNumber = Math.min(
        Math.ceil((startChar / charsPerPage) + 1),
        totalPages
      );

      if (content.length > 0) {
        chunks.push({
          id: `${documentId}-chunk-${chunkIndex}`,
          documentId,
          pageNumber,
          chunkIndex,
          content,
          startChar,
          endChar: adjustedEnd,
        });
        chunkIndex++;
      }
      
      // Move forward with overlap
      startChar = adjustedEnd - overlap;
      if (startChar <= chunks[chunks.length - 1]?.startChar) {
        startChar = adjustedEnd;
      }
    }

    return chunks;
  }

  // ============================================================================
  // PDF Q&A WITH CITATIONS
  // ============================================================================

  async queryDocument(dto: PdfQueryDto): Promise<PdfQueryResponse> {
    const document = this.documents.get(dto.documentId);
    
    if (!document) {
      throw new NotFoundException(`Document not found: ${dto.documentId}`);
    }

    this.logger.log(`Querying document ${dto.documentId}: ${dto.query}`);

    // Find relevant chunks
    const relevantChunks = await this.findRelevantChunks(document, dto.query, dto.selectedText);
    
    // Generate answer with citations
    const { answer, citedChunks } = await this.generateAnswerWithCitations(
      dto.query,
      relevantChunks,
      dto.selectedText
    );

    // Format citations
    const citations: Citation[] = citedChunks.map((chunk, index) => ({
      pageNumber: chunk.pageNumber,
      chunkId: chunk.id,
      text: chunk.content.substring(0, 200) + (chunk.content.length > 200 ? '...' : ''),
      relevanceScore: 1 - index * 0.1, // Decreasing relevance
      startChar: chunk.startChar,
      endChar: chunk.endChar,
    }));

    return {
      answer,
      citations,
      documentId: dto.documentId,
      confidence: citations.length > 0 ? 0.9 : 0.5,
    };
  }

  // ============================================================================
  // STREAMING Q&A
  // ============================================================================

  async *streamQueryDocument(dto: PdfQueryDto): AsyncGenerator<PdfStreamChunk> {
    const document = this.documents.get(dto.documentId);
    
    if (!document) {
      yield {
        type: 'error',
        content: `Document not found: ${dto.documentId}`,
        timestamp: new Date().toISOString(),
      };
      return;
    }

    yield {
      type: 'processing',
      content: { message: 'Analyzing document...' },
      timestamp: new Date().toISOString(),
    };

    // Find relevant chunks
    const relevantChunks = await this.findRelevantChunks(document, dto.query, dto.selectedText);

    // Emit citations first
    for (const chunk of relevantChunks.slice(0, 3)) {
      yield {
        type: 'citation',
        content: {
          pageNumber: chunk.pageNumber,
          chunkId: chunk.id,
          text: chunk.content.substring(0, 200) + (chunk.content.length > 200 ? '...' : ''),
          startChar: chunk.startChar,
          endChar: chunk.endChar,
        },
        timestamp: new Date().toISOString(),
      };
    }

    // Stream the answer
    const answerStream = await this.streamAnswerGeneration(dto.query, relevantChunks, dto.selectedText);

    for await (const chunk of answerStream) {
      yield {
        type: 'text_chunk',
        content: chunk,
        timestamp: new Date().toISOString(),
      };
    }

    yield {
      type: 'complete',
      content: { message: 'Query complete' },
      timestamp: new Date().toISOString(),
    };
  }

  // ============================================================================
  // RELEVANCE SCORING (Simple keyword-based, can be upgraded to embeddings)
  // ============================================================================

  private async findRelevantChunks(
    document: PdfDocument,
    query: string,
    selectedText?: string
  ): Promise<PdfChunk[]> {
    const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    
    // Score chunks by keyword overlap
    const scoredChunks = document.chunks.map(chunk => {
      const contentLower = chunk.content.toLowerCase();
      let score = 0;
      
      // Keyword matching
      for (const word of queryWords) {
        if (contentLower.includes(word)) {
          score += 1;
        }
      }
      
      // Boost if selected text matches
      if (selectedText && chunk.content.includes(selectedText)) {
        score += 5;
      }
      
      return { chunk, score };
    });

    // Sort by score and return top chunks
    return scoredChunks
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .filter(sc => sc.score > 0)
      .map(sc => sc.chunk);
  }

  // ============================================================================
  // ANSWER GENERATION WITH CITATIONS
  // ============================================================================

  private async generateAnswerWithCitations(
    query: string,
    relevantChunks: PdfChunk[],
    selectedText?: string
  ): Promise<{ answer: string; citedChunks: PdfChunk[] }> {
    
    if (relevantChunks.length === 0) {
      return {
        answer: "I couldn't find relevant information in the document to answer your question. Please try rephrasing or selecting a specific section.",
        citedChunks: [],
      };
    }

    // Build context from chunks
    const context = relevantChunks
      .map((chunk, i) => `[Source ${i + 1}, Page ${chunk.pageNumber}]:\n${chunk.content}`)
      .join('\n\n');

    const systemPrompt = `You are a helpful assistant answering questions about a PDF document.
Use ONLY the provided context to answer. If the context doesn't contain the answer, say so.
Always cite your sources using [Source X] notation.

${selectedText ? `The user has selected this specific text: "${selectedText}"` : ''}

Context from the document:
${context}`;

    try {
      const response = await chatClient.chat.completions.create({
        model: azureConfig.chat.deployment,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: query },
        ],
        max_tokens: 1000,
        temperature: 0.3,
      });

      const answer = response.choices[0]?.message?.content || 'Unable to generate response';
      
      // Determine which chunks were actually cited
      const citedChunks = relevantChunks.filter((_, i) => 
        answer.includes(`[Source ${i + 1}]`)
      );

      return {
        answer,
        citedChunks: citedChunks.length > 0 ? citedChunks : relevantChunks.slice(0, 2),
      };
    } catch (error: any) {
      this.logger.error(`Answer generation error: ${error.message}`);
      return {
        answer: `Error generating answer: ${error.message}`,
        citedChunks: [],
      };
    }
  }

  // ============================================================================
  // STREAMING ANSWER GENERATION
  // ============================================================================

  private async *streamAnswerGeneration(
    query: string,
    relevantChunks: PdfChunk[],
    selectedText?: string
  ): AsyncGenerator<string> {
    
    if (relevantChunks.length === 0) {
      yield "I couldn't find relevant information in the document to answer your question.";
      return;
    }

    const context = relevantChunks
      .map((chunk, i) => `[Source ${i + 1}, Page ${chunk.pageNumber}]:\n${chunk.content}`)
      .join('\n\n');

    const systemPrompt = `You are a helpful assistant answering questions about a PDF document.
Use ONLY the provided context to answer. Always cite sources using [Source X] notation.

${selectedText ? `User selected: "${selectedText}"` : ''}

Context:
${context}`;

    try {
      const stream = await chatClient.chat.completions.create({
        model: azureConfig.chat.deployment,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: query },
        ],
        max_tokens: 1000,
        temperature: 0.3,
        stream: true,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          yield content;
        }
      }
    } catch (error: any) {
      yield `Error: ${error.message}`;
    }
  }

  // ============================================================================
  // DOCUMENT MANAGEMENT
  // ============================================================================

  getDocument(documentId: string): PdfDocument | undefined {
    return this.documents.get(documentId);
  }

  getDocumentText(documentId: string): string {
    const document = this.documents.get(documentId);
    if (!document) {
      throw new NotFoundException(`Document not found: ${documentId}`);
    }
    return document.chunks.map(c => c.content).join(' ');
  }

  listDocuments(): Array<{ id: string; name: string; pages: number; uploadedAt: Date }> {
    return Array.from(this.documents.values()).map(doc => ({
      id: doc.id,
      name: doc.originalName,
      pages: doc.totalPages,
      uploadedAt: doc.uploadedAt,
    }));
  }

  deleteDocument(documentId: string): boolean {
    return this.documents.delete(documentId);
  }
}
