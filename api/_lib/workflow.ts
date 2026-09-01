// AUTO-GENERATED from Oracle plix_v2 workflow.json (steps.thumbnail_prompt version 2026-08-30).
// 원천: opc@131.186.42.62:/home/opc/plix_v2/workflow.json — 손편집 금지, 정본 변경 시 재생성.
export const WORKFLOW = {
  "flows": {
    "default": {
      "steps": [
        "analyze",
        "compose"
      ]
    }
  },
  "steps": {
    "analyze": {
      "system": "You are a music analysis assistant. Given a playlist request, extract: genre, mood, era, tempo, and 5 key characteristics. Reply ONLY in JSON: {\"genre\":\"...\",\"mood\":\"...\",\"era\":\"...\",\"tempo\":\"...\",\"tags\":[...]}",
      "prompt": "Playlist request: {{input}}",
      "provider_pref": [
        "Gemini",
        "Groq"
      ],
      "params": {
        "temperature": 0.3,
        "max_tokens": 512
      }
    },
    "compose": {
      "system": "You are a playlist curator. Based on the analysis, create a 10-track playlist. For each track include: title, artist, year, and why it fits. Format as a numbered list with clear spacing. Be specific and real.",
      "prompt": "Analysis: {{prev}}\n\nOriginal request: {{input}}\n\nCreate a 10-track playlist:",
      "provider_pref": [
        "Gemini",
        "OpenRouter_A"
      ],
      "params": {
        "temperature": 0.8,
        "max_tokens": 2048
      }
    },
    "thumbnail_prompt": {
      "version": "2026-08-30",
      "purpose": "Step-6 image prompt for a 1280x720 YouTube playlist thumbnail. Applies to FREE and PAID keys alike.",
      "rules": {
        "words_min": 90,
        "words_max": 140,
        "must_include": [
          "PLAYLIST"
        ],
        "forbidden": [
          "horror",
          "scary",
          "creepy",
          "terrifying",
          "blood",
          "gore",
          "weapon",
          "zombie",
          "ghost",
          "skull",
          "nightmare",
          "haunted"
        ],
        "playlist_line": "Behind the scene the single word PLAYLIST in huge pure-white heavy italic sans-serif letters, slightly tilted with subtle depth and a soft glow, partially covered by foreground objects, crisp and correctly spelled. No other text, no subtitles, no logos.",
        "negative": "text, watermark, logo, extra typography, blurry, low resolution, ugly, deformed, noisy artifacts, horror, scary, eerie, gloomy dread",
        "retry": 1
      },
      "genres": {
        "lofi": {
          "match": [
            "lo-fi",
            "lofi",
            "로파이"
          ],
          "scene": "a cozy bedroom or small cafe corner at night, rain on the window, city neon softly blurred outside",
          "subject": "a vintage turntable or cassette player, a steaming mug, a plant, headphones resting on a wooden desk",
          "lighting": "warm amber desk lamp, cool blue window light, gentle film grain",
          "camera": "eye-level, 35mm, shallow depth of field",
          "palette": [
            "#F2C078",
            "#1B2A41",
            "#7D5BA6",
            "#E8D8C4",
            "#0F1A2B"
          ],
          "mood": [
            "cozy",
            "nostalgic",
            "dreamy",
            "rainy",
            "intimate"
          ],
          "avoid": "harsh daylight, crowds, clutter"
        },
        "jazz": {
          "match": [
            "jazz",
            "재즈"
          ],
          "scene": "a candlelit vinyl bar or late-night lounge, large window with raindrops, soft city lights outside",
          "subject": "an antique turntable playing a record, brass candlestick, whiskey glass or coffee cup on a dark wooden table",
          "lighting": "warm candlelight, deep shadows, golden bokeh",
          "camera": "cinematic 50mm, shallow focus, rich contrast",
          "palette": [
            "#D4A24C",
            "#2B1B12",
            "#8C3B2E",
            "#F5E6C8",
            "#0D0B0A"
          ],
          "mood": [
            "sophisticated",
            "romantic",
            "smoky",
            "smooth",
            "melancholic yet comforting"
          ],
          "avoid": "bright colors, cartoon look"
        },
        "pop": {
          "match": [
            "pop",
            "팝"
          ],
          "scene": "a sunny rooftop, beach boardwalk or colorful city street in the golden hour",
          "subject": "a retro boombox, sunglasses, a convertible car or bicycle, balloons or confetti lightly in the air",
          "lighting": "bright golden sunlight, vivid saturated colors, lens flare",
          "camera": "wide 24mm, energetic composition",
          "palette": [
            "#FF477E",
            "#FFD166",
            "#06D6A0",
            "#118AB2",
            "#FFFFFF"
          ],
          "mood": [
            "bright",
            "playful",
            "energetic",
            "happy",
            "youthful"
          ],
          "avoid": "gloom, darkness, rain"
        },
        "rnb": {
          "match": [
            "r&b",
            "rnb",
            "r n b",
            "알앤비"
          ],
          "scene": "a velvet lounge or night apartment with city lights through the window, satin sheets or a leather sofa",
          "subject": "a glass of red wine, a vinyl record, candles, silk fabric, a rose",
          "lighting": "deep purple and magenta neon glow, soft rim light, moody",
          "camera": "85mm portrait lens look, tight elegant framing",
          "palette": [
            "#8E44AD",
            "#2C0A3A",
            "#E84393",
            "#F8E1F4",
            "#120714"
          ],
          "mood": [
            "sensual",
            "smooth",
            "late-night",
            "velvety",
            "intimate"
          ],
          "avoid": "daylight, cheap party vibe"
        },
        "indie": {
          "match": [
            "indie",
            "인디"
          ],
          "scene": "a road trip at dusk, an open field, a small-town street or a record store with posters",
          "subject": "an acoustic guitar, a film camera, a vintage van, a polaroid photo, wildflowers",
          "lighting": "soft golden dusk, muted film tones, light leaks",
          "camera": "35mm film look, natural handheld framing",
          "palette": [
            "#C97B4B",
            "#6B8E6B",
            "#F0E6D2",
            "#3A4A5A",
            "#B23A3A"
          ],
          "mood": [
            "free-spirited",
            "wistful",
            "warm",
            "authentic",
            "youthful"
          ],
          "avoid": "glossy commercial look"
        },
        "study": {
          "match": [
            "study",
            "focus",
            "study / focus",
            "공부",
            "집중"
          ],
          "scene": "a quiet library desk or a tidy study room by a large window, daylight or early evening",
          "subject": "an open notebook, a fountain pen, a stack of books, a mug of tea, a small plant, soft glowing laptop",
          "lighting": "soft natural window light, calm and clean, gentle warm lamp",
          "camera": "top-down or 45-degree desk view, orderly composition",
          "palette": [
            "#E8DCC8",
            "#6B8F71",
            "#F7F3EA",
            "#2F3E46",
            "#C9A66B"
          ],
          "mood": [
            "calm",
            "focused",
            "clean",
            "peaceful",
            "productive"
          ],
          "avoid": "night horror mood, darkness, clutter, moonlit gloom"
        },
        "workout": {
          "match": [
            "workout",
            "gym",
            "운동",
            "헬스"
          ],
          "scene": "a modern gym with concrete walls, a running track at sunrise, or an urban outdoor court",
          "subject": "dumbbells, a kettlebell, sneakers, a water bottle, chalk dust in the air",
          "lighting": "hard dramatic side light, high contrast, orange and teal",
          "camera": "low angle, dynamic diagonal composition",
          "palette": [
            "#FF6B35",
            "#1B1B1E",
            "#00A6A6",
            "#F5F5F5",
            "#FFD23F"
          ],
          "mood": [
            "powerful",
            "intense",
            "motivating",
            "sweaty",
            "driven"
          ],
          "avoid": "soft cozy vibe, pastel colors"
        },
        "meditation": {
          "match": [
            "meditation",
            "healing",
            "명상",
            "힐링",
            "relax"
          ],
          "scene": "a serene lake at dawn, a zen garden, a misty forest or a minimal room with a single plant",
          "subject": "smooth stones, a lotus flower, a candle, incense smoke curling, a soft cushion",
          "lighting": "soft diffused morning light, mist, pastel haze",
          "camera": "symmetrical calm composition, wide open space",
          "palette": [
            "#BFD8C9",
            "#F4F1EA",
            "#7A9E9F",
            "#E9D5C0",
            "#4A6670"
          ],
          "mood": [
            "serene",
            "still",
            "healing",
            "breathing",
            "weightless"
          ],
          "avoid": "clutter, strong contrast, city noise"
        },
        "citypop": {
          "match": [
            "city pop",
            "citypop",
            "시티팝",
            "시티 팝"
          ],
          "scene": "a 1980s Tokyo highway at night, a seaside road with palm trees, retro neon signs and a convertible",
          "subject": "a retro cassette deck, a cocktail with a straw, a vintage sports car, a skyline reflection",
          "lighting": "pink and cyan neon, sunset gradient, glossy reflections",
          "camera": "retro anime-influenced illustration or glossy photo, wide shot",
          "palette": [
            "#FF6EC7",
            "#4CC9F0",
            "#FFB347",
            "#2D1B4E",
            "#F7F7FF"
          ],
          "mood": [
            "retro",
            "glossy",
            "nostalgic-futuristic",
            "breezy",
            "glamorous"
          ],
          "avoid": "grunge, dull colors"
        },
        "sleep": {
          "match": [
            "sleep",
            "수면",
            "잠",
            "night rest"
          ],
          "scene": "a quiet bedroom at night, a window with a crescent moon and soft stars, curtains gently moving",
          "subject": "a warm bedside lamp, a fluffy blanket, a book left open, a cup of chamomile tea",
          "lighting": "very soft moonlight and a single warm lamp, low contrast, cozy not gloomy",
          "camera": "soft focus, gentle vignette",
          "palette": [
            "#2C3E6B",
            "#F1D6A8",
            "#8FA3C8",
            "#FFF8EC",
            "#1A2238"
          ],
          "mood": [
            "sleepy",
            "safe",
            "soft",
            "hushed",
            "comforting"
          ],
          "avoid": "horror, eerie shadows, cold blue dread"
        },
        "romance": {
          "match": [
            "romance",
            "love",
            "로맨스",
            "사랑",
            "발라드",
            "ballad"
          ],
          "scene": "a rainy window seat cafe, a rooftop at sunset, or a warm living room with fairy lights",
          "subject": "two coffee cups, a handwritten letter, roses, a record player, a knitted blanket",
          "lighting": "warm golden glow, soft bokeh, gentle haze",
          "camera": "50mm, intimate close framing",
          "palette": [
            "#E85D75",
            "#F9D8D6",
            "#5A2A3A",
            "#FFF4E6",
            "#B08968"
          ],
          "mood": [
            "tender",
            "longing",
            "warm",
            "heartfelt",
            "dreamy"
          ],
          "avoid": "cold tones, emptiness"
        },
        "travel": {
          "match": [
            "travel",
            "drive",
            "여행",
            "드라이브",
            "road"
          ],
          "scene": "an open coastal highway, a mountain pass at golden hour, or a train window view",
          "subject": "a car dashboard, a map, a camera, sunglasses on the dashboard, a coffee in a paper cup",
          "lighting": "golden hour sun, long shadows, clear air",
          "camera": "wide cinematic 16:9 landscape, leading lines",
          "palette": [
            "#F4A261",
            "#264653",
            "#2A9D8F",
            "#E9C46A",
            "#FFFFFF"
          ],
          "mood": [
            "free",
            "expansive",
            "adventurous",
            "breezy",
            "hopeful"
          ],
          "avoid": "night, rain, indoor"
        },
        "classical": {
          "match": [
            "classical",
            "piano",
            "클래식",
            "피아노"
          ],
          "scene": "a grand hall with tall windows, or an elegant room with a grand piano and velvet curtains",
          "subject": "a grand piano, sheet music, a violin resting on a chair, a chandelier softly glowing",
          "lighting": "soft golden window light, elegant shadows, dust motes in warm light",
          "camera": "wide elegant symmetry, 35mm",
          "palette": [
            "#C9A96E",
            "#3B2F2F",
            "#F3EEE6",
            "#6E7F80",
            "#1F1B18"
          ],
          "mood": [
            "elegant",
            "timeless",
            "graceful",
            "serene",
            "majestic"
          ],
          "avoid": "modern neon, clutter"
        },
        "default": {
          "match": [],
          "scene": "a cozy atmospheric setting that matches the playlist mood, with a window and gentle light",
          "subject": "a music player or turntable, a warm drink, small personal objects that tell a story",
          "lighting": "cinematic warm key light with soft shadows",
          "camera": "35mm, shallow depth of field, balanced composition",
          "palette": [
            "#F2C078",
            "#1B2A41",
            "#8C3B2E",
            "#F5E6C8",
            "#0F1A2B"
          ],
          "mood": [
            "atmospheric",
            "emotional",
            "inviting",
            "warm"
          ],
          "avoid": "horror, gloom, clutter"
        }
      },
      "system": "You are a YouTube thumbnail art director for music playlists. Write ONE English image-generation prompt for a 1280x720 cinematic thumbnail. Follow the GENRE LEXICON exactly: use its scene, subjects, lighting, camera and mood words; never invent a different mood. Keep it emotional and specific (what the viewer feels), not a bare list. Length {{words_min}}-{{words_max}} words. Never use these words: {{forbidden}}. End the prompt with this exact sentence: \"{{playlist_line}}\" Reply ONLY with JSON: {\"prompt\": \"...\", \"negativePrompt\": \"...\", \"palette\": [\"#hex\", \"#hex\", \"#hex\", \"#hex\", \"#hex\"]}",
      "prompt": "GENRE: {{genre}}\nPLAYLIST TITLE: {{title}}\nMOOD (from step 1): {{mood}}\nSCENE (from step 1): {{scene}}\n\nGENRE LEXICON\n- scene: {{lex_scene}}\n- subjects: {{lex_subject}}\n- lighting: {{lex_lighting}}\n- camera: {{lex_camera}}\n- mood words: {{lex_mood}}\n- avoid: {{lex_avoid}}\n- palette hint: {{lex_palette}}\n\nWrite the prompt now. Use negativePrompt = \"{{negative}}\" plus anything from 'avoid'.",
      "params": {
        "temperature": 0.45,
        "max_tokens": 900
      }
    }
  }
} as const;
