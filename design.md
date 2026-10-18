PinTheNote Design System
Global Structure (applies to every theme)
Layout: Unified workspace, not disconnected pages.
Left sidebar: main navigation/tools (Workspace Notes, Time Center, File & Image Lab, Ambient Canvas, Voice Notes, Activity Tracker).
Middle column: search, category filter pills, sort, "+ New", scrollable note cards.
Right column: active note editor (folder dropdown, save status, pin/star/delete, title, body).
Bottom-left: Style Theme switcher panel, listing all themes below, each with a Light/Dark toggle.
Rule: Only color, texture, type, and (Theme C only) the animated creature layer change between themes. Component positions and IA stay identical across all themes/modes.
Theme A — BOLD (Cozy, Solid Color)
Core Design Philosophy
Feel: A beautiful personal room / desk / workspace, but confident and grounded — like a cabin at night. Warm, relaxing, cozy, colorful, bold but soothing.
Atmosphere: A warm, sunlit personal workspace with sturdy, high-contrast color instead of soft pastels.
Avoid: Corporate SaaS dashboard, admin panel, generic notes app, pure white/black anywhere, sterile feel, neon colors, gradients, glassmorphism, drop-shadow-heavy depth.
The user should feel: "This is my sturdy, confident little workspace."
Color Palette — Light ("Bold L")
Background: Warm oat/cream (not pure white).
Accent (single, dominant): Terracotta, rust, or deep mustard — used solidly on primary buttons, active nav pill, selected note card border.
Surface: Cards sit on a slightly deeper cream panel; depth via color, not shadow.
Color Palette — Dark ("Bold D")
Background: Deep espresso/charcoal-brown.
Accent: Same hue as light mode, desaturated slightly so it doesn't vibrate against dark.
Text: Cream.
Shapes & Components
Thick 2px solid borders instead of soft shadows.
Fully rounded pill buttons and tags.
Chunky, simplified iconography.
Typography
Rounded-but-sturdy sans (friendlier Inter/Poppins style). Bold weights on titles. Generous letter spacing on nav labels.
Motion
Minimal — subtle hover scale (1.02) on cards/buttons only. No decorative animation.
Theme B — BLUSH (Pink, Girly, Soft)
Core Design Philosophy
Feel: Dreamy, soft-glam, girly — blush tones, not neon Barbie.
Atmosphere: A cozy pink corner of the workspace, still readable and calm, not overwhelming.
Avoid: Harsh neon pink, cluttered decoration that competes with note text.
The user should feel: "This is my soft, pretty little space."
Color Palette — Light ("Blush L")
Background: Soft gradient, blush pink → pale lavender-pink.
Surface: White note cards, thin pink border, soft pink drop shadow.
Accent: Saturated hot-pink/rose for buttons and active states.
Decoration: Small sparkle/heart/star glyphs near empty states and the "+ New" button.
Color Palette — Dark ("Blush D")
Background: Deep plum/mauve (not black).
Accent: Same rose-pink, glowing softly against the plum (like neon on velvet).
Surface: Slightly lighter plum cards, pink-glow border on hover.
Shapes & Components
Rounded/scalloped card corners.
Note-pin icon replaced with a heart or flower motif.
Tag pills styled like small ribbon badges.
Typography
Headers: soft rounded or light cursive-adjacent display font.
Body: clean sans-serif for readability.
Motion
Gentle: sparkle twinkle on hover, soft pulse on save/star icons, cards lightly "bounce" in on load.
Theme C — LIVING (Animated Creatures)
Core Design Philosophy
An interactive visual environment layered over the workspace, with tiny animated, stylized game-like characters (not emojis).
Mostly calm, occasionally alive/surprising — characters sit, walk, stretch, look around, sleep, and react to events (e.g. note completed, tap, drag).
Characters have safe interaction zones and never block or sit over active note text — productivity always comes first.
Color Palette — Light ("Living L")
Background: Soft green/sky-blue, daytime meadow feel.
Creature set: Sunny meadow creatures — bunnies, birds, butterflies.
Motion style: Gentle bobbing, bright and playful.
Color Palette — Dark ("Living D")
Background: Deep indigo/navy with subtle stars.
Creature set: Nocturnal creatures — fireflies, sleepy cats, tiny ghosts.
Motion style: Slower, drowsier; creatures glow faintly.
Creature Behavior Spec
Population: 3–6 concurrent creatures max (performance cap).
Spawn: Random screen edges/corners, random intervals; wander along margins/sidebar/empty space using idle → walk → sleep animation loops.
Never path over active editor text (pointer-events pass through unless directly over a creature).
Interactions:
Tap/click → reaction animation (bounce, blink, heart pop, squeak).
Press-and-hold / drag → creature follows cursor briefly (petting).
Occasional random "gift" bubble (star/treat) appears; tapping it makes the creature happy.
Despawn: Creatures wander off-screen and disappear after a wander cycle; new ones spawn to replace them.
Art style: Chibi/kawaii proportions, big glossy eyes, soft cel-shading, transparent-background sprite assets, curled-up sleep pose for idle/night state.
Accessibility: Include a "reduce motion" toggle that disables wandering/animation and shows creatures in a static idle pose only.
Implementation Notes (for engineering, not Stitch)
Stitch generates the static UI layout only — e.g. the reserved transparent overlay layer/z-index where creatures render, and the panel states (idle/populated).
Actual movement/animation is implemented in code, outside Stitch:
Sprite-sheet + CSS steps() animation, or
Rive (recommended — supports rigged state machines: idle/walk/react/sleep, and tap/drag interactivity), or
Lottie for simpler decorative loop animations.
Prompting only applies to Stitch for the UI shell; creature motion is hand-built/rigged separately and then embedded into the exported UI.
Theme D — CUSTOM (User-Configurable Studio)
Core Design Philosophy
A lightweight in-app "theme lab," not a separate skin — lets the user build their own combination of Theme A/B aesthetics plus Theme C's creature layer.
The user should feel: "I made this exactly how I like it."
Controls
Color customization: Pickers for background, accent, card, and text color, with live preview on the real note-list + editor. Quick preset swatches pulled from Bold/Blush palettes as starting points.
Typography toggle: 2–3 font pairing presets (Bold/Sturdy, Blush/Soft, Neutral/Clean).
Creature customization (extends Theme C):
Toggle the living layer on/off.
Checklist to choose which creatures appear.
Sliders for creature count and movement speed.
"Add your own" mini-pet: base shape + color + accessory (bow, hat, glasses) added to the roaming set.
Save/Reset:
"Save as my theme" — persists the combination as a new selectable option alongside Bold/Blush/Living/Custom.
"Reset to default" button.
Cross-Theme Technical Notes (for the Stitch agent)
Generate every theme as Light + Dark variants of the same three screens: (a) note-list view, (b) note-editor view, (c) theme-switcher panel open.
Theme switcher panel must list all themes (Bold, Blush, Living, Custom, plus any user-saved Custom presets) with a Light/Dark toggle per theme.
Maintain sufficient text/background contrast in every theme, especially Bold Dark and Blush Dark — decoration must never compromise note readability.
Reserve a dedicated overlay layer/z-index for Theme C/D's creature layer; do not let it intersect the editor's text area.
Include a motion-reduction toggle accessible from the theme panel for Theme C/D.
Stitch's output is the static UI/layout only. Creature animation (walk cycles, tap/drag reactions) is implemented separately in code (sprite sheets, Rive, or Lottie) and embedded into the exported UI — do not expect Stitch to produce moving assets.