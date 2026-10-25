/**
 * The design system: small, reusable UI building blocks. Each one is a styled
 * HTML element, so they're easy to read and change. Pages combine these
 * instead of repeating long lists of Tailwind classes.
 *
 *   Button.tsx    Button, ButtonLink, buttonClass
 *   Form.tsx      Input, Toggle
 *   Card.tsx      Card, CardHeader, StatCard, Badge (pastel tags)
 *   Feedback.tsx  Alert (callout), ErrorText, Spinner, Skeleton, EmptyState, ProgressBar
 *   Overlay.tsx   Modal, Lightbox, Menu, MenuLink, MenuButton
 *   Page.tsx      PageHeader, Properties, Avatar
 *
 * Colors, shadows and animations are design tokens in src/index.css.
 */
export * from './Button';
export * from './Form';
export * from './Card';
export * from './Feedback';
export * from './Overlay';
export * from './Page';
