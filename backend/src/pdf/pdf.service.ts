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
  SummarySource,
  ChunkSummaryWithSource,
  SummarizeDto,
  SummarizeResponse,
  ConversationSession,
  ConversationMessage,
  ChunkingConfig,
  DEFAULT_CHUNKING_CONFIG,
  DEFAULT_MEMORY_CONFIG,
} from './dto/pdf.dto';
import { chatClient, embeddingsClient, azureConfig } from '../config/azure';

// ============================================================================
// CONFIGURABLE PARAMETERS
// ============================================================================

export const PDF_CONFIG = {
  chunking: { ...DEFAULT_CHUNKING_CONFIG },
  embeddings: {
    batchSize: 20,
    enabled: false, // Disabled by default - not needed for basic Q&A, slows upload
  },
  summarization: {
    mapMaxTokens: 200,
    reduceMaxTokens: 1500,
    temperature: 0.3,
    maxChunksToSummarize: 50,
    quickSummaryMaxChars: 4000, // For fast single-call summary on upload
  },
  search: {
    topK: 5,
    minSimilarity: 0.5,
  },
  memory: { ...DEFAULT_MEMORY_CONFIG, cleanupIntervalMs: 5 * 60 * 1000 },
};

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);
  
  // In-memory storage (in production, use a database + vector store)
  private documents: Map<string, PdfDocument> = new Map();
  private sessions: Map<string, ConversationSession> = new Map();

  constructor() {
    // Cleanup expired sessions periodically
    setInterval(() => {
      this.cleanupExpiredSessions();
    }, PDF_CONFIG.memory.cleanupIntervalMs);
  }

  // ============================================================================
  // PDF UPLOAD & PROCESSING
  // ============================================================================

  async uploadAndProcess(file: Express.Multer.File, configOverrides?: Partial<ChunkingConfig>): Promise<PdfUploadResponse> {
    const startTime = Date.now();
    this.logger.log(`Processing PDF: ${file.originalname}`);

    if (!file.buffer) {
      throw new BadRequestException('No file buffer provided');
    }

    // Merge config
    const chunkingConfig: ChunkingConfig = {
      ...PDF_CONFIG.chunking,
      ...configOverrides,
    };
    this.logger.log(`Chunking with size=${chunkingConfig.chunkSize}, overlap=${chunkingConfig.overlap}`);

    try {
      // Parse PDF
      this.logger.log('Parsing PDF buffer...');
      const parser = new PDFParse({ data: file.buffer });
      this.logger.log('Getting text from PDF...');
      const textResult = await parser.getText();
      this.logger.log(`Text extracted: ${textResult.text?.length || 0} chars`);
      const infoResult = await parser.getInfo();
      await parser.destroy();
      
      const documentId = uuidv4();
      const fullText = textResult.text;
      const totalPages = textResult.pages?.length || infoResult.pages?.length || 1;
      this.logger.log(`PDF has ${totalPages} pages, ${fullText.length} chars`);
      
      // Chunk with configured params
      this.logger.log('Starting chunking...');
      let chunks: PdfChunk[];
      try {
        chunks = this.chunkText(fullText, documentId, totalPages, chunkingConfig);
        this.logger.log(`Created ${chunks.length} chunks`);
      } catch (chunkError: any) {
        this.logger.error(`Chunking failed: ${chunkError.message}`);
        throw chunkError;
      }
      
      // Generate embeddings if enabled (disabled by default for speed)
      if (PDF_CONFIG.embeddings.enabled) {
        await this.generateEmbeddings(chunks);
      }

      // SKIP summary for speed - just return basic document info
      this.logger.log(`Skipping summary for speed - ${chunks.length} chunks ready`);
      const summaryResult = {
        summary: `Document uploaded: ${file.originalname} - ${totalPages} pages, ${chunks.length} sections. Ask questions to explore the content.`,
        sources: chunks.slice(0, 3).map((chunk, index) => ({
          pageNumber: chunk.pageNumber,
          chunkId: chunk.id,
          chunkIndex: index,
          text: chunk.content,
          preview: chunk.content.substring(0, 150) + '...',
          contribution: `Page ${chunk.pageNumber} content`,
        })),
      };

      // Create document
      const document: PdfDocument = {
        id: documentId,
        filename: `${documentId}.pdf`,
        originalName: file.originalname,
        uploadedAt: new Date(),
        totalPages,
        totalChunks: chunks.length,
        chunks,
        fullText,
        summary: summaryResult.summary,
        chunkingConfig,
      };
      
      this.documents.set(documentId, document);
      
      const processingTime = Date.now() - startTime;
      this.logger.log(`PDF processed in ${processingTime}ms: ${document.totalChunks} chunks from ${document.totalPages} pages`);

      return {
        success: true,
        documentId,
        filename: file.originalname,
        totalPages: document.totalPages,
        totalChunks: document.totalChunks,
        preview: fullText.substring(0, 500),
        message: `Successfully processed ${file.originalname}`,
        summary: summaryResult.summary,
        summarySources: summaryResult.sources,
        chunkingConfig,
      };
    } catch (error: any) {
      this.logger.error(`PDF processing error: ${error.message}`);
      throw new BadRequestException(`Failed to process PDF: ${error.message}`);
    }
  }

  // ============================================================================
  // EMBEDDINGS
  // ============================================================================

  private async generateEmbeddings(chunks: PdfChunk[]): Promise<void> {
    this.logger.log(`Generating embeddings for ${chunks.length} chunks...`);
    
    const batchSize = PDF_CONFIG.embeddings.batchSize;
    const batches = Math.ceil(chunks.length / batchSize);

    for (let i = 0; i < batches; i++) {
      const batch = chunks.slice(i * batchSize, (i + 1) * batchSize);
      const texts = batch.map(c => c.content);

      try {
        const response = await embeddingsClient.embeddings.create({
          model: azureConfig.embeddings.deployment,
          input: texts,
        });

        response.data.forEach((item, idx) => {
          batch[idx].embedding = item.embedding;
        });

        this.logger.debug(`Embedded batch ${i + 1}/${batches}`);
      } catch (error: any) {
        this.logger.warn(`Embedding batch failed: ${error.message}. Continuing without embeddings.`);
      }
    }
  }

  // ============================================================================
  // TEXT CHUNKING
  // ============================================================================

  private chunkText(
    text: string,
    documentId: string,
    totalPages: number,
    config: ChunkingConfig
  ): PdfChunk[] {
    const chunks: PdfChunk[] = [];
    const { chunkSize, overlap, minChunkSize } = config;
    
    // Simple clean - avoid complex regex that might hang
    const cleanText = text.trim();
    const charsPerPage = Math.max(1, Math.ceil(cleanText.length / Math.max(1, totalPages)));
    
    let startChar = 0;
    let chunkIndex = 0;
    const maxChunks = 1000; // Safety limit

    while (startChar < cleanText.length && chunkIndex < maxChunks) {
      const endChar = Math.min(startChar + chunkSize, cleanText.length);
      const content = cleanText.substring(startChar, endChar).trim();
      const pageNumber = Math.min(Math.ceil((startChar / charsPerPage) + 1), totalPages);

      if (content.length >= minChunkSize) {
        chunks.push({
          id: `${documentId}-chunk-${chunkIndex}`,
          documentId,
          pageNumber,
          chunkIndex,
          content,
          startChar,
          endChar,
        });
        chunkIndex++;
      }
      
      // Simple advance - guaranteed progress
      const nextStart = endChar - overlap;
      startChar = nextStart > startChar ? nextStart : endChar;
    }

    return chunks;
  }

  // ============================================================================
  // FAST SINGLE-CALL SUMMARIZATION (Used on upload for speed)
  // ============================================================================

  private async quickSummarize(fullText: string, chunks: PdfChunk[]): Promise<{ summary: string; sources: SummarySource[] }> {
    const startTime = Date.now();
    this.logger.log(`Quick summarizing document (${fullText.length} chars, ${chunks.length} chunks)...`);

    // Take first N chars for summary (covers first few pages)
    const textToSummarize = fullText.substring(0, PDF_CONFIG.summarization.quickSummaryMaxChars);
    
    // Find which chunks are covered by this text
    const coveredChunks = chunks.filter(c => c.startChar < PDF_CONFIG.summarization.quickSummaryMaxChars);
    
    try {
      const response = await chatClient.chat.completions.create({
        model: azureConfig.chat.deployment,
        messages: [
          {
            role: 'system',
            content: `You are a document summarizer. Create a comprehensive summary of this document.
Include main topics, key points, and important details.
Use [Source X] citations to reference specific sections (where X is 1, 2, 3, etc.).
Structure your response with clear paragraphs.`,
          },
          {
            role: 'user',
            content: `Summarize this document:\n\n${textToSummarize}${fullText.length > PDF_CONFIG.summarization.quickSummaryMaxChars ? '\n\n[Document continues...]' : ''}`,
          },
        ],
        max_tokens: PDF_CONFIG.summarization.reduceMaxTokens,
        temperature: PDF_CONFIG.summarization.temperature,
      });

      const summary = response.choices[0]?.message?.content || 'Summary generation failed';
      
      // Create sources from covered chunks
      const sources: SummarySource[] = coveredChunks.slice(0, 10).map((chunk, index) => ({
        pageNumber: chunk.pageNumber,
        chunkId: chunk.id,
        chunkIndex: index,
        text: chunk.content,
        preview: chunk.content.substring(0, 150) + (chunk.content.length > 150 ? '...' : ''),
        contribution: `Content from page ${chunk.pageNumber}`,
      }));

      const processingTime = Date.now() - startTime;
      this.logger.log(`Quick summary completed in ${processingTime}ms`);

      return { summary, sources };
    } catch (error: any) {
      this.logger.error(`Quick summarization failed: ${error.message}`);
      return { 
        summary: 'Failed to generate summary. You can still ask questions about the document.',
        sources: [] 
      };
    }
  }

  // ============================================================================
  // MAP-REDUCE SUMMARIZATION (For detailed on-demand summarization)
  // ============================================================================

  private async mapSummarizeChunks(chunks: PdfChunk[]): Promise<ChunkSummaryWithSource[]> {
    this.logger.log(`Map step: Summarizing ${chunks.length} chunks with precise tracking...`);
    
    const summaries: ChunkSummaryWithSource[] = [];
    const batchSize = 5;

    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (chunk, idx) => {
        const globalIdx = i + idx;
        try {
          const response = await chatClient.chat.completions.create({
            model: azureConfig.chat.deployment,
            messages: [
              {
                role: 'system',
                content: `Extract the main point from this text in ONE clear sentence. Be specific and precise.`,
              },
              { role: 'user', content: chunk.content },
            ],
            max_tokens: 100,
            temperature: 0.2,
          });

          const summary = response.choices[0]?.message?.content || '';
          
          // Create a better preview - find the first complete sentence
          const firstSentence = this.extractFirstSentence(chunk.content);
          
          return {
            chunkId: chunk.id,
            chunkIndex: globalIdx,
            summary,
            pageNumber: chunk.pageNumber,
            sourceText: chunk.content,
            sourcePreview: firstSentence,
          };
        } catch (error: any) {
          this.logger.warn(`Chunk ${chunk.id} summary failed: ${error.message}`);
          return {
            chunkId: chunk.id,
            chunkIndex: globalIdx,
            summary: this.extractFirstSentence(chunk.content),
            pageNumber: chunk.pageNumber,
            sourceText: chunk.content,
            sourcePreview: this.extractFirstSentence(chunk.content),
          };
        }
      });

      const results = await Promise.all(batchPromises);
      summaries.push(...results);
    }

    return summaries;
  }

  // Helper to extract first meaningful sentence from text
  private extractFirstSentence(text: string): string {
    const cleaned = text.replace(/\s+/g, ' ').trim();
    // Find first sentence ending with . ! or ?
    const match = cleaned.match(/^[^.!?]*[.!?]/);
    if (match && match[0].length > 20) {
      return match[0].trim();
    }
    // Fallback: first 120 chars
    return cleaned.substring(0, 120) + (cleaned.length > 120 ? '...' : '');
  }

  private async reduceSummaries(chunkSummaries: ChunkSummaryWithSource[]): Promise<string> {
    this.logger.log(`Reduce step: Combining ${chunkSummaries.length} sources into detailed summary...`);
    
    // Create context with source numbers and page info
    const combinedContext = chunkSummaries
      .map((cs) => `[${cs.chunkIndex + 1}] Page ${cs.pageNumber}: "${cs.summary}"`)
      .join('\n');

    try {
      const response = await chatClient.chat.completions.create({
        model: azureConfig.chat.deployment,
        messages: [
          {
            role: 'system',
            content: `Create a comprehensive summary of this document using the provided sources.

CITATION RULES (FOLLOW EXACTLY):
- Cite sources as [1], [2], [3] etc.
- Place citation immediately after the relevant fact
- Be specific: cite the exact source that supports each statement
- Example: "Attention mechanisms allow modeling dependencies [3]. The model uses 512 dimensions [7]."

FORMAT: Write clear paragraphs. Each key fact should have a citation.`,
          },
          { role: 'user', content: `Sources:\n${combinedContext}\n\nCreate a detailed summary with precise citations:` },
        ],
        max_tokens: PDF_CONFIG.summarization.reduceMaxTokens,
        temperature: 0.2,
      });

      return response.choices[0]?.message?.content || 'Summary generation failed';
    } catch (error: any) {
      this.logger.error(`Reduce step failed: ${error.message}`);
      return 'Failed to generate summary';
    }
  }

  async mapReduceSummarize(chunks: PdfChunk[]): Promise<{ summary: string; sources: SummarySource[] }> {
    const startTime = Date.now();
    
    const chunksToSummarize = chunks.slice(0, PDF_CONFIG.summarization.maxChunksToSummarize);
    const chunkSummaries = await this.mapSummarizeChunks(chunksToSummarize);
    const finalSummary = await this.reduceSummaries(chunkSummaries);
    
    const sources: SummarySource[] = chunkSummaries.map((cs, index) => ({
      pageNumber: cs.pageNumber,
      chunkId: cs.chunkId,
      chunkIndex: index,
      text: cs.sourceText,
      preview: cs.sourcePreview,
      contribution: cs.summary,
    }));

    const processingTime = Date.now() - startTime;
    this.logger.log(`Map-reduce complete in ${processingTime}ms with ${sources.length} chunk-level sources`);

    return { summary: finalSummary, sources };
  }

  async summarize(dto: SummarizeDto): Promise<SummarizeResponse> {
    const document = this.documents.get(dto.documentId);
    if (!document) {
      throw new NotFoundException(`Document not found: ${dto.documentId}`);
    }

    const startTime = Date.now();
    const chunksToSummarize = document.chunks.slice(0, PDF_CONFIG.summarization.maxChunksToSummarize);
    const chunkSummaries = await this.mapSummarizeChunks(chunksToSummarize);
    const summary = await this.reduceSummaries(chunkSummaries);

    const sources: SummarySource[] = chunkSummaries.map((cs, index) => ({
      pageNumber: cs.pageNumber,
      chunkId: cs.chunkId,
      chunkIndex: index,
      text: cs.sourceText,
      preview: cs.sourcePreview,
      contribution: cs.summary,
    }));

    return {
      summary,
      documentId: dto.documentId,
      chunkSummaries,
      sources,
      processingTime: Date.now() - startTime,
    };
  }

  // ============================================================================
  // CONVERSATION MEMORY
  // ============================================================================

  getOrCreateSession(documentId: string, sessionId?: string): ConversationSession {
    if (sessionId && this.sessions.has(sessionId)) {
      const session = this.sessions.get(sessionId)!;
      if (session.documentId === documentId) {
        session.lastActivityAt = new Date();
        return session;
      }
    }

    const doc = this.documents.get(documentId);
    const newSession: ConversationSession = {
      id: uuidv4(),
      documentId,
      documentName: doc?.originalName || 'Unknown',
      messages: [],
      createdAt: new Date(),
      lastActivityAt: new Date(),
    };

    this.sessions.set(newSession.id, newSession);
    this.logger.log(`Created new conversation session: ${newSession.id} for document: ${documentId}`);
    return newSession;
  }

  addMessageToSession(session: ConversationSession, role: 'user' | 'assistant', content: string, citations?: Citation[]) {
    session.messages.push({ role, content, timestamp: new Date(), citations });
    session.lastActivityAt = new Date();

    while (session.messages.length > PDF_CONFIG.memory.maxMessages * 2) {
      session.messages.shift();
      session.messages.shift();
    }
  }

  buildConversationContext(session: ConversationSession): string {
    if (session.messages.length === 0) return '';
    const recent = session.messages.slice(-PDF_CONFIG.memory.maxMessages);
    return recent.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n');
  }

  private cleanupExpiredSessions() {
    const now = Date.now();
    let cleaned = 0;
    for (const [id, session] of this.sessions.entries()) {
      if (now - session.lastActivityAt.getTime() > PDF_CONFIG.memory.sessionTimeoutMs) {
        this.sessions.delete(id);
        cleaned++;
      }
    }
    if (cleaned > 0) {
      this.logger.log(`Cleaned up ${cleaned} expired conversation sessions`);
    }
  }

  // ============================================================================
  // PDF Q&A WITH CITATIONS
  // ============================================================================

  async queryDocument(dto: PdfQueryDto): Promise<PdfQueryResponse> {
    const document = this.documents.get(dto.documentId);
    
    if (!document) {
      throw new NotFoundException(`Document not found: ${dto.documentId}`);
    }

    const session = this.getOrCreateSession(dto.documentId, dto.sessionId);
    const conversationHistory = this.buildConversationContext(session);
    
    this.logger.log(`Querying document ${dto.documentId} (session: ${session.id}): ${dto.query}`);
    this.addMessageToSession(session, 'user', dto.query);

    const relevantChunks = await this.findRelevantChunks(document, dto.query, dto.selectedText, dto.selectedPage);
    
    const { answer, citedChunks } = await this.generateAnswerWithCitations(
      dto.query,
      relevantChunks,
      dto.selectedText,
      conversationHistory
    );

    const citations: Citation[] = citedChunks.map((chunk, index) => ({
      pageNumber: chunk.pageNumber,
      chunkId: chunk.id,
      text: chunk.content.substring(0, 200) + (chunk.content.length > 200 ? '...' : ''),
      relevanceScore: 1 - index * 0.1,
      startChar: chunk.startChar,
      endChar: chunk.endChar,
    }));

    this.addMessageToSession(session, 'assistant', answer, citations);

    return {
      answer,
      citations,
      documentId: dto.documentId,
      confidence: citations.length > 0 ? 0.9 : 0.5,
      sessionId: session.id,
      conversationLength: session.messages.length,
    };
  }

  // ============================================================================
  // STREAMING Q&A
  // ============================================================================

  async *streamQueryDocument(dto: PdfQueryDto): AsyncGenerator<PdfStreamChunk> {
    const document = this.documents.get(dto.documentId);
    
    if (!document) {
      yield { type: 'error', content: `Document not found: ${dto.documentId}`, timestamp: new Date().toISOString() };
      return;
    }

    const session = this.getOrCreateSession(dto.documentId, dto.sessionId);
    const conversationHistory = this.buildConversationContext(session);
    this.addMessageToSession(session, 'user', dto.query);

    yield {
      type: 'processing',
      content: { message: 'Finding relevant sections...', sessionId: session.id, conversationLength: session.messages.length },
      timestamp: new Date().toISOString(),
    };

    const relevantChunks = await this.findRelevantChunks(document, dto.query, dto.selectedText, dto.selectedPage);

    // Send relevant sources for this specific query (not the upload sources)
    const querySources: SummarySource[] = relevantChunks.slice(0, 5).map((chunk, index) => ({
      pageNumber: chunk.pageNumber,
      chunkId: chunk.id,
      chunkIndex: index,
      text: chunk.content, // Full text for highlighting
      preview: this.extractFirstSentence(chunk.content),
      contribution: `Relevant section from page ${chunk.pageNumber}`,
    }));

    yield {
      type: 'sources',
      content: querySources,
      timestamp: new Date().toISOString(),
    };

    let fullAnswer = '';
    const answerStream = await this.streamAnswerGeneration(dto.query, relevantChunks, dto.selectedText, conversationHistory);

    for await (const chunk of answerStream) {
      fullAnswer += chunk;
      yield { type: 'text_chunk', content: chunk, timestamp: new Date().toISOString() };
    }

    this.addMessageToSession(session, 'assistant', fullAnswer);

    yield {
      type: 'complete',
      content: { message: 'Query complete', sessionId: session.id, conversationLength: session.messages.length },
      timestamp: new Date().toISOString(),
    };
  }

  // ============================================================================
  // RELEVANCE SCORING WITH PAGE PROXIMITY BOOST
  // ============================================================================

  private async findRelevantChunks(
    document: PdfDocument,
    query: string,
    selectedText?: string,
    selectedPage?: number
  ): Promise<PdfChunk[]> {
    const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    
    // If selectedPage is provided, ONLY search within page range (page-1, page, page+1)
    // This gives more precise and relevant references for selected text queries
    let chunksToSearch = document.chunks;
    
    if (selectedPage) {
      const minPage = Math.max(1, selectedPage - 1);
      const maxPage = selectedPage + 1;
      chunksToSearch = document.chunks.filter(
        c => c.pageNumber >= minPage && c.pageNumber <= maxPage
      );
      this.logger.debug(`Selected text context: searching pages ${minPage}-${maxPage} (${chunksToSearch.length} chunks)`);
    }
    
    const scoredChunks = chunksToSearch.map(chunk => {
      const contentLower = chunk.content.toLowerCase();
      let score = 0;
      
      // Query word matching
      for (const word of queryWords) {
        if (contentLower.includes(word)) score += 1;
      }
      
      // Boost if chunk contains the selected text
      if (selectedText) {
        const selectedLower = selectedText.toLowerCase();
        if (contentLower.includes(selectedLower)) {
          score += 10; // High boost for exact match
        } else {
          // Partial match - check for overlapping words
          const selectedWords = selectedLower.split(/\s+/).filter(w => w.length > 3);
          const matchedWords = selectedWords.filter(w => contentLower.includes(w));
          score += matchedWords.length * 2;
        }
      }

      // Same page as selection gets extra boost
      if (selectedPage && chunk.pageNumber === selectedPage) {
        score += 5;
      }
      
      return { chunk, score };
    });

    // Sort by score and return top results
    const results = scoredChunks
      .sort((a, b) => b.score - a.score)
      .slice(0, PDF_CONFIG.search.topK)
      .filter(sc => sc.score > 0)
      .map(sc => sc.chunk);

    // If no results from page range, fall back to full document search
    if (results.length === 0 && selectedPage) {
      this.logger.debug('No results in page range, falling back to full document search');
      return this.findRelevantChunks(document, query, selectedText, undefined);
    }

    return results;
  }

  // ============================================================================
  // ANSWER GENERATION WITH CITATIONS
  // ============================================================================

  private async generateAnswerWithCitations(
    query: string,
    relevantChunks: PdfChunk[],
    selectedText?: string,
    conversationHistory?: string
  ): Promise<{ answer: string; citedChunks: PdfChunk[] }> {
    
    if (relevantChunks.length === 0) {
      return {
        answer: "I couldn't find relevant information in the document to answer your question. Please try rephrasing or selecting a specific section.",
        citedChunks: [],
      };
    }

    // Format context with simple numbered sources
    const context = relevantChunks
      .map((chunk, i) => `[${i + 1}] ${chunk.content}`)
      .join('\n\n');

    const systemPrompt = `You are answering questions about a PDF document.
Use ONLY the provided sources to answer. If the answer isn't in the sources, say so.

CITATION FORMAT (MUST FOLLOW EXACTLY):
- Cite as [1], [2], [3] etc.
- Place citation immediately after the fact it supports
- Example: "The model uses 512 dimensions [1] and 8 attention heads [2]."
- DO NOT write [Source 1] or [Source 1, Page X] - ONLY use [1], [2], etc.

${selectedText ? `User selected text: "${selectedText}"\nAnswer specifically about this selection.` : ''}

${conversationHistory ? `Previous conversation:\n${conversationHistory}\n` : ''}

Sources:
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
      
      // Match citations in format [1], [2], etc.
      const citedChunks = relevantChunks.filter((_, i) => 
        answer.includes(`[${i + 1}]`)
      );

      return {
        answer,
        citedChunks: citedChunks.length > 0 ? citedChunks : relevantChunks.slice(0, 2),
      };
    } catch (error: any) {
      this.logger.error(`Answer generation error: ${error.message}`);
      return { answer: `Error generating answer: ${error.message}`, citedChunks: [] };
    }
  }

  // ============================================================================
  // STREAMING ANSWER GENERATION
  // ============================================================================

  private async *streamAnswerGeneration(
    query: string,
    relevantChunks: PdfChunk[],
    selectedText?: string,
    conversationHistory?: string
  ): AsyncGenerator<string> {
    
    if (relevantChunks.length === 0) {
      yield "I couldn't find relevant information in the document to answer your question.";
      return;
    }

    // Format context with simple numbered sources
    const context = relevantChunks
      .map((chunk, i) => `[${i + 1}] ${chunk.content}`)
      .join('\n\n');

    const systemPrompt = `You are answering questions about a PDF document.
Use ONLY the provided sources. Cite as [1], [2], [3] - NOT [Source 1].

${selectedText ? `User selected: "${selectedText}"\nAnswer about this selection.` : ''}

${conversationHistory ? `Previous:\n${conversationHistory}` : ''}

Sources:
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
        if (content) yield content;
      }
    } catch (error: any) {
      yield `Error: ${error.message}`;
    }
  }

  // ============================================================================
  // DOCUMENT & SESSION MANAGEMENT
  // ============================================================================

  getDocument(documentId: string): PdfDocument | undefined {
    return this.documents.get(documentId);
  }

  getDocumentText(documentId: string): string {
    const document = this.documents.get(documentId);
    if (!document) throw new NotFoundException(`Document not found: ${documentId}`);
    return document.chunks.map(c => c.content).join(' ');
  }

  getDocumentSummary(documentId: string): string | undefined {
    const document = this.documents.get(documentId);
    if (!document) throw new NotFoundException(`Document not found: ${documentId}`);
    return document.summary;
  }

  listDocuments(): Array<{ id: string; name: string; pages: number; chunks: number; uploadedAt: Date; hasSummary: boolean }> {
    return Array.from(this.documents.values()).map(doc => ({
      id: doc.id,
      name: doc.originalName,
      pages: doc.totalPages,
      chunks: doc.totalChunks,
      uploadedAt: doc.uploadedAt,
      hasSummary: !!doc.summary,
    }));
  }

  deleteDocument(documentId: string): boolean {
    return this.documents.delete(documentId);
  }

  getConfig() {
    return PDF_CONFIG;
  }

  updateConfig(updates: Partial<typeof PDF_CONFIG>) {
    Object.assign(PDF_CONFIG, updates);
    return PDF_CONFIG;
  }

  listSessions() {
    return Array.from(this.sessions.values()).map(s => ({
      id: s.id,
      documentId: s.documentId,
      documentName: s.documentName,
      messageCount: s.messages.length,
      lastActivity: s.lastActivityAt,
    }));
  }

  getSession(sessionId: string): ConversationSession | undefined {
    return this.sessions.get(sessionId);
  }

  deleteSession(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }

  clearDocumentSessions(documentId: string): number {
    let cleared = 0;
    for (const [id, session] of this.sessions.entries()) {
      if (session.documentId === documentId) {
        this.sessions.delete(id);
        cleared++;
      }
    }
    return cleared;
  }
}

