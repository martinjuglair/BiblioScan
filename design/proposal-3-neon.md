# Proposition 3 : "Neon" — Vibrant & Moderne

## Personnalité
Énergique, tech-savvy, colorée mais maîtrisée. Inspirée par Spotify, Discord et les apps Gen-Z.
L'idée : fond sombre, accents néon, du mouvement. On est dans un univers digital assumé. La gamification est front & center.

---

## Palette de couleurs

### Brand
| Nom | Hex | Usage |
|-----|-----|-------|
| **Electric** (primaire) | `#6366F1` | Boutons principaux, navigation active |
| **Lime** | `#84CC16` | Succès, "lu", streaks, XP |
| **Hot Pink** | `#EC4899` | Badges, likes, highlights gamification |
| **Cyan** | `#22D3EE` | Infos, liens, éléments secondaires |
| **Amber** | `#F59E0B` | Étoiles, warnings, objectifs |

### Texte
| Nom | Hex |
|-----|-----|
| Primary | `#F8FAFC` (blanc cassé) |
| Secondary | `#94A3B8` |
| Tertiary | `#64748B` |
| On-brand | `#FFFFFF` |

### Surfaces
| Nom | Hex |
|-----|-----|
| Background | `#0F172A` (slate 900) |
| Card | `#1E293B` (slate 800) |
| Elevated | `#334155` (slate 700) |
| Input | `#1E293B` border `#334155` |

### Borders
| Nom | Hex |
|-----|-----|
| Default | `#334155` |
| Strong | `#475569` |
| Glow | `rgba(99, 102, 241, 0.4)` |

---

## Typographie

**Font principale : Space Grotesk**
- Google Font gratuite, géométrique, moderne, légèrement futuriste
- Plus de caractère que Inter, plus tech que Nunito
- Très bien en Display/titres, bon en body

| Niveau | Taille | Poids | Tracking |
|--------|--------|-------|----------|
| Display | 32px | 700 | -0.03em |
| H1 | 26px | 700 | -0.02em |
| H2 | 20px | 600 | -0.01em |
| H3 | 17px | 500 | 0 |
| Body | 15px | 400 | 0 |
| Caption | 13px | 500 | 0.01em |
| Micro | 11px | 700 | 0.04em |

---

## Formes & Rayons

| Élément | Rayon |
|---------|-------|
| Boutons | 14px |
| Cards | 16px |
| Badges | 100px (pill) |
| Inputs | 12px |
| Bottom sheet | 24px top |
| Modals | 20px |
| Couvertures | 8px |

---

## Ombres & Glows

```
card:    0 0 0 1px rgba(99, 102, 241, 0.1), 0 4px 20px rgba(0, 0, 0, 0.3)
float:   0 8px 40px rgba(0, 0, 0, 0.5)
neon:    0 0 20px rgba(99, 102, 241, 0.3), 0 0 60px rgba(99, 102, 241, 0.1)
streak:  0 0 12px rgba(132, 204, 22, 0.4)   /* glow vert pour les streaks */
badge:   0 0 12px rgba(236, 72, 153, 0.4)   /* glow rose pour les badges */
```

Les ombres sont remplacées par des **glows colorés** sur fond sombre.

---

## Composants clés

### Bouton primaire
```
background: linear-gradient(135deg, #6366F1 0%, #818CF8 100%)
color: white
padding: 14px 28px
border-radius: 14px
font: Space Grotesk 600 15px
box-shadow: neon
```
Au tap : glow s'intensifie (0.3 → 0.5)

### Bouton secondaire
```
background: #1E293B
color: #F8FAFC
border: 1px solid #475569
border-radius: 14px
```

### Bouton gamification (CTA streak)
```
background: linear-gradient(135deg, #84CC16, #22D3EE)
color: #0F172A
border-radius: 14px
box-shadow: streak
font: Space Grotesk 700
```

### Card livre
```
background: #1E293B
border-radius: 16px
border: 1px solid #334155
```
Au hover/tap : la border prend un glow Electric subtil.

### Badge gamification
```
background: linear-gradient(135deg, #EC4899, #F59E0B)
border-radius: 100px
padding: 6px 16px
color: white
font: Space Grotesk 700 11px uppercase
box-shadow: badge
```

### Navigation bottom
```
background: #0F172A
border-top: 1px solid #1E293B
height: 64px
```
Icônes : style filled quand actif, outline quand inactif. Actif = Electric avec glow subtil dessous.

---

## Animations & Micro-interactions

- **Ajout livre** : flash lumineux sur la card + particules qui se dispersent
- **Badge débloqué** : explosion de lumière (flash blanc → reveal badge avec glow)
- **Streak maintenu** : pulse glow vert autour du compteur
- **Swipe to read** : traînée lumineuse Lime derrière le slider
- **Tab switch** : l'icône active a un glow pulsant
- **Level up** : écran plein avec gradient animé + texte qui scale up

Animations plus prononcées que les 2 autres propositions — c'est assumé et fun.

---

## Proto — Écran Collection

```
┌─────────────────────────────┐
│                       🔔  Q │  ← fond #0F172A
│                             │
│  Ma collection              │  ← Space Grotesk 700, blanc
│  42 BD · Niv.3 ⚡           │  ← Lime accent
│                             │
│ ┌─────┐ ┌─────┐ ┌─────┐   │  ← pills filtre
│ │ Tous│ │À lire│ │ Lus │   │     actif = Electric bg + glow
│ └─────┘ └─────┘ └─────┘   │     inactif = slate 800 + border
│                             │
│ ┌───────────────────────┐  │
│ │ 📚 Marvel         12  │  │  ← card sombre, border subtle
│ │ ░░░░░░░░░░░░░░░░░░░░ │  │     glow Electric au tap
│ └───────────────────────┘  │
│                             │
│ ┌───────────────────────┐  │
│ │ 📚 Manga           8  │  │
│ │ ░░░░░░░░░░░░░░░░░░░░ │  │
│ └───────────────────────┘  │
│                             │
│ ┌───────────────────────┐  │
│ │ 📦 Non classés     5  │  │  ← même style, pas de cover
│ └───────────────────────┘  │
│                             │
├─────────────────────────────┤
│ 🏠   📚   📷   📊   ⚙️   │  ← glow Electric sous actif
└─────────────────────────────┘
```

## Proto — Écran Stats / Gamification

```
┌─────────────────────────────┐
│  Mes stats              ⚡  │  ← Space Grotesk 700, blanc
│                             │
│  ┌───────────────────────┐  │
│  │  ░░░ NIVEAU 3 ░░░    │  │  ← gradient Electric→Cyan
│  │  ★ Passionné ★       │  │     glow effect, blanc
│  │  ████████░░░░ 12/20  │  │  ← barre XP = Lime glow
│  └───────────────────────┘  │
│                             │
│  🔥 5 jours · Streak       │  ← glow vert pulsant
│  ┌─────────────────────┐   │
│  │ ⚡ J'ai lu !         │   │  ← gradient Lime→Cyan si dispo
│  └─────────────────────┘   │     grisé si déjà fait + ✓
│                             │
│  L   M   M   J   V   S   D │
│  🟢  🟢  🟢  ⚫  🟢  🟢  ⚫ │  ← Lime = fait, sombre = non
│                             │
│  Objectif                   │
│      ╭───╮                  │
│      │12 │                  │  ← ring SVG glow Amber
│      │/15│                  │
│      ╰───╯                  │
│                             │
│  Badges                     │
│  ┌────┐ ┌────┐ ┌────┐     │
│  │ 🏆 │ │ ⭐ │ │ 🔒 │     │  ← débloqué = gradient + glow
│  └────┘ └────┘ └────┘     │     verrouillé = slate 700 + lock
│                             │
│  Historique                 │
│  Avr ████████████ 8        │  ← barres horizontales Cyan
│  Mar ██████████ 6          │
│  Fév ████████ 5            │
└─────────────────────────────┘
```

---

## Mode clair (optionnel)

Cette DA fonctionne aussi en mode clair :
- Background : `#F8FAFC`
- Cards : `#FFFFFF`
- Les glows deviennent des ombres teintées
- Les couleurs brand restent identiques

Mais le **dark mode est le mode par défaut** et le plus impactant.

---

## Résumé mood

> **Neon** c'est la salle d'arcade des lecteurs. Fond sombre, accents qui brillent, chaque achievement est un moment spectaculaire. L'app dit "lire c'est cool et on va te le prouver".
