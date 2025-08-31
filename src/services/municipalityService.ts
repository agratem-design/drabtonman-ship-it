import * as XLSX from 'xlsx'

export interface Municipality {
  id: string
  name: string
  multiplier: number
  region?: string
  city?: string
}

export interface MunicipalityImportResult {
  success: boolean
  imported: Municipality[]
  errors: string[]
  duplicates: string[]
}

/**
 * خدمة إدارة البلديات ومعاملاتها
 */
class MunicipalityService {
  private readonly STORAGE_KEY = 'al-fares-municipalities'

  constructor() {
    this.initializeDefaults()
  }

  /**
   * تهيئة البلديات الافتراضية
   */
  private initializeDefaults() {
    if (!localStorage.getItem(this.STORAGE_KEY)) {
      const defaultMunicipalities: Municipality[] = [
        { id: '1', name: 'مصراتة', multiplier: 1.0, region: 'مصراتة', city: 'مصراتة' },
        { id: '2', name: 'زليتن', multiplier: 0.8, region: 'مصراتة', city: 'زليتن' },
        { id: '3', name: 'بنغازي', multiplier: 1.2, region: 'بنغازي', city: 'بنغازي' },
        { id: '4', name: 'طرابلس', multiplier: 1.0, region: 'طرابلس', city: 'طرابلس' },
        { id: '5', name: 'الخمس', multiplier: 0.9, region: 'مصراتة', city: 'الخمس' },
        { id: '6', name: 'سرت', multiplier: 0.85, region: 'سرت', city: 'سرت' }
      ]
      this.saveMunicipalities(defaultMunicipalities)
    }
  }

  /**
   * الحصول على ج��يع البلديات
   */
  getMunicipalities(): Municipality[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  }

  /**
   * حفظ البلديات
   */
  saveMunicipalities(municipalities: Municipality[]): boolean {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(municipalities))
      return true
    } catch {
      return false
    }
  }

  /**
   * إضافة بلدية جديدة
   */
  addMunicipality(municipality: Omit<Municipality, 'id'>): Municipality | null {
    const municipalities = this.getMunicipalities()
    
    // التحقق من عدم وجود بلدية بنفس الاسم
    if (municipalities.some(m => m.name.toLowerCase() === municipality.name.toLowerCase())) {
      return null
    }

    const newMunicipality: Municipality = {
      ...municipality,
      id: Date.now().toString()
    }

    municipalities.push(newMunicipality)
    
    if (this.saveMunicipalities(municipalities)) {
      return newMunicipality
    }
    
    return null
  }

  /**
   * تحديث بلدية
   */
  updateMunicipality(id: string, updates: Partial<Omit<Municipality, 'id'>>): boolean {
    const municipalities = this.getMunicipalities()
    const index = municipalities.findIndex(m => m.id === id)
    
    if (index === -1) return false

    // التحقق من عدم تكرار الاسم
    if (updates.name) {
      const nameExists = municipalities.some(m => 
        m.id !== id && m.name.toLowerCase() === updates.name!.toLowerCase()
      )
      if (nameExists) return false
    }

    municipalities[index] = { ...municipalities[index], ...updates }
    return this.saveMunicipalities(municipalities)
  }

  /**
   * حذف بلدية
   */
  deleteMunicipality(id: string): boolean {
    const municipalities = this.getMunicipalities()
    const filtered = municipalities.filter(m => m.id !== id)
    
    if (filtered.length === municipalities.length) return false
    
    return this.saveMunicipalities(filtered)
  }

  /**
   * البحث في البلديات
   */
  searchMunicipalities(query: string): Municipality[] {
    const municipalities = this.getMunicipalities()
    const searchTerm = query.toLowerCase().trim()
    
    if (!searchTerm) return municipalities

    return municipalities.filter(m =>
      m.name.toLowerCase().includes(searchTerm) ||
      m.region?.toLowerCase().includes(searchTerm) ||
      m.city?.toLowerCase().includes(searchTerm)
    )
  }

  /**
   * الحصول على ب��دية بالمعرف
   */
  getMunicipalityById(id: string): Municipality | null {
    const municipalities = this.getMunicipalities()
    return municipalities.find(m => m.id === id) || null
  }

  /**
   * الحصول على بلدية بالاسم
   */
  getMunicipalityByName(name: string): Municipality | null {
    const municipalities = this.getMunicipalities()
    return municipalities.find(m => m.name.toLowerCase() === name.toLowerCase()) || null
  }

  /**
   * حساب السعر النهائي بناءً على معامل البلدية
   */
  calculatePriceWithMultiplier(basePrice: number, municipalityId: string): number {
    const municipality = this.getMunicipalityById(municipalityId)
    if (!municipality) return basePrice
    
    return Math.round(basePrice * municipality.multiplier)
  }

  /**
   * استيراد البلديات من ملف Excel
   */
  async importFromExcel(file: File): Promise<MunicipalityImportResult> {
    const result: MunicipalityImportResult = {
      success: false,
      imported: [],
      errors: [],
      duplicates: []
    }

    try {
      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: 'array' })
      const worksheet = workbook.Sheets[workbook.SheetNames[0]]
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][]

      const existingMunicipalities = this.getMunicipalities()
      const newMunicipalities: Municipality[] = []

      // تخطي الصف الأول (العناوين)
      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i]
        
        if (!row[0] || !row[1]) {
          result.errors.push(`الصف ${i + 1}: بيانات ناقصة`)
          continue
        }

        const name = row[0].toString().trim()
        const multiplier = parseFloat(row[1].toString())

        if (isNaN(multiplier) || multiplier < 0) {
          result.errors.push(`الصف ${i + 1}: معامل غير صحيح "${row[1]}"`)
          continue
        }

        // التحقق من التكرار
        const existingName = existingMunicipalities.find(m => 
          m.name.toLowerCase() === name.toLowerCase()
        )
        
        if (existingName) {
          result.duplicates.push(name)
          // تحديث المعامل إذا كان مختلف
          if (existingName.multiplier !== multiplier) {
            this.updateMunicipality(existingName.id, { multiplier })
          }
          continue
        }

        // التحقق من التكرار في البيانات المستوردة
        const duplicateInImport = newMunicipalities.find(m => 
          m.name.toLowerCase() === name.toLowerCase()
        )
        
        if (duplicateInImport) {
          result.duplicates.push(name)
          continue
        }

        const municipality: Municipality = {
          id: (Date.now() + i).toString(),
          name,
          multiplier,
          region: row[2]?.toString().trim() || undefined,
          city: row[3]?.toString().trim() || undefined
        }

        newMunicipalities.push(municipality)
      }

      // حفظ البلديات الجديدة
      if (newMunicipalities.length > 0) {
        const allMunicipalities = [...existingMunicipalities, ...newMunicipalities]
        if (this.saveMunicipalities(allMunicipalities)) {
          result.imported = newMunicipalities
          result.success = true
        } else {
          result.errors.push('فشل في حفظ البيانات')
        }
      } else {
        result.success = true // نجح حتى لو لم يتم استيراد شيء
      }

    } catch (error) {
      result.errors.push(`خطأ في قراءة الملف: ${error}`)
    }

    return result
  }

  /**
   * تصدير البلديات إلى ملف Excel
   */
  exportToExcel(filename = 'municipalities.xlsx'): void {
    const municipalities = this.getMunicipalities()
    
    const data = [
      ['البلدية', 'المعامل', 'المنطقة', 'المدينة'],
      ...municipalities.map(m => [
        m.name,
        m.multiplier.toString(),
        m.region || '',
        m.city || ''
      ])
    ]

    const worksheet = XLSX.utils.aoa_to_sheet(data)
    const workbook = XLSX.utils.book_new()
    
    // تنسيق العرض
    worksheet['!cols'] = [
      { width: 20 }, // البلدية
      { width: 10 }, // المعام��
      { width: 15 }, // المنطقة
      { width: 15 }  // المدينة
    ]

    XLSX.utils.book_append_sheet(workbook, worksheet, 'البلديات')
    XLSX.writeFile(workbook, filename)
  }

  /**
   * الحصول على إحصائيات البلديات
   */
  getStatistics(): {
    total: number
    averageMultiplier: number
    highestMultiplier: { municipality: Municipality, multiplier: number }
    lowestMultiplier: { municipality: Municipality, multiplier: number }
    regionsCount: number
    citiesCount: number
  } {
    const municipalities = this.getMunicipalities()
    
    if (municipalities.length === 0) {
      return {
        total: 0,
        averageMultiplier: 0,
        highestMultiplier: { municipality: {} as Municipality, multiplier: 0 },
        lowestMultiplier: { municipality: {} as Municipality, multiplier: 0 },
        regionsCount: 0,
        citiesCount: 0
      }
    }

    const multipliers = municipalities.map(m => m.multiplier)
    const averageMultiplier = multipliers.reduce((a, b) => a + b, 0) / multipliers.length

    const highest = municipalities.reduce((max, current) => 
      current.multiplier > max.multiplier ? current : max
    )
    
    const lowest = municipalities.reduce((min, current) => 
      current.multiplier < min.multiplier ? current : min
    )

    const regions = new Set(municipalities.map(m => m.region).filter(Boolean))
    const cities = new Set(municipalities.map(m => m.city).filter(Boolean))

    return {
      total: municipalities.length,
      averageMultiplier: Math.round(averageMultiplier * 100) / 100,
      highestMultiplier: { municipality: highest, multiplier: highest.multiplier },
      lowestMultiplier: { municipality: lowest, multiplier: lowest.multiplier },
      regionsCount: regions.size,
      citiesCount: cities.size
    }
  }

  /**
   * التحقق من صحة البيانات
   */
  validateMunicipality(municipality: Partial<Municipality>): string[] {
    const errors: string[] = []

    if (!municipality.name || municipality.name.trim().length < 2) {
      errors.push('اسم البلدية يجب أن يكون على الأقل حرفين')
    }

    if (municipality.multiplier === undefined || municipality.multiplier < 0) {
      errors.push('معامل الضرب يجب أن يكون رقم موجب')
    }

    if (municipality.multiplier !== undefined && municipality.multiplier > 10) {
      errors.push('معامل الضرب يبدو كبير جداً (أكبر من 10)')
    }

    return errors
  }

  /**
   * إعادة تعيين البلديات للقيم الافتراضية
   */
  resetToDefaults(): boolean {
    localStorage.removeItem(this.STORAGE_KEY)
    this.initializeDefaults()
    return true
  }

  /**
   * الحصول على البلديات حسب المنطقة
   */
  getMunicipalitiesByRegion(region: string): Municipality[] {
    const municipalities = this.getMunicipalities()
    return municipalities.filter(m => 
      m.region?.toLowerCase() === region.toLowerCase()
    )
  }

  /**
   * الحصول على قائمة المناطق الفريدة
   */
  getUniqueRegions(): string[] {
    const municipalities = this.getMunicipalities()
    const regions = municipalities
      .map(m => m.region)
      .filter(Boolean)
      .filter((region, index, arr) => arr.indexOf(region) === index)
    
    return regions as string[]
  }

  /**
   * الحصول على قائمة المدن الفريدة
   */
  getUniqueCities(): string[] {
    const municipalities = this.getMunicipalities()
    const cities = municipalities
      .map(m => m.city)
      .filter(Boolean)
      .filter((city, index, arr) => arr.indexOf(city) === index)
    
    return cities as string[]
  }
}

export const municipalityService = new MunicipalityService()

// Export to global scope for easier access from pricing services
if (typeof window !== 'undefined') {
  (window as any).municipalityService = municipalityService
}
