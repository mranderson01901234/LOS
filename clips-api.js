#!/usr/bin/env node

import express from 'express';
import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const { Database } = sqlite3;

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Database path
const DB_PATH = path.join(__dirname, 'clips.db');

// Initialize database connection
const db = new Database(DB_PATH);

// API endpoint to get all clips
app.get('/api/clips', (req, res) => {
  db.all(
    'SELECT * FROM clips ORDER BY created_at DESC',
    [],
    (err, rows) => {
      if (err) {
        console.error('Database error:', err);
        res.status(500).json({ error: 'Database error' });
        return;
      }
      res.json(rows);
    }
  );
});

// API endpoint to get clips by type
app.get('/api/clips/:type', (req, res) => {
  const { type } = req.params;
  
  db.all(
    'SELECT * FROM clips WHERE type = ? ORDER BY created_at DESC',
    [type],
    (err, rows) => {
      if (err) {
        console.error('Database error:', err);
        res.status(500).json({ error: 'Database error' });
        return;
      }
      res.json(rows);
    }
  );
});

// API endpoint to delete a clip
app.delete('/api/clips/:id', (req, res) => {
  const { id } = req.params;
  
  db.run(
    'DELETE FROM clips WHERE id = ?',
    [id],
    function(err) {
      if (err) {
        console.error('Database error:', err);
        res.status(500).json({ error: 'Database error' });
        return;
      }
      res.json({ message: 'Clip deleted successfully', deletedId: id });
    }
  );
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Clips API server running on http://localhost:${PORT}`);
  console.log(`📊 Database: ${DB_PATH}`);
  console.log(`🔗 Endpoints:`);
  console.log(`   GET  /api/clips - Get all clips`);
  console.log(`   GET  /api/clips/:type - Get clips by type`);
  console.log(`   DELETE /api/clips/:id - Delete a clip`);
  console.log(`   GET  /api/health - Health check`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down clips API server...');
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err);
    } else {
      console.log('✅ Database connection closed');
    }
    process.exit(0);
  });
});
