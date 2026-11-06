# Product art prompts

Generated with ChatGPT image generation (owner's account, 2026-11-05), 4 sheets of 12 in one conversation so the style stays consistent, then sliced with `node scripts/products/slice.mjs`. All packaging is fictional: no real brands, logos or readable words (CLAUDE.md).

**Sheet 1 (base prompt):** a game icon sprite sheet for a mobile vending machine game. Exactly 12 products arranged in a strict grid of 4 columns × 3 rows, every cell the same size, each product centered in its cell with generous empty space around it, nothing touching or overlapping cell edges. Plain solid flat light gray background (#EDEDED) everywhere, no grid lines, no shadows on the background, no text, no labels, no numbers. Style: bright, cheerful, flat-shaded low-poly 3D game icons (like a polished casual mobile tycoon game), front 3/4 view, soft even lighting, saturated colors, chunky readable silhouettes. Packaging is fictional and unbranded: simple color blocks and shapes only, no real brands, no logos, no readable words. Then the 12 products in `PRODUCTS` order with their `color` hex.

**Sheets 2–4:** "exactly the same style, size, background (#EDEDED), lighting and 4 × 3 grid, unbranded, no text", then the next 12 products in order with their colors.

**Earbuds:** regenerated alone as a round, pebble-shaped case (light warm gray, coral accents) because the first drawing resembled a real product.

To add a product: generate one icon with the base style on #EDEDED, then run `slice.mjs` (or add a single-image cut like the earbuds one).
