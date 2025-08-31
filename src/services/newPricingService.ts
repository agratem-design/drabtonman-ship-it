import { cloudDatabase } from '@/services/cloudDatabase'
import { dynamicPricingService } from '@/services/dynamicPricingService'
import { municipalityService } from '@/services/municipalityService'
import { pricingZoneAutoManager } from '@/services/pricingZoneAutoManager'
import { sizesDatabase } from '@/services/sizesDatabase'
import type {
  PriceList,
  PricingZone,
  BillboardSize,
  CustomerType,
  PriceListType,
  PackageDuration,
  Quote,
  Billboard
} from '@/types'
import { formatGregorianDate } from '@/lib/dateUtils'

const DEFAULT_SIZES: BillboardSize[] = ['5x13', '4x12', '4x10', '3x8', '3x6', '3x4']

const DEFAULT_PACKAGES: PackageDuration[] = [
  { value: 1, unit: 'month', label: 'شهر واحد', discount: 0 },
  { value: 3, unit: 'months', label: '3 أشهر', discount: 5 },
  { value: 6, unit: 'months', label: '6 أشهر', discount: 10 },
  { value: 12, unit: 'year', label: 'سنة كاملة', discount: 20 }
]

const CUSTOMER_TYPES: CustomerType[] = ['marketers', 'individuals', 'companies']
const PRICE_LIST_TYPES: PriceListType[] = ['A', 'B']

function ensurePackages(packages?: PackageDuration[]): PackageDuration[] {
  if (packages && packages.length) return packages
  return DEFAULT_PACKAGES
}

function applyDurationDiscount(base: number, duration: number): number {
  if (duration === 1) return base
  if (duration === 3) return Math.round(base * 0.95)
  if (duration === 6) return Math.round(base * 0.9)
  if (duration === 12) return Math.round(base * 0.8)
  return base
}

function computeBFromA(aPrice: number): number {
  return Math.round(aPrice * 1.2)
}

class NewPricingService {
  private readonly STORAGE_KEY = 'al-fares-new-pricing'
  private readonly SIZES_STORAGE_KEY = 'al-fares-pricing-sizes'

  constructor() {
    void this.initialize()
  }

  private async initialize() {
    try {
      const remote = await cloudDatabase.getRentalPricing()
      if (remote) {
        const normalized: PriceList = {
          zones: remote.zones || {},
          packages: ensurePackages(remote.packages),
          currency: remote.currency || 'د.ل'
        }
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(normalized))
      } else if (!localStorage.getItem(this.STORAGE_KEY)) {
        // Fallback: generate dynamic list from municipalities
        const generated = dynamicPricingService.generateDynamicPriceList()
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(generated))
      }
    } catch {
      if (!localStorage.getItem(this.STORAGE_KEY)) {
        const generated = dynamicPricingService.generateDynamicPriceList()
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(generated))
      }
    }

    // Initialize sizes from Supabase distinct sizes if available
    try {
      let sizesFromDb: string[] = []
      try { sizesFromDb = await sizesDatabase.getSizes() } catch {}
      if (!sizesFromDb || sizesFromDb.length === 0) {
        try { sizesFromDb = await sizesDatabase.getDistinctSizesFromPricing() } catch {}
      }
      if (sizesFromDb && sizesFromDb.length) {
        const normalized = Array.from(new Set(sizesFromDb.map(s => (s || '').toString().trim()).filter(Boolean)))
        localStorage.setItem(this.SIZES_STORAGE_KEY, JSON.stringify(normalized))
      } else if (!localStorage.getItem(this.SIZES_STORAGE_KEY)) {
        localStorage.setItem(this.SIZES_STORAGE_KEY, JSON.stringify(DEFAULT_SIZES))
      }
    } catch {
      if (!localStorage.getItem(this.SIZES_STORAGE_KEY)) {
        localStorage.setItem(this.SIZES_STORAGE_KEY, JSON.stringify(DEFAULT_SIZES))
      }
    }
  }

  getPricing(): PriceList {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY)
      if (data) {
        const parsed = JSON.parse(data) as PriceList
        return { ...parsed, packages: ensurePackages(parsed.packages), currency: parsed.currency || 'د.ل' }
      }
    } catch {}
    const generated = dynamicPricingService.generateDynamicPriceList()
    return generated
  }

  updatePricing(pricing: PriceList): { success: boolean; error?: string } {
    try {
      const updated: PriceList = { ...pricing, packages: ensurePackages(pricing.packages), currency: pricing.currency || 'د.ل' }
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updated))
      
      // محاولة الحفظ في السحابة بشكل غير متزامن
      cloudDatabase.saveRentalPricing(updated)
        .then(success => {
          if (success) {
            console.log('✅ تم رفع الأسعار للسحابة بنجاح')
          } else {
            console.warn('⚠️ فشل في رفع الأسعار للسحابة، البيانات محفوظة محلياً')
          }
        })
        .catch(error => {
          console.warn('⚠️ خطأ في رفع الأسعار للسحابة:', error)
        })
      
      return { success: true }
    } catch (e: any) {
      return { success: false, error: e?.message || 'unknown error' }
    }
  }

  async savePricingToCloud(pricing?: PriceList): Promise<boolean> {
    try {
      const data = pricing || this.getPricing()
      return await cloudDatabase.saveRentalPricing(data)
    } catch {
      return false
    }
  }

  // دالة للتحقق من حالة الاتصال بقاعدة البيانات
  async checkCloudConnection(): Promise<{ connected: boolean; source: 'supabase' | 'netlify' | 'local' }> {
    try {
      const connectionStatus = await cloudDatabase.checkConnection()
      
      if (connectionStatus.supabase) {
        return { connected: true, source: 'supabase' }
      } else if (connectionStatus.netlify) {
        return { connected: true, source: 'netlify' }
      } else {
        return { connected: false, source: 'local' }
      }
    } catch {
      return { connected: false, source: 'local' }
    }
  }

  // دالة لمزامنة البيانات مع السحابة
  async forceSyncToCloud(): Promise<{ success: boolean; message: string }> {
    try {
      const pricing = this.getPricing()
      const success = await cloudDatabase.saveRentalPricing(pricing)
      
      if (success) {
        return { success: true, message: 'تم رفع البيانات للسحابة بنجاح' }
      } else {
        return { success: false, message: 'فشل في رفع البيانات للسحابة' }
      }
    } catch (error: any) {
      return { success: false, message: `خطأ في المزامنة: ${error.message}` }
    }
  }

  // دالة لتحديث البيانات من السحابة
  async syncFromCloud(): Promise<{ success: boolean; message: string }> {
    try {
      const cloudPricing = await cloudDatabase.getRentalPricing()
      
      if (cloudPricing) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(cloudPricing))
        return { success: true, message: 'تم تحديث البيانات من السحابة بنجاح' }
      } else {
        return { success: false, message: 'لا توجد بيانات في السحابة' }
      }
    } catch (error: any) {
      return { success: false, message: `خطأ في التحديث: ${error.message}` }
    }
  }

  getPackages(): PackageDuration[] {
    return ensurePackages(this.getPricing().packages)
  }

  getCustomerTypes(): CustomerType[] { return CUSTOMER_TYPES }
  getPriceListTypes(): PriceListType[] { return PRICE_LIST_TYPES }

  get sizes(): BillboardSize[] {
    try {
      const stored = localStorage.getItem(this.SIZES_STORAGE_KEY)
      if (stored) return JSON.parse(stored)
    } catch {}

    // Fallback: infer from pricing
    const pricing = this.getPricing()
    const set = new Set<BillboardSize>()
    const anyZone = Object.values(pricing.zones)[0]
    if (anyZone?.abPrices?.A?.['1']) {
      Object.keys(anyZone.abPrices.A['1']).forEach(s => set.add(s as BillboardSize))
    } else {
      // infer from customer type pricing
      const firstCT = anyZone ? anyZone.prices.individuals : {}
      Object.keys(firstCT || {}).forEach(s => set.add(s as BillboardSize))
    }
    return Array.from(set.size ? set : new Set(DEFAULT_SIZES))
  }

  setSizes(sizes: BillboardSize[]): void {
    localStorage.setItem(this.SIZES_STORAGE_KEY, JSON.stringify(sizes))
    void sizesDatabase.saveSizes(sizes as string[]).catch(() => {})
  }

  validateSize(size: string): boolean { return /^\d+x\d+$/.test(size) }

  addSizeToAllZones(size: BillboardSize, basePriceA1: number): boolean {
    const pricing = this.getPricing()
    if (this.sizes.includes(size)) return false

    const durations = ['1','3','6','12'].map(n => Number(n))

    Object.values(pricing.zones).forEach(zone => {
      // A durations
      zone.abPrices.A['1'][size] = applyDurationDiscount(basePriceA1, 1)
      zone.abPrices.A['3'][size] = applyDurationDiscount(basePriceA1, 3)
      zone.abPrices.A['6'][size] = applyDurationDiscount(basePriceA1, 6)
      zone.abPrices.A['12'][size] = applyDurationDiscount(basePriceA1, 12)

      // B derived from A base
      const b1 = computeBFromA(basePriceA1)
      zone.abPrices.B['1'][size] = applyDurationDiscount(b1, 1)
      zone.abPrices.B['3'][size] = applyDurationDiscount(b1, 3)
      zone.abPrices.B['6'][size] = applyDurationDiscount(b1, 6)
      zone.abPrices.B['12'][size] = applyDurationDiscount(b1, 12)

      // legacy customer-type pricing approximation
      zone.prices.individuals[size] = basePriceA1
      zone.prices.marketers[size] = Math.round(basePriceA1 * 0.9)
      zone.prices.companies[size] = Math.round(basePriceA1 * 1.15)
    })

    // persist sizes list
    const sizes = [...this.sizes, size]
    this.setSizes(sizes)

    return this.updatePricing(pricing).success
  }

  removeSizeFromAllZones(size: BillboardSize): boolean {
    const pricing = this.getPricing()

    Object.values(pricing.zones).forEach(zone => {
      delete (zone.abPrices.A['1'] as any)[size]
      delete (zone.abPrices.A['3'] as any)[size]
      delete (zone.abPrices.A['6'] as any)[size]
      delete (zone.abPrices.A['12'] as any)[size]
      delete (zone.abPrices.B['1'] as any)[size]
      delete (zone.abPrices.B['3'] as any)[size]
      delete (zone.abPrices.B['6'] as any)[size]
      delete (zone.abPrices.B['12'] as any)[size]
      delete (zone.prices.individuals as any)[size]
      delete (zone.prices.marketers as any)[size]
      delete (zone.prices.companies as any)[size]
    })

    // update size list
    this.setSizes(this.sizes.filter(s => s !== size))

    return this.updatePricing(pricing).success
  }

  determinePricingZone(municipality: string): string {
    const m = municipalityService.getMunicipalityByName(municipality)
    return m?.name || municipality || 'مصراتة'
  }

  determinePriceListFromBillboard(b: Billboard): PriceListType {
    if (b.priceCategory === 'A' || b.priceCategory === 'B') return b.priceCategory
    // fallback using level
    const level = (b.level || '').toUpperCase()
    if (level.includes('A')) return 'A'
    if (level.includes('B')) return 'B'
    return 'A'
  }

  addPricingZoneForMunicipality(municipalityName: string): void {
    const pricing = this.getPricing()
    if (pricing.zones[municipalityName]) return
    const newZone = dynamicPricingService.getPricingZoneByMunicipality(municipalityName) || pricingZoneAutoManager.createDefaultPricingZone(municipalityName)
    pricing.zones[municipalityName] = newZone
    this.updatePricing(pricing)
  }

  getPricingZones(): string[] { return Object.keys(this.getPricing().zones) }

  getBillboardPriceABWithDuration(size: BillboardSize, zoneName: string, priceList: PriceListType, duration: number, municipalityName?: string): number {
    const pricing = this.getPricing()
    let zone = pricing.zones[zoneName]

    if (!zone) {
      const mName = municipalityName || zoneName
      const created = dynamicPricingService.getPricingZoneByMunicipality(mName) || pricingZoneAutoManager.createDefaultPricingZone(mName)
      zone = created
      pricing.zones[zoneName] = created
      this.updatePricing(pricing)
    }

    const dKey = String(duration) as keyof typeof zone.abPrices['A']
    const value = zone.abPrices?.[priceList]?.[dKey]?.[size]
    if (typeof value === 'number') return value

    // fallback: try duration 1
    const v1 = zone.abPrices?.[priceList]?.['1']?.[size as any]
    if (typeof v1 === 'number') return applyDurationDiscount(v1, duration)

    // final fallback: compute from customer type individuals
    const base = zone.prices?.individuals?.[size] || 0
    if (!base) return 0
    const baseA = priceList === 'A' ? base : computeBFromA(base)
    return applyDurationDiscount(baseA, duration)
  }

  async checkNeedForSync(): Promise<{ needsSync: boolean; missingZones: string[]; existingZones: string[] }> {
    const analysis = await pricingZoneAutoManager.analyzePricingZones()
    return { needsSync: analysis.missingZones.length > 0, missingZones: analysis.missingZones, existingZones: analysis.existingZones }
  }

  async syncWithExcelData(): Promise<{ success: boolean; summary: { newZonesCreated: number; missingZones: string[] } }> {
    const result = await pricingZoneAutoManager.syncPricingZonesWithExcel()
    return { success: result.success, summary: { newZonesCreated: result.newZonesCreated.length, missingZones: result.missingZones } }
  }

  generateQuote(customerInfo: Quote['customerInfo'], billboards: Billboard[], pkg: PackageDuration): Quote {
    const pricing = this.getPricing()
    const items = billboards.map(b => {
      const zone = this.determinePricingZone(b.municipality)
      const list = this.determinePriceListFromBillboard(b)
      const monthly = this.getBillboardPriceABWithDuration(b.size as BillboardSize, zone, list, pkg.value, b.municipality)
      return {
        billboardId: b.id,
        name: b.name,
        location: b.location,
        size: b.size as BillboardSize,
        zone,
        basePrice: pkg.discount > 0 ? Math.round(monthly / (1 - pkg.discount / 100)) : monthly,
        finalPrice: monthly,
        duration: pkg.value,
        discount: pkg.discount,
        total: monthly * pkg.value,
        imageUrl: b.imageUrl
      }
    })

    const subtotal = items.reduce((a, i) => a + i.basePrice * pkg.value, 0)
    const totalDiscount = items.reduce((a, i) => a + (i.basePrice - i.finalPrice) * pkg.value, 0)
    const taxRate = 0
    const tax = Math.round(subtotal * taxRate)
    const total = subtotal - totalDiscount + tax

    const now = new Date()
    const valid = new Date(now)
    valid.setDate(valid.getDate() + 30)

    return {
      id: `Q-${Date.now()}`,
      customerInfo,
      packageInfo: pkg,
      items,
      subtotal,
      totalDiscount,
      tax,
      taxRate,
      total,
      currency: pricing.currency,
      createdAt: now.toISOString(),
      validUntil: valid.toISOString()
    }
  }

  printQuote(quote: Quote): void {
    const html = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>فاتورة عرض - ${quote.id}</title>
<link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap" rel="stylesheet">
<style>
  body { font-family: 'Tajawal', Arial, sans-serif; color: #000; }
  .header { display:flex; justify-content:space-between; align-items:center; border-bottom:3px solid #D4AF37; padding:12px 0; margin-bottom:16px; }
  .logo { width:70px; height:70px; object-fit:contain; }
  table { width:100%; border-collapse:collapse; }
  th, td { border:1px solid #DDD; padding:8px; text-align:center; }
  th { background:#f6f6f6; }
  .totals { width:320px; margin-left:auto; margin-top:12px; }
  .totals td { border:1px solid #DDD; padding:8px; }
  .total { background:#D4AF37; font-weight:700; }
</style>
</head>
<body>
  <div class="header">
    <div style="display:flex; align-items:center; gap:12px;">
      <img class="logo" src="${window.location.origin}/logo-symbol.svg" alt="logo" />
      <div>
        <div style="font-weight:800; font-size:20px;">الفارس الذهبي</div>
        <div style="opacity:.7">عرض أسعار</div>
      </div>
    </div>
    <div style="text-align:left">
      <div style="font-weight:700">${quote.id}</div>
      <div>${formatGregorianDate(quote.createdAt)}</div>
    </div>
  </div>

  <div style="margin:10px 0;">
    <div><strong>العمي��:</strong> ${quote.customerInfo.name}</div>
    <div><strong>البريد:</strong> ${quote.customerInfo.email}</div>
    <div><strong>الهاتف:</strong> ${quote.customerInfo.phone}</div>
    <div><strong>الشركة:</strong> ${quote.customerInfo.company || 'غير محدد'}</div>
  </div>

  <table>
    <thead>
      <tr>
        <th>اللوحة</th><th>الموقع</th><th>المقاس</th><th>المنطقة</th><th>المدة</th><th>سعر شهري</th><th>الإجمالي</th>
      </tr>
    </thead>
    <tbody>
      ${quote.items.map(i => `
        <tr>
          <td>${i.name}</td>
          <td>${i.location}</td>
          <td>${i.size}</td>
          <td>${i.zone}</td>
          <td>${i.duration} شهر</td>
          <td>${i.finalPrice.toLocaleString()} ${quote.currency}</td>
          <td>${(i.finalPrice * i.duration).toLocaleString()} ${quote.currency}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <table class="totals">
    <tr><td>المجموع الفرعي</td><td>${quote.subtotal.toLocaleString()} ${quote.currency}</td></tr>
    <tr><td>إجمالي الخصم</td><td>${quote.totalDiscount.toLocaleString()} ${quote.currency}</td></tr>
    <tr class="total"><td>الإجمالي النهائي</td><td>${quote.total.toLocaleString()} ${quote.currency}</td></tr>
  </table>

  <script>
    window.onload = function(){ setTimeout(function(){ window.print(); setTimeout(function(){ window.close(); }, 800); }, 400); };
  </script>
</body>
</html>`

    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(html)
    w.document.close()
  }
}

export const newPricingService = new NewPricingService()
