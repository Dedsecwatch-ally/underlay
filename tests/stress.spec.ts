import { _electron as electron, test, expect } from '@playwright/test';
import { join } from 'path';

test.describe('Stress & Memory Tests', () => {
    test('Tab Churn: Open/Close 20 Tabs', async () => {
        const electronApp = await electron.launch({
            args: [join(__dirname, '../dist/main/index.js')],
        });
        const window = await electronApp.firstWindow();

        // Get initial memory usage (approx) via internal metric if exposed, or just proceed
        // Here we simulate rapid tab opening via keyboard shortcuts or UI

        console.log('Starting Tab Churn...');

        for (let i = 0; i < 20; i++) {
            // Cmd+T to open tab (assuming accelerator works, or use UI)
            // We'll use the Command Palette or just UI clicks if possible, 
            // but for now let's just use the "+" button if selectable.

            // Use keyboard shortcut for reliability if implemented
            await window.keyboard.press('Meta+t');

            // Wait a tiny bit
            await window.waitForTimeout(100);

            // Close it immediately
            await window.keyboard.press('Meta+w');

            await window.waitForTimeout(50);
        }

        console.log('Tab Churn Complete.');

        // Verify app didn't crash
        const isClosed = await window.isClosed();
        expect(isClosed).toBe(false);

        await electronApp.close();
    });

    test('GPU Stress: WebGL Sample', async () => {
        const electronApp = await electron.launch({
            args: [join(__dirname, '../dist/main/index.js')],
        });
        const window = await electronApp.firstWindow();

        // Load a WebGL Aquarium
        await window.goto('https://webglsamples.org/aquarium/aquarium.html');

        // Wait for canvas
        await expect(window.locator('canvas')).toBeVisible();

        // Let it run for 5 seconds
        await window.waitForTimeout(5000);

        console.log('WebGL Aquarium ran for 5s.');

        await electronApp.close();
    });
});
