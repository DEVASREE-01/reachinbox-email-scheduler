export interface FrontendCSVResult {
  valid: number;
  duplicates: number;
  invalid: number;
  emails: string[];
}

/**
 * Reads a local CSV file and estimates recipient statistics before upload.
 */
export function parseCSVInFrontend(file: File): Promise<FrontendCSVResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        // Split by lines
        const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
        if (lines.length === 0) {
          resolve({ valid: 0, duplicates: 0, invalid: 0, emails: [] });
          return;
        }

        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        const uniqueEmails = new Set<string>();

        let duplicateCount = 0;
        let invalidCount = 0;

        // Try to detect email column from first row
        const firstRowCells = lines[0].split(',').map(c => c.trim().toLowerCase());
        const emailColIdx = firstRowCells.findIndex(cell => /email|recipient|to/i.test(cell));

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const cells = line.split(',');
          
          if (emailColIdx !== -1) {
            const cellValue = cells[emailColIdx];
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
            for (const cell of cells) {
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

        resolve({
          valid: uniqueEmails.size,
          duplicates: duplicateCount,
          invalid: invalidCount,
          emails: Array.from(uniqueEmails),
        });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsText(file);
  });
}
