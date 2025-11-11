import fs from 'fs';
import path from 'path';

const versionPath = path.join(process.cwd(), 'public', 'version.json');

try {
  const version = {
    version: new Date().toISOString(),
    buildDate: new Date().toISOString().split('T')[0],
    buildTime: Date.now()
  };

  fs.writeFileSync(versionPath, JSON.stringify(version, null, 2));
  console.log(`✅ Version updated to ${version.version}`);
} catch (error) {
  console.error('❌ Error updating version:', error);
  process.exit(1);
}
