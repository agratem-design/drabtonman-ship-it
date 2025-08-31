import { createClient } from '@supabase/supabase-js'
import type { PriceList, InstallationPricing } from '@/types'

// تحسين الاتصال بقاعدة البيانات مع معالجة أفضل للأخطاء
const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY || ''
const hasSupabase = !!(supabaseUrl && supabaseAnonKey)

// Netlify KV كبديل
const NETLIFY_API_BASE = '/.netlify/functions/kv-pricing'

// إعدادات التخزين المحلي كبديل نهائي
const LOCAL_STORAGE_KEYS = {
  RENTAL_PRICING: 'al-fares-rental-pricing-backup',
  INSTALLATION_PRICING: 'al-fares-installation-pricing-backup'
}

async function kvGet<T>(key: string): Promise<T | null> {
  try {
    const res = await fetch(`${NETLIFY_API_BASE}?key=${encodeURIComponent(key)}`, { 
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    if (!res.ok) return null
    const data = await res.json().catch(() => ({}))
    return (data?.value ?? null) as T | null
  } catch {
    return null
  }
}

async function kvSet<T>(key: string, value: T): Promise<boolean> {
  try {
    const res = await fetch(`${NETLIFY_API_BASE}?key=${encodeURIComponent(key)}`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ value })
    })
    return res.ok
  } catch {
    return false
  }
}

// إنشاء عميل Supabase مع معالجة أفضل للأخطاء
const supabase = hasSupabase ? createClient(supabaseUrl, supabaseAnonKey) : null

// تحسين تعيين البيانات من Supabase
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

// دالة محسنة لتحويل صفوف قاعدة البيانات إلى قائمة أسعار
function rowsToPriceList(rows: PricingRow[]): PriceList {
  const zones: PriceList['zones'] = {}
  const packagesSet = new Set<number>()
  let currency = 'د.ل'

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

// دالة للحفظ المحلي كبديل
function saveToLocalStorage<T>(key: string, data: T): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(data))
    return true
  } catch (error) {
    console.error('خطأ في الحفظ المحلي:', error)
    return false
  }
}

function getFromLocalStorage<T>(key: string): T | null {
  try {
    const data = localStorage.getItem(key)
    return data ? JSON.parse(data) : null
  } catch (error) {
    console.error('خطأ في القراءة المحلية:', error)
    return null
  }
}

export const cloudDatabase = {
  // تحسين دالة الحصول على أسعار الإيجار
  async getRentalPricing(): Promise<PriceList | null> {
    try {
      // أولاً: محاولة Supabase
      if (supabase) {
        const { data, error } = await supabase.from('pricing').select('*')
        if (!error && data && data.length > 0) {
          const priceList = rowsToPriceList(data as unknown as PricingRow[])
          // حفظ نسخة احتياطية محلياً
          saveToLocalStorage(LOCAL_STORAGE_KEYS.RENTAL_PRICING, priceList)
          return priceList
        }
      }
      
      // ثانياً: محاولة Netlify KV
      const kvData = await kvGet<PriceList>('rental_pricing')
      if (kvData) {
        saveToLocalStorage(LOCAL_STORAGE_KEYS.RENTAL_PRICING, kvData)
        return kvData
      }
      
      // ثالثاً: البيانات المحلية المحفوظة
      return getFromLocalStorage<PriceList>(LOCAL_STORAGE_KEYS.RENTAL_PRICING)
      
    } catch (error) {
      console.error('خطأ في تحميل أسعار الإيجار:', error)
      // العودة للبيانات المحلية في حالة الخطأ
      return getFromLocalStorage<PriceList>(LOCAL_STORAGE_KEYS.RENTAL_PRICING)
    }
  },
  
  // تحسين دالة حفظ أسعار الإيجار
  async saveRentalPricing(pricing: PriceList): Promise<boolean> {
    let success = false
    
    try {
      // حفظ محلياً أولاً كضمان
      saveToLocalStorage(LOCAL_STORAGE_KEYS.RENTAL_PRICING, pricing)
      
      // محاولة Supabase
      if (supabase) {
        try {
          const rows: PricingRow[] = []
          
          Object.entries(pricing.zones).forEach(([zone_name, zone]) => {
            // أسعار فئات العملاء
            (['marketers','individuals','companies'] as const).forEach(ct => {
              Object.entries(zone.prices[ct] || {}).forEach(([billboard_size, price]) => {
                rows.push({ 
                  id: 0, 
                  zone_id: null, 
                  zone_name, 
                  billboard_size, 
                  customer_type: ct, 
                  price: Number(price), 
                  ab_type: null, 
                  package_duration: null, 
                  package_discount: null, 
                  currency: pricing.currency, 
                  created_at: new Date().toISOString() 
                })
              })
            })
            
            // أسعار قوائم A/B
            (['A','B'] as const).forEach(ab => {
              const abEntry: any = (zone.abPrices as any)?.[ab] || {}
              const keys = Object.keys(abEntry)
              const hasDurations = keys.some(k => ['1','3','6','12'].includes(k))
              
              if (hasDurations) {
                (['1','3','6','12'] as const).forEach(dk => {
                  const durationPrices = abEntry[dk] || {}
                  Object.entries(durationPrices).forEach(([billboard_size, price]) => {
                    rows.push({ 
                      id: 0, 
                      zone_id: null, 
                      zone_name, 
                      billboard_size, 
                      customer_type: null, 
                      price: Number(price), 
                      ab_type: ab, 
                      package_duration: Number(dk), 
                      package_discount: null, 
                      currency: pricing.currency, 
                      created_at: new Date().toISOString() 
                    })
                  })
                })
              }
            })
          })
          
          if (rows.length > 0) {
            // حذف البيانات القديمة وإدراج الجديدة
            await supabase.from('pricing').delete().neq('id', -1)
            const { error } = await supabase.from('pricing').insert(rows as any)
            
            if (!error) {
              success = true
              console.log('✅ تم حفظ أسعار الإيجار في Supabase بنجاح')
            } else {
              console.error('خطأ في حفظ أسعار الإيجار في Supabase:', error)
            }
          }
        } catch (supabaseError) {
          console.error('خطأ في Supabase:', supabaseError)
        }
      }
      
      // محاولة Netlify KV كبديل
      if (!success) {
        try {
          const kvSuccess = await kvSet<PriceList>('rental_pricing', pricing)
          if (kvSuccess) {
            success = true
            console.log('✅ تم حفظ أسعار الإيجار في Netlify KV بنجاح')
          }
        } catch (kvError) {
          console.error('خطأ في Netlify KV:', kvError)
        }
      }
      
      return success
      
    } catch (error) {
      console.error('خطأ عام في حفظ أسعار الإيجار:', error)
      return false
    }
  },
  
  // تحسين دالة الحصول على أسعار التركيب
  async getInstallationPricing(): Promise<InstallationPricing | null> {
    try {
      // أولاً: محاولة Supabase
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
          let currency = 'د.ل'
          
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
          const installationPricing: InstallationPricing = {
            zones,
            sizes,
            currency,
            lastUpdated: new Date().toISOString()
          }
          
          // حفظ نسخة احتياطية محلياً
          saveToLocalStorage(LOCAL_STORAGE_KEYS.INSTALLATION_PRICING, installationPricing)
          return installationPricing
        }
      }
      
      // ثانياً: محاولة Netlify KV
      const kvData = await kvGet<InstallationPricing>('installation_pricing')
      if (kvData) {
        saveToLocalStorage(LOCAL_STORAGE_KEYS.INSTALLATION_PRICING, kvData)
        return kvData
      }
      
      // ثالثاً: البيانات المحلية المحفوظة
      return getFromLocalStorage<InstallationPricing>(LOCAL_STORAGE_KEYS.INSTALLATION_PRICING)
      
    } catch (error) {
      console.error('خطأ في تحميل أسعار التركيب:', error)
      return getFromLocalStorage<InstallationPricing>(LOCAL_STORAGE_KEYS.INSTALLATION_PRICING)
    }
  },
  
  // تحسين دالة حفظ أسعار التركيب
  async saveInstallationPricing(pricing: InstallationPricing): Promise<boolean> {
    let success = false
    
    try {
      // حفظ محلياً أولاً كضمان
      saveToLocalStorage(LOCAL_STORAGE_KEYS.INSTALLATION_PRICING, pricing)
      
      // محاولة Supabase
      if (supabase) {
        try {
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
          
          const rows: Row[] = []
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
          
          if (rows.length > 0) {
            await supabase.from('installation_pricing').delete().neq('id', -1)
            const { error } = await supabase.from('installation_pricing').insert(rows as any)
            
            if (!error) {
              success = true
              console.log('✅ تم حفظ أسعار التركيب في Supabase بنجاح')
            } else {
              console.error('خطأ في حفظ أسعار التركيب في Supabase:', error)
            }
          }
        } catch (supabaseError) {
          console.error('خطأ في Supabase:', supabaseError)
        }
      }
      
      // محاولة Netlify KV كبديل
      if (!success) {
        try {
          const kvSuccess = await kvSet<InstallationPricing>('installation_pricing', pricing)
          if (kvSuccess) {
            success = true
            console.log('✅ تم حفظ أسعار التركيب في Netlify KV بنجاح')
          }
        } catch (kvError) {
          console.error('خطأ في Netlify KV:', kvError)
        }
      }
      
      return success
      
    } catch (error) {
      console.error('خطأ عام في حفظ أسعار التركيب:', error)
      return false
    }
  },
  
  // دالة للتحقق من حالة الاتصال
  async checkConnection(): Promise<{ supabase: boolean, netlify: boolean }> {
    const result = { supabase: false, netlify: false }
    
    // فحص Supabase
    if (supabase) {
      try {
        const { error } = await supabase.from('pricing').select('id').limit(1)
        result.supabase = !error
      } catch {
        result.supabase = false
      }
    }
    
    // فحص Netlify KV
    try {
      const response = await fetch(`${NETLIFY_API_BASE}?key=test`, { method: 'GET' })
      result.netlify = response.ok
    } catch {
      result.netlify = false
    }
    
    return result
  }
}
