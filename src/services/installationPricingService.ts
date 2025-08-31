import { BillboardSize, InstallationPricing, InstallationPriceZone, InstallationQuote, InstallationQuoteItem } from '@/types'
import { formatGregorianDate } from '@/lib/dateUtils'
import { cloudDatabase } from './cloudDatabase'

// المقاسات المتاحة لأسعار التركيب
const DEFAULT_INSTALLATION_SIZES: BillboardSize[] = ['5x13', '4x12', '4x10', '3x8', '3x6', '3x4']

// أسعار التركيب الافتراضية حسب المقاس
const createDefaultInstallationPrices = (): Record<BillboardSize, number> => ({
  '5x13': 1500,
  '4x12': 1200,
  '4x10': 1000,
  '3x8': 800,
  '3x6': 600,
  '3x4': 500
})

// البيانات الافتراضية لأسعار التركيب
const DEFAULT_INSTALLATION_PRICING: InstallationPricing = {
  zones: {
    'مصراتة': {
      name: 'مصراتة',
      prices: createDefaultInstallationPrices(),
      multiplier: 1.0,
      description: 'أسعار التركيب لمنطقة مصراتة'
    },
    'أبو سليم': {
      name: 'أبو سليم',
      prices: createDefaultInstallationPrices(),
      multiplier: 1.1,
      description: 'أسعار التركيب لمنطقة أبو سليم'
    },
    'زليتن': {
      name: 'زليتن',
      prices: createDefaultInstallationPrices(),
      multiplier: 0.9,
      description: 'أسعار التركيب لمنطقة زليتن'
    },
    'بنغازي': {
      name: 'بنغازي',
      prices: createDefaultInstallationPrices(),
      multiplier: 1.2,
      description: 'أسعار التركيب لمنطقة بنغازي'
    }
  },
  sizes: DEFAULT_INSTALLATION_SIZES,
  currency: 'د.ل',
  lastUpdated: new Date().toISOString(),
  basePrices: createDefaultInstallationPrices()
}

class InstallationPricingService {
  private readonly STORAGE_KEY = 'al-fares-installation-pricing'

  constructor() {
    this.initializeDefaults()
  }

  // تهيئة البيانات الافتراضية إذا لم تكن موجودة
  private async initializeDefaults() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY)
      if (!raw) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(DEFAULT_INSTALLATION_PRICING))
      }
    } catch {
      // تجاهل أخطاء التخزين المحلية
    }

    // محاولة جلب البيانات من قاعدة السحابة وتخزينها محلياً
    try {
      const remote = await cloudDatabase.getInstallationPricing()
      if (remote) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify({
          zones: remote.zones || {},
          sizes: remote.sizes || DEFAULT_INSTALLATION_SIZES,
          currency: remote.currency || 'د.ل',
          lastUpdated: remote.lastUpdated || new Date().toISOString(),
          basePrices: remote.basePrices || createDefaultInstallationPrices()
        }))
      }
    } catch {
      // لا شيء
    }
  }

  // الحصول على أسعار التركيب
  getInstallationPricing(): InstallationPricing {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY)
      const parsed = data ? (JSON.parse(data) as InstallationPricing) : null
      if (parsed) {
        return {
          zones: parsed.zones || {},
          sizes: parsed.sizes || [],
          currency: parsed.currency || 'د.ل',
          lastUpdated: parsed.lastUpdated || new Date().toISOString(),
          basePrices: parsed.basePrices || {}
        }
      }
      return { zones: {}, sizes: [], currency: 'د.ل', lastUpdated: new Date().toISOString(), basePrices: {} }
    } catch {
      return { zones: {}, sizes: [], currency: 'د.ل', lastUpdated: new Date().toISOString(), basePrices: {} }
    }
  }

  // تحديث أسعار التركيب
  updateInstallationPricing(pricing: InstallationPricing): { success: boolean; message: string } {
    try {
      const updatedPricing = { ...pricing, lastUpdated: new Date().toISOString() }
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updatedPricing))
      void cloudDatabase.saveInstallationPricing(updatedPricing)
      return { success: true, message: 'تم حفظ أس��ار التركيب بنجاح' }
    } catch (error) {
      console.error('Error saving installation pricing:', error)
      return { success: false, message: 'حدث خطأ في حفظ البيانات' }
    }
  }

  // الحصول على سعر التركيب لمقاس ومنطقة محددة
  getInstallationPrice(size: BillboardSize, zone: string): number {
    const pricing = this.getInstallationPricing()
    const zoneData = pricing.zones[zone]
    const base = pricing.basePrices || {}
    const basePrice = (base[size] ?? zoneData?.prices?.[size] ?? 0)
    const multiplier = zoneData?.multiplier ?? 1.0
    return Math.round(basePrice * multiplier)
  }

  // تحديد المنطقة التسعيرية للتركيب من معلومات اللوحة
  determineInstallationZone(municipality: string, area?: string): string {
    const municipalityLower = municipality.toLowerCase()
    const areaLower = area?.toLowerCase() || ''
    if (municipalityLower.includes('مصراتة')) return 'مصراتة'
    if (municipalityLower.includes('أبو سليم') || areaLower.includes('أبو سليم')) return 'أبو سليم'
    if (municipalityLower.includes('زليتن')) return 'زليتن'
    if (municipalityLower.includes('بنغازي')) return 'بنغازي'
    return 'مصراتة'
  }

  // إضافة مقاس جديد لجميع المناطق
  addSizeToAllZones(size: BillboardSize, defaultPrice: number): { success: boolean; message: string } {
    try {
      const pricing = this.getInstallationPricing()
      if (pricing.sizes.includes(size)) {
        return { success: false, message: 'هذا المقاس موجود بالفعل' }
      }
      pricing.sizes.push(size)
      pricing.basePrices = { ...(pricing.basePrices || {}), [size]: defaultPrice }
      Object.keys(pricing.zones).forEach(zoneName => {
        pricing.zones[zoneName].prices[size] = defaultPrice
      })
      const result = this.updateInstallationPricing(pricing)
      if (result.success) {
        return { success: true, message: `تم إضافة مقاس "${size}" بنجاح` }
      }
      return result
    } catch (error) {
      console.error('Error adding size:', error)
      return { success: false, message: 'حدث خطأ في إضافة المقاس' }
    }
  }

  // حذف مقاس من جميع المناطق
  removeSizeFromAllZones(size: BillboardSize): { success: boolean; message: string } {
    try {
      const pricing = this.getInstallationPricing()
      if (pricing.sizes.length <= 1) {
        return { success: false, message: 'لا يمكن حذف آخر مقاس' }
      }
      pricing.sizes = pricing.sizes.filter(s => s !== size)
      if (pricing.basePrices) {
        const { [size]: _omit, ...rest } = pricing.basePrices
        pricing.basePrices = rest
      }
      Object.keys(pricing.zones).forEach(zoneName => {
        delete pricing.zones[zoneName].prices[size]
      })
      const result = this.updateInstallationPricing(pricing)
      if (result.success) {
        return { success: true, message: `تم حذف مقاس "${size}" بنجاح` }
      }
      return result
    } catch (error) {
      console.error('Error removing size:', error)
      return { success: false, message: 'حدث خطأ في حذف المقاس' }
    }
  }

  // إضافة منطقة جديدة
  addZone(zoneName: string, multiplier: number = 1.0, description?: string): { success: boolean; message: string } {
    try {
      const pricing = this.getInstallationPricing()
      if (pricing.zones[zoneName]) {
        return { success: false, message: 'هذه المنطقة موجودة بالفعل' }
      }
      const base = pricing.basePrices || {}
      const newZone: InstallationPriceZone = {
        name: zoneName,
        prices: { ...base },
        multiplier,
        description: description || `أسعار التركيب لمنطقة ${zoneName}`
      }
      pricing.zones[zoneName] = newZone
      const result = this.updateInstallationPricing(pricing)
      if (result.success) {
        return { success: true, message: `تم إضافة منطقة "${zoneName}" بنجاح` }
      }
      return result
    } catch (error) {
      console.error('Error adding zone:', error)
      return { success: false, message: 'حدث خطأ في إضافة المنطقة' }
    }
  }

  // حذف منطقة
  removeZone(zoneName: string): { success: boolean; message: string } {
    try {
      const pricing = this.getInstallationPricing()
      if (Object.keys(pricing.zones).length <= 1) {
        return { success: false, message: 'لا يمكن حذف آخر منطقة' }
      }
      if (!pricing.zones[zoneName]) {
        return { success: false, message: 'هذه المنطقة غير موجودة' }
      }
      delete pricing.zones[zoneName]
      const result = this.updateInstallationPricing(pricing)
      if (result.success) {
        return { success: true, message: `تم حذف منطقة "${zoneName}" بنجاح` }
      }
      return result
    } catch (error) {
      console.error('Error removing zone:', error)
      return { success: false, message: 'حدث خطأ في حذف المنطقة' }
    }
  }

  // إنشاء فاتورة عرض للت��كيب
  generateInstallationQuote(
    items: { size: BillboardSize; zone: string; quantity: number; description?: string }[],
    customerInfo: { name: string; email?: string; phone?: string; company?: string },
    discount: number = 0,
    notes?: string
  ): InstallationQuote {
    const pricing = this.getInstallationPricing()
    const quoteItems: InstallationQuoteItem[] = []
    let subtotal = 0

    items.forEach(item => {
      const unitPrice = this.getInstallationPrice(item.size, item.zone)
      const totalPrice = unitPrice * item.quantity
      quoteItems.push({
        id: `inst-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        size: item.size,
        zone: item.zone,
        quantity: item.quantity,
        unitPrice,
        totalPrice,
        description: item.description || `تركيب لوحة إعلانية ${item.size} - ${item.zone}`
      })
      subtotal += totalPrice
    })

    const discountAmount = Math.round(subtotal * (discount / 100))
    const total = subtotal - discountAmount

    return {
      id: `INST-${Date.now()}`,
      date: new Date().toISOString(),
      customerInfo,
      items: quoteItems,
      subtotal,
      discount,
      discountAmount,
      total,
      currency: pricing.currency,
      notes,
      type: 'installation',
      status: 'draft'
    }
  }

  // تصدير فاتورة العرض للطباعة
  printInstallationQuote(quote: InstallationQuote): void {
    const printContent = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>فاتورة عرض التركيب - ${quote.id}</title>
        <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap" rel="stylesheet">
        <style>
          @page { size: A4; margin: 15mm; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Tajawal', 'Cairo', Arial, sans-serif; direction: rtl; background: white; color: #000; line-height: 1.6; font-size: 14px; }
          .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding: 15px 0; border-bottom: 3px solid #D4AF37; }
          .logo-section { display: flex; align-items: center; gap: 15px; }
          .logo { width: 80px; height: 80px; object-fit: contain; }
          .company-info { text-align: right; }
          .company-name { font-size: 20px; font-weight: 700; color: #000; margin-bottom: 5px; }
          .company-subtitle { font-size: 14px; color: #666; }
          .quote-info { text-align: left; }
          .quote-title { font-size: 24px; font-weight: 700; color: #D4AF37; margin-bottom: 10px; }
          .quote-details { font-size: 12px; color: #666; }
          .customer-section { background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
          .customer-title { font-size: 18px; font-weight: 700; margin-bottom: 10px; color: #000; }
          .customer-details { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th, td { border: 1px solid #D4AF37; padding: 10px; text-align: center; }
          th { background: #D4AF37; color: #000; font-weight: 700; }
          tr:nth-child(even) { background: #f8f9fa; }
          .totals-section { text-align: left; margin-top: 20px; }
          .totals-table { border: none; width: 300px; margin-left: auto; }
          .totals-table td { border: 1px solid #ddd; padding: 8px 15px; font-weight: 600; }
          .total-row { background: #D4AF37; color: #000; font-weight: 700; font-size: 16px; }
          .notes-section { margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 2px solid #D4AF37; text-align: center; font-size: 12px; color: #666; }
          @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo-section">
            <img src="${window.location.origin}/logo-symbol.svg" alt="شعار الشركة" class="logo" />
            <div class="company-info">
              <div class="company-name">الفــــارس الذهبــــي</div>
              <div class="company-subtitle">للدعــــــاية والإعـــلان</div>
            </div>
          </div>
          <div class="quote-info">
            <div class="quote-title">فاتورة عرض التركيب</div>
            <div class="quote-details">
              <div>رقم العرض: ${quote.id}</div>
              <div>التاريخ: ${formatGregorianDate(quote.date)}</div>
            </div>
          </div>
        </div>

        <div class="customer-section">
          <div class="customer-title">معلومات العميل</div>
          <div class="customer-details">
            <div><strong>الاسم:</strong> ${quote.customerInfo.name}</div>
            <div><strong>الشركة:</strong> ${quote.customerInfo.company || 'غي�� محدد'}</div>
            <div><strong>البريد الإلكتروني:</strong> ${quote.customerInfo.email || 'غير محدد'}</div>
            <div><strong>رقم الهاتف:</strong> ${quote.customerInfo.phone || 'غير محدد'}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>الوصف</th>
              <th>المقاس</th>
              <th>المنطقة</th>
              <th>الكمية</th>
              <th>سعر الوحدة</th>
              <th>الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            ${quote.items.map(item => `
              <tr>
                <td>${item.description || ''}</td>
                <td>${item.size}</td>
                <td>${item.zone}</td>
                <td>${item.quantity}</td>
                <td>${item.unitPrice.toLocaleString()} ${quote.currency}</td>
                <td>${item.totalPrice.toLocaleString()} ${quote.currency}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="totals-section">
          <table class="totals-table">
            <tr>
              <td>المجموع الفرعي:</td>
              <td>${quote.subtotal.toLocaleString()} ${quote.currency}</td>
            </tr>
            ${quote.discount > 0 ? `
            <tr>
              <td>الخصم (${quote.discount}%):</td>
              <td>-${quote.discountAmount.toLocaleString()} ${quote.currency}</td>
            </tr>
            ` : ''}
            <tr class="total-row">
              <td>الإجمالي النهائي:</td>
              <td>${quote.total.toLocaleString()} ${quote.currency}</td>
            </tr>
          </table>
        </div>

        ${quote.notes ? `
        <div class="notes-section">
          <h4>ملاحظات:</h4>
          <p>${quote.notes}</p>
        </div>
        ` : ''}

        <div class="footer">
          <p>شركة الفارس الذهبي للدعاية والإعلان</p>
          <p>هذا عرض أسعار صالح لمدة 30 يوماً من تاريخ الإصدار</p>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
              setTimeout(function() { window.close(); }, 1000);
            }, 500);
          };
        </script>
      </body>
      </html>
    `

    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    printWindow.document.write(printContent)
    printWindow.document.close()
  }

  // التحقق من صحة المقاس
  validateSize(size: string): boolean {
    return /^\d+x\d+$/.test(size)
  }

  // الحصول على قائمة المناطق المتاحة
  getAvailableZones(): string[] {
    const pricing = this.getInstallationPricing()
    return Object.keys(pricing.zones)
  }

  // الحصول على قائمة المقاسات المتاحة
  getAvailableSizes(): BillboardSize[] {
    const pricing = this.getInstallationPricing()
    return pricing.sizes
  }

  // الحصول على إحصائيات الأسعار
  getPricingStatistics(): {
    totalZones: number
    totalSizes: number
    averagePrice: number
    minPrice: number
    maxPrice: number
    lastUpdated: string
  } {
    const pricing = this.getInstallationPricing()
    const allPrices: number[] = []

    Object.values(pricing.zones).forEach(zone => {
      Object.values(zone.prices).forEach(price => {
        allPrices.push(price * (zone.multiplier ?? 1))
      })
    })

    return {
      totalZones: Object.keys(pricing.zones).length,
      totalSizes: pricing.sizes.length,
      averagePrice: allPrices.length > 0 ? Math.round(allPrices.reduce((a, b) => a + b, 0) / allPrices.length) : 0,
      minPrice: allPrices.length > 0 ? Math.min(...allPrices) : 0,
      maxPrice: allPrices.length > 0 ? Math.max(...allPrices) : 0,
      lastUpdated: pricing.lastUpdated
    }
  }
}

export const installationPricingService = new InstallationPricingService()
export default installationPricingService
