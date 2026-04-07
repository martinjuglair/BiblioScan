# Proposition 2 : "Paper" — Épuré & Chaleureux

## Personnalité
Minimaliste mais chaleureux. Inspirée par les apps comme Things, Linear et les belles librairies indépendantes.
L'idée : on est dans un beau carnet de lecture. La lecture est au centre, pas le chrome. Les couleurs sont terreuses, le contraste est net, tout respire.

---

## Palette de couleurs

### Brand
| Nom | Hex | Usage |
|-----|-----|-------|
| **Ink** (primaire) | `#1D1D1F` | Texte fort, boutons primaires |
| **Terracotta** | `#C2654A` | Accents principaux, CTA, gamification |
| **Sage** | `#7C9A82` | Succès, "lu", validations |
| **Sand** | `#D4A853` | Étoiles, highlights, streaks |
| **Clay** | `#B08968` | Badges, éléments secondaires |

### Texte
| Nom | Hex |
|-----|-----|
| Primary | `#1D1D1F` |
| Secondary | `#636366` |
| Tertiary | `#AEAEB2` |
| On-brand | `#FFFBF5` |

### Surfaces
| Nom | Hex |
|-----|-----|
| Background | `#FFFBF5` (crème chaud) |
| Card | `#FFFFFF` |
| Subtle | `#F5F0EA` (papier) |
| Input | `#F0EBE3` |

### Borders
| Nom | Hex |
|-----|-----|
| Default | `#E8E2DA` |
| Strong | `#D0C8BC` |

---

## Typographie

**Font principale : DM Sans**
- Google Font gratuite, géométrique mais douce, très moderne
- Plus structurée que Nunito, moins corporate que Inter
- Excellent en gras pour les titres, lisible en regular pour le body

| Niveau | Taille | Poids | Tracking |
|--------|--------|-------|----------|
| Display | 30px | 700 | -0.03em |
| H1 | 24px | 700 | -0.02em |
| H2 | 19px | 600 | -0.01em |
| H3 | 16px | 600 | 0 |
| Body | 15px | 400 | 0 |
| Caption | 13px | 500 | 0.01em |
| Micro | 11px | 600 | 0.03em |

---

## Formes & Rayons

| Élément | Rayon |
|---------|-------|
| Boutons | 12px |
| Cards | 16px |
| Badges | 8px (pas pill — plus sobre) |
| Inputs | 10px |
| Bottom sheet | 20px top |
| Modals | 20px |
| Couvertures | 4px (simule un vrai livre) |

---

## Ombres

```
card:    0 1px 4px rgba(29, 29, 31, 0.06), 0 4px 16px rgba(29, 29, 31, 0.04)
float:   0 8px 32px rgba(29, 29, 31, 0.10)
book:    4px 4px 0 rgba(29, 29, 31, 0.08)   /* ombre portée "posé sur une table" */
```

Ombres neutres, très subtiles. Le contraste vient des couleurs, pas des ombres.

---

## Composants clés

### Bouton primaire
```
background: #1D1D1F
color: #FFFBF5
padding: 14px 24px
border-radius: 12px
font: DM Sans 600 15px
```
Pas de gradient. Solide, net. Au hover/tap : opacity 0.85.

### Bouton secondaire
```
background: transparent
color: #1D1D1F
border: 1.5px solid #D0C8BC
border-radius: 12px
```

### Bouton accent (CTA gamification)
```
background: #C2654A
color: #FFFBF5
border-radius: 12px
```

### Card livre
```
background: white
border-radius: 16px
border: 1px solid #E8E2DA
shadow: card
```
Les couvertures ont un radius de 4px et une ombre `book` — elles ressemblent à de vrais livres posés.

### Badge gamification
```
background: #F5F0EA
border: 1.5px solid #D4A853
border-radius: 8px
padding: 4px 12px
color: #1D1D1F
font: DM Sans 600 11px
```
Plus sobre que Bubblegum mais toujours satisfaisant.

### Navigation bottom
```
background: #FFFBF5
border-top: 1px solid #E8E2DA
height: 60px
```
Icônes : ligne fine, actif = Terracotta + label visible, inactif = gris

---

## Animations & Micro-interactions

- **Ajout livre** : slide-in doux depuis le bas (300ms ease-out)
- **Badge débloqué** : la card pulse une fois avec un halo Sand doré
- **Streak maintenu** : petit check animé (style Things)
- **Swipe to read** : le slider passe de Terracotta à Sage
- **Tab switch** : crossfade simple, pas de bounce

L'animation est **retenue** — elle souligne sans distraire.

---

## Proto — Écran Collection

```
┌─────────────────────────────┐
│                       🔔  Q │  ← fond crème #FFFBF5
│                             │
│  Ma collection              │  ← DM Sans 700, 24px, Ink
│  42 albums                  │  ← 13px, Secondary
│                             │
│  Tous   À lire   Lus       │  ← pas de pills — underline tab
│  ────                       │     actif = Terracotta underline 2px
│                             │
│ ┌───────────────────────┐  │
│ │ Marvel            12 →│  │  ← card sobre, border subtle
│ │ ░░░ ░░░ ░░░ ░░░      │  │  ← petites couvertures alignées
│ └───────────────────────┘  │
│                             │
│ ┌───────────────────────┐  │
│ │ Manga              8 →│  │
│ │ ░░░ ░░░ ░░░           │  │
│ └───────────────────────┘  │
│                             │
│ ┌───────────────────────┐  │
│ │ Non classés        5 →│  │  ← même style, fond Subtle
│ └───────────────────────┘  │
│                             │
├─────────────────────────────┤
│ Accueil Coll. Scan Stats ⚙ │  ← nav simple, actif = Terracotta
└─────────────────────────────┘
```

## Proto — Écran Stats / Gamification

```
┌─────────────────────────────┐
│  Mon parcours               │  ← DM Sans 700
│                             │
│  Niveau 3 · Passionné      │  ← Terracotta accent
│  ████████████░░░░ 12/20    │  ← barre XP, Terracotta fill
│                             │
│  ┌─────────────────────┐   │
│  │ ☀️ J'ai lu aujourd'hui│   │  ← fond Terracotta si pas fait
│  └─────────────────────┘   │     fond Sage + ✓ si fait
│                             │
│  Cette semaine              │
│  L   M   M   J   V   S   D │
│  ●   ●   ●   ○   ●   ●   ○ │  ← Terracotta = fait, gris = non
│                             │
│  5 jours d'affilée 🔥      │  ← sobre, pas d'animation folle
│                             │
│  ── Objectif ──             │
│       12/15                 │  ← ring SVG stroke = Sand
│    ce mois-ci               │
│                             │
│  ── Badges ──               │
│  ┌──────┐ ┌──────┐ ┌──────┐│
│  │  📚  │ │  ⭐  │ │  🔒  ││
│  │50 BD │ │Toutes│ │ ???  ││
│  │      │ │notées│ │      ││
│  └──────┘ └──────┘ └──────┘│
│  badges = rectangles sobres │
│  avec border Sand           │
└─────────────────────────────┘
```

---

## Résumé mood

> **Paper** c'est la belle librairie de quartier version app. Crème, terracotta, textures chaudes. Tout est net et lisible, la gamification est présente mais jamais criarde. L'app dit "tu as bon goût et on le sait".
