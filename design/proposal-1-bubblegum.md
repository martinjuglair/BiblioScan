# Proposition 1 : "Bubblegum" — Pétillant & Ludique

## Personnalité
Joyeuse, enfantine sans être infantile, colorée. Inspirée par les apps comme Duolingo et Headspace.
L'idée : chaque interaction donne l'impression de jouer. Les couleurs pop, les formes rebondissent, tout est doux et invitant.

---

## Palette de couleurs

### Brand
| Nom | Hex | Usage |
|-----|-----|-------|
| **Grape** (primaire) | `#8B5CF6` | Boutons principaux, liens, accents |
| **Bubblegum** | `#F472B6` | Gamification, badges, streaks |
| **Mint** | `#34D399` | Succès, validations, "lu" |
| **Lemon** | `#FBBF24` | Étoiles, alertes douces, highlights |
| **Sky** | `#38BDF8` | Infos, liens secondaires |

### Texte
| Nom | Hex |
|-----|-----|
| Primary | `#1E1B4B` (indigo très foncé) |
| Secondary | `#6B7280` |
| Tertiary | `#9CA3AF` |
| On-brand | `#FFFFFF` |

### Surfaces
| Nom | Hex |
|-----|-----|
| Background | `#FEFBFF` (blanc rosé) |
| Card | `#FFFFFF` |
| Subtle | `#F5F3FF` (lavande ultra-light) |
| Input | `#EDE9FE` |

### Borders
| Nom | Hex |
|-----|-----|
| Default | `#E5E7EB` |
| Strong | `#C4B5FD` (lavande) |

---

## Typographie

**Font principale : Nunito**
- Google Font gratuite, arrondie naturellement, très lisible, feeling friendly
- Alternative à Manrope : même lisibilité mais beaucoup plus ronde et douce

| Niveau | Taille | Poids | Tracking |
|--------|--------|-------|----------|
| Display | 32px | 800 (ExtraBold) | -0.02em |
| H1 | 26px | 700 | -0.01em |
| H2 | 20px | 700 | 0 |
| H3 | 17px | 600 | 0 |
| Body | 15px | 400 | 0.01em |
| Caption | 13px | 600 | 0.02em |
| Micro | 11px | 700 | 0.04em |

---

## Formes & Rayons

| Élément | Rayon |
|---------|-------|
| Boutons | 16px (très arrondi, pas pill) |
| Cards | 20px |
| Badges | 100px (pill) |
| Inputs | 14px |
| Avatars/Icônes | 50% (cercle) |
| Bottom sheet | 28px top |
| Modals | 24px |

---

## Ombres

```
card:    0 2px 12px rgba(139, 92, 246, 0.08)
float:   0 8px 30px rgba(139, 92, 246, 0.12)
glow:    0 0 20px rgba(139, 92, 246, 0.20)   /* pour les éléments gamifiés */
```

Les ombres ont une teinte **violette** pour renforcer l'identité de marque.

---

## Composants clés

### Bouton primaire
```
background: linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)
color: white
padding: 14px 28px
border-radius: 16px
font: Nunito 600 15px
shadow: 0 4px 14px rgba(139, 92, 246, 0.3)
```
Au tap : léger scale(0.97) + glow

### Bouton secondaire
```
background: #F5F3FF
color: #8B5CF6
border: 1.5px solid #C4B5FD
border-radius: 16px
```

### Card livre
```
background: white
border-radius: 20px
shadow: card
padding: 0
overflow: hidden
```
La couverture dépasse légèrement en haut (-8px) avec un léger tilt de 2° pour un effet "posé sur la table".

### Badge gamification
```
background: linear-gradient(135deg, #F472B6, #FBBF24)
border-radius: 100px
padding: 6px 14px
color: white
font: Nunito 700 11px uppercase
letter-spacing: 0.04em
```

### Navigation bottom
```
background: white
border-top: none
shadow: 0 -4px 20px rgba(0,0,0,0.06)
height: 64px
border-radius: 20px 20px 0 0
```
Icônes : ligne fine (Lucide), actif = Grape avec dot dessous au lieu de highlight

---

## Animations & Micro-interactions

- **Ajout livre** : la couverture tombe dans la collection avec un léger bounce
- **Badge débloqué** : explosion de confettis (petits cercles colorés)
- **Streak maintenu** : flamme animée pulse doucement
- **Swipe to read** : le slider a un gradient Grape→Mint quand complété
- **Tab switch** : les icônes ont un petit bounce quand sélectionnées

---

## Proto — Écran Collection

```
┌─────────────────────────────┐
│  ● BiblioScan        🔔  Q │  ← fond #FEFBFF
│                             │
│  Ma collection              │  ← Nunito 800, 26px, #1E1B4B
│  42 BD · Niveau 3 🟣       │  ← 13px, #6B7280
│                             │
│ ┌─────┐ ┌─────┐ ┌─────┐   │  ← pills filtre
│ │ Tous│ │À lire│ │ Lus │   │     actif = fond Grape, texte blanc
│ └─────┘ └─────┘ └─────┘   │     inactif = fond #F5F3FF, texte Grape
│                             │
│ ┌───────────────────────┐  │
│ │ 📚 Marvel             │  │  ← card catégorie, radius 20px
│ │ 12 BD                 │  │     ombre violette subtile
│ │ ░░░░░░░░░░░░░░░░░░░░ │  │  ← mini couvertures en bande
│ └───────────────────────┘  │
│                             │
│ ┌───────────────────────┐  │
│ │ 📚 Manga              │  │
│ │ 8 BD                  │  │
│ │ ░░░░░░░░░░░░░░░░░░░░ │  │
│ └───────────────────────┘  │
│                             │
│ ┌───────────────────────┐  │
│ │ Non classés           │  │  ← fond #F5F3FF au lieu de blanc
│ │ 5 BD                  │  │
│ └───────────────────────┘  │
│                             │
├─────────────────────────────┤
│ 🏠   📚   📷   📊   ⚙️   │  ← nav uniforme, actif = dot Grape
└─────────────────────────────┘
```

## Proto — Écran Stats / Gamification

```
┌─────────────────────────────┐
│  Mes stats                  │  ← Nunito 800
│                             │
│  ┌───────────────────────┐  │
│  │   NIVEAU 3            │  │  ← gradient Grape→Bubblegum
│  │   Passionné 🔥        │  │     blanc, gros texte
│  │   ████████░░ 12/20    │  │  ← barre XP, Mint fill
│  └───────────────────────┘  │
│                             │
│  🔥 Streak : 5 jours       │  ← flamme animée
│  ┌─────────────────────┐   │
│  │ J'ai lu aujourd'hui  │   │  ← bouton Bubblegum si pas cliqué
│  └─────────────────────┘   │     Mint + ✓ si cliqué
│                             │
│  L  M  M  J  V  S  D       │
│  🟣 🟣 🟣 ⚪ 🟣 🟣 ⚪      │  ← calendrier semaine
│                             │
│  Badges                     │
│  ┌────┐ ┌────┐ ┌────┐     │
│  │ 🏆 │ │ ⭐ │ │ 🔒 │     │  ← débloqué = coloré
│  │Coll.│ │Note│ │ ?? │     │     verrouillé = grisé + cadenas
│  │ 50  │ │All │ │    │     │
│  └────┘ └────┘ └────┘     │
│                             │
│  Objectif mensuel           │
│      ╭───╮                  │
│      │12 │                  │  ← ring SVG, stroke = Lemon
│      │/15│                  │
│      ╰───╯                  │
│  80% complété               │
└─────────────────────────────┘
```

---

## Résumé mood

> **Bubblegum** c'est l'ami fun qui te motive à lire. Violet pop, touches de rose et vert menthe, tout est rond, doux et récompensant. Chaque action dans l'app donne un petit dopamine hit visuel.
