const storageKey = (userId: number) => `zhaogang:favorites:${userId}`

const read = (userId: number): Set<string> => {
  try {
    const raw = window.localStorage.getItem(storageKey(userId))
    const values = raw ? JSON.parse(raw) : []
    return new Set(Array.isArray(values) ? values.filter((item): item is string => typeof item === 'string') : [])
  } catch {
    return new Set()
  }
}

const write = (userId: number, values: Set<string>) => {
  window.localStorage.setItem(storageKey(userId), JSON.stringify([...values]))
}

export const planFavoriteKey = (projectId: number, planId: number): string => `${projectId}:${planId}`

export const loadZhaogangFavorites = (userId: number): Set<string> => read(userId)

export const clearZhaogangFavorites = (userId: number): Set<string> => {
  const favorites = new Set<string>()
  write(userId, favorites)
  return favorites
}

export const toggleZhaogangFavorite = (userId: number, key: string): Set<string> => {
  const favorites = read(userId)
  if (favorites.has(key)) {
    favorites.delete(key)
  } else {
    favorites.add(key)
  }
  write(userId, favorites)
  return favorites
}
