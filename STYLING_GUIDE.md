# MathLive Styling Guide

This guide shows you where to edit the visual appearance of MathLive components.

## 📍 Key Files Location

### 1. **Suggestion Popover Menu** (Autocomplete Menu)
**File:** `css/suggestion-popover.less`

This controls the autocomplete/suggestion menu that appears when typing.

**Key variables to edit (lines 8-19):**
```less
@suggestion-bg: #111111;              // Background color
@suggestion-border: #333333;           // Border color
@suggestion-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);  // Shadow
@suggestion-hover-bg: #1a1a1a;         // Hover background
@suggestion-current-bg: #222222;       // Selected item background
@suggestion-current-border: #444444;    // Selected item border
@suggestion-text: #ffffff;              // Text color
@suggestion-text-secondary: #888888;    // Secondary text color
@suggestion-accent: #ffffff;           // Accent color
@suggestion-border-radius: 12px;       // Border radius
@suggestion-item-radius: 6px;           // Item border radius
```

**Main container (lines 21-42):**
- Background, border, shadow, padding, min/max width

**Scrollbar styling (lines 59-70):**
- Scrollbar width, track, and thumb colors

**Item hover/selection (lines 107-126):**
- Hover background, current item styling

---

### 2. **Caret (Cursor) Color**
**File:** `css/mathfield.less`

**Caret color variable (line 58):**
```less
--_caret-color: var(--caret-color, hsl(var(--_hue), 40%, 49%));
```

**To customize:**
- Override the CSS variable `--caret-color` on your math-field element
- Or edit line 58 directly to change the default

**Caret styling (lines 281-346):**
```less
.ML__caret::after {
  --_caret-width: clamp(2px, 0.08em, 10px);  // Caret width
  border-right: var(--_caret-width) solid var(--_caret-color);  // Caret color
  animation: ML__caret-blink 1.05s step-end forwards infinite;  // Blink animation
}
```

**Caret blink animation (lines 19-27):**
```less
@keyframes ML__caret-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}
```

**Different caret types:**
- `.ML__caret` - Regular math caret (line 281)
- `.ML__text-caret` - Text mode caret (line 305)
- `.ML__latex-caret` - LaTeX mode caret (line 326)

---

### 3. **Math Fonts**
**File:** `css/fonts.less`

This file defines all the KaTeX math fonts used for rendering.

**Font files location:**
- Font files are in: `css/fonts/` directory
- Fonts are loaded via `@font-face` declarations (lines 30-60)

**To change fonts:**
1. Replace font files in `css/fonts/` directory
2. Or modify the font-family names in `fonts.less`

**Font families defined:**
- KaTeX_AMS, KaTeX_Caligraphic, KaTeX_Fraktur
- KaTeX_Main (most common)
- KaTeX_Math, KaTeX_SansSerif
- KaTeX_Script, KaTeX_Size1-4, KaTeX_Typewriter

---

### 4. **Context Menu** (Right-click Menu)
**File:** `src/ui/menu/style.less`

**Key variables (lines 15-19):**
```less
--active-label-color: #fff;        // Active menu item text
--label-color: #121212;             // Menu item text
--menu-bg: #e2e2e2;                // Menu background
--active-bg: #5898ff;               // Active item background
--active-bg-dimmed: #c5c5c5;       // Active submenu background
```

**Menu container (lines 25-54):**
- Position, z-index, border-radius, background, shadow

---

### 5. **Environment Popover** (Fraction/Matrix Controls)
**File:** `css/environment-popover.less`

**Key variables (lines 8-13):**
```less
--_accent-color: var(--accent-color, #aaa);
--_background: var(--environment-panel-background, #fff);
--_button-background: var(--environment-panel-button-background, white);
--_button-background-hover: var(--environment-panel-button-background-hover, #f5f5f7);
--_button-text: var(--environment-panel-button-text, #e3e4e8);
```

---

### 6. **Math Field General Styling**
**File:** `css/mathfield.less`

**Selection colors (lines 61-65):**
```less
--_selection-color: var(--selection-color, #000);
--_selection-background-color: var(--selection-background-color, hsl(var(--_hue), 70%, 85%));
```

**Text highlight (lines 68-71):**
```less
--_text-highlight-background-color: var(--highlight-text, hsla(var(--_hue), 40%, 50%, 0.1));
```

**LaTeX mode color (line 91):**
```less
--_latex-color: var(--latex-color, hsl(var(--_hue), 80%, 40%));
```

**Smart fence (lines 81-82):**
```less
--_smart-fence-color: var(--smart-fence-color, currentColor);
--_smart-fence-opacity: var(--smart-fence-opacity, 0.5);
```

---

## 🎨 How to Customize

### Method 1: Override CSS Variables (Recommended)
Add custom CSS in your project:
```css
math-field {
  --caret-color: #3b82f6;
  --selection-background-color: rgba(59, 130, 246, 0.2);
  --latex-color: #10b981;
}
```

### Method 2: Edit LESS Files Directly
1. Edit the `.less` files in `css/` directory
2. Rebuild MathLive: `npm run build`
3. The changes will be in `dist/mathlive-static.css`

### Method 3: Use CSS Custom Properties
Many styles can be overridden using CSS variables without rebuilding:
- `--caret-color`
- `--selection-color`
- `--selection-background-color`
- `--latex-color`
- `--smart-fence-color`
- `--smart-fence-opacity`
- `--highlight-text`
- `--contains-highlight-background-color`

---

## 📂 File Structure Summary

```
mathlive/
├── css/
│   ├── suggestion-popover.less    ← Suggestion menu styling
│   ├── environment-popover.less   ← Fraction/matrix controls
│   ├── mathfield.less             ← Main mathfield + caret styling
│   ├── fonts.less                 ← Font definitions
│   ├── mathlive-fonts.less        ← Font imports
│   ├── mathlive-static.css        ← Compiled CSS (after build)
│   └── fonts/                     ← Font files (KaTeX)
│
└── src/ui/menu/
    └── style.less                  ← Context menu styling
```

---

## 🔧 Quick Reference

| What to Change | File | Line/Area |
|---------------|------|-----------|
| Popover background | `css/suggestion-popover.less` | Line 9 (`@suggestion-bg`) |
| Popover text color | `css/suggestion-popover.less` | Line 15 (`@suggestion-text`) |
| Caret color | `css/mathfield.less` | Line 58 (`--_caret-color`) |
| Caret width | `css/mathfield.less` | Line 293 (`--_caret-width`) |
| Selection color | `css/mathfield.less` | Line 61 (`--_selection-color`) |
| Math fonts | `css/fonts.less` | Lines 41-60 (font-face) |
| Context menu | `src/ui/menu/style.less` | Lines 15-19 (variables) |

---

## 💡 Tips

1. **After editing LESS files**, always run `npm run build` to compile changes
2. **Use CSS variables** when possible - no rebuild needed
3. **Test in dark/light mode** - some colors may need adjustment
4. **Check browser DevTools** to see which CSS variables are available
5. **Font changes** require font files to be in the correct format (woff2)

