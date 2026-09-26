export function shuffleMarathonOptions(count: number, previous: number[] = [], random = Math.random) {
  const order = Array.from({ length: count }, (_, index) => index);
  for (let index = count - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    [order[index], order[other]] = [order[other], order[index]];
  }
  if (count > 1 && order.every((value, index) => value === previous[index])) {
    order.push(order.shift()!);
  }
  return order;
}
