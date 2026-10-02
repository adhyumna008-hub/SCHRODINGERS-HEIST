# Anime-inspired 2.5D cutscenes

The playable scenes combine the painted background below with code-native animated character rigs, perspective-projected quantum architecture, separate foreground layers and recorded voice-over.

- Background source: [anime-lab.png](./anime-lab.png)
- Method: built-in `image_gen` tool; no API/CLI fallback.
- Original generated image is retained in the Codex generated-images directory. The production copy lives in this project and is embedded by Vite using `?inline`.
- Character and effect animation is implemented in `src/render/anime-actors.ts` and `src/render/anime-scenes.ts`, not baked into the background.

## Exact generation prompt

Create a production-quality ANIME FILM BACKGROUND painting for a 2.5D animated indie game, wide landscape 16:9. An empty quantum research laboratory at night. Crisp hand-drawn architectural linework, gorgeous richly painted cel-animation environment, cinematic Japanese science-fiction animation aesthetic, sophisticated indigo shadows, muted teal monitor glow, amber practical lamps, atmospheric depth. Three-quarter camera looking across the lab. A huge magnificent dilution refrigerator quantum computer with hanging golden concentric plates and finely detailed copper wiring occupies the RIGHT background behind glass; tall rain-streaked windows and a distant nighttime city occupy the LEFT background. Rear monitors, racks, cables, brushed metal floor reflecting light. Maintain the LOWER THIRD relatively empty floor with atmospheric subtle details: animated characters and a foreground console will be composited on top in code. Strong perspective, believable industrial detail, tactile painted brush texture, sharp inked edges, beautiful moody lighting, not flat vector shapes, not photorealistic, not a UI mockup. No people, no cats, no text, no lettering, no logos, no subtitles, no border. This is a background plate for actual animation, not a complete static cutscene.

## Animation direction

Miso is a ginger tabby with jade eyes, cream facial markings, a teal collar and an amber identification tag. Inside the computer the same rig becomes a silver familiar with a cyan state register. The laboratory and return scenes use warm practical lighting against indigo shadows; the quantum space uses cyan and muted violet. The last antagonist is never shown as a complete body or face.

The film uses 24 fps character poses with continuously eased camera motion. Voice amplitude drives mouth opening and the holographic speaker; it does not claim phoneme-specific lip sync. Reduced-motion mode retains the compositions and dialogue with static cameras and stable actor placement.
