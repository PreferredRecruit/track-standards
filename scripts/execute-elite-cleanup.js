const fs = require('fs');
let content = fs.readFileSync('./src/data/schoolStandards.ts', 'utf8');
const eliteConferences = ['SEC', 'Big Ten', 'ACC', 'Big 12'];
let removed = 0;
eliteConferences.forEach(conf => {
  const regex = new RegExp(`(conference:\\s*"${conf.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}"[\\s\\S]*?)(?=\\s*\\},\\s*\\{|\\}\\s*\\])`, 'g');
  content = content.replace(regex, (match) => {
    const count = (match.match(/,\\s*walkon:\\s*"[^"]*"/g) || []).length;
    removed += count;
    return match.replace(/,\\s*walkon:\\s*"[^"]*"/g, '');
  });
});
fs.writeFileSync('./src/data/schoolStandards.ts', content);
console.log(`Removed ${removed} walkon properties from elite conferences`);