# LPC Spritesheet Auto-Generator

Auto-generates pixel art character spritesheets using **Groq's free Llama API** to translate text descriptions into LPC layer configurations, then composites them into a full spritesheet PNG.

## Quick Start

### 1. Clone the LPC repo (if you haven't already)
```bash
git clone https://github.com/liberatedpixelcup/Universal-LPC-Spritesheet-Character-Generator.git
```

### 2. Install dependencies
```bash
cd lpc-generator
npm install
```

### 3. Get a free Groq API key
- Go to https://console.groq.com
- Sign up (free, no credit card needed)
- Create an API key

### 4. Set your key
```bash
export GROQ_API_KEY=your_groq_api_key_here
```

### 5. Point to your LPC repo (if not in the same folder)
```bash
export LPC_REPO=/path/to/Universal-LPC-Spritesheet-Character-Generator
```

---

## Usage

### Single character
```bash
node generate.js "a female warrior with red hair and plate armor"
node generate.js "an elderly male wizard with white hair and a long beard"
node generate.js "a young orc with dark skin, mohawk hair, and a battle axe"
```

### Interactive mode (describe multiple characters one by one)
```bash
node generate.js --interactive
```

### Batch mode (generate from a JSON list)
```bash
node generate.js --batch characters.json
```

`characters.json` format:
```json
[
  "a female knight with silver hair",
  "a male rogue with dark hair and leather armor",
  "an elderly wizard with a white beard and staff"
]
```

---

## Output

For each character, three files are saved to `output/`:

| File | Description |
|------|-------------|
| `<name>.png` | The full composited LPC spritesheet (832×1344px) |
| `<name>.json` | The layer config — can be reimported into the LPC generator UI |
| `<name>_credits.txt` | Required attribution for the CC-BY-SA licensed artwork |

---

## How It Works

1. **Llama selects layers** — Your description is sent to Groq's Llama 3 70B model along with all available LPC layer options. It returns a JSON config selecting the best match for each layer (body type, skin, hair style, hair color, armor, weapons, etc.).

2. **Fuzzy validation** — The chosen values are validated against the real available options. If Llama picks something close but not exact, it's fuzzy-matched to the nearest real option.

3. **Canvas compositing** — Each layer's spritesheet PNG is loaded and drawn in order (body → hair → clothes → armor → weapons) onto a canvas, producing the final sheet.

4. **Files saved** — PNG + JSON config + credits file written to `output/`.

---

## Customization

### Change the AI model
Edit `CONFIG.groqModel` in `generate.js`. Options on Groq:
- `llama3-70b-8192` (default, best quality)
- `llama3-8b-8192` (faster, slightly less accurate)
- `mixtral-8x7b-32768` (good alternative)

### Change output folder
Edit `CONFIG.outputDir` in `generate.js`.

### Reimport into the LPC generator UI
The `.json` output file can be loaded into the browser generator via its "Import JSON" button — useful if you want to tweak the result manually after auto-generation.

---

## Troubleshooting

**"No layers could be loaded"**
→ Make sure the LPC repo's `spritesheets/` folder has PNG files in it. Some repo clones may be missing large assets.

**"LPC repo not found"**
→ Set `export LPC_REPO=/path/to/your/clone`

**Poor layer selection**
→ Be more specific in your description (e.g. "silver hair" not just "grey") or try a different description phrasing.

---

## Attribution

All sprites are from the Liberated Pixel Cup project (CC-BY-SA 3.0).
See the generated `_credits.txt` file for full attribution.
