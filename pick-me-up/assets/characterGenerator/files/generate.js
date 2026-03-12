#!/usr/bin/env node

/**
 * LPC Spritesheet Auto-Generator
 * Uses Groq (free Llama API) to translate character descriptions into
 * LPC layer configs, then composites the spritesheet using @napi-rs/canvas.
 *
 * Reads available layers dynamically from the LPC repo's sheet_definitions/.
 *
 * Usage:
 *   node generate.js "a female knight with silver hair and red cape"
 *   node generate.js --batch characters.json
 *   node generate.js --interactive
 *   node generate.js --list-layers          # dump available layers
 */

import Groq from "groq-sdk";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import readline from "readline";
// Resolve lpc-sheets.js relative to this file → ../../server/lpc-sheets.js
// (from assets/characterGenerator/files/ to server/)
import {
  parseSheetDefinitions,
  buildLayerCatalog,
  resolveLayerFiles,
  buildCreditsText,
} from "../../../server/lpc-sheets.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── Configuration ────────────────────────────────────────────────────────────

const CONFIG = {
  groqModel: "llama-3.3-70b-versatile",
  lpcRepoPath: process.env.LPC_REPO || path.join(__dirname, "..", "Universal-LPC-Spritesheet-Character-Generator"),
  outputDir: path.join(__dirname, "output"),
};

// LPC Universal-Expanded spritesheet: 832×2944 = 13 cols × 46 rows of 64×64
const SHEET_WIDTH = 832;
const SHEET_HEIGHT = 2944;

// ─── Groq / Llama Integration ─────────────────────────────────────────────────

async function descriptionToLayers(description, groq, catalog) {
  const optionsSummary = Object.entries(catalog)
    .map(([key, val]) => {
      // Limit options shown to keep prompt manageable
      const opts = val.options.length > 40
        ? [...val.options.slice(0, 40), `... (${val.options.length} total)`]
        : val.options;
      return `- ${key} (${val.description}): ${opts.join(", ")}`;
    })
    .join("\n");

  const prompt = `You are a pixel art character designer for the LPC (Liberated Pixel Cup) spritesheet generator.

A user described this character: "${description}"

Select the best matching option for each layer from the EXACT options listed below. Return ONLY a valid JSON object with no extra text, comments, or markdown.

Available layers and their exact options:
${optionsSummary}

Rules:
1. Use ONLY options from the lists above — no variations or invented values.
2. If a feature isn't mentioned, pick a reasonable default that fits the archetype.
3. For female/child characters, set facial_hair to "none".
4. Match colors to the description as closely as possible.
5. Set unused/unwanted layers to "none".
6. For weapons, use the full name like "sword_longsword" not just "longsword".
7. For torso, use names like "clothes_longsleeve" or "armour_plate".

Return a JSON object with keys matching the layer names above.`;

  const response = await groq.chat.completions.create({
    messages: [{ role: "user", content: prompt }],
    model: CONFIG.groqModel,
    temperature: 0.3,
    max_tokens: 1200,
  });

  const raw = response.choices[0].message.content.trim();
  const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error(`Could not parse Llama response as JSON:\n${raw}`);
  }
}

// ─── Validation & Fuzzy Matching ──────────────────────────────────────────────

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

function validateLayers(rawLayers, catalog) {
  const fixed = {};
  const warnings = [];

  for (const [key, def] of Object.entries(catalog)) {
    const raw = rawLayers[key];
    if (!raw || raw === "none") {
      fixed[key] = "none";
      continue;
    }
    const matched = fuzzyMatch(String(raw), def.options);
    if (matched) {
      if (matched !== String(raw)) {
        warnings.push(`  "${key}": "${raw}" -> "${matched}" (fuzzy match)`);
      }
      fixed[key] = matched;
    } else {
      warnings.push(`  "${key}": "${raw}" not found, using "none"`);
      fixed[key] = "none";
    }
  }

  return { fixed, warnings };
}

// ─── Compositing ──────────────────────────────────────────────────────────────

/**
 * Map user-facing layer selections to actual LPC definition keys.
 * e.g. { hair_style: "long", hair_color: "blonde", body: "female" }
 *   → definition key "hair_long" with variant "blonde" for body "female"
 */
function resolveSelections(layers, parsed) {
  const bodyType = layers.body || "male";
  const skinColor = layers.skin_color || "light";
  const hairColor = layers.hair_color || "dark_brown";

  // Build a list of { defKey, variant, zPos } from selections
  const toComposite = [];

  // Body
  if (bodyType !== "none") {
    toComposite.push({ defKey: "body", variant: skinColor });
  }

  // Head
  const headType = layers.head || "human_male";
  if (headType !== "none") {
    toComposite.push({ defKey: `heads_${headType}`, variant: skinColor });
  }

  // Eyes
  const eyeColor = layers.eyes || "brown";
  if (eyeColor !== "none") {
    toComposite.push({ defKey: "eyes", variant: eyeColor });
  }

  // Map simple layer names to definition key prefixes
  const layerMappings = {
    hair_style: { prefix: "hair", variant: hairColor },
    facial_hair: { prefix: "beards", variant: layers.facial_hair_color || hairColor },
    torso: { prefix: "torso", variant: layers.torso_color || "white" },
    legs: { prefix: "legs", variant: layers.legs_color || "white" },
    feet: { prefix: "feet", variant: layers.feet_color || "brown" },
    arms: { prefix: "arms", variant: layers.arms_color || "steel" },
    hat: { prefix: "hat", variant: layers.hat_color || "steel" },
    cape: { prefix: "cape", variant: layers.cape_color || "brown" },
    belt: { prefix: "belt", variant: layers.belt_color || "brown" },
    shoulders: { prefix: "shoulders", variant: layers.shoulders_color || "steel" },
    weapon: { prefix: "weapon", variant: null },
    shield: { prefix: "shield", variant: null },
    facial_accessory: { prefix: "facial", variant: layers.facial_accessory_color || "brown" },
    wings: { prefix: "wings", variant: layers.wings_color || null },
    neck: { prefix: "neck", variant: layers.neck_color || "gold" },
  };

  for (const [layerName, mapping] of Object.entries(layerMappings)) {
    const value = layers[layerName];
    if (!value || value === "none") continue;

    const defKey = `${mapping.prefix}_${value}`;
    toComposite.push({ defKey, variant: mapping.variant });
  }

  return { toComposite, bodyType };
}

async function compositeSpritesheet(layers, parsed, lpcRepoPath) {
  const canvas = createCanvas(SHEET_WIDTH, SHEET_HEIGHT);
  const ctx = canvas.getContext("2d");

  const { toComposite, bodyType } = resolveSelections(layers, parsed);

  // Resolve all files with zPos for proper ordering
  const allFiles = [];
  const usedKeys = [];

  for (const { defKey, variant } of toComposite) {
    const files = resolveLayerFiles(defKey, bodyType, variant, parsed, lpcRepoPath);
    if (files.length > 0) {
      usedKeys.push(defKey);
      for (const f of files) {
        allFiles.push({ ...f, defKey });
      }
    }
  }

  // Sort by zPos (lower = drawn first = behind)
  allFiles.sort((a, b) => a.zPos - b.zPos);

  const loaded = [];
  const skipped = [];

  for (const { path: filePath, zPos, defKey } of allFiles) {
    try {
      const img = await loadImage(filePath);
      ctx.drawImage(img, 0, 0);
      loaded.push(`${defKey} (z:${zPos})`);
      console.log(`  [load] ${defKey} z:${zPos} - ${path.basename(filePath)}`);
    } catch (e) {
      skipped.push(`${defKey}: ${e.message}`);
      console.warn(`  [err]  ${defKey}: ${e.message}`);
    }
  }

  return { canvas, loaded, skipped, usedKeys };
}

// ─── Hash-based caching ──────────────────────────────────────────────────────

function layerHash(layers) {
  const sorted = JSON.stringify(layers, Object.keys(layers).sort());
  return crypto.createHash("md5").update(sorted).digest("hex").slice(0, 12);
}

// ─── Output ──────────────────────────────────────────────────────────────────

function sanitizeFilename(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "_").slice(0, 60);
}

async function generateCharacter(description, groq, parsed, catalog) {
  console.log(`\nGenerating: "${description}"`);

  // 1. Ask Llama to pick layers
  console.log("  Asking Llama to select layers...");
  const rawLayers = await descriptionToLayers(description, groq, catalog);

  // 2. Validate
  const { fixed: layers, warnings } = validateLayers(rawLayers, catalog);
  if (warnings.length > 0) {
    console.log("  Layer adjustments:");
    warnings.forEach(w => console.log(w));
  }
  console.log("  Final layers:", JSON.stringify(layers, null, 2));

  // 3. Composite
  console.log("  Compositing spritesheet...");
  const { canvas, loaded, skipped, usedKeys } = await compositeSpritesheet(
    layers, parsed, CONFIG.lpcRepoPath
  );

  if (loaded.length === 0) {
    throw new Error(
      "No layers could be loaded! Check your LPC repo has the spritesheets/ folder."
    );
  }

  console.log(`  Loaded ${loaded.length} layers, skipped ${skipped.length}`);

  // 4. Save outputs
  fs.mkdirSync(CONFIG.outputDir, { recursive: true });
  const slug = sanitizeFilename(description);
  const hash = layerHash(layers);
  const pngPath = path.join(CONFIG.outputDir, `${slug}_${hash}.png`);
  const jsonPath = path.join(CONFIG.outputDir, `${slug}_${hash}.json`);
  const creditsPath = path.join(CONFIG.outputDir, `${slug}_${hash}_credits.txt`);

  const buffer = canvas.toBuffer("image/png");
  fs.writeFileSync(pngPath, buffer);
  fs.writeFileSync(jsonPath, JSON.stringify({ description, layers, loaded, skipped }, null, 2));
  fs.writeFileSync(creditsPath, buildCreditsText(usedKeys, parsed));

  console.log(`  Saved:`);
  console.log(`    PNG:     ${pngPath}`);
  console.log(`    Config:  ${jsonPath}`);
  console.log(`    Credits: ${creditsPath}`);

  return { pngPath, jsonPath, layers, hash };
}

async function interactiveMode(groq, parsed, catalog) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = q => new Promise(res => rl.question(q, res));

  console.log("\nLPC Character Generator - Interactive Mode");
  console.log("Type a character description, or 'quit' to exit.\n");

  while (true) {
    const input = await ask("Describe a character: ");
    if (!input.trim() || input.toLowerCase() === "quit") break;
    try {
      await generateCharacter(input.trim(), groq, parsed, catalog);
    } catch (e) {
      console.error(`  Error: ${e.message}`);
    }
  }
  rl.close();
}

async function batchMode(jsonFile, groq, parsed, catalog) {
  const raw = fs.readFileSync(jsonFile, "utf8");
  const characters = JSON.parse(raw);
  if (!Array.isArray(characters)) {
    throw new Error("Batch JSON file must be an array of description strings.");
  }

  console.log(`\nBatch mode: ${characters.length} characters`);
  for (const desc of characters) {
    try {
      await generateCharacter(desc, groq, parsed, catalog);
    } catch (e) {
      console.error(`  Failed "${desc}": ${e.message}`);
    }
  }
  console.log("\nBatch complete!");
}

// ─── Entry Point ──────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);

  // Check LPC repo
  if (!fs.existsSync(CONFIG.lpcRepoPath)) {
    console.error(`LPC repo not found at: ${CONFIG.lpcRepoPath}`);
    console.error(`Clone it first:`);
    console.error(`  git clone https://github.com/sanderfrenken/Universal-LPC-Spritesheet-Character-Generator.git`);
    console.error(`Or set LPC_REPO env variable.`);
    process.exit(1);
  }

  // Parse sheet definitions from the LPC repo
  console.log("Parsing LPC sheet definitions...");
  const parsed = parseSheetDefinitions(CONFIG.lpcRepoPath);
  const catalog = buildLayerCatalog(parsed);
  console.log(`Found ${parsed.definitions.length} layer definitions in ${Object.keys(parsed.categories).length} categories`);

  // List layers mode (no API key needed)
  if (args[0] === "--list-layers" || args[0] === "-l") {
    for (const [key, val] of Object.entries(catalog)) {
      console.log(`\n${key} (${val.description}):`);
      console.log(`  Options: ${val.options.join(", ")}`);
    }
    return;
  }

  // Help mode (no API key needed)
  if (args.length === 0) {
    console.log(`
LPC Spritesheet Auto-Generator
===============================
Reads layer definitions from the LPC repo's sheet_definitions/ directory
and uses Groq (free Llama 3.3 API) to select layers from text descriptions.

Usage:
  node generate.js "a female knight with silver hair and red cape"
  node generate.js --interactive
  node generate.js --batch characters.json
  node generate.js --list-layers

Setup:
  1. Clone the LPC repo (already done if you see this)
  2. Get a free Groq API key at https://console.groq.com
  3. export GROQ_API_KEY=your_key_here
  4. node generate.js "describe your character"

Output:
  output/<slug>_<hash>.png         - composited spritesheet
  output/<slug>_<hash>.json        - layer config
  output/<slug>_<hash>_credits.txt - CC-BY-SA attribution
`);
    return;
  }

  // Check Groq API key
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.error("GROQ_API_KEY environment variable not set.");
    console.error("Get a free key at: https://console.groq.com");
    console.error("Then run: export GROQ_API_KEY=your_key_here");
    process.exit(1);
  }

  const groq = new Groq({ apiKey });

  if (args[0] === "--interactive" || args[0] === "-i") {
    await interactiveMode(groq, parsed, catalog);
  } else if (args[0] === "--batch" || args[0] === "-b") {
    if (!args[1]) { console.error("Usage: node generate.js --batch characters.json"); process.exit(1); }
    await batchMode(args[1], groq, parsed, catalog);
  } else {
    await generateCharacter(args.join(" "), groq, parsed, catalog);
  }
}

main().catch(e => {
  console.error("\nFatal error:", e.message);
  process.exit(1);
});
