import { createClient } from '@supabase/supabase-js'
import type { PriceList, InstallationPricing } from '@/types'

// Prefer Supabase for cloud persistence; fallback to Netlify KV if not configured
const supabaseUrl = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SUPABASE_URL) || ''
const supabaseAnonKey = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SUPABASE_ANON_KEY) || ''
const hasSupabase = !!(supabaseUrl && supabaseAnonKey)

const API_BASE = '/.netlify/functions/kv-pricing'

async function kvGet<T>(key: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE}?key=${encodeURIComponent(key)}`, { method: 'GET' })
    if (!res.ok) return null
    const data = await res.json().catch(() => ({}))
    return (data?.value ?? null) as T | null
  } catch {
    return null
  }
}

async function kvSet<T>(key: string, value: T): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}?key=${encodeURIComponent(key)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value })
    })
    return res.ok
  } catch {
    return false
  }
}

// Supabase client (anon key is fine for RLS-enabled public data)
const supabase = hasSupabase ? createClient(supabaseUrl, supabaseAnonKey) : null

// Map Supabase rows to our PriceList type
type PricingRow = {
  id: number
  zone_id: number | null
  zone_name: string
  billboard_size: string
  customer_type: 'marketers' | 'individuals' | 'companies' | null
  price: number
  ab_type: 'A' | 'B' | null
  package_duration: number | null
  package_discount: number | null
  currency: string | null
  created_at: string | null
}

function rowsToPriceList(rows: PricingRow[]): PriceList {
  const zones: PriceList['zones'] = {}
  const packagesSet = new Set<number>()
  let currency: string = 'د.ل'

  for (const r of rows) {
    if (!zones[r.zone_name]) {
      zones[r.zone_name] = {
        name: r.zone_name,
        prices: { marketers: {}, individuals: {}, companies: {} },
        abPrices: { A: { '1': {}, '3': {}, '6': {}, '12': {} }, B: { '1': {}, '3': {}, '6': {}, '12': {} } }
      }
    }
    if (r.currency) currency = r.currency

    if (r.customer_type) {
      zones[r.zone_name].prices[r.customer_type][r.billboard_size] = Number(r.price) || 0
    }
    if (r.ab_type && r.package_duration) {
      const durKey = String(r.package_duration) as '1' | '3' | '6' | '12'
      if (!zones[r.zone_name].abPrices[r.ab_type][durKey]) zones[r.zone_name].abPrices[r.ab_type][durKey] = {}
      zones[r.zone_name].abPrices[r.ab_type][durKey][r.billboard_size] = Number(r.price) || 0
      packagesSet.add(r.package_duration)
    }
  }

  const packages = Array.from(packagesSet).sort((a, b) => a - b).map(value => ({
    value,
    unit: value === 12 ? 'year' : 'months',
    label: value === 1 ? 'شهر واحد' : value === 3 ? '3 أشهر' : value === 6 ? '6 أشهر' : 'سنة كاملة',
    discount: value === 1 ? 0 : value === 3 ? 5 : value === 6 ? 10 : 20
  }))

  return { zones, packages, currency }
}

export const cloudDatabase = {
  async getRentalPricing(): Promise<PriceList | null> {
    if (supabase) {
      const { data, error } = await supabase.from('pricing').select('*')
      if (error) return null
      if (!data || data.length === 0) return null
      return rowsToPriceList(data as unknown as PricingRow[])
    }
    return await kvGet<PriceList>('rental_pricing')
  },
  async saveRentalPricing(pricing: PriceList): Promise<boolean> {
    if (supabase) {
      // Upsert per-cell rows for A/B durations and customer types
      const rows: PricingRow[] = [] as any
      Object.entries(pricing.zones).forEach(([zone_name, zone]) => {
        // customer types
        (['marketers','individuals','companies'] as const).forEach(ct => {
          Object.entries(zone.prices[ct]).forEach(([billboard_size, price]) => {
            rows.push({ id: 0, zone_id: null, zone_name, billboard_size, customer_type: ct, price: Number(price), ab_type: null, package_duration: null, package_discount: null, currency: pricing.currency, created_at: new Date().toISOString() })
          })
        })
        // A/B with durations
        (['A','B'] as const).forEach(ab => {
          const abEntry: any = (zone.abPrices as any)[ab] || {}
          const keys = Object.keys(abEntry)
          const hasDurations = keys.some(k => ['1','3','6','12'].includes(k))
          if (hasDurations) {
            ;(['1','3','6','12'] as const).forEach(dk => {
              const durationPrices = abEntry[dk] || {}
              Object.entries(durationPrices).forEach(([billboard_size, price]) => {
                rows.push({ id: 0, zone_id: null, zone_name, billboard_size, customer_type: null, price: Number(price), ab_type: ab, package_duration: Number(dk), package_discount: null, currency: pricing.currency, created_at: new Date().toISOString() })
              })
            })
          } else {
            // Support flat map (size -> price) edited from interactive table; default duration = 1
            Object.entries(abEntry).forEach(([billboard_size, price]) => {
              rows.push({ id: 0, zone_id: null, zone_name, billboard_size, customer_type: null, price: Number(price), ab_type: ab, package_duration: 1, package_discount: null, currency: pricing.currency, created_at: new Date().toISOString() })
            })
          }
        })
      })
      // Strategy: simple replace -> delete all then insert
      await supabase.from('pricing').delete().neq('id', -1)
      const { error } = await supabase.from('pricing').insert(rows as any)
      return !error
    }
    return await kvSet<PriceList>('rental_pricing', pricing)
  },
  async getInstallationPricing(): Promise<InstallationPricing | null> {
    if (supabase) {
      type Row = {
        id: number
        zone_name: string
        billboard_size: string
        price: number
        multiplier: number | null
        currency: string | null
        description: string | null
        created_at: string | null
      }
      const { data, error } = await supabase.from('installation_pricing').select('*')
      if (!error && data && data.length > 0) {
        const zones: InstallationPricing['zones'] = {}
        let currency: string = 'د.ل'
        for (const r of data as unknown as Row[]) {
          if (!zones[r.zone_name]) {
            zones[r.zone_name] = {
              name: r.zone_name,
              prices: {},
              multiplier: r.multiplier ?? 1.0,
              description: r.description || undefined
            }
          }
          zones[r.zone_name].prices[r.billboard_size as any] = Number(r.price) || 0
          if (r.currency) currency = r.currency
        }
        const sizes = Array.from(new Set((data as Row[]).map(r => r.billboard_size))) as any
        return {
          zones,
          sizes,
          currency,
          lastUpdated: new Date().toISOString()
        }
      }
    }
    // Fallback to KV if Supabase not configured or table missing
    return await kvGet<InstallationPricing>('installation_pricing')
  },
  async saveInstallationPricing(pricing: InstallationPricing): Promise<boolean> {
    if (supabase) {
      type Row = {
        id: number
        zone_name: string
        billboard_size: string
        price: number
        multiplier: number | null
        currency: string | null
        description: string | null
        created_at: string | null
      }
      const rows: Row[] = [] as any
      Object.entries(pricing.zones).forEach(([zone_name, zone]) => {
        Object.entries(zone.prices).forEach(([billboard_size, price]) => {
          rows.push({
            id: 0,
            zone_name,
            billboard_size,
            price: Number(price),
            multiplier: zone.multiplier ?? 1.0,
            currency: pricing.currency,
            description: zone.description || null,
            created_at: new Date().toISOString()
          } as any)
        })
      })
      await supabase.from('installation_pricing').delete().neq('id', -1)
      const { error } = await supabase.from('installation_pricing').insert(rows as any)
      return !error
    }
    return await kvSet<InstallationPricing>('installation_pricing', pricing)
  }
}
