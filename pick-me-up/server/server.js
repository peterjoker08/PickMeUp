#!/usr/bin/env node
/**
 * PickMeUp Sprite Generation Server
 * Wraps the LPC character generator behind an Express API.
 *
 * POST /generate        — generate a single hero/enemy spritesheet
 * POST /generate-batch  — generate multiple at once
 * GET  /sprite/:id      — serve a cached spritesheet PNG
 * GET  /health          — check server status
 *
 * Env vars:
 *   GROQ_API_KEY  — free key from console.groq.com
 *   LPC_REPO      — path to Universal-LPC-Spritesheet-Character-Generator clone
 *   PORT          — server port (default 3777)
 */

import express from "express";
import cors from "cors";
import Groq from "groq-sdk";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import {
  getAllCharacters, getCharacter, createCharacter,
  updateCharacter, deleteCharacter, searchCharacters,
} from "./db.js";
import {
  parseSheetDefinitions,
  buildLayerCatalog,
  resolveLayerFiles,
  buildCreditsText,
} from "./lpc-sheets.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3777;

// ─── Configuration ─────────────────────────────────────────
const CONFIG = {
  groqModel: "llama-3.3-70b-versatile",
  lpcRepoPath: process.env.LPC_REPO || path.join(__dirname, "..", "assets", "characterGenerator", "Universal-LPC-Spritesheet-Character-Generator"),
  cacheDir: path.join(__dirname, "sprite-cache"),
  spritesheetBase: "spritesheets",
};

fs.mkdirSync(CONFIG.cacheDir, { recursive: true });

// ─── Parse LPC repo sheet_definitions (if available) ───────
let lpcParsed = null;
let lpcCatalog = null;
try {
  if (fs.existsSync(CONFIG.lpcRepoPath)) {
    lpcParsed = parseSheetDefinitions(CONFIG.lpcRepoPath);
    lpcCatalog = buildLayerCatalog(lpcParsed);
    console.log(`Parsed ${lpcParsed.definitions.length} LPC sheet definitions`);
  }
} catch (e) {
  console.warn("Could not parse LPC sheet definitions:", e.message);
}

// ─── LPC Layer Definitions (hardcoded fallback) ────────────
const LPC_LAYERS = {
  body: {
    description: "Base body type",
    options: ["male", "female", "child", "elderly_male", "elderly_female"],
    default: "male", folder: "body",
  },
  skin: {
    description: "Skin color tone",
    options: ["light", "tanned", "tanned2", "dark", "dark2", "darkelf", "darkelf2", "orc", "zombie"],
    default: "light", folder: "body",
  },
  head: {
    description: "Head type (auto-matched to body and skin)",
    options: ["human"],
    default: "human", folder: "head",
  },
  hair_style: {
    description: "Hair style",
    options: [
      "none", "plain", "long", "princess", "bangs", "pixie",
      "messy", "messy1", "messy2", "messy3", "halfmessy",
      "ponytail", "ponytail2", "high_ponytail", "swoop", "swoop_side",
      "bedhead", "parted", "parted2", "parted3", "loose",
      "curly_long", "curly_short", "curly_short2",
      "shoulderl", "shoulderr", "bob", "bob_side_part",
      "xlong", "longhawk", "long_messy", "long_messy2", "long_straight",
      "page", "page2", "braid", "braid2", "pigtails",
      "buzzcut", "balding", "afro", "jewfro", "natural",
      "spiked", "spiked2", "shorthawk", "mop", "unkempt",
    ],
    default: "plain", folder: "hair",
  },
  hair_color: {
    description: "Hair color",
    options: [
      "ash", "black", "blonde", "blue", "carrot", "chestnut",
      "dark_brown", "dark_gray", "ginger", "gold", "gray", "green",
      "light_brown", "navy", "orange", "pink", "platinum", "purple",
      "raven", "red", "redhead", "rose", "sandy", "strawberry",
      "violet", "white",
    ],
    default: "dark_brown", folder: "hair",
  },
  facial_hair: {
    description: "Facial hair style (use 'none' for female/child characters)",
    options: ["none", "beard", "mustache", "goatee", "elvish"],
    default: "none", folder: "facial_hair",
  },
  facial_hair_color: {
    description: "Facial hair color (only if facial_hair is not none)",
    options: ["black", "blonde", "brown", "gray", "red", "white"],
    default: "brown", folder: "facial_hair",
  },
  ears: {
    description: "Ear type",
    options: ["none", "ears", "elven_ears"],
    default: "ears", folder: "ears",
  },
  eyes: {
    description: "Eye color",
    options: ["blue", "brown", "gray", "green", "orange", "purple", "red", "yellow"],
    default: "brown", folder: "eyes",
  },
  underwear: {
    description: "Underwear or undershirt",
    options: ["none", "panties", "shorties"],
    default: "none", folder: "underwear",
  },
  legs: {
    description: "Leg covering",
    options: [
      "none", "pants", "shorts", "skirts", "hose", "leggings",
      "pantaloons", "plate", "fur",
    ],
    default: "pants", folder: "legs",
  },
  feet: {
    description: "Footwear",
    options: ["none", "shoes", "boots", "slippers", "sandals", "plate", "ghillies"],
    default: "shoes", folder: "feet",
  },
  torso: {
    description: "Torso clothing or armor",
    options: [
      "none", "longsleeve", "shortsleeve", "sleeveless", "tunic", "blouse", "vest",
      "robe", "corset", "chainmail", "leather", "plate",
      "tabard", "gambeson", "dress",
    ],
    default: "longsleeve", folder: "torso",
  },
  arms: {
    description: "Arms/sleeves",
    options: ["none", "bracers", "leather", "plate", "chainmail"],
    default: "none", folder: "arms",
  },
  belt: {
    description: "Belt or waist accessory",
    options: ["none", "belt", "leather", "rope"],
    default: "none", folder: "belt",
  },
  cape: {
    description: "Cape or cloak",
    options: ["none", "solid", "tattered", "trim"],
    default: "none", folder: "cape",
  },
  hat: {
    description: "Headwear or helmet",
    options: [
      "none", "greathelm", "close", "armet_simple", "mail",
      "bandana", "bycocket", "hood", "wizard",
      "tiara", "crown",
    ],
    default: "none", folder: "hat",
  },
  weapon_right: {
    description: "Weapon in right hand",
    options: [
      "none", "longsword", "dagger", "rapier", "scimitar", "katana", "saber",
      "mace", "waraxe", "flail", "club",
      "halberd", "spear", "trident", "longspear",
      "bow", "crossbow",
      "simple", "gnarled", "crystal", "loop",
    ],
    default: "none", folder: "weapon",
  },
  shield: {
    description: "Shield in left hand",
    options: ["none", "kite", "crusader", "heater", "spartan", "scutum"],
    default: "none", folder: "shield",
  },
};

// ─── Groq Integration ──────────────────────────────────────
let groq = null;

function initGroq() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.warn("⚠ GROQ_API_KEY not set — sprite generation will use fallback templates.");
    return null;
  }
  return new Groq({ apiKey });
}

async function descriptionToLayers(description) {
  if (!groq) return buildFallbackLayers(description);

  const optionsSummary = Object.entries(LPC_LAYERS)
    .map(([key, val]) => `- ${key} (${val.description}): ${val.options.join(", ")}`)
    .join("\n");

  const prompt = `You are a pixel art character designer for the LPC spritesheet generator.

A user described this character: "${description}"

Select the best matching option for each layer from the EXACT options listed below. Return ONLY a valid JSON object with no extra text, comments, or markdown.

Available layers and their exact options:
${optionsSummary}

Rules:
1. Use ONLY options from the lists above — no variations or invented values.
2. If a feature isn't mentioned, pick a reasonable default that fits the character's archetype.
3. For female/child characters, set facial_hair to "none".
4. Match colors to the description as closely as possible.
5. For skin, pick from: light, tanned, tanned2, dark, dark2, darkelf, darkelf2, orc, zombie.

Return a JSON object like:
{
  "body": "female",
  "skin": "tanned",
  "hair_style": "longhair",
  "hair_color": "red",
  ...all other layers...
}`;

  const response = await groq.chat.completions.create({
    messages: [{ role: "user", content: prompt }],
    model: CONFIG.groqModel,
    temperature: 0.3,
    max_tokens: 800,
  });

  const raw = response.choices[0].message.content.trim();
  const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error("Could not parse Llama response as JSON");
  }
}

// ─── Fallback Templates (when no API key) ──────────────────
// Maps game classes to reasonable LPC layer configs
const CLASS_TEMPLATES = {
  Knight:     { body: "male", torso: "plate", legs: "plate", feet: "plate", arms: "plate", hat: "greathelm", weapon_right: "longsword", shield: "kite", cape: "solid" },
  Mage:       { body: "male", torso: "longsleeve", legs: "hose", feet: "slippers", hat: "wizard", weapon_right: "simple", cape: "solid" },
  Rogue:      { body: "male", torso: "leather", legs: "pants", feet: "boots", arms: "bracers", weapon_right: "dagger", hat: "hood", cape: "solid" },
  Archer:     { body: "male", torso: "leather", legs: "pants", feet: "boots", arms: "bracers", weapon_right: "bow" },
  Healer:     { body: "female", torso: "robe", legs: "hose", feet: "slippers", hat: "none", weapon_right: "simple" },
  Berserker:  { body: "male", torso: "none", legs: "pants", feet: "boots", arms: "bracers", weapon_right: "waraxe" },
  Summoner:   { body: "female", torso: "robe", legs: "skirts", feet: "slippers", weapon_right: "simple", cape: "tattered" },
  Villager:   { body: "male", torso: "longsleeve", legs: "pants", feet: "shoes" },
  Chef:       { body: "male", torso: "longsleeve", legs: "pants", feet: "shoes" },
  Maid:       { body: "female", torso: "blouse", legs: "skirts", feet: "shoes" },
  Farmer:     { body: "male", torso: "longsleeve", legs: "pants", feet: "shoes" },
  Merchant:   { body: "male", torso: "vest", legs: "pants", feet: "boots" },
  Blacksmith: { body: "male", torso: "sleeveless", legs: "pants", feet: "boots", arms: "bracers" },
  Herbalist:  { body: "female", torso: "blouse", legs: "skirts", feet: "shoes", cape: "tattered" },
  Tailor:     { body: "female", torso: "blouse", legs: "skirts", feet: "shoes" },
  Bard:       { body: "male", torso: "longsleeve", legs: "pants", feet: "boots", cape: "solid" },
  "Stable Hand": { body: "male", torso: "longsleeve", legs: "pants", feet: "shoes" },
  Novice:     { body: "male", torso: "longsleeve", legs: "pants", feet: "shoes" },
};

const ENEMY_LPC_TEMPLATES = {
  // Humanoid enemies get actual LPC sprites
  goblin:      { body: "male", skin: "orc", hair_style: "shorthawk", hair_color: "green", torso: "leather", legs: "pants", feet: "boots", weapon_right: "dagger" },
  orc:         { body: "male", skin: "orc", hair_style: "shorthawk", hair_color: "black", torso: "chainmail", legs: "pants", feet: "boots", weapon_right: "waraxe", arms: "plate" },
  skeleton:    { body: "male", skin: "zombie", hair_style: "none", torso: "none", legs: "pants", feet: "none", weapon_right: "longsword" },
  zombie:      { body: "male", skin: "zombie", hair_style: "bedhead", hair_color: "gray", torso: "none", legs: "pants", feet: "none" },
  mage:        { body: "male", skin: "darkelf", hair_style: "long", hair_color: "white", torso: "longsleeve", legs: "hose", feet: "slippers", weapon_right: "simple", hat: "wizard", cape: "solid" },
  knight:      { body: "male", skin: "dark", torso: "plate", legs: "plate", feet: "plate", arms: "plate", hat: "greathelm", weapon_right: "longsword", shield: "crusader", cape: "solid" },
  ogre:        { body: "male", skin: "orc", hair_style: "none", torso: "none", legs: "pants", feet: "boots", weapon_right: "warhammer" },
  harpy:       { body: "female", skin: "darkelf2", hair_style: "bedhead", hair_color: "purple", torso: "blouse", legs: "skirts", feet: "none", cape: "tattered" },
  demon:       { body: "male", skin: "darkelf", hair_style: "shorthawk", hair_color: "red", torso: "chainmail", legs: "pants", feet: "plate", weapon_right: "flail", cape: "solid" },
  lich:        { body: "male", skin: "zombie", hair_style: "long", hair_color: "white", torso: "longsleeve", legs: "hose", feet: "none", weapon_right: "simple", hat: "wizard", cape: "solid" },
};

function buildFallbackLayers(description) {
  // Try to match a class from the description
  const desc = description.toLowerCase();

  for (const [cls, template] of Object.entries(CLASS_TEMPLATES)) {
    if (desc.includes(cls.toLowerCase())) {
      return { skin: "light", hair_style: "plain", hair_color: "dark_brown", eyes: "brown", ears: "ears", ...template };
    }
  }
  for (const [key, template] of Object.entries(ENEMY_LPC_TEMPLATES)) {
    if (desc.includes(key)) {
      return { eyes: "red", ears: "ears", ...template };
    }
  }

  // Generic default
  return { body: "male", skin: "light", head: "human", hair_style: "plain", hair_color: "dark_brown", eyes: "brown", ears: "ears", torso: "longsleeve", legs: "pants", feet: "shoes" };
}

// ─── Validation ────────────────────────────────────────────
function fuzzyMatch(value, options) {
  if (!value) return null;
  const v = value.toLowerCase().trim();
  if (options.includes(v)) return v;
  const sub = options.find(o => o.includes(v) || v.includes(o));
  if (sub) return sub;
  let best = null, bestDist = Infinity;
  for (const opt of options) {
    const dist = levenshtein(v, opt);
    if (dist < bestDist) { bestDist = dist; best = opt; }
  }
  return bestDist <= 4 ? best : null;
}

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
  return dp[m][n];
}

function validateLayers(layers) {
  const fixed = {};
  for (const [key, def] of Object.entries(LPC_LAYERS)) {
    const raw = layers[key];
    if (raw === "none") { fixed[key] = "none"; continue; }       // Explicit "none" stays none
    if (!raw) { fixed[key] = def.default; continue; }            // Missing → use default
    const matched = fuzzyMatch(String(raw), def.options);
    fixed[key] = matched || def.default;
  }
  // Always ensure head is set (it's auto-matched from body/skin)
  if (!fixed.head) fixed.head = "human";
  return fixed;
}

// ─── Compositing ───────────────────────────────────────────
// LPC Universal-Expanded spritesheet: 832×2944 = 13 cols × 46 rows of 64×64
//
// Row layout (direction order: Up/N, Left/W, Down/S, Right/E):
//   Rows  0-3:  Spellcast  (4 dirs, 7 frames)
//   Rows  4-7:  Thrust     (4 dirs, 8 frames)
//   Rows  8-11: Walk       (4 dirs, 9 frames)
//   Rows 12-15: Slash      (4 dirs, 6 frames)
//   Rows 16-19: Shoot      (4 dirs, 13 frames)
//   Row  20:    Hurt       (1 dir, 6 frames)
//   Row  21:    Climb      (1 dir, 6 frames)
//   Rows 22-25: Idle       (4 dirs, 2 frames)
//   Rows 26-29: Jump       (4 dirs, 5 frames)
//   Rows 30-33: Sit        (4 dirs, 3 frames)
//   Rows 34-37: Emote      (4 dirs)
//   Rows 38-41: Run        (4 dirs, 8 frames)
//   Rows 42-45: Combat Idle(4 dirs, 2 frames)
//
const SHEET_WIDTH = 832;
const SHEET_HEIGHT = 2944;
const DRAW_ORDER = [
  "body", "head", "ears", "eyes", "underwear", "legs", "feet", "torso", "arms",
  "belt", "facial_hair", "hair_style", "hat", "cape", "shield", "weapon_right",
];

function searchRecursive(dir, filename) {
  if (!fs.existsSync(dir)) return null;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    if (e.isDirectory()) {
      const sub = searchRecursive(path.join(dir, e.name), filename);
      if (sub) return sub;
    } else if (e.name === filename) {
      return path.join(dir, e.name);
    }
  }
  return null;
}

async function findSpritesheetFile(layer, value, allLayers) {
  const spritesDir = path.join(CONFIG.lpcRepoPath, CONFIG.spritesheetBase);
  const def = LPC_LAYERS[layer];
  if (!def || value === "none") return null;

  const body = allLayers.body || "male";
  const skin = allLayers.skin || "light";
  const hairColor = allLayers.hair_color || "dark_brown";
  const facialHairColor = allLayers.facial_hair_color || "dark_brown";
  const candidates = [];

  switch (layer) {
    case "body":
      // Actual path: body/bodies/{bodyType}/{skin}.png
      candidates.push(
        path.join(spritesDir, "body", "bodies", body, `${skin}.png`),
        path.join(spritesDir, "body", "bodies", `${body}.png`),
      );
      break;

    case "head":
      // Actual path: head/heads/human/{bodyType}/{skin}.png
      candidates.push(
        path.join(spritesDir, "head", "heads", "human", body, `${skin}.png`),
        path.join(spritesDir, "head", "heads", "human", `${body}.png`),
        // For non-human heads (orc, skeleton, etc.)
        path.join(spritesDir, "head", "heads", skin, body, `${skin}.png`),
        path.join(spritesDir, "head", "heads", skin, `${body}.png`),
      );
      break;

    case "ears":
      // Default human ears are already part of the head PNG — only draw special ears
      if (value === "ears" || value === "none") return null;
      // Elven ears: head/ears/elven/adult/{skin}.png
      if (value === "elven_ears" || value === "elven") {
        candidates.push(
          path.join(spritesDir, "head", "ears", "elven", "adult", `${skin}.png`),
        );
      }
      break;

    case "eyes":
      // Actual path: eyes/human/adult/{color}.png
      candidates.push(
        path.join(spritesDir, "eyes", "human", "adult", `${value}.png`),
        path.join(spritesDir, "eyes", "human", `adult.png`),
      );
      break;

    case "hair_style":
      // Actual path: hair/{style}/{bodyType}/{color}.png  or  hair/{style}/{bodyType}.png
      candidates.push(
        path.join(spritesDir, "hair", value, body, `${hairColor}.png`),
        path.join(spritesDir, "hair", value, `${body}.png`),
      );
      break;

    case "facial_hair":
      // Actual path: beards/{type}/{color}.png  or  beards/{type}/basic/{color}.png
      candidates.push(
        path.join(spritesDir, "beards", value, `${facialHairColor}.png`),
        path.join(spritesDir, "beards", value, "basic", `${facialHairColor}.png`),
      );
      break;

    case "torso":
      // The torso folder has a complex 3-level structure:
      //   torso/clothes/{category}/{subcategory}/{bodyType}/{color}.png
      //   torso/armour/{type}/{bodyType}/{material}.png
      //   torso/chainmail/{bodyType}/{color}.png
      //   torso/jacket/{type}/{bodyType}/{color}.png
      // For clothes like longsleeve, the structure is:
      //   torso/clothes/longsleeve/longsleeve/{bodyType}/{color}.png
      candidates.push(
        // Direct clothes path (doubled name like longsleeve/longsleeve/male/)
        path.join(spritesDir, "torso", "clothes", value, value, body, "white.png"),
        path.join(spritesDir, "torso", "clothes", value, value, `${body}.png`),
        // Clothes flat path
        path.join(spritesDir, "torso", "clothes", value, body, "white.png"),
        path.join(spritesDir, "torso", "clothes", value, `${body}.png`),
        // Shortsleeve special: torso/clothes/shortsleeve/tshirt/{bodyType}/{color}.png
        path.join(spritesDir, "torso", "clothes", "shortsleeve", value, body, "white.png"),
        path.join(spritesDir, "torso", "clothes", "shortsleeve", "tshirt", body, "white.png"),
        // Armour
        path.join(spritesDir, "torso", "armour", value, body, "steel.png"),
        path.join(spritesDir, "torso", "armour", value, `${body}.png`),
        // Chainmail / direct subfolder
        path.join(spritesDir, "torso", value, body, "gray.png"),
        path.join(spritesDir, "torso", value, `${body}.png`),
        // Jacket
        path.join(spritesDir, "torso", "jacket", value, body, "white.png"),
        path.join(spritesDir, "torso", "jacket", value, `${body}.png`),
      );
      break;

    case "legs":
      // Actual path: legs/{item}/{bodyType}/{color}.png
      //              legs/armour/{item}/{bodyType}/{material}.png
      //              legs/skirts/plain/{bodyType}/{color}.png  (skirts has subcategories: plain, belle, legion, slit, straight)
      candidates.push(
        path.join(spritesDir, "legs", value, body, "white.png"),
        path.join(spritesDir, "legs", value, `${body}.png`),
        path.join(spritesDir, "legs", "armour", value, body, "steel.png"),
        path.join(spritesDir, "legs", "armour", value, `${body}.png`),
      );
      // For items with subcategories (like skirts), try common sub-styles
      for (const sub of ["plain", "legion", "belle", "straight", "slit", "overskirt"]) {
        candidates.push(
          path.join(spritesDir, "legs", value, sub, body, "white.png"),
          path.join(spritesDir, "legs", value, sub, `${body}.png`),
        );
      }
      break;

    case "feet":
      // Actual path: feet/{item}/{bodyType}/{color}.png
      //              feet/armour/{item}/{bodyType}/{material}.png
      candidates.push(
        path.join(spritesDir, "feet", value, body, "brown.png"),
        path.join(spritesDir, "feet", value, `${body}.png`),
        path.join(spritesDir, "feet", "armour", value, body, "steel.png"),
        path.join(spritesDir, "feet", "armour", value, `${body}.png`),
      );
      break;

    case "arms":
      // Actual path: arms/{item}/{bodyType}/{color}.png
      candidates.push(
        path.join(spritesDir, "arms", value, body, "steel.png"),
        path.join(spritesDir, "arms", value, `${body}.png`),
      );
      break;

    case "hat":
      // Hat paths vary a lot:
      //   hat/helmet/{item}/{bodyType}/{material}.png      (greathelm, close, etc.)
      //   hat/cloth/{item}/adult/{color}.png               (bandana, hood, etc.)
      //   hat/magic/wizard/base/adult/{color}.png          (wizard hat - extra "base" level)
      //   hat/formal/{item}/adult/{color}.png              (crown, tiara, etc.)
      for (const category of ["helmet", "cloth", "magic", "headband", "accessory", "formal", "pirate", "holiday", "visor"]) {
        candidates.push(
          // Standard: hat/{category}/{item}/{bodyType}/{material}.png
          path.join(spritesDir, "hat", category, value, body, "steel.png"),
          path.join(spritesDir, "hat", category, value, body, "brown.png"),
          path.join(spritesDir, "hat", category, value, body, "white.png"),
          path.join(spritesDir, "hat", category, value, `${body}.png`),
          // Adult variant: hat/{category}/{item}/adult/{color}.png
          path.join(spritesDir, "hat", category, value, "adult", "steel.png"),
          path.join(spritesDir, "hat", category, value, "adult", "brown.png"),
          path.join(spritesDir, "hat", category, value, "adult", "blue.png"),
          path.join(spritesDir, "hat", category, value, `adult.png`),
          // Deeper nesting (wizard): hat/{category}/{item}/base/adult/{color}.png
          path.join(spritesDir, "hat", category, value, "base", "adult", "blue.png"),
          path.join(spritesDir, "hat", category, value, "base", "adult", "brown.png"),
          path.join(spritesDir, "hat", category, value, "base", "adult", "steel.png"),
          path.join(spritesDir, "hat", category, value, "base", `adult.png`),
        );
      }
      break;

    case "cape":
      // Actual path: cape/{style}/{bodyType}/{color}.png  (e.g., cape/solid/male/brown.png)
      // Some styles only have female variants, so also try solid fallback
      candidates.push(
        path.join(spritesDir, "cape", value, body, "brown.png"),
        path.join(spritesDir, "cape", value, `${body}.png`),
        // Fallback to solid if tattered doesn't have our body type
        path.join(spritesDir, "cape", "solid", body, "brown.png"),
        path.join(spritesDir, "cape", "solid", `${body}.png`),
      );
      break;

    case "shield":
      // Actual path: shield/{type}/fg/{bodyType}/{type}.png  or  shield/{type}/fg/{type}.png
      candidates.push(
        path.join(spritesDir, "shield", value, "fg", body, `${value}.png`),
        path.join(spritesDir, "shield", value, "fg", `${value}.png`),
        path.join(spritesDir, "shield", value, "fg", `${body}.png`),
        path.join(spritesDir, "shield", body, `${value}.png`),
      );
      break;

    case "weapon_right":
      // Weapons have varied structures:
      //   weapon/sword/longsword/longsword.png                           (direct)
      //   weapon/magic/simple/foreground/simple.png                      (foreground subfolder)
      //   weapon/magic/gnarled/universal/gnarled.png                     (universal subfolder)
      //   weapon/ranged/bow/normal/universal/foreground/normal.png       (deep nested ranged)
      for (const cat of ["sword", "blunt", "polearm", "ranged", "magic"]) {
        candidates.push(
          // Direct: weapon/{cat}/{item}/{item}.png
          path.join(spritesDir, "weapon", cat, value, `${value}.png`),
          // Foreground/universal: weapon/{cat}/{item}/foreground/{item}.png
          path.join(spritesDir, "weapon", cat, value, "foreground", `${value}.png`),
          path.join(spritesDir, "weapon", cat, value, "universal", `${value}.png`),
          // Ranged deep nested: weapon/ranged/{item}/normal/universal/foreground/normal.png
          path.join(spritesDir, "weapon", cat, value, "normal", "universal", "foreground", "normal.png"),
          path.join(spritesDir, "weapon", cat, value, "normal", "universal", "foreground.png"),
          path.join(spritesDir, "weapon", cat, value, "normal", `${value}.png`),
        );
      }
      break;

    default: {
      const folder = def.folder || layer;
      candidates.push(
        path.join(spritesDir, folder, `${value}.png`),
        path.join(spritesDir, folder, body, `${value}.png`),
        path.join(spritesDir, folder, value, `${body}.png`),
      );
    }
  }

  // Try direct candidates first
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }

  // Fallback: recursive search in the layer's top-level folder
  const topFolder = {
    body: "body", head: "head", ears: "head", eyes: "eyes",
    hair_style: "hair", facial_hair: "beards", torso: "torso",
    legs: "legs", feet: "feet", arms: "arms", hat: "hat",
    cape: "cape", shield: "shield", weapon_right: "weapon",
  }[layer] || def.folder || layer;
  const folderPath = path.join(spritesDir, topFolder);
  if (fs.existsSync(folderPath)) {
    // Try: find a subfolder matching the value name, then find a PNG for our body type inside it
    const result = searchRecursive(folderPath, `${value}.png`);
    if (result) return result;

    // Search deeper: look for any folder named {value} and pick the first body-matching PNG inside
    const valueFolders = findFolders(folderPath, value);
    for (const vf of valueFolders) {
      // Try body-specific subfolder first
      const bodyDir = path.join(vf, body);
      if (fs.existsSync(bodyDir)) {
        const pngs = fs.readdirSync(bodyDir).filter(f => f.endsWith('.png'));
        if (pngs.length > 0) return path.join(bodyDir, pngs[0]);
      }
      // Try "adult" subfolder
      const adultDir = path.join(vf, "adult");
      if (fs.existsSync(adultDir)) {
        const pngs = fs.readdirSync(adultDir).filter(f => f.endsWith('.png'));
        if (pngs.length > 0) return path.join(adultDir, pngs[0]);
      }
      // Try any PNG directly in the value folder
      const pngs = fs.readdirSync(vf).filter(f => f.endsWith('.png'));
      if (pngs.length > 0) return path.join(vf, pngs[0]);
    }

    // Last resort: search by skin color
    return searchRecursive(folderPath, `${skin}.png`);
  }
  return null;
}

/** Find all directories with a given name under a root path (non-recursive to 4 levels) */
function findFolders(root, name) {
  const results = [];
  function search(dir, depth) {
    if (depth > 4 || !fs.existsSync(dir)) return;
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const e of entries) {
        if (e.isDirectory()) {
          if (e.name === name) results.push(path.join(dir, e.name));
          else search(path.join(dir, e.name), depth + 1);
        }
      }
    } catch {}
  }
  search(root, 0);
  return results;
}

async function compositeSpritesheet(layers) {
  const canvas = createCanvas(SHEET_WIDTH, SHEET_HEIGHT);
  const ctx = canvas.getContext("2d");
  const loaded = [];

  for (const layer of DRAW_ORDER) {
    const value = layers[layer];
    if (!value || value === "none") continue;

    const filePath = await findSpritesheetFile(layer, value, layers);
    if (!filePath) {
      console.log(`  [skip] ${layer}:${value} — no file found`);
      continue;
    }

    try {
      const img = await loadImage(filePath);
      // Draw at natural size, aligned to top-left.
      // Smaller sheets (e.g. 832×1344 old format) only cover the first 21 rows — that's fine.
      ctx.drawImage(img, 0, 0);
      loaded.push(`${layer}:${value}`);
      console.log(`  [load] ${layer}:${value} — ${img.width}×${img.height} from ${path.basename(filePath)}`);
    } catch (e) {
      console.warn(`  [err]  ${layer}:${value} — ${e.message}`);
    }
  }

  return { canvas, loaded };
}

// ─── Hash-based caching ────────────────────────────────────
function layerHash(layers) {
  const sorted = JSON.stringify(layers, Object.keys(layers).sort());
  return crypto.createHash("md5").update(sorted).digest("hex").slice(0, 12);
}

function getCachedSprite(hash) {
  const p = path.join(CONFIG.cacheDir, `${hash}.png`);
  if (fs.existsSync(p)) return p;
  return null;
}

function cacheSprite(hash, buffer) {
  const p = path.join(CONFIG.cacheDir, `${hash}.png`);
  fs.writeFileSync(p, buffer);
  return p;
}

// ─── PickMeUp game-specific helpers ────────────────────────

/**
 * Build a description string from game hero data for Llama.
 * Used by the browser to request a sprite for a new hero.
 */
function heroToDescription(heroData) {
  const { name, rarity, class: cls, isCommoner } = heroData;
  const rarityWord = ["", "common", "uncommon", "rare", "epic", "legendary", "mythic", "divine"][rarity] || "common";

  if (isCommoner) {
    return `a ${rarityWord} ${cls.toLowerCase()} villager, simple clothing, no armor, no weapons`;
  }

  // Build a description based on class
  const classDescriptions = {
    Knight:     "a knight in plate armor with a sword and shield",
    Mage:       "a mage in long robes with a staff and wizard hat",
    Rogue:      "a rogue in dark leather armor with a dagger and hood",
    Archer:     "an archer in light leather armor with a bow",
    Healer:     "a healer in white robes with a wand",
    Berserker:  "a fierce berserker with no shirt, an axe, and horns",
    Summoner:   "a summoner in an elegant dress with a staff and red cape",
  };

  const base = classDescriptions[cls] || `a ${cls.toLowerCase()} warrior`;
  return `${base}, ${rarityWord} quality`;
}

function enemyToDescription(enemyKey) {
  const descriptions = {
    slime:        "a green slime creature",
    rat:          "a giant rat beast",
    goblin:       "a small goblin with leather armor and a dagger",
    skeleton:     "an undead skeleton warrior with torn pants and a sword",
    bat:          "a cave bat",
    orc:          "an orc warrior with chainmail armor and a battle axe",
    wolf:         "a dire wolf",
    zombie:       "a shambling zombie in torn clothes",
    mage:         "a dark elf mage with black robes and a staff",
    spider:       "a giant spider",
    knight:       "a dark knight in black plate armor with a longsword and tower shield",
    golem:        "a stone golem construct",
    wraith:       "a ghostly wraith",
    ogre:         "a large ogre with a hammer",
    harpy:        "a harpy with purple hair and a red cape",
    demon:        "a demon with horns, chainmail, and a flail",
    dragon_kin:   "a dragonkin warrior with scale armor",
    lich:         "an undead lich wizard with white hair and a staff",
    titan:        "a titan guard construct in heavy armor",
    overlord:     "a demon overlord with a crown and plate armor",
    elder_dragon: "an elder dragon creature",
    death_lord:   "a death lord in dark robes with a scythe",
  };
  return descriptions[enemyKey] || `a ${enemyKey.replace(/_/g, " ")} monster`;
}

// ─── Express Server ────────────────────────────────────────
const app = express();
app.use(cors());
app.use(express.json());

// Health check
app.get("/health", (req, res) => {
  const lpcExists = fs.existsSync(CONFIG.lpcRepoPath);
  res.json({
    status: "ok",
    groqAvailable: !!groq,
    lpcRepoFound: lpcExists,
    cacheDir: CONFIG.cacheDir,
  });
});

// Generate a single sprite
app.post("/generate", async (req, res) => {
  try {
    const { description, heroData, enemyKey, layers: directLayers } = req.body;

    let layers;

    if (directLayers) {
      // Direct layer config (skip AI)
      layers = validateLayers(directLayers);
    } else if (heroData) {
      // Game hero object → build description → ask AI
      const desc = heroToDescription(heroData);
      const rawLayers = await descriptionToLayers(desc);
      layers = validateLayers(rawLayers);
    } else if (enemyKey) {
      // Enemy template key → use preset or AI
      if (ENEMY_LPC_TEMPLATES[enemyKey]) {
        layers = validateLayers(ENEMY_LPC_TEMPLATES[enemyKey]);
      } else {
        const desc = enemyToDescription(enemyKey);
        const rawLayers = await descriptionToLayers(desc);
        layers = validateLayers(rawLayers);
      }
    } else if (description) {
      // Free-text description → AI
      const rawLayers = await descriptionToLayers(description);
      layers = validateLayers(rawLayers);
    } else {
      return res.status(400).json({ error: "Provide description, heroData, enemyKey, or layers" });
    }

    // Check cache
    const hash = layerHash(layers);
    const cached = getCachedSprite(hash);
    if (cached) {
      const buffer = fs.readFileSync(cached);
      return res.json({
        spriteId: hash,
        layers,
        base64: buffer.toString("base64"),
        cached: true,
      });
    }

    // Composite
    const { canvas, loaded } = await compositeSpritesheet(layers);
    if (loaded.length === 0) {
      return res.status(500).json({ error: "No layers could be loaded. Check LPC repo path." });
    }

    const buffer = canvas.toBuffer("image/png");
    cacheSprite(hash, buffer);

    res.json({
      spriteId: hash,
      layers,
      base64: buffer.toString("base64"),
      loaded,
      cached: false,
    });
  } catch (err) {
    console.error("Generate error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Batch generate
app.post("/generate-batch", async (req, res) => {
  try {
    const { items } = req.body; // array of { description?, heroData?, enemyKey?, layers? }
    if (!Array.isArray(items)) return res.status(400).json({ error: "items must be an array" });

    const results = [];
    for (const item of items) {
      try {
        // Reuse the same logic by calling internal handler
        const resp = await fetch(`http://localhost:${PORT}/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(item),
        });
        results.push(await resp.json());
      } catch (err) {
        results.push({ error: err.message });
      }
    }
    res.json({ results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Serve cached sprite directly
app.get("/sprite/:id", (req, res) => {
  const p = path.join(CONFIG.cacheDir, `${req.params.id}.png`);
  if (!fs.existsSync(p)) return res.status(404).json({ error: "Sprite not found" });
  res.type("png").sendFile(p);
});

// Generate for a game class directly (quick endpoint)
app.get("/generate-class/:className", async (req, res) => {
  try {
    const cls = req.params.className;
    const template = CLASS_TEMPLATES[cls];
    if (!template) return res.status(404).json({ error: `Unknown class: ${cls}` });

    // Randomize cosmetics
    const skinOpts = ["light", "tanned", "tanned2", "dark", "dark2"];
    const hairOpts = LPC_LAYERS.hair_style.options.filter(h => h !== "none");
    const colorOpts = LPC_LAYERS.hair_color.options;
    const eyeOpts = LPC_LAYERS.eyes.options;

    const layers = validateLayers({
      skin: skinOpts[Math.floor(Math.random() * skinOpts.length)],
      hair_style: hairOpts[Math.floor(Math.random() * hairOpts.length)],
      hair_color: colorOpts[Math.floor(Math.random() * colorOpts.length)],
      eyes: eyeOpts[Math.floor(Math.random() * eyeOpts.length)],
      ears: "ears",
      ...template,
    });

    const hash = layerHash(layers);
    const cached = getCachedSprite(hash);
    if (cached) {
      const buffer = fs.readFileSync(cached);
      return res.json({ spriteId: hash, layers, base64: buffer.toString("base64"), cached: true });
    }

    const { canvas, loaded } = await compositeSpritesheet(layers);
    const buffer = canvas.toBuffer("image/png");
    cacheSprite(hash, buffer);

    res.json({ spriteId: hash, layers, base64: buffer.toString("base64"), loaded, cached: false });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Character Database API ────────────────────────────────

// List all characters (with optional search)
app.get("/characters", (req, res) => {
  const q = req.query.q;
  res.json(q ? searchCharacters(q) : getAllCharacters());
});

// Get single character
app.get("/characters/:id", (req, res) => {
  const c = getCharacter(req.params.id);
  if (!c) return res.status(404).json({ error: "Character not found" });
  res.json(c);
});

// Create character
app.post("/characters", (req, res) => {
  const c = createCharacter(req.body);
  res.status(201).json(c);
});

// Update character
app.put("/characters/:id", (req, res) => {
  const c = updateCharacter(req.params.id, req.body);
  if (!c) return res.status(404).json({ error: "Character not found" });
  res.json(c);
});

// Delete character
app.delete("/characters/:id", (req, res) => {
  const ok = deleteCharacter(req.params.id);
  if (!ok) return res.status(404).json({ error: "Character not found" });
  res.json({ ok: true });
});

// Generate sprite for a character + save to DB in one call
app.post("/characters/:id/generate-sprite", async (req, res) => {
  try {
    const char = getCharacter(req.params.id);
    if (!char) return res.status(404).json({ error: "Character not found" });

    const { description, layers: directLayers } = req.body;
    let layers;

    if (directLayers) {
      layers = validateLayers(directLayers);
    } else {
      const desc = description || char.description || `a ${char.class.toLowerCase()} named ${char.name}`;
      const rawLayers = await descriptionToLayers(desc);
      layers = validateLayers(rawLayers);
    }

    const hash = layerHash(layers);
    const cached = getCachedSprite(hash);
    let base64;

    if (cached) {
      base64 = fs.readFileSync(cached).toString("base64");
    } else {
      const { canvas, loaded } = await compositeSpritesheet(layers);
      if (loaded.length === 0) {
        return res.status(500).json({ error: "No layers could be loaded." });
      }
      const buffer = canvas.toBuffer("image/png");
      cacheSprite(hash, buffer);
      base64 = buffer.toString("base64");
    }

    // Update character in DB
    const updated = updateCharacter(req.params.id, { spriteId: hash, layers });
    res.json({ ...updated, base64 });
  } catch (err) {
    console.error("Character sprite gen error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Serve the Sprite Studio tool page
app.get("/studio", (req, res) => {
  const studioPath = path.join(__dirname, "..", "tools", "sprite-studio.html");
  if (!fs.existsSync(studioPath)) return res.status(404).send("Studio not found");
  res.sendFile(studioPath);
});

// Expose LPC layer definitions for the studio
app.get("/lpc-layers", (req, res) => {
  res.json({
    layers: LPC_LAYERS,
    repoCatalog: lpcCatalog,
    repoAvailable: !!lpcParsed,
    definitionCount: lpcParsed ? lpcParsed.definitions.length : 0,
  });
});

// Expose full repo catalog categories
app.get("/lpc-catalog", (req, res) => {
  if (!lpcParsed) {
    return res.status(503).json({ error: "LPC repo not parsed. Clone the repo first." });
  }
  res.json({
    categories: Object.fromEntries(
      Object.entries(lpcParsed.categories).map(([cat, items]) => [
        cat,
        items.map(i => ({ key: i.key, name: i.name, variants: i.variants })),
      ])
    ),
    catalog: lpcCatalog,
  });
});

// ─── Start ─────────────────────────────────────────────────
groq = initGroq();

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════╗
║   🎨 PickMeUp Sprite Server                     ║
║   http://localhost:${PORT}                         ║
║                                                  ║
║   Groq API:  ${groq ? "✅ Connected" : "⚠  No key (using fallback templates)"}       ║
║   LPC Repo:  ${fs.existsSync(CONFIG.lpcRepoPath) ? "✅ Found" : "❌ Not found"}                         ║
║   Cache Dir: ${CONFIG.cacheDir.split("/").slice(-2).join("/")}     ║
╚══════════════════════════════════════════════════╝
  `);
});
