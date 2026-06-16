import { createClient } from '@libsql/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '..', '.env.local') });

const url = process.env.TURSO_DATABASE_URL || 'file:tournament.db';
const authToken = process.env.TURSO_AUTH_TOKEN;

const db = createClient({ url, authToken });

async function seed() {
  console.log('Connecting to database...');

  // Create tables
  const tables = `
    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS sports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      icon TEXT
    );
    CREATE TABLE IF NOT EXISTS groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      pool TEXT DEFAULT 'A',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      group_id INTEGER NOT NULL,
      sport_id INTEGER NOT NULL,
      FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
      FOREIGN KEY (sport_id) REFERENCES sports(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sport_id INTEGER NOT NULL,
      match_date DATE NOT NULL,
      match_time TEXT,
      home_group_id INTEGER NOT NULL,
      away_group_id INTEGER NOT NULL,
      home_score INTEGER DEFAULT NULL,
      away_score INTEGER DEFAULT NULL,
      stage TEXT DEFAULT 'group',
      status TEXT DEFAULT 'upcoming',
      details TEXT DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sport_id) REFERENCES sports(id),
      FOREIGN KEY (home_group_id) REFERENCES groups(id),
      FOREIGN KEY (away_group_id) REFERENCES groups(id)
    );
  `;

  for (const statement of tables.split(';').filter(s => s.trim())) {
    await db.execute(statement);
  }

  // Clear existing data
  await db.execute("DELETE FROM players");
  await db.execute("DELETE FROM matches");
  await db.execute("DELETE FROM groups");
  await db.execute("DELETE FROM sports");
  await db.execute("DELETE FROM admins");
  // sqlite_sequence may not exist if tables are empty
  try {
    await db.execute("DELETE FROM sqlite_sequence");
  } catch (e) {}

  // Seed admin
  const passwordHash = bcrypt.hashSync('admin123', 10);
  await db.execute({
    sql: `INSERT INTO admins (username, password_hash) VALUES (?, ?)`,
    args: ['admin', passwordHash]
  });

  // Seed sports
  await db.execute({ sql: `INSERT INTO sports (name, icon) VALUES (?, ?)`, args: ['Sepak Bola', 'football'] });
  await db.execute({ sql: `INSERT INTO sports (name, icon) VALUES (?, ?)`, args: ['Bulutangkis', 'badminton'] });
  await db.execute({ sql: `INSERT INTO sports (name, icon) VALUES (?, ?)`, args: ['Catur', 'chess'] });
  await db.execute({ sql: `INSERT INTO sports (name, icon) VALUES (?, ?)`, args: ['Volly', 'volleyball'] });
  await db.execute({ sql: `INSERT INTO sports (name, icon) VALUES (?, ?)`, args: ['Tenis Meja', 'tabletennis'] });

  // Seed groups
  for (let i = 1; i <= 10; i++) {
    const pool = i <= 5 ? 'A' : 'B';
    await db.execute({ sql: `INSERT INTO groups (name, pool) VALUES (?, ?)`, args: [`Grup ${i}`, pool] });
  }

  // Seed players
  const globalPlayers = {
    1: ['Ahmad Riyadi', 'Budi Santoso', 'Cahyo Pratama', 'Dimas Arya', 'Eko Saputra', 'Fajar Nugroho', 'Gilang Ramadhan', 'Ahmad Dahlan', 'Susanto Megaranto'],
    2: ['Hendra Wijaya', 'Irfan Hakim', 'Joko Susilo', 'Kurniawan Dwi', 'Lukman Hakim', 'Mulyadi Putra', 'Naufal Rizky', 'Cahya Putra', 'Utut Adianto'],
    3: ['Oscar Firmansyah', 'Pandu Wicaksono', 'Qori Ananda', 'Rizky Maulana', 'Surya Darma', 'Teguh Prasetyo', 'Umar Fauzi', 'Eka Satria', 'Herman Suradiradja'],
    4: ['Vino Bastian', 'Wahyu Hidayat', 'Xander Putra', 'Yusuf Maulana', 'Zainal Abidin', 'Adi Nugraha', 'Bayu Setiawan', 'Galih Perkasa', 'Cerdas Barus'],
    5: ['Candra Kirana', 'Deni Rahmat', 'Erwin Prasetya', 'Faisal Akbar', 'Gunawan Wibowo', 'Hadi Purnomo', 'Ilham Saputra', 'Indra Lesmana', 'Novendra Priasmoro'],
    6: ['Jefri Kurniawan', 'Krisna Murti', 'Luthfi Hakim', 'Maman Suryaman', 'Nanda Pratama', 'Okta Rivaldi', 'Putra Ramadhan', 'Kevin Sanjaya', 'Irene Sukandar'],
    7: ['Raka Aditya', 'Sandi Permana', 'Taufik Hidayat', 'Ujang Suryana', 'Valentino Jati', 'Wawan Setiawan', 'Yogi Pratama', 'Marcus Gideon', 'Medina Aulia'],
    8: ['Zaki Mubarak', 'Arief Budiman', 'Bambang Pamungkas', 'Cecep Riza', 'Doni Wahyudi', 'Eka Prasetya', 'Fandi Ahmad', 'Owi Budiarto', 'Sean Winshand'],
    9: ['Gading Marten', 'Hari Mulyono', 'Ivan Kolev', 'Jajang Sulaeman', 'Karsa Negara', 'Lutung Kasarung', 'Maulana Malik', 'Qadir Hamzah', 'Aditya Bagus'],
    10: ['Nabil Husein', 'Obet Permana', 'Pras Teguh', 'Rendi Irawan', 'Syamsul Arifin', 'Tono Sucipto', 'Ucok Baba', 'Sigit Budiarto', 'Farid Firman'],
  };

  for (const [groupId, names] of Object.entries(globalPlayers)) {
    for (const name of names) {
      await db.execute({
        sql: `INSERT INTO players (name, group_id, sport_id) VALUES (?, ?, ?)`,
        args: [name, parseInt(groupId), 1]
      });
    }
  }

  // Seed matches
  const insertMatch = async (sportId, date, time, home, away, hScore, aScore, stage, status, details) => {
    await db.execute({
      sql: `INSERT INTO matches (sport_id, match_date, match_time, home_group_id, away_group_id, home_score, away_score, stage, status, details)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [sportId, date, time, home, away, hScore, aScore, stage, status, details]
    });
  };

  const footballDetails1 = JSON.stringify({ goals: [{ player: "Ahmad Riyadi", time: "12'" }, { player: "Cahyo Pratama", time: "45'" }, { player: "Budi Santoso", time: "89'" }], yellow_cards: ["Fajar Nugroho"], red_cards: [] });
  const badmintonDetails = JSON.stringify({ home_players: ["Ahmad Dahlan", "Budi Santoso"], away_players: ["Cahya Putra", "Utut Adianto"], sets: [{ home: 21, away: 15 }, { home: 18, away: 21 }, { home: 21, away: 19 }] });
  const chessDetails = JSON.stringify({ home_players: ["Susanto Megaranto"], away_players: ["Utut Adianto"], score_text: "1 - 0" });
  const volleyballDetails1 = JSON.stringify({ sets: [{ home: 25, away: 21 }, { home: 25, away: 23 }, { home: 25, away: 18 }] });
  const volleyballDetails2 = JSON.stringify({ sets: [{ home: 25, away: 22 }, { home: 20, away: 25 }, { home: 25, away: 23 }, { home: 18, away: 25 }, { home: 15, away: 12 }] });
  const volleyballDetails3 = JSON.stringify({ sets: [{ home: 18, away: 25 }, { home: 25, away: 22 }, { home: 15, away: 25 }, { home: 21, away: 25 }] });

  await insertMatch(2, '2026-05-23', '19.00', 1, 2, 2, 1, 'group', 'finished', badmintonDetails);
  await insertMatch(2, '2026-05-23', '19.30', 6, 7, 2, 0, 'group', 'finished', JSON.stringify({ home_players: ["Kevin Sanjaya", "Irene Sukandar"], away_players: ["Marcus Gideon", "Medina Aulia"], sets: [{ home: 21, away: 10 }, { home: 21, away: 12 }] }));
  await insertMatch(3, '2026-05-23', '19.00', 1, 2, 1, 0, 'group', 'finished', chessDetails);
  await insertMatch(3, '2026-05-23', '19.30', 6, 7, 0, 1, 'group', 'finished', JSON.stringify({ home_players: ["Irene Sukandar"], away_players: ["Medina Aulia"], score_text: "0 - 1" }));
  await insertMatch(1, '2026-05-24', '15.00', 1, 2, 3, 1, 'group', 'finished', footballDetails1);
  await insertMatch(1, '2026-05-24', '17.00', 6, 7, 1, 1, 'group', 'finished', JSON.stringify({ goals: [{ player: "Jefri Kurniawan", time: "20'" }, { player: "Raka Aditya", time: "80'" }], yellow_cards: [], red_cards: [] }));
  await insertMatch(4, '2026-05-25', '19.00', 1, 2, 3, 0, 'group', 'finished', volleyballDetails1);
  await insertMatch(4, '2026-05-25', '20.30', 3, 4, 3, 2, 'group', 'finished', volleyballDetails2);
  await insertMatch(4, '2026-05-26', '19.00', 6, 7, 1, 3, 'group', 'finished', volleyballDetails3);

  await insertMatch(1, '2026-05-31', '15.00', 3, 4, null, null, 'group', 'upcoming', null);
  await insertMatch(1, '2026-05-31', '17.00', 8, 9, null, null, 'group', 'upcoming', null);
  await insertMatch(4, '2026-05-31', '19.00', 1, 3, null, null, 'group', 'upcoming', null);
  await insertMatch(4, '2026-05-31', '20.30', 6, 8, null, null, 'group', 'upcoming', null);
  await insertMatch(1, '2026-06-10', '15.00', 1, 7, null, null, 'semifinal', 'upcoming', null);
  await insertMatch(1, '2026-06-10', '19.00', 6, 2, null, null, 'semifinal', 'upcoming', null);
  await insertMatch(1, '2026-06-14', '15.00', 7, 2, null, null, 'third_place', 'upcoming', null);
  await insertMatch(1, '2026-06-14', '19.00', 1, 6, null, null, 'final', 'upcoming', null);

  console.log('✅ Database seeded successfully!');
  console.log(`   📁 Target URL: ${url}`);
  console.log('   👤 Admin: admin / admin123');
  console.log('   🏐 4 cabang olahraga');
  console.log('   👥 10 grup ronda (Pool A & Pool B)');
  console.log('   📅 Sample matches seeded with details');
}

seed().catch(console.error);
