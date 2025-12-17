import * as XLSX from 'xlsx';
import { chatClient, azureConfig } from '../../config/azure';

export interface FileGenerationResult {
  filename: string;
  mimeType: string;
  data: string; // Base64 encoded file data
  tablePreview: {
    headers: string[];
    rows: string[][];
  };
  description: string;
}

/**
 * Generate structured data and XLSX file based on user request
 */
export async function fileAgent(prompt: string): Promise<FileGenerationResult> {
  console.log('[File Agent] Generating data for:', prompt);

  try {
    // Ask LLM to generate structured JSON data
    const systemPrompt = `You are a data generation assistant. Based on the user's request, generate appropriate tabular data.

IMPORTANT: Respond ONLY with a valid JSON object in this exact format:
{
  "filename": "descriptive_filename",
  "description": "Brief description of the generated data",
  "headers": ["Column1", "Column2", "Column3"],
  "rows": [
    ["value1", "value2", "value3"],
    ["value4", "value5", "value6"]
  ]
}

Guidelines:
- Generate realistic, useful sample data based on the user's request
- Use appropriate column headers that match the data type
- Generate 5-15 rows of data typically (unless user specifies)
- Keep values realistic and consistent
- For numbers, use string format: "100" not 100
- Filename should be descriptive without extension

Examples:
- "employee data" → headers: ["Name", "Department", "Salary", "Start Date"]
- "product inventory" → headers: ["SKU", "Product Name", "Quantity", "Price", "Category"]
- "sales report" → headers: ["Date", "Product", "Units Sold", "Revenue", "Region"]`;

    const response = await chatClient.chat.completions.create({
      model: azureConfig.chat.deployment,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      max_tokens: 2000,
      temperature: 0.7,
    });

    const content = response.choices[0]?.message?.content || '';
    
    // Parse JSON response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to generate structured data');
    }

    const data = JSON.parse(jsonMatch[0]);
    
    // Validate data structure
    if (!data.headers || !data.rows || !Array.isArray(data.headers) || !Array.isArray(data.rows)) {
      throw new Error('Invalid data structure from LLM');
    }

    // Create XLSX workbook
    const workbook = XLSX.utils.book_new();
    
    // Create worksheet data (headers + rows)
    const worksheetData = [data.headers, ...data.rows];
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    
    // Set column widths for better readability
    const colWidths = data.headers.map((header: string) => ({ wch: Math.max(header.length, 15) }));
    worksheet['!cols'] = colWidths;
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
    
    // Generate XLSX buffer
    const xlsxBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    // Convert to base64
    const base64Data = Buffer.from(xlsxBuffer).toString('base64');
    
    const filename = `${data.filename || 'generated_data'}.xlsx`;
    
    console.log(`[File Agent] Generated ${filename} with ${data.rows.length} rows`);

    return {
      filename,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      data: base64Data,
      tablePreview: {
        headers: data.headers,
        rows: data.rows.slice(0, 10), // Preview first 10 rows
      },
      description: data.description || `Generated ${data.rows.length} rows of data`,
    };

  } catch (error: any) {
    console.error('[File Agent] Error:', error.message);
    
    // Return a fallback simple file
    const fallbackData = {
      headers: ['Column A', 'Column B', 'Column C'],
      rows: [
        ['Sample 1', 'Data 1', '100'],
        ['Sample 2', 'Data 2', '200'],
        ['Sample 3', 'Data 3', '300'],
      ],
    };

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet([fallbackData.headers, ...fallbackData.rows]);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
    const xlsxBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    const base64Data = Buffer.from(xlsxBuffer).toString('base64');

    return {
      filename: 'sample_data.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      data: base64Data,
      tablePreview: fallbackData,
      description: 'Sample data file (fallback due to generation error)',
    };
  }
}

/**
 * Check if user is asking for file generation
 */
export function isFileGenerationRequest(query: string): boolean {
  const filePatterns = [
    /xlsx/i,
    /excel\s*(file|format|sheet|spreadsheet)/i,
    /spreadsheet/i,
    /generate\s*(a|an|the)?\s*(file|document)/i,
    /create\s*(a|an|the)?\s*(file|document)/i,
    /export\s*(to|as|in)\s*(xlsx|excel)/i,
    /download.*data/i,
    /data\s*(in|as)\s*(xlsx|excel)/i,
    /give\s*me\s*(a|an)?\s*(xlsx|excel)/i,
    /dummy\s*(file|data|xlsx|excel)/i,
    /sample\s*(file|data|xlsx|excel)/i,
  ];

  return filePatterns.some(pattern => pattern.test(query));
}

/**
 * Extract the data description from the query
 */
export function extractFilePrompt(query: string): string {
  // Remove file-related keywords to get the data description
  return query
    .replace(/xlsx|excel|spreadsheet|file|format|generate|create|export|download|give\s*me/gi, '')
    .replace(/\s+/g, ' ')
    .trim() || 'sample data';
}

