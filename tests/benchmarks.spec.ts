import { _electron as electron, test, expect } from '@playwright/test';
import { join } from 'path';

test.describe('Automated JS Benchmarks', () => {
    test('Speedometer 3.0 Smoke Test', async () => {
        // Launch Electron app
        const electronApp = await electron.launch({
            args: [join(__dirname, '../dist/main/index.js')],
            env: { ...process.env, NODE_ENV: 'test' }
        });

        const window = await electronApp.firstWindow();

        // Navigate to Speedometer
        // Note: In a real scenario we'd run the full test. 
        // Here we verify we can load it and start it.
        await window.goto('https://browserbench.org/Speedometer3.0/');

        // Wait for the "Start Test" button
        const startButton = window.locator('button:has-text("Start Test")');
        await expect(startButton).toBeVisible();

        console.log('Speedometer 3.0 loaded successfully.');

        await electronApp.close();
    });

    test('JetStream 2 Smoke Test', async () => {
        const electronApp = await electron.launch({
            args: [join(__dirname, '../dist/main/index.js')],
        });
        const window = await electronApp.firstWindow();
        await window.goto('https://browserbench.org/JetStream/');

        const startButton = window.locator('a:has-text("Start Test")');
        await expect(startButton).toBeVisible();

        console.log('JetStream 2 loaded successfully.');

        await electronApp.close();
    });
});
