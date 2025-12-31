import fs from 'fs';
import path from 'path';
import { app } from 'electron';

const dataPath = app.getPath('userData');
const filePath = path.join(dataPath, 'config.json');

export const store = {
    get: (key: string, defaultValue: any) => {
        try {
            if (!fs.existsSync(filePath)) {
                return defaultValue;
            }
            const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
            return data[key] !== undefined ? data[key] : defaultValue;
        } catch (e) {
            console.error('Failed to read config store:', e);
            return defaultValue;
        }
    },
    set: (key: string, value: any) => {
        try {
            let data: any = {};
            if (fs.existsSync(filePath)) {
                data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
            }
            data[key] = value;
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        } catch (e) {
            console.error('Failed to write to config store:', e);
        }
    }
};
