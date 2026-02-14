import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const wikiDir = path.join(process.cwd(), 'content', 'wiki');
const files = fs.readdirSync(wikiDir).filter(f => f.endsWith('.mdx'));

const typeCounts: Record<string, number> = {};
const typeExamples: Record<string, string[]> = {};

files.forEach(file => {
    try {
        const content = fs.readFileSync(path.join(wikiDir, file), 'utf8');
        const { data } = matter(content);
        const type = data.type || '(no type)';

        typeCounts[type] = (typeCounts[type] || 0) + 1;

        if (!typeExamples[type]) {
            typeExamples[type] = [];
        }
        if (typeExamples[type].length < 3) {
            typeExamples[type].push(data.title || file);
        }
    } catch (err) {
        // skip
    }
});

const sorted = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]);

console.log('\n📊 Type Field Analysis:\n');
sorted.forEach(([type, count]) => {
    console.log(`${count.toString().padStart(5)} - "${type}"`);
});

console.log(`\n📝 Total files: ${files.length}`);
console.log(`📝 Unique types: ${sorted.length}\n`);

// Save to file for analysis
fs.writeFileSync('type-analysis.json', JSON.stringify({
    total_files: files.length,
    unique_types: sorted.length,
    types: sorted.map(([type, count]) => ({ type, count, examples: typeExamples[type] }))
}, null, 2));

console.log('💾 Saved detailed analysis to: type-analysis.json');

