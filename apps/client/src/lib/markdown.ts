import { promises as fs } from 'node:fs';
import path from 'node:path';

export async function getMarkdownContent(fileName: string) {
  const filePath = path.join(process.cwd(), 'public', fileName);
  const content = await fs.readFile(filePath, 'utf8');
  return content;
}
