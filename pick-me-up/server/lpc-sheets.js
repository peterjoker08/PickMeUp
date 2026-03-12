/**
 * LPC Sheet Definitions Parser
 *
 * Reads the Universal-LPC-Spritesheet-Character-Generator's sheet_definitions/
 * directory and builds a structured lookup of all available layers, variants,
 * and file paths for compositing.
 *
 * Used by both the CLI (generate.js) and the server (server.js).
 */

import fs from "fs";
import path from "path";

/**
 * Parse all sheet_definitions/*.json files and return a structured catalog.
 *
 * @param {string} lpcRepoPath - Path to the Universal-LPC-Spritesheet-Character-Generator clone
 * @returns {{ categories: Object, definitions: Object[], layerIndex: Object }}
 *
 * categories: Grouped by top-level category (body, hair, torso, weapon, etc.)
 *   Each entry: { fileName, name, type_name, variants, layers (with paths), credits }
 *
 * layerIndex: Quick lookup by definition filename (without .json)
 *   e.g. layerIndex["hair_long"] → the parsed definition
 */
export function parseSheetDefinitions(lpcRepoPath) {
  const defsDir = path.join(lpcRepoPath, "sheet_definitions");
  if (!fs.existsSync(defsDir)) {
    throw new Error(`sheet_definitions not found at: ${defsDir}`);
  }

  const files = fs.readdirSync(defsDir).filter(f => f.endsWith(".json"));
  const categories = {};
  const layerIndex = {};
  const definitions = [];

  for (const file of files) {
    const raw = fs.readFileSync(path.join(defsDir, file), "utf8");
    let def;
    try {
      def = JSON.parse(raw);
    } catch {
      continue;
    }

    const key = file.replace(/\.json$/, "");
    const category = key.split("_")[0]; // e.g. "hair", "torso", "weapon", "hat"

    // Extract all layer paths (layer_1, layer_2, etc.)
    const layerPaths = {};
    for (const [k, v] of Object.entries(def)) {
      if (k.startsWith("layer_") && typeof v === "object") {
        layerPaths[k] = v;
      }
    }

    const entry = {
      key,
      fileName: file,
      name: def.name,
      type_name: def.type_name,
      variants: def.variants || [],
      layerPaths,
      credits: def.credits || [],
      match_body_color: def.match_body_color || false,
    };

    definitions.push(entry);
    layerIndex[key] = entry;

    if (!categories[category]) categories[category] = [];
    categories[category].push(entry);
  }

  return { categories, definitions, layerIndex };
}

/**
 * Build a simplified layer catalog for the Groq/Llama prompt.
 * Groups items by semantic category with friendly names.
 *
 * @param {Object} parsed - Output of parseSheetDefinitions
 * @returns {Object} LPC_LAYERS compatible structure for the AI prompt
 */
export function buildLayerCatalog(parsed) {
  const { categories, layerIndex } = parsed;

  // Body types
  const bodyDef = layerIndex["body"];
  const bodySkinColors = bodyDef ? bodyDef.variants : ["light"];

  // Aggregate hair styles from all hair_* definitions
  const hairStyles = (categories.hair || [])
    .filter(d => !d.key.startsWith("hairext"))
    .map(d => {
      // Extract the style name from the key: hair_long → long, hair_curly_short → curly_short
      const style = d.key.replace(/^hair_/, "");
      return style;
    });

  // Hair colors come from variants of any hair definition
  const hairColors = bodyDef ? [] : [];
  const sampleHair = (categories.hair || [])[0];
  const allHairColors = sampleHair ? sampleHair.variants : [];

  // Beards
  const beardStyles = (categories.beards || []).map(d => d.key.replace(/^beards_/, ""));

  // Eyes
  const eyesDef = layerIndex["eyes"];
  const eyeColors = eyesDef ? eyesDef.variants : [];

  // Heads
  const headTypes = (categories.heads || []).map(d => d.key.replace(/^heads_/, ""));

  // Torso items
  const torsoItems = (categories.torso || []).map(d => {
    const k = d.key.replace(/^torso_/, "");
    return k;
  });

  // Legs
  const legItems = (categories.legs || []).map(d => d.key.replace(/^legs_/, ""));

  // Feet
  const feetItems = (categories.feet || []).map(d => d.key.replace(/^feet_/, ""));

  // Hat
  const hatItems = (categories.hat || []).map(d => d.key.replace(/^hat_/, ""));

  // Cape
  const capeItems = (categories.cape || []).map(d => d.key.replace(/^cape_/, ""));

  // Weapon
  const weaponItems = (categories.weapon || []).map(d => d.key.replace(/^weapon_/, ""));

  // Shield
  const shieldItems = (categories.shield || []).map(d => d.key.replace(/^shield_/, ""));

  // Shoulders
  const shoulderItems = (categories.shoulders || []).map(d => d.key.replace(/^shoulders_/, ""));

  // Wings
  const wingItems = (categories.wings || []).map(d => d.key.replace(/^wings_/, ""));

  // Belt
  const beltItems = (categories.belt || []).map(d => d.key.replace(/^belt_/, ""));

  // Neck
  const neckItems = (categories.neck || []).map(d => d.key.replace(/^neck_/, ""));

  // Arms
  const armItems = (categories.arms || []).map(d => d.key.replace(/^arms_/, ""));

  // Facial (earrings, eyepatches, glasses, etc.)
  const facialItems = (categories.facial || []).map(d => d.key.replace(/^facial_/, ""));

  return {
    body: {
      description: "Base body type",
      options: ["male", "female", "muscular", "pregnant", "teen", "child"],
      default: "male",
    },
    skin_color: {
      description: "Skin/body color",
      options: bodySkinColors,
      default: "light",
    },
    head: {
      description: "Head shape/race",
      options: ["none", ...headTypes],
      default: "human_male",
    },
    eyes: {
      description: "Eye color",
      options: eyeColors.length > 0 ? eyeColors : ["blue", "brown", "green", "gray"],
      default: "brown",
    },
    hair_style: {
      description: "Hair style",
      options: ["none", ...hairStyles],
      default: "plain",
    },
    hair_color: {
      description: "Hair color (from variant list of chosen hair style)",
      options: allHairColors.length > 0 ? allHairColors : ["black", "brown", "blonde", "red", "white"],
      default: "dark_brown",
    },
    facial_hair: {
      description: "Beard/mustache style",
      options: ["none", ...beardStyles],
      default: "none",
    },
    torso: {
      description: "Torso clothing or armor",
      options: ["none", ...torsoItems],
      default: "clothes_longsleeve",
    },
    legs: {
      description: "Leg covering",
      options: ["none", ...legItems],
      default: "pants",
    },
    feet: {
      description: "Footwear",
      options: ["none", ...feetItems],
      default: "shoes",
    },
    arms: {
      description: "Arm armor/accessories",
      options: ["none", ...armItems],
      default: "none",
    },
    hat: {
      description: "Headwear or helmet",
      options: ["none", ...hatItems],
      default: "none",
    },
    cape: {
      description: "Cape or cloak",
      options: ["none", ...capeItems],
      default: "none",
    },
    belt: {
      description: "Belt or waist accessory",
      options: ["none", ...beltItems],
      default: "none",
    },
    shoulders: {
      description: "Shoulder armor/accessories",
      options: ["none", ...shoulderItems],
      default: "none",
    },
    weapon: {
      description: "Weapon",
      options: ["none", ...weaponItems],
      default: "none",
    },
    shield: {
      description: "Shield",
      options: ["none", ...shieldItems],
      default: "none",
    },
    facial_accessory: {
      description: "Facial accessories (glasses, earrings, eyepatch, mask)",
      options: ["none", ...facialItems],
      default: "none",
    },
    wings: {
      description: "Wings",
      options: ["none", ...wingItems],
      default: "none",
    },
    neck: {
      description: "Neck accessory (amulet, necklace, scarf)",
      options: ["none", ...neckItems],
      default: "none",
    },
  };
}

/**
 * Resolve a layer selection to actual PNG file paths for compositing.
 *
 * @param {string} layerKey - The definition key (e.g. "hair_long", "torso_clothes_longsleeve")
 * @param {string} bodyType - Body type (male, female, etc.)
 * @param {string} variant - Color/variant (e.g. "dark_brown", "steel", "white")
 * @param {Object} parsed - Output of parseSheetDefinitions
 * @param {string} lpcRepoPath - Path to the LPC repo
 * @returns {Array<{path: string, zPos: number}>} - Ordered list of PNG paths to composite
 */
export function resolveLayerFiles(layerKey, bodyType, variant, parsed, lpcRepoPath) {
  const def = parsed.layerIndex[layerKey];
  if (!def) return [];

  const spritesDir = path.join(lpcRepoPath, "spritesheets");
  const results = [];

  // Iterate layer_1, layer_2, ... in order
  const layerKeys = Object.keys(def.layerPaths).sort();
  for (const lk of layerKeys) {
    const layerDef = def.layerPaths[lk];
    const zPos = layerDef.zPos || 0;

    // Skip layers with custom_animation (slash_oversize, etc.) for now
    // These are special attack animations that need frame-specific handling
    if (layerDef.custom_animation) continue;

    // Find the path for our body type
    let relPath = layerDef[bodyType] || layerDef["male"] || layerDef["female"];
    if (!relPath) {
      // Try any available body type
      const available = Object.keys(layerDef).filter(k => k !== "zPos" && k !== "custom_animation");
      if (available.length > 0) relPath = layerDef[available[0]];
    }
    if (!relPath) continue;

    // The relPath is like "hair/long/male/" — we need to append the variant.png
    const fullDir = path.join(spritesDir, relPath);

    if (variant && variant !== "none") {
      const variantPath = path.join(fullDir, `${variant}.png`);
      if (fs.existsSync(variantPath)) {
        results.push({ path: variantPath, zPos });
        continue;
      }
    }

    // If no variant match, try to find any PNG in that directory
    if (fs.existsSync(fullDir)) {
      const stat = fs.statSync(fullDir);
      if (stat.isDirectory()) {
        const pngs = fs.readdirSync(fullDir).filter(f => f.endsWith(".png"));
        if (pngs.length > 0) {
          // Prefer common defaults
          const preferred = ["white.png", "steel.png", "brown.png", "light.png", "black.png"];
          const pick = preferred.find(p => pngs.includes(p)) || pngs[0];
          results.push({ path: path.join(fullDir, pick), zPos });
          continue;
        }
      }
    }

    // The relPath might already end with .png for universal items
    const directPath = path.join(spritesDir, relPath.replace(/\/$/, "") + ".png");
    if (fs.existsSync(directPath)) {
      results.push({ path: directPath, zPos });
    }
  }

  return results;
}

/**
 * Build credits text for a set of used layer definitions.
 *
 * @param {string[]} usedKeys - Definition keys that were used
 * @param {Object} parsed - Output of parseSheetDefinitions
 * @returns {string} - CC-BY-SA attribution text
 */
export function buildCreditsText(usedKeys, parsed) {
  const allAuthors = new Set();
  const allLicenses = new Set();
  const allUrls = new Set();
  const perLayer = [];

  for (const key of usedKeys) {
    const def = parsed.layerIndex[key];
    if (!def || !def.credits) continue;

    for (const credit of def.credits) {
      perLayer.push(`  ${key}: ${credit.file}`);
      if (credit.authors) credit.authors.forEach(a => allAuthors.add(a));
      if (credit.licenses) credit.licenses.forEach(l => allLicenses.add(l));
      if (credit.urls) credit.urls.forEach(u => allUrls.add(u));
    }
  }

  return `# LPC Spritesheet Credits
# Generated by PickMeUp Sprite Generator
# Date: ${new Date().toISOString()}

## Authors
${[...allAuthors].join(", ")}

## Licenses
${[...allLicenses].join(", ")}

## Layer Sources
${perLayer.join("\n")}

## Source URLs
${[...allUrls].join("\n")}

## Attribution
Sprites from the Liberated Pixel Cup (LPC) project.
Licensed under CC-BY-SA 3.0 / GPL 3.0.
Source: https://github.com/sanderfrenken/Universal-LPC-Spritesheet-Character-Generator
`;
}
