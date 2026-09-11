import * as stylex from '@stylexjs/stylex';

/**
 * Dark theme for the chat UI. `defineVars` must live in a `.stylex.ts` file.
 *
 * Note: `body` background is set literally in styles.css — global element
 * selectors can't be expressed in StyleX, so that one value is duplicated
 * there and must be kept in sync with `bg` below.
 */
export const t = stylex.defineVars({
  bg: '#0b0b0d',
  bgElevated: '#16161a',
  bgInput: '#1c1c21',
  bgHover: '#23232a',
  border: '#2a2a32',
  text: '#f2f2f5',
  textMuted: '#9a9aa5',
  textFaint: '#6b6b76',
  accent: '#f5f5f7',
  accentFg: '#0b0b0d',
  danger: '#ff6b6b',
  dangerBg: '#2a1416',
  bubbleUser: '#2b2b33',
  radiusLg: '24px',
  radiusMd: '16px',
  radiusSm: '10px',
  headerH: '52px',
});
