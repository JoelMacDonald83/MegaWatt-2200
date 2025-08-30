import React from 'react';

const styles = `
:root {
  /* Font Sizes - Default is now larger */
  --font-size-xs: 0.85rem;   /* 13.6px */
  --font-size-sm: 1rem;      /* 16px */
  --font-size-base: 1.125rem;/* 18px */
  --font-size-lg: 1.25rem;   /* 20px */
  --font-size-xl: 1.4rem;    /* 22.4px */
  --font-size-2xl: 1.7rem;   /* 27.2px */
  --font-size-3xl: 2rem;     /* 32px */
}

body.font-size-small { /* This was the old medium */
  --font-size-xs: 0.75rem;
  --font-size-sm: 0.875rem;
  --font-size-base: 1rem;
  --font-size-lg: 1.125rem;
  --font-size-xl: 1.25rem;
  --font-size-2xl: 1.5rem;
  --font-size-3xl: 1.875rem;
}

body.font-size-large { /* This is the new, larger size */
  --font-size-xs: 1rem;      /* 16px */
  --font-size-sm: 1.125rem;  /* 18px */
  --font-size-base: 1.25rem; /* 20px */
  --font-size-lg: 1.5rem;    /* 24px */
  --font-size-xl: 1.75rem;   /* 28px */
  --font-size-2xl: 2rem;     /* 32px */
  --font-size-3xl: 2.5rem;   /* 40px */
}

/* Base variables (defaults to dark theme) */
:root, body.theme-dark {
  --bg-main: #111827; /* gray-900 */
  --bg-panel: #1f2937; /* gray-800 */
  --bg-panel-light: #374151; /* gray-700 */
  --bg-input: #111827; /* gray-900 */
  --bg-hover: #374151; /* gray-700 */
  --bg-active: #22d3ee; /* cyan-400 */
  --bg-backdrop: rgba(17, 24, 39, 0.7); /* gray-900/70 */

  --text-primary: #f9fafb; /* gray-50 */
  --text-secondary: #9ca3af; /* gray-400 */
  --text-tertiary: #6b7280; /* gray-500 */
  --text-accent: #67e8f9; /* cyan-300 */
  --text-accent-dark: #0e7490; /* cyan-700 */
  --text-accent-bright: #22d3ee; /* cyan-400 */
  --text-on-accent: #111827; /* gray-900 */
  --text-danger: #f87171; /* red-400 */
  --text-success: #4ade80; /* green-400 */
  --text-warning: #facc15; /* yellow-400 */
  --text-teal: #5eead4; /* teal-300 */

  --border-primary: #374151; /* gray-700 */
  --border-secondary: #4b5563; /* gray-600 */
  --border-accent: #22d3ee; /* cyan-400 */
  
  --shadow-color: rgba(0, 0, 0, 0.5);
  --grid-bg-color: rgba(45, 212, 191, 0.05);
}

body.theme-light {
  --bg-main: #f9fafb; /* gray-50 */
  --bg-panel: #ffffff;
  --bg-panel-light: #f3f4f6; /* gray-100 */
  --bg-input: #ffffff;
  --bg-hover: #e5e7eb; /* gray-200 */
  --bg-active: #4f46e5; /* indigo-600 */
  --bg-backdrop: rgba(249, 250, 251, 0.7); /* gray-50/70 */
  
  --text-primary: #111827; /* gray-900 */
  --text-secondary: #4b5563; /* gray-600 */
  --text-tertiary: #6b7280; /* gray-500 */
  --text-accent: #4338ca; /* indigo-700 */
  --text-accent-dark: #3730a3; /* indigo-800 */
  --text-accent-bright: #4f46e5; /* indigo-600 */
  --text-on-accent: #ffffff;
  --text-danger: #dc2626; /* red-600 */
  --text-success: #16a34a; /* green-600 */
  --text-warning: #f59e0b; /* amber-500 */
  --text-teal: #0d9488; /* teal-600 */

  --border-primary: #d1d5db; /* gray-300 */
  --border-secondary: #e5e7eb; /* gray-200 */
  --border-accent: #4f46e5; /* indigo-600 */

  --shadow-color: rgba(0, 0, 0, 0.1);
  --grid-bg-color: rgba(79, 70, 229, 0.05);
}

body.theme-high-contrast {
  --bg-main: #000000;
  --bg-panel: #0a0a0a;
  --bg-panel-light: #1a1a1a;
  --bg-input: #000000;
  --bg-hover: #2a2a2a;
  --bg-active: #ffff00; /* yellow-300 */
  --bg-backdrop: rgba(0, 0, 0, 0.8);
  
  --text-primary: #ffffff;
  --text-secondary: #e0e0e0;
  --text-tertiary: #c0c0c0;
  --text-accent: #ffff00; /* yellow-300 */
  --text-accent-dark: #eab308; /* yellow-500 */
  --text-accent-bright: #fde047; /* yellow-200 */
  --text-on-accent: #000000;
  --text-danger: #ff4d4d;
  --text-success: #52ff52;
  --text-warning: #ffa500;
  --text-teal: #00ffff;

  --border-primary: #666666;
  --border-secondary: #ffffff;
  --border-accent: #ffff00;

  --shadow-color: rgba(255, 255, 255, 0.3);
  --grid-bg-color: rgba(255, 255, 255, 0.1);
}

body {
  background-color: var(--bg-main);
  color: var(--text-primary);
  font-family: 'Inter', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Clear default browser outlines and use a more visible, consistent ring */
input, textarea, select, button {
  outline: none;
}

input:focus-visible, 
textarea:focus-visible, 
select:focus-visible,
button:focus-visible {
  outline-style: solid;
  outline-width: 0.125rem;
  outline-color: var(--border-accent);
  outline-offset: 0.125rem;
}

.focus-ring {
  @apply focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--bg-input)] focus:ring-[var(--border-accent)];
}

`;

export const GlobalStyles = () => {
    return <style>{styles}</style>;
};