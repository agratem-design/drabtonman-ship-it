import { PriceList, InstallationPricing, PricingZone } from '@/types'

interface DatabaseJson {
  meta?: { currency?: string; updated_at?: string; version?: number }
  rental_pricing?: PriceList | any
  installation_pricing?: InstallationPricing | any
}

const DB_URL = '/database.json'
const DB_CACHE_KEYS = {
  rental: 'db:rental_pricing',
  install: 'db:installation_pricing',
  full: 'db:database_full'
}

const normalizePriceList = (data: any): PriceList | null => {
  if (!data || !data.zones) return null
  const zones: Record<string, PricingZone> = {}
  Object.keys(data.zones).forEach((zoneName) => {
    const z = data.zones[zoneName] || {}
    zones[zoneName] = {
      name: z.name || zoneName,
      prices: z.prices || { marketers: {}, individuals: {}, companies: {} },
      abPrices: z.abPrices || { A: { '1': {}, '3': {}, '6': {}, '12': {} }, B: { '1': {}, '3': {}, '6': {}, '12': {} } }
    }
  })
  return {
    zones,
    packages: data.packages || [],
    currency: data.currency || 'د.ل'
  }
}

const normalizeInstallation = (data: any): InstallationPricing | null => {
  if (!data || !data.zones) return null
  return {
    zones: data.zones,
    sizes: data.sizes || [],
    currency: data.currency || 'د.ل',
    lastUpdated: data.lastUpdated || new Date().toISOString()
  }
}

const preload = async (): Promise<void> => {
  try {
    const res = await fetch(DB_URL, { cache: 'no-store' })
    if (!res.ok) return
    const db: DatabaseJson = await res.json()

    if (db.rental_pricing) {
      const rental = normalizePriceList(db.rental_pricing)
      if (rental) localStorage.setItem(DB_CACHE_KEYS.rental, JSON.stringify(rental))
    }
    if (db.installation_pricing) {
      const inst = normalizeInstallation(db.installation_pricing)
      if (inst) localStorage.setItem(DB_CACHE_KEYS.install, JSON.stringify(inst))
    }
    localStorage.setItem(DB_CACHE_KEYS.full, JSON.stringify(db))
  } catch (e) {
    // Silent fail, fallback to defaults
  }
}

// Trigger background preload at module import
void preload()

export const jsonDatabase = {
  ensurePreloaded: preload,
  getRentalPricing(): PriceList | null {
    try {
      const cached = localStorage.getItem(DB_CACHE_KEYS.rental)
      return cached ? (JSON.parse(cached) as PriceList) : null
    } catch {
      return null
    }
  },
  saveRentalPricing(pricing: PriceList): void {
    try {
      localStorage.setItem(DB_CACHE_KEYS.rental, JSON.stringify(pricing))
      // Update full db cache for export convenience
      const full = (localStorage.getItem(DB_CACHE_KEYS.full) && JSON.parse(localStorage.getItem(DB_CACHE_KEYS.full) as string)) || {}
      full.rental_pricing = pricing
      localStorage.setItem(DB_CACHE_KEYS.full, JSON.stringify(full))
    } catch {
      // ignore
    }
  },
  getInstallationPricing(): InstallationPricing | null {
    try {
      const cached = localStorage.getItem(DB_CACHE_KEYS.install)
      return cached ? (JSON.parse(cached) as InstallationPricing) : null
    } catch {
      return null
    }
  },
  saveInstallationPricing(pricing: InstallationPricing): void {
    try {
      localStorage.setItem(DB_CACHE_KEYS.install, JSON.stringify(pricing))
      const full = (localStorage.getItem(DB_CACHE_KEYS.full) && JSON.parse(localStorage.getItem(DB_CACHE_KEYS.full) as string)) || {}
      full.installation_pricing = pricing
      localStorage.setItem(DB_CACHE_KEYS.full, JSON.stringify(full))
    } catch {
      // ignore
    }
  },
  exportDatabase(filename = 'database.json'): void {
    try {
      const full = localStorage.getItem(DB_CACHE_KEYS.full)
      const rental = localStorage.getItem(DB_CACHE_KEYS.rental)
      const install = localStorage.getItem(DB_CACHE_KEYS.install)
      let data: DatabaseJson = full ? JSON.parse(full) : {}
      if (rental) (data as any).rental_pricing = JSON.parse(rental)
      if (install) (data as any).installation_pricing = JSON.parse(install)
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      // ignore
    }
  }
}
