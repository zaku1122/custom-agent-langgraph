import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PDFParse } from 'pdf-parse';
import * as mammoth from 'mammoth';
import { chatClient, azureConfig } from '../../config/azure';

export interface LoadedDocument {
  type: 'pdf' | 'docx' | 'text' | 'image';
  filename: string;
  content: string; // Extracted text content
  pageCount?: number;
  imageBase64?: string; // For images, store base64 for vision API
  mimeType: string;
}

export interface DocumentAnalysis {
  summary: string;
  keyPoints: string[];
  documentType: string;
  suggestedQuestions: string[];
}

@Injectable()
export class DocumentLoaderService {
  private readonly logger = new Logger(DocumentLoaderService.name);

  // Supported MIME types
  private readonly supportedTypes = {
    'application/pdf': 'pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/msword': 'docx',
    'text/plain': 'text',
    'text/markdown': 'text',
    'text/csv': 'text',
    'image/png': 'image',
    'image/jpeg': 'image',
    'image/jpg': 'image',
    'image/webp': 'image',
    'image/gif': 'image',
  } as const;

  /**
   * Check if file type is supported
   */
  isSupported(mimeType: string): boolean {
    return mimeType in this.supportedTypes;
  }

  /**
   * Get supported file extensions for UI
   */
  getSupportedExtensions(): string[] {
    return ['.pdf', '.docx', '.doc', '.txt', '.md', '.csv', '.png', '.jpg', '.jpeg', '.webp', '.gif'];
  }

  /**
   * Load document and extract content
   */
  async loadDocument(file: Express.Multer.File): Promise<LoadedDocument> {
    const mimeType = file.mimetype;
    
    if (!this.isSupported(mimeType)) {
      throw new BadRequestException(
        `Unsupported file type: ${mimeType}. Supported: ${this.getSupportedExtensions().join(', ')}`
      );
    }

    const docType = this.supportedTypes[mimeType as keyof typeof this.supportedTypes];
    this.logger.log(`Loading ${docType} document: ${file.originalname}`);

    switch (docType) {
      case 'pdf':
        return this.loadPdf(file);
      case 'docx':
        return this.loadDocx(file);
      case 'text':
        return this.loadText(file);
      case 'image':
        return this.loadImage(file);
      default:
        throw new BadRequestException(`Unknown document type: ${docType}`);
    }
  }

  /**
   * Load PDF document
   */
  private async loadPdf(file: Express.Multer.File): Promise<LoadedDocument> {
    try {
      const parser = new PDFParse({ data: file.buffer });
      const textResult = await parser.getText();
      const infoResult = await parser.getInfo();
      await parser.destroy();

      const pageCount = textResult.pages?.length || infoResult.pages?.length || 1;

      return {
        type: 'pdf',
        filename: file.originalname,
        content: textResult.text,
        pageCount,
        mimeType: file.mimetype,
      };
    } catch (error: any) {
      this.logger.error(`PDF loading error: ${error.message}`);
      throw new BadRequestException(`Failed to load PDF: ${error.message}`);
    }
  }

  /**
   * Load DOCX document using mammoth
   */
  private async loadDocx(file: Express.Multer.File): Promise<LoadedDocument> {
    try {
      const result = await mammoth.extractRawText({ buffer: file.buffer });
      
      return {
        type: 'docx',
        filename: file.originalname,
        content: result.value,
        mimeType: file.mimetype,
      };
    } catch (error: any) {
      this.logger.error(`DOCX loading error: ${error.message}`);
      throw new BadRequestException(`Failed to load DOCX: ${error.message}`);
    }
  }

  /**
   * Load plain text document
   */
  private async loadText(file: Express.Multer.File): Promise<LoadedDocument> {
    try {
      const content = file.buffer.toString('utf-8');
      
      return {
        type: 'text',
        filename: file.originalname,
        content,
        mimeType: file.mimetype,
      };
    } catch (error: any) {
      this.logger.error(`Text loading error: ${error.message}`);
      throw new BadRequestException(`Failed to load text file: ${error.message}`);
    }
  }

  /**
   * Load image - store base64 for vision API
   */
  private async loadImage(file: Express.Multer.File): Promise<LoadedDocument> {
    try {
      const base64 = file.buffer.toString('base64');
      
      // Use GPT-4 Vision to extract text/describe image
      const description = await this.analyzeImageWithVision(base64, file.mimetype);
      
      return {
        type: 'image',
        filename: file.originalname,
        content: description,
        imageBase64: base64,
        mimeType: file.mimetype,
      };
    } catch (error: any) {
      this.logger.error(`Image loading error: ${error.message}`);
      throw new BadRequestException(`Failed to load image: ${error.message}`);
    }
  }

  /**
   * Analyze image using GPT-4 Vision
   */
  private async analyzeImageWithVision(base64: string, mimeType: string): Promise<string> {
    try {
      const response = await chatClient.chat.completions.create({
        model: azureConfig.chat.deployment,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analyze this image in detail. Extract any text you can see (OCR), describe the visual content, and identify key information. If it\'s a document, extract its structure and content.',
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType};base64,${base64}`,
                },
              },
            ],
          },
        ],
        max_tokens: 2000,
      });

      return response.choices[0]?.message?.content || 'Unable to analyze image';
    } catch (error: any) {
      this.logger.warn(`Vision API error: ${error.message}. Returning placeholder.`);
      return '[Image uploaded - Vision analysis unavailable]';
    }
  }

  /**
   * Generate a brief analysis of the document
   */
  async analyzeDocument(doc: LoadedDocument): Promise<DocumentAnalysis> {
    const truncatedContent = doc.content.substring(0, 4000); // Limit for API

    try {
      const response = await chatClient.chat.completions.create({
        model: azureConfig.chat.deployment,
        messages: [
          {
            role: 'system',
            content: `Analyze the following ${doc.type} document and provide a JSON response with:
{
  "summary": "2-3 sentence summary",
  "keyPoints": ["point1", "point2", "point3"],
  "documentType": "report|article|contract|letter|presentation|data|other",
  "suggestedQuestions": ["question1", "question2", "question3"]
}`,
          },
          {
            role: 'user',
            content: `Document: ${doc.filename}\n\nContent:\n${truncatedContent}`,
          },
        ],
        max_tokens: 500,
        temperature: 0.3,
      });

      const content = response.choices[0]?.message?.content || '{}';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      return {
        summary: 'Document loaded successfully',
        keyPoints: [],
        documentType: 'other',
        suggestedQuestions: [],
      };
    } catch (error: any) {
      this.logger.error(`Document analysis error: ${error.message}`);
      return {
        summary: `${doc.type.toUpperCase()} document loaded: ${doc.filename}`,
        keyPoints: [],
        documentType: 'other',
        suggestedQuestions: ['What is this document about?', 'Summarize the key points'],
      };
    }
  }

  /**
   * Query document with context
   */
  async queryDocument(doc: LoadedDocument, query: string): Promise<string> {
    const truncatedContent = doc.content.substring(0, 8000);

    try {
      const response = await chatClient.chat.completions.create({
        model: azureConfig.chat.deployment,
        messages: [
          {
            role: 'system',
            content: `You are analyzing a ${doc.type} document named "${doc.filename}". 
Answer questions based ONLY on the document content provided.
If the answer isn't in the document, say so clearly.
Be specific and cite relevant parts when possible.`,
          },
          {
            role: 'user',
            content: `Document Content:\n${truncatedContent}\n\n---\nQuestion: ${query}`,
          },
        ],
        max_tokens: 1500,
        temperature: 0.3,
      });

      return response.choices[0]?.message?.content || 'Unable to answer query';
    } catch (error: any) {
      this.logger.error(`Query error: ${error.message}`);
      throw new Error(`Failed to query document: ${error.message}`);
    }
  }

  /**
   * Stream query response
   */
  async *streamQueryDocument(doc: LoadedDocument, query: string): AsyncGenerator<string> {
    const truncatedContent = doc.content.substring(0, 8000);

    try {
      const stream = await chatClient.chat.completions.create({
        model: azureConfig.chat.deployment,
        messages: [
          {
            role: 'system',
            content: `You are analyzing a ${doc.type} document named "${doc.filename}". 
Answer questions based ONLY on the document content provided.
If the answer isn't in the document, say so clearly.`,
          },
          {
            role: 'user',
            content: `Document Content:\n${truncatedContent}\n\n---\nQuestion: ${query}`,
          },
        ],
        max_tokens: 1500,
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
}

