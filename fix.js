import fs from "fs";
import path from "path";

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else { 
      results.push(file);
    }
  });
  return results;
}

const files = walk('src').filter(f => f.endsWith('.ts') || f.endsWith('.tsx'));

for (const file of files) {
  let content = fs.readFileSync(file, 'utf-8');
  content = content.replace(/\\\`/g, '\`');
  content = content.replace(/\\\$/g, '$');
  fs.writeFileSync(file, content);
}
console.log('Fixed escaped chars properly');
