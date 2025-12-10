import * as fs from 'fs';
import * as path from 'path';

// @dev pulled from https://chainid.network/chains.json
// Refactored to load from JSON at runtime to save build memory

let chains: any[] = [];

try {
  // Try to locate the assets/chains.json file
  // In dev/source: src/common/utils/chains.ts -> ../../../assets/chains.json
  // In prod/dist: dist/common/utils/chains.js -> ../../../assets/chains.json
  const chainsPath = path.resolve(__dirname, '../../../assets/chains.json');

  if (fs.existsSync(chainsPath)) {
    const content = fs.readFileSync(chainsPath, 'utf8');
    chains = JSON.parse(content);
  } else {
    console.warn(`Chains asset not found at ${chainsPath}`);
  }
} catch (error) {
  console.error('Failed to load chains asset:', error);
}

export default chains;
