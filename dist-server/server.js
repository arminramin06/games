import express from 'express';
import cors from 'cors';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 3001;
app.use(cors());
app.use(express.json());
// Initialize SQLite database
let db;
async function initDb() {
    db = await open({
        filename: path.join(__dirname, 'database.sqlite'),
        driver: sqlite3.Database
    });
    // Create tables
    await db.exec(`
    CREATE TABLE IF NOT EXISTS players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      high_score INTEGER DEFAULT 0,
      games_played INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player1_name TEXT NOT NULL,
      player2_name TEXT NOT NULL,
      player1_score INTEGER NOT NULL,
      player2_score INTEGER NOT NULL,
      winner_name TEXT,
      played_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
    console.log('SQLite database initialized successfully.');
}
// Routes
// Get top players for leaderboard
app.get('/api/leaderboard', async (req, res) => {
    try {
        const leaderboard = await db.all('SELECT name, high_score, games_played FROM players ORDER BY high_score DESC LIMIT 10');
        res.json(leaderboard);
    }
    catch (error) {
        console.error('Error fetching leaderboard:', error);
        res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
});
// Register or get a player by name
app.post('/api/players', async (req, res) => {
    const { name } = req.body;
    if (!name || typeof name !== 'string' || name.trim() === '') {
        return res.status(400).json({ error: 'Invalid name' });
    }
    const normalizedName = name.trim();
    try {
        // Check if player already exists
        let player = await db.get('SELECT * FROM players WHERE name = ?', [normalizedName]);
        if (!player) {
            // Insert new player
            const result = await db.run('INSERT INTO players (name) VALUES (?)', [normalizedName]);
            player = {
                id: result.lastID,
                name: normalizedName,
                high_score: 0,
                games_played: 0
            };
        }
        res.json(player);
    }
    catch (error) {
        console.error('Error registering player:', error);
        res.status(500).json({ error: 'Failed to register player' });
    }
});
// Record a completed match and update player stats
app.post('/api/matches', async (req, res) => {
    const { player1Name, player2Name, player1Score, player2Score, winnerName } = req.body;
    if (!player1Name || !player2Name || player1Score === undefined || player2Score === undefined) {
        return res.status(400).json({ error: 'Missing match details' });
    }
    try {
        // Record match in match history
        await db.run(`INSERT INTO matches (player1_name, player2_name, player1_score, player2_score, winner_name) 
       VALUES (?, ?, ?, ?, ?)`, [player1Name, player2Name, player1Score, player2Score, winnerName || null]);
        // Update Player 1 stats
        await updatePlayerStats(player1Name, player1Score);
        // Update Player 2 stats
        await updatePlayerStats(player2Name, player2Score);
        res.json({ success: true, message: 'Match recorded successfully' });
    }
    catch (error) {
        console.error('Error recording match:', error);
        res.status(500).json({ error: 'Failed to record match' });
    }
});
// Fetch complete match history
app.get('/api/matches', async (req, res) => {
    try {
        const history = await db.all('SELECT player1_name, player2_name, player1_score, player2_score, winner_name, played_at FROM matches ORDER BY played_at DESC LIMIT 20');
        res.json(history);
    }
    catch (error) {
        console.error('Error fetching matches:', error);
        res.status(500).json({ error: 'Failed to fetch match history' });
    }
});
// Helper to update player high score and total games played
async function updatePlayerStats(name, score) {
    const player = await db.get('SELECT high_score FROM players WHERE name = ?', [name]);
    if (player) {
        const newHighScore = Math.max(player.high_score, score);
        await db.run('UPDATE players SET high_score = ?, games_played = games_played + 1 WHERE name = ?', [newHighScore, name]);
    }
    else {
        // Fallback if player doesn't exist for some reason
        await db.run('INSERT INTO players (name, high_score, games_played) VALUES (?, ?, 1)', [name, score]);
    }
}
// Start Server
initDb().then(() => {
    app.listen(PORT, () => {
        console.log(`Backend server is running on http://localhost:${PORT}`);
    });
}).catch(err => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
});
