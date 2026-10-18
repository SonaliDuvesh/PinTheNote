/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: "class",
    theme: {
        extend: {
            colors: {
                // Blush Sanctuary Light (Calm L)
                "hot-pink": "#FF69B4",
                "baby-pink": "#FFD1DC",
                "blush-pink": "#FFB7C5",
                "faint-lilac": "#E6E6FA",
                "plum-mauve": "#4B0082",
                "muted-plum": "#6A4C93",
                "rose-gold": "#D2B48C",

                // Midnight Blush Dark (Calm D)
                "plum-black": "#2A1B29",
                "magenta-plum-top": "#3D1F3A",
                "magenta-plum-bottom": "#2A1729",
                "plum-card": "#3C2740",
                "glowing-magenta": "#FF6FB0",
                "dusty-rose-gold": "#D9A6C4",
                "tag-pill-fill": "#5C3A57",
                "soft-white-pink": "#FCE8F3",
                "soft-lavender-white": "#E8D9E5",
                "muted-mauve-gray": "#B497AC",

                // Bold Cozy Light (Living L)
                "choc-sidebar": "#F1E4D0",
                "choc-canvas": "#FBF3E7",
                "choc-card": "#FFFBF5",
                "choc-deep": "#4A2C1D",
                "choc-caramel": "#B0764A",
                "choc-sage": "#7A8B6F",
                "choc-heading": "#3B2418",
                "choc-body": "#5A4636",
                "choc-border": "#E5D5C5",
                "cream": "#F0E5DB",
                "cream-darker": "#DFD3C8",
                "kraft": "#BCA99C",

                // Bold Cozy Dark (Living D)
                "espresso": "#211610",
                "espresso-bg": "#2A1D15",
                "espresso-card": "#3A2A1E",
                "espresso-border": "#4A362A",
                "amber-gold": "#C9975C",
                "ivory-cream": "#F2E6D3",
                "warm-tan": "#D9C7AE",
                "tag-amber": "#D8B98A",
                "check-green": "#8FA487",
                "nav-inactive": "#A8927A",

                // Shared Sanctuary palette
                terracotta: '#d27d56',
                sage: '#8da399',
                lavender: '#a997bd',
                softYellow: '#ebc885',
                coral: '#e88d7d',
                warmBlue: '#8fb1c2',
                warmCream: '#fbf9f5',
                bgBeige: '#f5f0e8',
                textCharcoal: '#3d3b39',
                textHeading: '#4a4542',
            },
            borderRadius: {
                "blob": "40% 60% 70% 30% / 40% 50% 60% 50%",
                "blob-2": "60% 40% 30% 70% / 60% 30% 70% 40%",
            },
            fontFamily: {
                fredoka: ["Fredoka", "sans-serif"],
                nunito: ["Nunito", "sans-serif"],
                caveat: ["Caveat", "cursive"],
                lora: ["Lora", "serif"],
                outfit: ["Outfit", "sans-serif"],
                "plus-jakarta": ["Plus Jakarta Sans", "sans-serif"],
            },
            boxShadow: {
                panel: '4px 0 24px -4px rgba(74, 44, 29, 0.08)',
                plush: '0 10px 25px -5px rgba(176, 118, 74, 0.15)',
                seal: 'inset 0 0 5px rgba(74, 44, 29, 0.1)',
                card: '0 4px 12px rgba(74, 44, 29, 0.04)',
                "pink-glow": '0 0 20px 5px rgba(255, 183, 197, 0.4)',
                "magenta-glow": '0 0 20px 5px rgba(255, 111, 176, 0.3)',
            }
        },
    },
    plugins: [],
}
