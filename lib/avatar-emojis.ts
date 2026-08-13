export const AVATAR_EMOJIS = [
  "🙂", "😎", "🤓", "🥳", "🚀", "🔥", "⚡", "🧠", "🎯", "💻",
  "🐱", "🦊", "🐼", "🐸", "🐧", "🦁", "🤖", "👾", "🌟", "🦄",
] as const;

export type AvatarEmoji = (typeof AVATAR_EMOJIS)[number];

export function isAvatarEmoji(value: string): value is AvatarEmoji {
  return (AVATAR_EMOJIS as readonly string[]).includes(value);
}
