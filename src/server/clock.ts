let current = () => new Date()

export function now() {
  return current()
}

export function setNow(next: () => Date) {
  current = next
}
