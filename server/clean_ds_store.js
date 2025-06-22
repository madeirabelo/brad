const fs = require('fs');
const yaml = require('js-yaml');

// Read the concerts.yaml file
const concertsPath = './data/concerts.yaml';
const concertsData = fs.readFileSync(concertsPath, 'utf8');

// Parse the YAML
const concerts = yaml.load(concertsData);

let totalOriginal = 0;
let totalFiltered = 0;

// Process each user's concerts
Object.keys(concerts).forEach(user => {
    if (Array.isArray(concerts[user])) {
        const originalLength = concerts[user].length;
        totalOriginal += originalLength;
        
        // Filter out entries that:
        // 1. Start with "._" (macOS metadata files)
        // 2. Contain "DS_Store"
        // 3. Contain ".VOB", ".BUP", or ".IFO" extensions
        // 4. End with ".png"
        // 5. End with "Artwork"
        // 6. End with "/AUDIO_TS"
        // 7. End with ".miniso"
        concerts[user] = concerts[user].filter(concert => {
            const name = concert.concert || '';
            return !name.startsWith('._') && 
                   !name.includes('DS_Store') && 
                   !name.includes('.VOB') && 
                   !name.includes('.BUP') && 
                   !name.includes('.IFO') && 
                   !name.endsWith('.png') &&
                   !name.endsWith('Artwork') &&
                   !name.endsWith('/AUDIO_TS') &&
                   !name.endsWith('.miniso');
        });
        
        const filteredLength = concerts[user].length;
        totalFiltered += filteredLength;
        
        if (originalLength !== filteredLength) {
            console.log(`User "${user}": Removed ${originalLength - filteredLength} entries`);
        }
    }
});

console.log(`Original total entries: ${totalOriginal}`);
console.log(`Filtered total entries: ${totalFiltered}`);
console.log(`Total removed: ${totalOriginal - totalFiltered}`);

// Write the filtered data back to the file
const yamlStr = yaml.dump(concerts, { indent: 2 });
fs.writeFileSync(concertsPath, yamlStr, 'utf8');

console.log('Concerts file cleaned successfully!'); 