/** Theme-aware status / badge surfaces (pair bg + text + border). */

export const statusSuccess =
  "bg-success-bg text-success-text border-success-border";
export const statusInfo = "bg-info-bg text-info-text border-info-border";
export const statusWarning =
  "bg-warning-bg text-warning-text border-warning-border";
export const statusDanger = "bg-danger-bg text-danger-text border-danger-border";

export const statusSuccessBadge = `rounded-full px-2 py-0.5 text-xs font-medium ${statusSuccess} border`;
export const statusInfoBadge = `rounded-full px-2 py-0.5 text-xs font-medium ${statusInfo} border`;
export const statusWarningBadge = `rounded-full px-2 py-0.5 text-xs font-medium ${statusWarning} border`;
export const statusDangerBadge = `rounded-full px-2 py-0.5 text-xs font-medium ${statusDanger} border`;

export const statusSuccessButton = `text-xs font-medium ${statusSuccess} border rounded-md px-3 py-1.5 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed`;

export const statusInfoButton = `text-xs font-semibold px-3 py-2 rounded-md border ${statusInfo} hover:opacity-90`;

export const planBadgeFree =
  "bg-surface-muted text-foreground-secondary dark:bg-surface-muted dark:text-muted";
export const planBadgeStarter =
  "bg-info-bg text-info-text dark:bg-info-bg dark:text-info-text";
export const planBadgePro =
  "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300";
