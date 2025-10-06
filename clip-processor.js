#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sqlite3 from 'sqlite3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const { Database } = sqlite3;

// Simple SQLite database for storing clips
const DB_PATH = path.join(__dirname, 'clips.db');

// Initialize database
function initDB() {
    return new Promise((resolve, reject) => {
        const db = new Database(DB_PATH);
        
        db.serialize(() => {
            db.run(`
                CREATE TABLE IF NOT EXISTS clips (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    type TEXT NOT NULL,
                    title TEXT NOT NULL,
                    url TEXT,
                    content TEXT,
                    image_url TEXT,
                    description TEXT,
                    author TEXT,
                    timestamp INTEGER NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `, (err) => {
                if (err) {
                    reject(err);
                } else {
                    console.log('✅ Database initialized');
                    resolve(db);
                }
            });
        });
    });
}

// Process a clip file
async function processClip(filePath) {
    try {
        console.log(`📎 Processing clip: ${path.basename(filePath)}`);
        
        // Read the JSON file
        const content = fs.readFileSync(filePath, 'utf8');
        const clipData = JSON.parse(content);
        
        // Save to database
        const db = await initDB();
        
        return new Promise((resolve, reject) => {
            db.run(`
                INSERT INTO clips (type, title, url, content, image_url, description, author, timestamp)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                clipData.type,
                clipData.title,
                clipData.url || null,
                clipData.content || null,
                clipData.image_url || null,
                clipData.description || null,
                clipData.author || null,
                clipData.timestamp
            ], function(err) {
                if (err) {
                    reject(err);
                } else {
                    console.log(`✅ Clip saved to database (ID: ${this.lastID})`);
                    console.log(`   Title: ${clipData.title}`);
                    console.log(`   Type: ${clipData.type}`);
                    resolve(this.lastID);
                }
            });
        });
        
    } catch (error) {
        console.error(`❌ Error processing clip: ${error.message}`);
        throw error;
    }
}

// Watch for new files in clips directory
function watchClips() {
    const clipsDir = path.join(__dirname, 'clips');
    
    console.log('🔍 LOS Clip Processor starting...');
    console.log(`📁 Watching: ${clipsDir}`);
    
    // Create clips directory if it doesn't exist
    if (!fs.existsSync(clipsDir)) {
        fs.mkdirSync(clipsDir, { recursive: true });
    }
    
    // Process existing files
    const existingFiles = fs.readdirSync(clipsDir).filter(file => file.endsWith('.json'));
    if (existingFiles.length > 0) {
        console.log(`📋 Found ${existingFiles.length} existing files to process`);
        existingFiles.forEach(file => {
            const filePath = path.join(clipsDir, file);
            processClip(filePath)
                .then(() => {
                    // Remove the file after processing
                    fs.unlinkSync(filePath);
                    console.log(`🗑️ Removed processed file: ${file}`);
                })
                .catch(err => {
                    console.error(`❌ Failed to process ${file}:`, err.message);
                });
        });
    }
    
    // Watch for new files
    fs.watch(clipsDir, (eventType, filename) => {
        if (eventType === 'rename' && filename && filename.endsWith('.json')) {
            const filePath = path.join(clipsDir, filename);
            
            // Wait a moment for file to be fully written
            setTimeout(() => {
                if (fs.existsSync(filePath)) {
                    processClip(filePath)
                        .then(() => {
                            // Remove the file after processing
                            fs.unlinkSync(filePath);
                            console.log(`🗑️ Removed processed file: ${filename}`);
                        })
                        .catch(err => {
                            console.error(`❌ Failed to process ${filename}:`, err.message);
                        });
                }
            }, 100);
        }
    });
    
    console.log('👂 Watching for new clips...');
}

// Main function
async function main() {
    try {
        await initDB();
        watchClips();
        
        // Keep the process running
        process.on('SIGINT', () => {
            console.log('\n👋 Shutting down clip processor...');
            process.exit(0);
        });
        
    } catch (error) {
        console.error('❌ Failed to start clip processor:', error.message);
        process.exit(1);
    }
}

// Start the processor
main();
