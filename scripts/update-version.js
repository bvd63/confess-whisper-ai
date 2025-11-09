const fs = require('fs');
const path = require('path');

const versionPath = path.join(__dirname, '../public/version.json');

try {
  const versionContent = fs.readFileSync(versionPath, 'utf8');
  const versionData = JSON.parse(versionContent);

  // Generate version from timestamp
  const now = new Date();
  const newVersion = `${now.getFullYear()}.${now.getMonth() + 1}.${now.getDate()}.${now.getHours()}${String(now.getMinutes()).padStart(2, '0')}`;

  versionData.version = newVersion;
  versionData.buildDate = now.toISOString().split('T')[0];

  fs.writeFileSync(versionPath, JSON.stringify(versionData, null, 2));
  console.log(`✅ Version updated to ${newVersion}`);
} catch (error) {
  console.error('❌ Error updating version:', error);
  process.exit(1);
}
