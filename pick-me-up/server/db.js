/**
 * Simple JSON-file character database.
 * Stores characters with their name, level, stats, spritesheet, and metadata.
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, "characters.json");

// ─── Helpers ───────────────────────────────────────────────

function readDB() {
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({ characters: [] }, null, 2));
  }
  return JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
}

function writeDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

function genId() {
  return crypto.randomBytes(8).toString("hex");
}

// ─── CRUD ──────────────────────────────────────────────────

export function getAllCharacters() {
  return readDB().characters;
}

export function getCharacter(id) {
  return readDB().characters.find((c) => c.id === id) || null;
}

export function createCharacter(data) {
  const db = readDB();
  const now = new Date().toISOString();

  const character = {
    id: genId(),
    name: data.name || "Unnamed",
    level: data.level ?? 1,
    class: data.class || "Novice",
    rarity: data.rarity ?? 1,
    stats: {
      strength: data.stats?.strength ?? 8,
      intelligence: data.stats?.intelligence ?? 8,
      health: data.stats?.health ?? 8,
      agility: data.stats?.agility ?? 8,
      critRate: data.stats?.critRate ?? 5,
      critDamage: data.stats?.critDamage ?? 130,
    },
    spriteId: data.spriteId || null,
    layers: data.layers || null,
    description: data.description || "",
    tags: data.tags || [],
    notes: data.notes || "",
    createdAt: now,
    updatedAt: now,
  };

  db.characters.push(character);
  writeDB(db);
  return character;
}

export function updateCharacter(id, updates) {
  const db = readDB();
  const idx = db.characters.findIndex((c) => c.id === id);
  if (idx === -1) return null;

  const character = db.characters[idx];

  // Merge updates (shallow for top-level, deep for stats)
  if (updates.name !== undefined) character.name = updates.name;
  if (updates.level !== undefined) character.level = updates.level;
  if (updates.class !== undefined) character.class = updates.class;
  if (updates.rarity !== undefined) character.rarity = updates.rarity;
  if (updates.stats) character.stats = { ...character.stats, ...updates.stats };
  if (updates.spriteId !== undefined) character.spriteId = updates.spriteId;
  if (updates.layers !== undefined) character.layers = updates.layers;
  if (updates.description !== undefined) character.description = updates.description;
  if (updates.tags !== undefined) character.tags = updates.tags;
  if (updates.notes !== undefined) character.notes = updates.notes;

  character.updatedAt = new Date().toISOString();
  db.characters[idx] = character;
  writeDB(db);
  return character;
}

export function deleteCharacter(id) {
  const db = readDB();
  const idx = db.characters.findIndex((c) => c.id === id);
  if (idx === -1) return false;
  db.characters.splice(idx, 1);
  writeDB(db);
  return true;
}

export function searchCharacters(query) {
  const q = query.toLowerCase();
  return readDB().characters.filter(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      c.class.toLowerCase().includes(q) ||
      (c.tags && c.tags.some((t) => t.toLowerCase().includes(q))) ||
      (c.description && c.description.toLowerCase().includes(q))
  );
}
