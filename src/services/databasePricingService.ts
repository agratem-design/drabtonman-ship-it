import { supabase } from '@/supabaseClient'
import { BillboardSize } from '@/types'

// نوع بيانات الأسعار في قاعدة البيانات
export interface PricingRecord {
  id?: number
  billboard_size: string
  duration_months: number
  price: number
  price_category: 'A' | 'B'
  zone_name: string
  created_at?: string
  updated_at?: string
}

// نوع بيانات معاملات المدن
export interface CityMultiplier {
  id?: number
  city_name: string
  multiplier: number
  description?: string
  image_url?: string
  is_active: boolean
  created_at?: string
  updated_at?: string
}

// نوع بيانات جدولة الأسعار (للواجهة)
export interface PricingTableRow {
  billboard_size: string
  prices: {
    [duration: number]: {
      [category in 'A' | 'B']: number
    }
  }
}

// نوع بيانات معاملات المدن للواجهة
export interface CityMultiplierRow {
  main_city: string
  multipliers: {
    [city: string]: number
  }
}

class DatabasePricingService {
  // المدد المتاحة (بالأشهر)
  private readonly AVAILABLE_DURATIONS = [1, 2, 3, 6, 12]
  
  // المدن الرئيسية
  private readonly MAIN_CITIES = [
    'بنغازي',
    'طبرق', 
    'صبراتة',
    'مصراتة',
    'سب��ا',
    'طرابلس'
  ]

  // المقاسات المتاحة
  private readonly AVAILABLE_SIZES: BillboardSize[] = [
    '5x13', '4x12', '4x10', '3x8', '3x6', '3x4'
  ]

  /**
   * تهيئة جداول قاعدة البيانات
   */
  async initializeTables(): Promise<{ success: boolean; message: string }> {
    try {
      if (!supabase) {
        return { success: false, message: 'قاعدة البيانات غير متاحة' }
      }

      // التحقق من وجود الجداول وإنشاؤها إذا لم تكن موجودة
      await this.createPricingTable()
      await this.createCityMultiplierTable()
      
      // إدراج البيانات الافتراضية
      await this.insertDefaultPricing()
      await this.insertDefaultCityMultipliers()

      return { success: true, message: 'تم تهيئة قاعدة البيانات بنجاح' }
    } catch (error) {
      console.error('خطأ في تهيئة قاعدة البيانات:', error)
      return { success: false, message: `خطأ: ${error}` }
    }
  }

  /**
   * إنشاء جدول الأسعار
   */
  private async createPricingTable() {
    if (!supabase) return

    // التحقق من وجود الجدول أولاً
    const { data: tables } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_name', 'billboard_pricing')

    if (!tables || tables.length === 0) {
      // إنشاء الجدول إذا لم يكن موجوداً
      console.log('إنشاء جدول الأسعار...')
      // ملاحظة: في بيئة الإنتاج، يجب إنشاء الجداول من خلال واجهة Supabase
      // هنا نفترض أن الجدول موجود بالفعل
    }
  }

  /**
   * إنشاء جدول معاملات المدن
   */
  private async createCityMultiplierTable() {
    if (!supabase) return

    // التحقق من وجود الجدول أولاً
    const { data: tables } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_name', 'city_multipliers')

    if (!tables || tables.length === 0) {
      console.log('إنشاء جدول معاملات المدن...')
      // ملاحظة: في بيئة الإنتاج، يجب إنشاء الجداول من خلال واجهة Supabase
    }
  }

  /**
   * إدراج البيانات الافتراضية للأسعار
   */
  private async insertDefaultPricing() {
    if (!supabase) return

    // التحقق من وجود بيانات
    const { data: existingData } = await supabase
      .from('billboard_pricing')
      .select('id')
      .limit(1)

    if (existingData && existingData.length > 0) {
      return // البيانات موجودة بالفعل
    }

    console.log('إدراج البيانات الافتراضية للأسعار...')

    const defaultPricing: Omit<PricingRecord, 'id' | 'created_at' | 'updated_at'>[] = []

    // إنشاء أسعار افتراضية لكل مقاس ومدة وفئة ومنطقة
    const zones = ['مصراتة', 'طرابلس', 'بنغازي']
    const basePrices = {
      '5x13': 4000,
      '4x12': 3500,
      '4x10': 3000,
      '3x8': 2500,
      '3x6': 2000,
      '3x4': 1500
    }

    for (const zone of zones) {
      for (const size of this.AVAILABLE_SIZES) {
        for (const duration of this.AVAILABLE_DURATIONS) {
          for (const category of ['A', 'B'] as const) {
            const basePrice = basePrices[size] || 1000
            const categoryMultiplier = category === 'A' ? 1.0 : 0.8
            const durationDiscount = duration >= 6 ? 0.9 : duration >= 3 ? 0.95 : 1.0
            
            const finalPrice = Math.round(basePrice * categoryMultiplier * durationDiscount)

            defaultPricing.push({
              billboard_size: size,
              duration_months: duration,
              price: finalPrice,
              price_category: category,
              zone_name: zone
            })
          }
        }
      }
    }

    // إدراج البيانات في دفعات
    const batchSize = 100
    for (let i = 0; i < defaultPricing.length; i += batchSize) {
      const batch = defaultPricing.slice(i, i + batchSize)
      const { error } = await supabase
        .from('billboard_pricing')
        .insert(batch)

      if (error) {
        console.error('خطأ في إدراج البيانات:', error)
      }
    }
  }

  /**
   * إدراج البيانات الافتراضية لمعاملات المدن
   */
  private async insertDefaultCityMultipliers() {
    if (!supabase) return

    // التحقق من وجود بيانات
    const { data: existingData } = await supabase
      .from('city_multipliers')
      .select('id')
      .limit(1)

    if (existingData && existingData.length > 0) {
      return // البيانات موجودة بالفعل
    }

    console.log('إدراج البيانات الافتراضية لمعاملات المدن...')

    const defaultMultipliers: Omit<CityMultiplier, 'id' | 'created_at' | 'updated_at'>[] = [
      {
        city_name: 'طرابلس',
        multiplier: 1.2,
        description: 'العاصمة - سعر مرتفع',
        image_url: '/cities/tripoli.png',
        is_active: true
      },
      {
        city_name: 'بنغازي',
        multiplier: 1.1,
        description: 'المدينة الثانية - سعر متوسط مرتفع',
        image_url: '/cities/benghazi.png',
        is_active: true
      },
      {
        city_name: 'مصراتة',
        multiplier: 1.0,
        description: 'السعر الأساسي',
        image_url: '/cities/misrata.png',
        is_active: true
      },
      {
        city_name: 'صبراتة',
        multiplier: 0.9,
        description: 'مدينة ساحلية - سعر منخفض',
        image_url: '/cities/sabratha.png',
        is_active: true
      },
      {
        city_name: 'سبها',
        multiplier: 0.8,
        description: 'مدينة جنوبية - سعر منخفض',
        image_url: '/cities/sebha.png',
        is_active: true
      },
      {
        city_name: 'طبرق',
        multiplier: 0.85,
        description: 'مدينة شرقية - سعر منخفض',
        image_url: '/cities/tobruk.png',
        is_active: true
      }
    ]

    const { error } = await supabase
      .from('city_multipliers')
      .insert(defaultMultipliers)

    if (error) {
      console.error('خطأ في ��دراج معاملات المدن:', error)
    }
  }

  /**
   * الحصول على جميع الأسعار في صورة جدولية للواجهة
   */
  async getPricingTable(): Promise<PricingTableRow[]> {
    if (!supabase) {
      return this.getFallbackPricingTable()
    }

    try {
      const { data, error } = await supabase
        .from('billboard_pricing')
        .select('*')
        .order('billboard_size', { ascending: true })

      if (error) {
        console.error('خطأ في جلب الأسعار:', error)
        return this.getFallbackPricingTable()
      }

      // تنظيم البيانات في شكل جدولي
      const pricingMap = new Map<string, PricingTableRow>()

      data?.forEach((record: PricingRecord) => {
        if (!pricingMap.has(record.billboard_size)) {
          pricingMap.set(record.billboard_size, {
            billboard_size: record.billboard_size,
            prices: {}
          })
        }

        const row = pricingMap.get(record.billboard_size)!
        if (!row.prices[record.duration_months]) {
          row.prices[record.duration_months] = { A: 0, B: 0 }
        }

        row.prices[record.duration_months][record.price_category] = record.price
      })

      return Array.from(pricingMap.values())
    } catch (error) {
      console.error('خطأ عام في جلب الأسعار:', error)
      return this.getFallbackPricingTable()
    }
  }

  /**
   * الحصول على معاملات المدن في صورة جدولية
   */
  async getCityMultiplierTable(): Promise<CityMultiplierRow[]> {
    if (!supabase) {
      return this.getFallbackCityMultipliers()
    }

    try {
      const { data, error } = await supabase
        .from('city_multipliers')
        .select('*')
        .eq('is_active', true)
        .order('city_name', { ascending: true })

      if (error) {
        console.error('خطأ في جلب معاملات المدن:', error)
        return this.getFallbackCityMultipliers()
      }

      // تنظيم البيانات للواجهة
      const multiplierRow: CityMultiplierRow = {
        main_city: 'جميع المدن',
        multipliers: {}
      }

      data?.forEach((record: CityMultiplier) => {
        multiplierRow.multipliers[record.city_name] = record.multiplier
      })

      return [multiplierRow]
    } catch (error) {
      console.error('خطأ عام في جلب معاملات المدن:', error)
      return this.getFallbackCityMultipliers()
    }
  }

  /**
   * تحديث سعر معين
   */
  async updatePrice(
    billboardSize: string,
    durationMonths: number,
    priceCategory: 'A' | 'B',
    zoneName: string,
    newPrice: number
  ): Promise<{ success: boolean; message: string }> {
    if (!supabase) {
      return { success: false, message: 'قاعدة البيانات غير متاحة' }
    }

    try {
      const { error } = await supabase
        .from('billboard_pricing')
        .update({ 
          price: newPrice,
          updated_at: new Date().toISOString()
        })
        .eq('billboard_size', billboardSize)
        .eq('duration_months', durationMonths)
        .eq('price_category', priceCategory)
        .eq('zone_name', zoneName)

      if (error) {
        console.error('خطأ في تحديث السعر:', error)
        return { success: false, message: 'فشل في تحديث السعر' }
      }

      return { success: true, message: 'تم تحديث السعر بنجاح' }
    } catch (error) {
      console.error('خطأ عام في تحديث السعر:', error)
      return { success: false, message: `خطأ: ${error}` }
    }
  }

  /**
   * تحديث معامل مدينة
   */
  async updateCityMultiplier(
    cityName: string,
    newMultiplier: number
  ): Promise<{ success: boolean; message: string }> {
    if (!supabase) {
      return { success: false, message: 'ق��عدة البيانات غير متاحة' }
    }

    try {
      const { error } = await supabase
        .from('city_multipliers')
        .update({ 
          multiplier: newMultiplier,
          updated_at: new Date().toISOString()
        })
        .eq('city_name', cityName)

      if (error) {
        console.error('خطأ في تحديث معامل المدينة:', error)
        return { success: false, message: 'فشل في تحديث معامل المدينة' }
      }

      return { success: true, message: 'تم تحديث معامل المدينة بنجاح' }
    } catch (error) {
      console.error('خطأ عام في تحديث معامل المدينة:', error)
      return { success: false, message: `خطأ: ${error}` }
    }
  }

  /**
   * الحصول على سعر لوحة معينة
   */
  async getBillboardPrice(
    billboardSize: string,
    durationMonths: number,
    priceCategory: 'A' | 'B',
    zoneName: string = 'مصراتة',
    cityName?: string
  ): Promise<number> {
    if (!supabase) {
      return this.getFallbackPrice(billboardSize, durationMonths, priceCategory)
    }

    try {
      const { data, error } = await supabase
        .from('billboard_pricing')
        .select('price')
        .eq('billboard_size', billboardSize)
        .eq('duration_months', durationMonths)
        .eq('price_category', priceCategory)
        .eq('zone_name', zoneName)
        .single()

      if (error || !data) {
        return this.getFallbackPrice(billboardSize, durationMonths, priceCategory)
      }

      let finalPrice = data.price

      // تطبيق معامل المدينة إذا كان متوفراً
      if (cityName) {
        const multiplier = await this.getCityMultiplier(cityName)
        finalPrice = Math.round(finalPrice * multiplier)
      }

      return finalPrice
    } catch (error) {
      console.error('خطأ في جلب السعر:', error)
      return this.getFallbackPrice(billboardSize, durationMonths, priceCategory)
    }
  }

  /**
   * الحصول على معامل مدينة معينة
   */
  async getCityMultiplier(cityName: string): Promise<number> {
    if (!supabase) {
      return 1.0
    }

    try {
      const { data, error } = await supabase
        .from('city_multipliers')
        .select('multiplier')
        .eq('city_name', cityName)
        .eq('is_active', true)
        .single()

      if (error || !data) {
        return 1.0
      }

      return data.multiplier
    } catch (error) {
      console.error('خطأ في جلب معامل المدينة:', error)
      return 1.0
    }
  }

  /**
   * إضافة مقاس جديد
   */
  async addNewSize(
    billboardSize: string,
    basePrices: { A: number; B: number }
  ): Promise<{ success: boolean; message: string }> {
    if (!supabase) {
      return { success: false, message: 'قاعدة البيانات غير متاحة' }
    }

    try {
      const zones = ['مصراتة', 'طرابلس', 'بنغازي']
      const newRecords: Omit<PricingRecord, 'id' | 'created_at' | 'updated_at'>[] = []

      for (const zone of zones) {
        for (const duration of this.AVAILABLE_DURATIONS) {
          for (const category of ['A', 'B'] as const) {
            const basePrice = basePrices[category]
            const durationDiscount = duration >= 6 ? 0.9 : duration >= 3 ? 0.95 : 1.0
            const finalPrice = Math.round(basePrice * durationDiscount)

            newRecords.push({
              billboard_size: billboardSize,
              duration_months: duration,
              price: finalPrice,
              price_category: category,
              zone_name: zone
            })
          }
        }
      }

      const { error } = await supabase
        .from('billboard_pricing')
        .insert(newRecords)

      if (error) {
        console.error('خطأ في إضافة المقاس الجد��د:', error)
        return { success: false, message: 'فشل في إضافة المقاس الجديد' }
      }

      return { success: true, message: 'تم إضافة المقاس الجديد بنجاح' }
    } catch (error) {
      console.error('خطأ عام في إضافة المقاس:', error)
      return { success: false, message: `خطأ: ${error}` }
    }
  }

  /**
   * بيانات احتياطية للأسعار
   */
  private getFallbackPricingTable(): PricingTableRow[] {
    const basePrices = {
      '5x13': { A: 4000, B: 3200 },
      '4x12': { A: 3500, B: 2800 },
      '4x10': { A: 3000, B: 2400 },
      '3x8': { A: 2500, B: 2000 },
      '3x6': { A: 2000, B: 1600 },
      '3x4': { A: 1500, B: 1200 }
    }

    return this.AVAILABLE_SIZES.map(size => ({
      billboard_size: size,
      prices: {
        1: basePrices[size],
        2: {
          A: Math.round(basePrices[size].A * 0.98),
          B: Math.round(basePrices[size].B * 0.98)
        },
        3: {
          A: Math.round(basePrices[size].A * 0.95),
          B: Math.round(basePrices[size].B * 0.95)
        },
        6: {
          A: Math.round(basePrices[size].A * 0.9),
          B: Math.round(basePrices[size].B * 0.9)
        },
        12: {
          A: Math.round(basePrices[size].A * 0.85),
          B: Math.round(basePrices[size].B * 0.85)
        }
      }
    }))
  }

  /**
   * بيانات احتياطية لمعاملات المدن
   */
  private getFallbackCityMultipliers(): CityMultiplierRow[] {
    return [{
      main_city: 'جميع المدن',
      multipliers: {
        'طرابلس': 1.2,
        'بنغازي': 1.1,
        'مصراتة': 1.0,
        'صبراتة': 0.9,
        'سبها': 0.8,
        'طبرق': 0.85
      }
    }]
  }

  /**
   * سعر احتياطي
   */
  private getFallbackPrice(billboardSize: string, durationMonths: number, priceCategory: 'A' | 'B'): number {
    const basePrices: Record<string, number> = {
      '5x13': 4000,
      '4x12': 3500,
      '4x10': 3000,
      '3x8': 2500,
      '3x6': 2000,
      '3x4': 1500
    }

    const basePrice = basePrices[billboardSize] || 1000
    const categoryMultiplier = priceCategory === 'A' ? 1.0 : 0.8
    const durationDiscount = durationMonths >= 6 ? 0.9 : durationMonths >= 3 ? 0.95 : 1.0

    return Math.round(basePrice * categoryMultiplier * durationDiscount)
  }

  /**
   * الحصول على المدد المتاحة
   */
  getAvailableDurations(): number[] {
    return this.AVAILABLE_DURATIONS
  }

  /**
   * الحصول على المقاسات المتاحة
   */
  getAvailableSizes(): BillboardSize[] {
    return this.AVAILABLE_SIZES
  }

  /**
   * الحصول على المدن الرئيسية
   */
  getMainCities(): string[] {
    return this.MAIN_CITIES
  }
}

export const databasePricingService = new DatabasePricingService()
