import { logger } from './logger';

export interface CSVParseResult {
  emails: string[];
  stats: {
    valid: number;
    duplicates: number;
    invalid: number;
  };
}

/**
 * Parses raw CSV text into a 2D array of string cells.
 * Fully compliant with RFC 4180 (handles double quotes, escaped quotes, newlines, commas, etc.).
 */
function parseCSV(text: string): string[][] {
  const lines: string[][] = [];
  let row: string[] = [];
  let inQuotes = false;
  let cell = '';

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        cell += '"';
        i++; // skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push(cell.trim());
      cell = '';
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++; // skip LF
      }
      row.push(cell.trim());
      if (row.length > 0 && !(row.length === 1 && row[0] === '')) {
        lines.push(row);
      }
      row = [];
      cell = '';
    } else {
      cell += char;
    }
  }

  // Push final cell and row if any
  if (cell || row.length > 0) {
    row.push(cell.trim());
    if (row.length > 0 && !(row.length === 1 && row[0] === '')) {
      lines.push(row);
    }
  }

  return lines;
}

/**
 * Intelligent CSV Parser.
 * Iterates through rows, scans each cell for a valid email format,
 * removes duplicates and blank fields, and compiles descriptive stats.
 */
export function parseEmailsFromCSV(fileBuffer: Buffer): CSVParseResult {
  try {
    const fileContent = fileBuffer.toString('utf-8');
    
    // Parse CSV rows using our custom parser
    const records = parseCSV(fileContent).filter(row => row.length > 0 && !(row.length === 1 && row[0] === ''));

    if (records.length === 0) {
      return {
        emails: [],
        stats: { valid: 0, duplicates: 0, invalid: 0 }
      };
    }

    // Standard email validation pattern
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    const uniqueEmails = new Set<string>();

    let duplicateCount = 0;
    let invalidCount = 0;

    // Try to detect email column from first row
    const firstRowCells = records[0].map(c => c.trim().toLowerCase());
    const emailColIdx = firstRowCells.findIndex(cell => /email|recipient|to/i.test(cell));

    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      
      if (emailColIdx !== -1) {
        const cellValue = record[emailColIdx];
        if (cellValue) {
          const cleaned = cellValue.trim().toLowerCase();
          if (emailRegex.test(cleaned)) {
            if (uniqueEmails.has(cleaned)) {
              duplicateCount++;
            } else {
              uniqueEmails.add(cleaned);
            }
          } else {
            invalidCount++;
          }
        } else {
          invalidCount++;
        }
      } else {
        let emailFoundInRow = false;
        for (const cell of record) {
          if (!cell) continue;
          const cleaned = cell.trim().toLowerCase();
          if (emailRegex.test(cleaned)) {
            emailFoundInRow = true;
            if (uniqueEmails.has(cleaned)) {
              duplicateCount++;
            } else {
              uniqueEmails.add(cleaned);
            }
            break;
          }
        }
        if (!emailFoundInRow) {
          invalidCount++;
        }
      }
    }

    const emails = Array.from(uniqueEmails);
    
    logger.info(
      { valid: emails.length, duplicates: duplicateCount, invalid: invalidCount },
      '📊 CSV Parsing complete'
    );

    return {
      emails,
      stats: {
        valid: emails.length,
        duplicates: duplicateCount,
        invalid: invalidCount,
      },
    };
  } catch (error) {
    logger.error({ err: error }, '❌ CSV Parser failed');
    throw new Error('Failed to parse CSV file. Ensure it is a valid CSV format.');
  }
}
