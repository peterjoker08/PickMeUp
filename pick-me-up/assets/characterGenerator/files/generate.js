#!/usr/bin/env node

/**
 * LPC Spritesheet Auto-Generator
 * Uses Groq (free Llama API) to translate character descriptions into
 * LPC layer configs, then composites the spritesheet using canvas.
 *
 * Usage:
 *   node generate.js "a female warrior with red hair and plate armor"
 *   node generate.js --batch characters.json
 *   node generate.js --interactive
 */

import Groq from "groq-sdk";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import readline from "readline";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── Configuration ────────────────────────────────────────────────────────────

const CONFIG = {
  groqModel: "llama3-70b-8192",        // Best free model on Groq
  lpcRepoPath: process.env.LPC_REPO || path.join(__dirname, "Universal-LPC-Spritesheet-Character-Generator"),
  outputDir: path.join(__dirname, "output"),
  spritesheetBase: "spritesheets",
};

// ─── LPC Layer Definitions ────────────────────────────────────────────────────
// These are the core layer categories the LPC generator supports.
// Each layer maps to a folder in spritesheets/ with specific options.

const LPC_LAYERS = {
  // Base body
  body: {
    description: "Base body type",
    options: ["male", "female", "child", "elderly_male", "elderly_female"],
    default: "male",
    folder: "body",
  },
  skin: {
    description: "Skin color tone",
    options: ["light", "tanned", "tanned2", "dark", "dark2", "darkelf", "darkelf2", "orc", "zombie"],
    default: "light",
    folder: "body",
  },

  // Hair
  hair_style: {
    description: "Hair style",
    options: [
      "none", "plain", "longhair", "princess", "bangs", "pixie",
      "shorthair", "mohawk", "pageboybraid", "ponytail", "swoop",
      "messy1", "messy2", "bedhead", "parted", "loose", "curly1", "curly2",
      "shoulderl", "shoulderlfull", "shoulderl2", "shoulderl3",
      "xlong", "xlonghawk", "xlongknot",
    ],
    default: "plain",
    folder: "hair",
  },
  hair_color: {
    description: "Hair color",
    options: [
      "black", "blonde", "blonde2", "blue_black", "brown", "brunette",
      "brunette2", "dark_blonde", "gray", "green", "light_blonde",
      "pink", "purple", "raven", "red", "reddish_brown", "rosebrown",
      "teal", "white",
    ],
    default: "brown",
    folder: "hair",
  },

  // Facial features
  facial_hair: {
    description: "Facial hair style (use 'none' for female/child characters)",
    options: ["none", "beard", "mustache", "goatee", "elvish"],
    default: "none",
    folder: "facial_hair",
  },
  facial_hair_color: {
    description: "Facial hair color (only if facial_hair is not none)",
    options: [
      "black", "blonde", "brown", "gray", "red", "white",
    ],
    default: "brown",
    folder: "facial_hair",
  },

  // Ears
  ears: {
    description: "Ear type",
    options: ["none", "ears", "elven_ears"],
    default: "ears",
    folder: "ears",
  },

  // Eyes
  eyes: {
    description: "Eye color",
    options: ["black", "blue", "brown", "green", "pink", "purple", "red", "teal", "yellow"],
    default: "brown",
    folder: "eyes",
  },

  // Clothing layers (bottom to top)
  underwear: {
    description: "Underwear or undershirt",
    options: ["none", "panties", "shorties"],
    default: "none",
    folder: "underwear",
  },
  legs: {
    description: "Leg covering (pants, skirts, etc.)",
    options: [
      "none", "pants", "longrobe", "robe", "skirt", "dressskirt",
      "tattered_pants", "plated_leather", "lorica", "metal_plate",
      "shorts", "leather",
    ],
    default: "pants",
    folder: "legs",
  },
  feet: {
    description: "Footwear",
    options: [
      "none", "shoes", "boots", "slippers", "armored", "metal",
      "leather_armored",
    ],
    default: "shoes",
    folder: "feet",
  },
  torso: {
    description: "Torso clothing or armor",
    options: [
      "none", "shirt", "tunic", "blouse", "chainmail", "leather_armor",
      "plate_armor", "robe", "scalemail", "dress",
      "longsleeve", "vest", "gambeson",
    ],
    default: "shirt",
    folder: "torso",
  },
  arms: {
    description: "Arms/sleeves",
    options: ["none", "bracers", "leather", "plate", "chainmail"],
    default: "none",
    folder: "arms",
  },

  // Accessories & equipment
  belt: {
    description: "Belt or waist accessory",
    options: ["none", "belt", "leather", "rope"],
    default: "none",
    folder: "belt",
  },
  cape: {
    description: "Cape or cloak",
    options: ["none", "cape_blue", "cape_brown", "cape_red", "cape_green", "cape_black", "cloak"],
    default: "none",
    folder: "cape",
  },
  hat: {
    description: "Headwear or helmet",
    options: [
      "none", "hat_leather", "hat_chain", "hat_plate", "hat_wizard",
      "hat_straw", "hat_crown", "hood", "bandana", "horns",
    ],
    default: "none",
    folder: "hat",
  },
  weapon_right: {
    description: "Weapon in right hand",
    options: [
      "none", "sword", "longsword", "dagger", "axe", "mace", "staff",
      "wand", "bow", "spear", "flail", "hammer",
    ],
    default: "none",
    folder: "weapon",
  },
  shield: {
    description: "Shield in left hand",
    options: ["none", "buckler", "round_shield", "kite_shield", "tower_shield"],
    default: "none",
    folder: "shield",
  },
};

// ─── Groq / Llama Integration ─────────────────────────────────────────────────

async function descriptionToLayers(description, groq) {
  const optionsSummary = Object.entries(LPC_LAYERS)
    .map(([key, val]) => `- ${key} (${val.description}): ${val.options.join(", ")}`)
    .join("\n");

  const prompt = `You are a pixel art character designer for the LPC (Liberated Pixel Cup) spritesheet generator.

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

  // Strip markdown code fences if present
  const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    // Try to extract JSON from within the response
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error(`Could not parse Llama response as JSON:\n${raw}`);
  }
}

// ─── Validation & Fuzzy Matching ──────────────────────────────────────────────

function fuzzyMatch(value, options) {
  if (!value) return null;
  const v = value.toLowerCase().trim();

  // Exact match
  if (options.includes(v)) return v;

  // Substring match
  const sub = options.find(o => o.includes(v) || v.includes(o));
  if (sub) return sub;

  // Edit distance match (simple)
  let best = null;
  let bestDist = Infinity;
  for (const opt of options) {
    const dist = levenshtein(v, opt);
    if (dist < bestDist) {
      bestDist = dist;
      best = opt;
    }
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

function validateAndFixLayers(layers) {
  const fixed = {};
  const warnings = [];

  for (const [key, def] of Object.entries(LPC_LAYERS)) {
    const raw = layers[key];
    if (!raw || raw === "none") {
      fixed[key] = def.default;
      continue;
    }

    const matched = fuzzyMatch(String(raw), def.options);
    if (matched) {
      if (matched !== raw) warnings.push(`  ⚠ "${key}": "${raw}" → "${matched}" (fuzzy match)`);
      fixed[key] = matched;
    } else {
      warnings.push(`  ⚠ "${key}": "${raw}" not found, using default "${def.default}"`);
      fixed[key] = def.default;
    }
  }

  return { fixed, warnings };
}

// ─── Spritesheet Compositing ──────────────────────────────────────────────────

// LPC standard spritesheet is 832×1344 (13 cols × 21 rows of 64×64 frames)
const SHEET_WIDTH = 832;
const SHEET_HEIGHT = 1344;

// Layer draw order (bottom to top)
const DRAW_ORDER = [
  "body",       // base body + skin
  "ears",
  "eyes",
  "underwear",
  "legs",
  "feet",
  "torso",
  "arms",
  "belt",
  "facial_hair",
  "hair_style",
  "hat",
  "cape",
  "shield",
  "weapon_right",
];

async function findSpritesheetFile(lpcPath, layer, value, body, hairColor, facialHairColor) {
  const spritesDir = path.join(lpcPath, CONFIG.spritesheetBase);

  // Strategy: search for matching file in the layer's folder
  // LPC files follow patterns like: body/male/light.png, hair/longhair/brown.png, etc.

  const def = LPC_LAYERS[layer];
  if (!def) return null;

  // Skip "none" layers
  if (value === "none") return null;

  // Build candidate paths based on common LPC naming conventions
  const candidates = [];

  if (layer === "body" || layer === "skin") {
    // Body is combined: folder = body, file named by skin color
    const bodyType = body || "male";
    candidates.push(
      path.join(spritesDir, "body", bodyType, `${value}.png`),
      path.join(spritesDir, "body", `${bodyType}_${value}.png`),
    );
  } else if (layer === "hair_style") {
    // Hair: folder by style, file by color
    candidates.push(
      path.join(spritesDir, "hair", value, `${hairColor || "brown"}.png`),
      path.join(spritesDir, "hair", `${value}_${hairColor || "brown"}.png`),
    );
  } else if (layer === "facial_hair") {
    candidates.push(
      path.join(spritesDir, "facial_hair", value, `${facialHairColor || "brown"}.png`),
      path.join(spritesDir, "facial_hair", `${value}_${facialHairColor || "brown"}.png`),
    );
  } else if (layer === "cape") {
    candidates.push(
      path.join(spritesDir, "cape", `${value}.png`),
      path.join(spritesDir, "cape", value, "brown.png"),
    );
  } else {
    // Generic: try folder/value.png and variations
    const folder = def.folder || layer;
    candidates.push(
      path.join(spritesDir, folder, `${value}.png`),
      path.join(spritesDir, folder, body || "male", `${value}.png`),
      path.join(spritesDir, folder, value, `${body || "male"}.png`),
    );
  }

  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }

  // Fallback: recursive search in the folder for any file matching the value name
  const folder = def.folder || layer;
  const folderPath = path.join(spritesDir, folder);
  if (fs.existsSync(folderPath)) {
    const found = searchRecursive(folderPath, `${value}.png`);
    if (found) return found;
  }

  return null;
}

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

async function compositeSpritesheets(layers, lpcPath) {
  const canvas = createCanvas(SHEET_WIDTH, SHEET_HEIGHT);
  const ctx = canvas.getContext("2d");

  const body = layers.body || "male";
  const hairColor = layers.hair_color || "brown";
  const facialHairColor = layers.facial_hair_color || "brown";

  const loaded = [];
  const skipped = [];

  for (const layer of DRAW_ORDER) {
    const value = layers[layer];
    if (!value || value === "none") continue;

    const filePath = await findSpritesheetFile(lpcPath, layer, value, body, hairColor, facialHairColor);

    if (!filePath) {
      skipped.push(`${layer}:${value}`);
      continue;
    }

    try {
      const img = await loadImage(filePath);
      ctx.drawImage(img, 0, 0, SHEET_WIDTH, SHEET_HEIGHT);
      loaded.push(`${layer}:${value}`);
    } catch (e) {
      skipped.push(`${layer}:${value} (load error: ${e.message})`);
    }
  }

  return { canvas, loaded, skipped };
}

// ─── Output & Credits ─────────────────────────────────────────────────────────

function generateCredits(description, layers) {
  return `# Character Spritesheet Credits
# Generated by LPC Auto-Generator
# Description: ${description}
# Date: ${new Date().toISOString()}

## Character Configuration
${Object.entries(layers).map(([k, v]) => `${k}: ${v}`).join("\n")}

## Attribution
Sprites from the Liberated Pixel Cup project.
Authors: Johannes Sjölund (wulax), Michael Whitlock (bigbeargames),
Matthew Krohn (makrohn), Nila122, David Conway Jr. (JaidynReiman),
bluecarrot16, Stephen Challener (Redshrike), ElizaWy, and many others.

License: CC-BY-SA 3.0
Source: https://github.com/LiberatedPixelCup/Universal-LPC-Spritesheet-Character-Generator
Full credits: See CREDITS.csv in the LPC repository.
`;
}

// ─── CLI & Main ───────────────────────────────────────────────────────────────

function sanitizeFilename(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "_").slice(0, 60);
}

async function generateCharacter(description, groq) {
  console.log(`\n🎨 Generating: "${description}"`);

  // 1. Check LPC repo exists
  if (!fs.existsSync(CONFIG.lpcRepoPath)) {
    throw new Error(
      `LPC repo not found at: ${CONFIG.lpcRepoPath}\n` +
      `Clone it first:\n  git clone https://github.com/liberatedpixelcup/Universal-LPC-Spritesheet-Character-Generator.git\n` +
      `Or set the LPC_REPO env variable to its path.`
    );
  }

  // 2. Ask Llama to pick layers
  console.log("  🤖 Asking Llama to select layers...");
  const rawLayers = await descriptionToLayers(description, groq);

  // 3. Validate
  const { fixed: layers, warnings } = validateAndFixLayers(rawLayers);
  if (warnings.length > 0) {
    console.log("  📋 Layer adjustments:");
    warnings.forEach(w => console.log(w));
  }

  // 4. Composite
  console.log("  🖼  Compositing spritesheet...");
  const { canvas, loaded, skipped } = await compositeSpritesheets(layers, CONFIG.lpcRepoPath);

  if (loaded.length === 0) {
    throw new Error(
      "No layers could be loaded! Make sure your LPC repo has the spritesheets/ folder populated.\n" +
      "Run the generator in a browser once to ensure assets are present, or check the repo has PNG files."
    );
  }

  console.log(`  ✅ Loaded ${loaded.length} layers: ${loaded.join(", ")}`);
  if (skipped.length > 0) {
    console.log(`  ⚠  Skipped ${skipped.length}: ${skipped.join(", ")}`);
  }

  // 5. Save outputs
  fs.mkdirSync(CONFIG.outputDir, { recursive: true });
  const slug = sanitizeFilename(description);
  const timestamp = Date.now();
  const pngPath = path.join(CONFIG.outputDir, `${slug}_${timestamp}.png`);
  const jsonPath = path.join(CONFIG.outputDir, `${slug}_${timestamp}.json`);
  const creditsPath = path.join(CONFIG.outputDir, `${slug}_${timestamp}_credits.txt`);

  const buffer = canvas.toBuffer("image/png");
  fs.writeFileSync(pngPath, buffer);
  fs.writeFileSync(jsonPath, JSON.stringify({ description, layers }, null, 2));
  fs.writeFileSync(creditsPath, generateCredits(description, layers));

  console.log(`  💾 Saved:`);
  console.log(`     PNG:     ${pngPath}`);
  console.log(`     Config:  ${jsonPath}`);
  console.log(`     Credits: ${creditsPath}`);

  return { pngPath, jsonPath, layers };
}

async function interactiveMode(groq) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = q => new Promise(res => rl.question(q, res));

  console.log("\n🎮 LPC Character Generator — Interactive Mode");
  console.log("   Type a character description, or 'quit' to exit.\n");

  while (true) {
    const input = await ask("Describe a character: ");
    if (!input.trim() || input.toLowerCase() === "quit") break;

    try {
      await generateCharacter(input.trim(), groq);
    } catch (e) {
      console.error(`  ❌ Error: ${e.message}`);
    }
  }

  rl.close();
}

async function batchMode(jsonFile, groq) {
  const raw = fs.readFileSync(jsonFile, "utf8");
  const characters = JSON.parse(raw);

  if (!Array.isArray(characters)) {
    throw new Error("Batch JSON file must be an array of description strings.");
  }

  console.log(`\n📦 Batch mode: ${characters.length} characters`);

  for (const desc of characters) {
    try {
      await generateCharacter(desc, groq);
    } catch (e) {
      console.error(`  ❌ Failed "${desc}": ${e.message}`);
    }
  }

  console.log("\n✅ Batch complete!");
}

// ─── Entry Point ──────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.error("❌ GROQ_API_KEY environment variable not set.");
    console.error("   Get a free key at: https://console.groq.com");
    console.error("   Then run: export GROQ_API_KEY=your_key_here");
    process.exit(1);
  }

  const groq = new Groq({ apiKey });

  if (args[0] === "--interactive" || args[0] === "-i") {
    await interactiveMode(groq);
  } else if (args[0] === "--batch" || args[0] === "-b") {
    if (!args[1]) { console.error("Usage: node generate.js --batch characters.json"); process.exit(1); }
    await batchMode(args[1], groq);
  } else if (args.length > 0) {
    const description = args.join(" ");
    await generateCharacter(description, groq);
  } else {
    console.log(`
LPC Spritesheet Auto-Generator
===============================
Uses Groq (free Llama API) to auto-select layers from a description,
then composites them into a full LPC spritesheet PNG.

Usage:
  node generate.js "a female knight with silver hair and red cape"
  node generate.js --interactive
  node generate.js --batch characters.json

Setup:
  1. Clone the LPC repo:
     git clone https://github.com/liberatedpixelcup/Universal-LPC-Spritesheet-Character-Generator.git

  2. Get a free Groq API key at https://console.groq.com

  3. Set your key:
     export GROQ_API_KEY=your_key_here

  4. Optionally set the LPC repo path (if not in the same folder):
     export LPC_REPO=/path/to/Universal-LPC-Spritesheet-Character-Generator

  5. Run it:
     node generate.js "a dwarf warrior with a red beard and battle axe"

Output:
  output/<slug>_<timestamp>.png        — the composited spritesheet
  output/<slug>_<timestamp>.json       — the layer config (reimportable)
  output/<slug>_<timestamp>_credits.txt — required attribution file

Batch file format (characters.json):
  [
    "a female elf with white hair and a staff",
    "a male orc warrior with plate armor",
    "an elderly wizard with a long white beard"
  ]
`);
  }
}

main().catch(e => {
  console.error("\n❌ Fatal error:", e.message);
  process.exit(1);
});
