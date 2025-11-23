import { injectStylesheet, releaseStylesheet } from '../common/stylesheet';

import {
  makeStruts,
  parseLatex,
  Atom,
  coalesce,
  Box,
  Context,
} from '../core/core';

import { getCaretPoint } from '../editor-mathfield/utils';
import type { _Mathfield } from '../editor-mathfield/mathfield-private';

import { getKeybindingsForCommand } from './keybindings';

import { complete } from '../editor-mathfield/autocomplete';
import { ModeEditor } from '../editor-mathfield/mode-editor';
import { applyInterBoxSpacing } from '../core/inter-box-spacing';
import {
  getSharedElement,
  releaseSharedElement,
} from '../common/shared-element';

// Store the current suggestions to avoid recreating the popover unnecessarily
let gCurrentSuggestions: string[] = [];

function latexToMarkup(mf: _Mathfield, latex: string): string {
  const context = new Context({ from: mf.context });

  const root = new Atom({
    mode: 'math',
    type: 'root',
    body: parseLatex(latex, { context }),
  });

  const box = coalesce(
    applyInterBoxSpacing(
      new Box(root.render(context), { classes: 'ML__base' }),
      context
    )
  );

  return makeStruts(box, { classes: 'ML__latex' }).toMarkup();
}

export function showSuggestionPopover(
  mf: _Mathfield,
  suggestions: string[]
): void {
  if (suggestions.length === 0) {
    hideSuggestionPopover(mf);
    return;
  }

  // Check if popover is already visible with the same suggestions
  // If so, just update the current selection instead of recreating everything
  const panel = document.getElementById('mathlive-suggestion-popover');
  const isVisible = panel?.classList.contains('is-visible');
  const suggestionsChanged =
    gCurrentSuggestions.length !== suggestions.length ||
    gCurrentSuggestions.some((s, i) => s !== suggestions[i]);

  if (isVisible && !suggestionsChanged) {
    // Just update the current selection - no need to recreate
    updateCurrentSelection(panel!, mf.suggestionIndex);
    panel!
      .querySelector('.ML__popover__current')
      ?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    return;
  }

  // Store current suggestions
  gCurrentSuggestions = [...suggestions];

  // 1. Filter out styling commands
  const excludedStylingCommands = [
    // Text formatting
    '\\text', '\\textbf', '\\textit', '\\textrm', '\\textsf', '\\texttt',
    '\\textmd', '\\textup', '\\textnormal', '\\textsl', '\\textsc',
    // Math formatting
    '\\mathbf', '\\mathit', '\\mathrm', '\\mathsf', '\\mathtt',
    '\\mathbb', '\\mathcal', '\\mathscr', '\\mathfrak', '\\mathnormal', '\\mathbfit',
    '\\Bbb', '\\frak',
    // Font families and styles
    '\\bf', '\\it', '\\rm', '\\sf', '\\tt',
    '\\rmfamily', '\\sffamily', '\\ttfamily',
    '\\bfseries', '\\mdseries', '\\upshape', '\\slshape', '\\scshape',
    // Bold symbols
    '\\boldsymbol', '\\bm', '\\bold',
    // Size commands
    '\\tiny', '\\scriptsize', '\\footnotesize', '\\small', '\\normalsize',
    '\\large', '\\Large', '\\LARGE', '\\huge', '\\Huge',
    // Style commands
    '\\displaystyle', '\\textstyle', '\\scriptstyle', '\\scriptscriptstyle',
    // Color and boxes
    '\\color', '\\textcolor', '\\colorbox', '\\fcolorbox', '\\boxed',
    '\\em', '\\emph',
    // Advanced TeX commands
    '\\the',
  ];

  // 2. Categorize suggestions
  const categories = {
    functions: [] as { command: string; markup: string; keybinding?: string }[],
    constants: [] as { command: string; markup: string; keybinding?: string }[],
    symbols: [] as { command: string; markup: string; keybinding?: string }[],
  };

  for (const suggestion of suggestions) {
    const command = suggestion;

    // Skip styling commands
    if (excludedStylingCommands.some(excluded => command.startsWith(excluded))) {
      continue;
    }

    const commandMarkup = latexToMarkup(mf, suggestion);
    const keybinding = getKeybindingsForCommand(mf.keybindings, command).join(
      '<br>'
    );
    const item = { command, markup: commandMarkup, keybinding };

    // Simple heuristic for categorization (can be refined)
    const greekLetters = [
      '\\alpha', '\\beta', '\\gamma', '\\delta', '\\epsilon', '\\zeta', '\\eta', '\\theta', '\\iota', '\\kappa', '\\lambda', '\\mu', '\\nu', '\\xi', '\\omicron', '\\pi', '\\rho', '\\sigma', '\\tau', '\\upsilon', '\\phi', '\\chi', '\\psi', '\\omega',
      '\\Gamma', '\\Delta', '\\Theta', '\\Lambda', '\\Xi', '\\Pi', '\\Sigma', '\\Upsilon', '\\Phi', '\\Psi', '\\Omega',
      '\\varepsilon', '\\vartheta', '\\varpi', '\\varrho', '\\varsigma', '\\varphi'
    ];

    if (command.startsWith('\\mathbb') || command.startsWith('\\mathcal') || command.length === 2) {
      // Single letter commands or font commands often act like symbols/constants
      categories.symbols.push(item);
    } else if (greekLetters.some(g => command === g || command.startsWith(g + ' '))) {
      categories.symbols.push(item);
    } else if (command.length > 3 && !command.includes('{')) {
      categories.functions.push(item);
    } else {
      categories.symbols.push(item);
    }
  }

  // Move "Variable or Function" like items to top if they look like text
  // For now, let's just use the first few as "Top Matches" if we want, 
  // but the user asked for specific categories: "Variable or Function", "Constant", "Symbols"
  // Let's try to map the user's image structure.

  // Re-sorting/filtering based on the user's "Variable or Function" vs "Constant" vs "Symbols"
  // This is a bit tricky without more metadata, but let's try a best effort.

  const sections: string[] = [];

  // Helper to create a list item
  const createItem = (item: { command: string, markup: string, keybinding?: string }, index: number, isGrid: boolean = false) => {
    const isCurrent = index === mf.suggestionIndex ? 'ML__popover__current' : '';
    const shortcut = index < 9 ? `⌘${index + 1}` : ''; // Example shortcuts

    let html = `<li role="button" data-command="${item.command}" class="${isCurrent} ${isGrid ? 'ML__popover__item--grid' : 'ML__popover__item--list'}" tabindex="0">`;

    if (isGrid) {
      html += `<span class="ML__popover__command">${item.markup}</span>`;
      if (shortcut) html += `<span class="ML__popover__shortcut">${shortcut}</span>`;
    } else {
      html += `<span class="ML__popover__icon">${item.markup}</span>`; // Use markup as icon for now
      html += `<div class="ML__popover__label-group">`;
      html += `<span class="ML__popover__latex">${item.command}</span>`;
      html += `<span class="ML__popover__type">Function</span>`; // Placeholder type
      html += `</div>`;
      if (shortcut) html += `<span class="ML__popover__shortcut">${shortcut}</span>`;
      else if (item.keybinding) html += `<span class="ML__popover__keybinding">${item.keybinding}</span>`;
    }
    html += '</li>';
    return html;
  };

  let globalIndex = 0;

  // Section 1: Symbols (Grid view) - Priority
  if (categories.symbols.length > 0) {
    sections.push(`<div class="ML__popover__section-title">Symbols</div>`);
    sections.push('<ul class="ML__popover__grid">');
    for (const item of categories.symbols) {
      sections.push(createItem(item, globalIndex++, true));
    }
    sections.push('</ul>');
  }

  // Section 2: Functions/Variables (List view)
  if (categories.functions.length > 0) {
    sections.push(`<div class="ML__popover__section-title">Variable or Function</div>`);
    sections.push('<ul>');
    for (const item of categories.functions) {
      sections.push(createItem(item, globalIndex++, false));
    }
    sections.push('</ul>');
  }

  // Section 3: Constants (List view)
  if (categories.constants.length > 0) {
    sections.push(`<div class="ML__popover__section-title">Constant</div>`);
    sections.push('<ul>');
    for (const item of categories.constants) {
      sections.push(createItem(item, globalIndex++, false));
    }
    sections.push('</ul>');
  }

  // Fallback if everything ended up in symbols but we want a list for the first few?
  // For now, let's stick to the categorization.

  const newPanel = createSuggestionPopover(mf, `<div class="ML__popover__container">${sections.join('')}</div>`);

  if (isSuggestionPopoverVisible()) {
    newPanel
      .querySelector('.ML__popover__current')
      ?.scrollIntoView({ block: 'nearest', inline: 'nearest' });

    // Add keyboard listener
    setupPopoverKeybindings(mf);
  }

  setTimeout(() => {
    if (newPanel && !isSuggestionPopoverVisible()) {
      newPanel.classList.add('is-visible');
      updateSuggestionPopoverPosition(mf);
      newPanel
        .querySelector('.ML__popover__current')
        ?.scrollIntoView({ block: 'nearest', inline: 'nearest' });

      // Add keyboard listener (in case it wasn't visible immediately)
      setupPopoverKeybindings(mf);
    }
  }, 32);
}

/**
 * Update the current selection in the popover without recreating it
 */
function updateCurrentSelection(panel: HTMLElement, newIndex: number): void {
  const items = panel.querySelectorAll('li');

  // Remove current class from all items
  items.forEach((item) => {
    item.classList.remove('ML__popover__current');
  });

  // Add current class to the new selected item
  if (newIndex >= 0 && newIndex < items.length) {
    items[newIndex].classList.add('ML__popover__current');
  }
}

let gKeydownHandler: ((evt: KeyboardEvent) => void) | null = null;

function setupPopoverKeybindings(mf: _Mathfield) {
  if (gKeydownHandler) return; // Already set up

  gKeydownHandler = (evt: KeyboardEvent) => {
    if (!isSuggestionPopoverVisible()) return;

    // Handle Enter/Return key to accept current suggestion
    if (evt.key === 'Enter' || evt.key === 'Return') {
      const panel = document.getElementById('mathlive-suggestion-popover');
      if (!panel) return;

      const items = panel.querySelectorAll('li');
      if (mf.suggestionIndex < items.length) {
        evt.preventDefault();
        evt.stopPropagation();

        const el = items[mf.suggestionIndex];
        complete(mf, 'reject');
        ModeEditor.insert(mf.model, el.dataset.command!, {
          selectionMode: 'placeholder',
          format: 'latex',
          mode: 'math',
        });
        mf.dirty = true;
        mf.focus();
      }
      return;
    }

    // Handle Cmd/Ctrl + number shortcuts
    if ((evt.metaKey || evt.ctrlKey) && evt.key >= '1' && evt.key <= '9') {
      const index = parseInt(evt.key) - 1;
      const panel = document.getElementById('mathlive-suggestion-popover');
      if (!panel) return;

      const items = panel.querySelectorAll('li');
      if (index < items.length) {
        evt.preventDefault();
        evt.stopPropagation();

        const el = items[index];
        complete(mf, 'reject');
        ModeEditor.insert(mf.model, el.dataset.command!, {
          selectionMode: 'placeholder',
          format: 'latex',
          mode: 'math',
        });
        mf.dirty = true;
        mf.focus();
      }
    }
  };

  document.addEventListener('keydown', gKeydownHandler, { capture: true });
}

export function isSuggestionPopoverVisible(): boolean {
  const panel = document.getElementById('mathlive-suggestion-popover');
  if (!panel) return false;
  return panel.classList.contains('is-visible');
}

export function updateSuggestionPopoverPosition(
  mf: _Mathfield,
  options?: { deferred: boolean }
): void {
  // Check that the mathfield is still valid
  // (we're calling ourselves from requestAnimationFrame() and the mathfield
  // could have gotten destroyed
  if (!mf.element || mf.element.mathfield !== mf) return;

  if (!isSuggestionPopoverVisible()) return;

  if (mf.model.at(mf.model.position)?.type !== 'latex') {
    hideSuggestionPopover(mf);
    return;
  }

  if (options?.deferred) {
    // Call ourselves again later, typically after the
    // rendering/layout of the DOM has been completed
    // (don't do it on next frame, it might be too soon)
    setTimeout(() => updateSuggestionPopoverPosition(mf), 32);
    return;
  }

  const position = getCaretPoint(mf.field!);
  if (!position) return;

  // Get screen width & height (browser compatibility)
  const viewportHeight =
    window.innerHeight ||
    document.documentElement.clientHeight ||
    document.body.clientHeight;
  const viewportWidth =
    window.innerWidth ||
    document.documentElement.clientWidth ||
    document.body.clientWidth;

  // Get scrollbar size. This would be 0 in mobile device (also no needed).
  const scrollbarWidth =
    window.innerWidth - document.documentElement.clientWidth;
  const scrollbarHeight =
    window.innerHeight - document.documentElement.clientHeight;
  const virtualkeyboardHeight =
    window.mathVirtualKeyboard?.boundingRect.height ?? 0;
  // Prevent screen overflow horizontal.
  const panel = document.getElementById('mathlive-suggestion-popover')!;
  if (position.x + panel.offsetWidth / 2 > viewportWidth - scrollbarWidth) {
    panel.style.left = `${viewportWidth - panel.offsetWidth - scrollbarWidth
      }px`;
  } else if (position.x - panel.offsetWidth / 2 < 0) panel.style.left = '0';
  else panel.style.left = `${position.x - panel.offsetWidth / 2}px`;

  // And position the popover right below or above the caret
  const spaceAbove = position.y - position.height;
  const spaceBelow =
    viewportHeight - scrollbarHeight - virtualkeyboardHeight - position.y;

  if (spaceBelow < spaceAbove) {
    panel.classList.add('ML__popover--reverse-direction');
    panel.classList.remove('top-tip');
    panel.classList.add('bottom-tip');
    panel.style.top = `${position.y - position.height - panel.offsetHeight - 15
      }px`;
  } else {
    panel.classList.remove('ML__popover--reverse-direction');
    panel.classList.add('top-tip');
    panel.classList.remove('bottom-tip');
    panel.style.top = `${position.y + 15}px`;
  }
}

export function hideSuggestionPopover(mf: _Mathfield): void {
  mf.suggestionIndex = 0;
  gCurrentSuggestions = []; // Clear stored suggestions
  const panel = document.getElementById('mathlive-suggestion-popover');
  if (panel) {
    releaseSharedElement('mathlive-suggestion-popover');
  }

  if (gKeydownHandler) {
    document.removeEventListener('keydown', gKeydownHandler, { capture: true });
    gKeydownHandler = null;
  }
}

export function createSuggestionPopover(
  mf: _Mathfield,
  html: string
): HTMLElement {
  let panel = document.getElementById('mathlive-suggestion-popover');
  if (panel) {
    releaseSharedElement('mathlive-suggestion-popover');
  } else {
    injectStylesheet('suggestion-popover');
    injectStylesheet('core');
  }

  panel = getSharedElement('mathlive-suggestion-popover');
  panel.addEventListener('pointerdown', (ev) => ev.preventDefault());
  panel.addEventListener('click', (ev) => {
    let el: HTMLElement | null = ev.target as HTMLElement;
    while (el && !el.dataset.command) el = el.parentElement;
    if (!el) return;
    complete(mf, 'reject');
    ModeEditor.insert(mf.model, el.dataset.command!, {
      selectionMode: 'placeholder',
      format: 'latex',
      mode: 'math',
    });
    mf.dirty = true;
    mf.focus();
  });

  panel!.innerHTML = globalThis.MathfieldElement.createHTML(html);

  return panel;
}

export function disposeSuggestionPopover(): void {
  if (!document.getElementById('mathlive-suggestion-popover')) return;
  releaseSharedElement('mathlive-suggestion-popover');
  releaseStylesheet('suggestion-popover');
  releaseStylesheet('core');
}
