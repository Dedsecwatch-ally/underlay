const fs = require('fs');
const path = require('path');
const os = require('os');

const homeDir = os.homedir();
const commonPaths = [
    path.join(homeDir, 'Library/Application Support/Google/Chrome/WidevineCdm'),
    '/Applications/Google Chrome.app/Contents/Frameworks/Google Chrome Framework.framework/Versions'
];

console.log('--- WIDEVINE SEARCH ---');

function search(dir) {
    if (!fs.existsSync(dir)) {
        console.log(`[MISSING] ${dir}`);
        return;
    }
    console.log(`[SCANNING] ${dir}`);
    try {
        const items = fs.readdirSync(dir);
        items.forEach(item => {
            if (item.startsWith('.')) return;
            const fullPath = path.join(dir, item);
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory()) {
                // Peek inside version dirs
                if (/^\d+\.\d+\.\d+\.\d+$/.test(item)) {
                    console.log(`  -> Version Found: ${item}`);
                    const recSearch = (d) => {
                        const subs = fs.readdirSync(d);
                        subs.forEach(s => {
                            const p = path.join(d, s);
                            if (fs.statSync(p).isDirectory()) recSearch(p);
                            if (s.includes('widevine') && s.endsWith('.dylib')) {
                                console.log(`     FOUND BINARY: ${p}`);
                            }
                        });
                    };
                    recSearch(fullPath);
                } else {
                    // Recurse a bit limitedly
                    // search(fullPath);
                }
            }
        });
    } catch (e) {
        console.log(`[ERROR] ${e.message}`);
    }
}

commonPaths.forEach(p => search(p));
console.log('-----------------------');
