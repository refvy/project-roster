/** Sign-in cap, per email or per IP. A pause, not a mistake. */
export const MAGIC_LINK_LIMIT_MESSAGE =
  "We've sent a few links already. Check your inbox (and spam), or try again in 15 minutes.";

/** "Add someone else" cap. A pause, not a mistake. */
export const GUEST_ADD_LIMIT_MESSAGE =
  "That's the limit for adding people right now. Try again in an hour.";

/**
 * Same size and place as a form error. Grey #6B7280, not danger red.
 * `--ink-soft` is #5e584f, so it is not this colour.
 */
export const RATE_LIMIT_NOTE_CLASS = "text-sm font-medium text-[#6B7280]";
