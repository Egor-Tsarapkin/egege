export function reconcileTypingInput(current: string, incoming: string, target: string) {
  if (incoming.length <= current.length) {
    return { value: incoming.slice(0, target.length), keystrokes: 0, mistakes: 0 };
  }

  const added = incoming.slice(current.length);
  let value = current;
  let mistakes = 0;

  for (const character of added) {
    if (value.length >= target.length) break;
    if (character !== target[value.length]) mistakes += 1;
    value += character;
  }

  return { value, keystrokes: added.length, mistakes };
}
