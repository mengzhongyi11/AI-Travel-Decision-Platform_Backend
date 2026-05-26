/**
 * 泛型 TTL 内存缓存
 * - `Map` 实现，插入有序
 * - 惰性淘汰（get 时检查过期）
 * - 达到 maxSize 时删除最旧条目
 */
export default class TTLCache {
  #map = new Map()
  #defaultTTL
  #maxSize

  constructor(defaultTTL = 60_000, maxSize = 500) {
    this.#defaultTTL = defaultTTL
    this.#maxSize = maxSize
  }

  get(key) {
    const entry = this.#map.get(key)
    if (!entry) return undefined
    if (Date.now() > entry.expiresAt) {
      this.#map.delete(key)
      return undefined
    }
    return entry.value
  }

  set(key, value, ttlMs) {
    // 达到上限时淘汰最旧的 30%
    if (this.#map.size >= this.#maxSize) {
      const deleteCount = Math.ceil(this.#maxSize * 0.3)
      const keys = [...this.#map.keys()]
      for (let i = 0; i < deleteCount; i++) {
        this.#map.delete(keys[i])
      }
    }
    this.#map.set(key, {
      value,
      expiresAt: Date.now() + (ttlMs ?? this.#defaultTTL),
    })
  }

  delete(key) {
    this.#map.delete(key)
  }

  has(key) {
    return this.#map.has(key) && Date.now() <= this.#map.get(key).expiresAt
  }

  clear() {
    this.#map.clear()
  }

  get size() {
    return this.#map.size
  }
}
