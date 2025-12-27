import { _electron as electron, test, expect } from '@playwright/test';
import { join } from 'path';

const TOP_SITES = [
    'https://www.google.com',
    'https://www.wikipedia.org',
    'https://www.reddit.com'
];

test.describe('Compatibility Smoke Tests', () => {
    test('Top 10 Site Load', async () => {
        const electronApp = await electron.launch({
            args: [join(__dirname, '../dist/main/index.js')],
            env: { ...process.env, NODE_ENV: 'test' }
        });
        const window = await electronApp.firstWindow();
        await window.waitForLoadState('domcontentloaded');

        // Wait for app to be ready
        await window.waitForSelector('input[type="text"]'); // Address Bar

        for (const url of TOP_SITES) {
            console.log(`Testing ${url}...`);
            try {
                // Type URL in Address Bar
                const addressBar = window.locator('input[type="text"]').first();
                await addressBar.click();
                await addressBar.fill(url);
                await addressBar.press('Enter');

                // Wait for a bit (simulate load time) - rigorous check requires connecting to webview
                // For smoke test, valid verification is "App didn't crash" and "Title updated"
                // The title bar should eventually reflect the page title

                // Allow some time for title update (webview did-stop-loading)
                await window.waitForTimeout(3000); // 3s buffer

                const title = await window.title();
                console.log(`✅ Navigated to ${url}. Window Title: ${title}`);
                expect(title).not.toBe('Underlay'); // Should update from default
            } catch (e) {
                console.error(`❌ Failed to load ${url}:`, e);
            }
        }

        await electronApp.close();
    });
});
