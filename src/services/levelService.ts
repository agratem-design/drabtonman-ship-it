export interface Level {
  id: string
  name: string
  description: string
  discount?: number // خصم اختياري بالنسبة المئوية
  color: string
  isActive: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface LevelStats {
  totalLevels: number
  activeLevels: number
  averageDiscount: number
  levelsWithDiscount: number
}

/**
 * خدمة إدارة مستويات الأسعار
 */
class LevelService {
  private readonly STORAGE_KEY = 'al-fares-levels'

  constructor() {
    this.initializeDefaults()
  }

  /**
   * تهيئة المستويات الافتراضية
   */
  private initializeDefaults() {
    if (!localStorage.getItem(this.STORAGE_KEY)) {
      const defaultLevels: Level[] = [
        {
          id: 'A',
          name: 'مستوى A',
          description: 'مواقع مميزة - شوارع رئيسية',
          color: 'blue',
          isActive: true,
          sortOrder: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'B',
          name: 'مستوى B',
          description: 'مواقع عادية - شوارع فرعية',
          color: 'green',
          isActive: true,
          sortOrder: 2,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'C',
          name: 'مستوى C',
          description: 'مواقع اقتصادية - أطراف المدينة',
          discount: 15, // خصم 15%
          color: 'yellow',
          isActive: true,
          sortOrder: 3,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'VIP',
          name: 'مستوى VIP',
          description: 'مواقع حصرية - ميادين مركزية',
          color: 'purple',
          isActive: true,
          sortOrder: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ]
      this.saveLevels(defaultLevels)
    }
  }

  /**
   * الحصول على جميع المستويات
   */
  getLevels(includeInactive = false): Level[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      const levels = stored ? JSON.parse(stored) : []
      
      const filteredLevels = includeInactive ? levels : levels.filter((level: Level) => level.isActive)
      
      // ترتيب حسب sortOrder
      return filteredLevels.sort((a: Level, b: Level) => a.sortOrder - b.sortOrder)
    } catch {
      return []
    }
  }

  /**
   * حفظ المستويات
   */
  private saveLevels(levels: Level[]): boolean {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(levels))
      return true
    } catch {
      return false
    }
  }

  /**
   * إضافة مستوى جديد
   */
  addLevel(level: Omit<Level, 'id' | 'createdAt' | 'updatedAt' | 'sortOrder'>): Level | null {
    const levels = this.getLevels(true)
    
    // التحقق من عدم تكرار الاسم
    if (levels.some(l => l.name.toLowerCase() === level.name.toLowerCase())) {
      return null
    }

    // تحديد ترتيب جديد
    const maxSortOrder = Math.max(...levels.map(l => l.sortOrder), -1)

    const newLevel: Level = {
      ...level,
      id: this.generateId(),
      sortOrder: maxSortOrder + 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    levels.push(newLevel)
    
    if (this.saveLevels(levels)) {
      return newLevel
    }
    
    return null
  }

  /**
   * تحديث مستوى
   */
  updateLevel(id: string, updates: Partial<Omit<Level, 'id' | 'createdAt'>>): boolean {
    const levels = this.getLevels(true)
    const index = levels.findIndex(l => l.id === id)
    
    if (index === -1) return false

    // التحقق من عدم تكرار الاسم
    if (updates.name) {
      const nameExists = levels.some(l => 
        l.id !== id && l.name.toLowerCase() === updates.name!.toLowerCase()
      )
      if (nameExists) return false
    }

    levels[index] = {
      ...levels[index],
      ...updates,
      updatedAt: new Date().toISOString()
    }
    
    return this.saveLevels(levels)
  }

  /**
   * حذف مستوى (إلغاء تفعيل)
   */
  deleteLevel(id: string): boolean {
    return this.updateLevel(id, { isActive: false })
  }

  /**
   * حذف مستوى نهائياً
   */
  permanentDeleteLevel(id: string): boolean {
    const levels = this.getLevels(true)
    const filtered = levels.filter(l => l.id !== id)
    
    if (filtered.length === levels.length) return false
    
    return this.saveLevels(filtered)
  }

  /**
   * تفعيل مستوى
   */
  activateLevel(id: string): boolean {
    return this.updateLevel(id, { isActive: true })
  }

  /**
   * البحث في المستويات
   */
  searchLevels(query: string, includeInactive = false): Level[] {
    const levels = this.getLevels(includeInactive)
    const searchTerm = query.toLowerCase().trim()
    
    if (!searchTerm) return levels

    return levels.filter(l =>
      l.name.toLowerCase().includes(searchTerm) ||
      l.description.toLowerCase().includes(searchTerm)
    )
  }

  /**
   * الحصول على مستوى بالمعرف
   */
  getLevelById(id: string): Level | null {
    const levels = this.getLevels(true)
    return levels.find(l => l.id === id) || null
  }

  /**
   * الحصول على مستوى بالاسم
   */
  getLevelByName(name: string): Level | null {
    const levels = this.getLevels(true)
    return levels.find(l => l.name.toLowerCase() === name.toLowerCase()) || null
  }

  /**
   * حساب السعر بناءً على المستوى (إذا كان له خصم)
   */
  calculatePriceForLevel(basePrice: number, levelId: string): number {
    const level = this.getLevelById(levelId)
    if (!level || !level.discount) return basePrice
    
    const discountAmount = (basePrice * level.discount) / 100
    return Math.round(basePrice - discountAmount)
  }

  /**
   * الحصول على الألوان المتاحة للمستويات
   */
  getAvailableColors(): Array<{ value: string, label: string, hex: string }> {
    return [
      { value: 'blue', label: 'أزرق', hex: '#3B82F6' },
      { value: 'green', label: 'أخضر', hex: '#10B981' },
      { value: 'purple', label: 'بنفسجي', hex: '#8B5CF6' },
      { value: 'red', label: 'أحمر', hex: '#EF4444' },
      { value: 'yellow', label: 'أصفر', hex: '#F59E0B' },
      { value: 'pink', label: 'وردي', hex: '#EC4899' },
      { value: 'indigo', label: 'نيلي', hex: '#6366F1' },
      { value: 'gray', label: 'رمادي', hex: '#6B7280' },
      { value: 'orange', label: 'برتقالي', hex: '#F97316' },
      { value: 'teal', label: 'تركوازي', hex: '#14B8A6' },
      { value: 'gold', label: 'ذهبي', hex: '#D4AF37' },
      { value: 'slate', label: 'إردوازي', hex: '#64748B' }
    ]
  }

  /**
   * إعادة ترتيب المستويات
   */
  reorderLevels(levelIds: string[]): boolean {
    const levels = this.getLevels(true)
    
    // تحديث ترتيب المستويات
    levelIds.forEach((id, index) => {
      const level = levels.find(l => l.id === id)
      if (level) {
        level.sortOrder = index
        level.updatedAt = new Date().toISOString()
      }
    })

    return this.saveLevels(levels)
  }

  /**
   * نقل مستوى للأعلى في الترتيب
   */
  moveLevelUp(id: string): boolean {
    const levels = this.getLevels()
    const currentLevel = levels.find(l => l.id === id)
    
    if (!currentLevel || currentLevel.sortOrder === 0) return false

    const previousLevel = levels.find(l => l.sortOrder === currentLevel.sortOrder - 1)
    
    if (!previousLevel) return false

    // تبديل الترتيب
    const tempOrder = currentLevel.sortOrder
    currentLevel.sortOrder = previousLevel.sortOrder
    previousLevel.sortOrder = tempOrder

    // تحديث التاريخ
    currentLevel.updatedAt = new Date().toISOString()
    previousLevel.updatedAt = new Date().toISOString()

    return this.saveLevels(this.getLevels(true))
  }

  /**
   * نقل مستوى للأسفل في الترتيب
   */
  moveLevelDown(id: string): boolean {
    const levels = this.getLevels()
    const currentLevel = levels.find(l => l.id === id)
    
    if (!currentLevel) return false

    const maxOrder = Math.max(...levels.map(l => l.sortOrder))
    if (currentLevel.sortOrder === maxOrder) return false

    const nextLevel = levels.find(l => l.sortOrder === currentLevel.sortOrder + 1)
    
    if (!nextLevel) return false

    // تبديل الترتيب
    const tempOrder = currentLevel.sortOrder
    currentLevel.sortOrder = nextLevel.sortOrder
    nextLevel.sortOrder = tempOrder

    // تحديث التاريخ
    currentLevel.updatedAt = new Date().toISOString()
    nextLevel.updatedAt = new Date().toISOString()

    return this.saveLevels(this.getLevels(true))
  }

  /**
   * إنشاء معرف فريد
   */
  private generateId(): string {
    const timestamp = Date.now().toString()
    const random = Math.random().toString(36).substr(2, 9)
    return `level_${timestamp}_${random}`
  }

  /**
   * الحصول على إحصائيات المستويات
   */
  getStatistics(): LevelStats {
    const allLevels = this.getLevels(true)
    const activeLevels = allLevels.filter(l => l.isActive)
    const levelsWithDiscount = activeLevels.filter(l => l.discount && l.discount > 0)
    
    if (activeLevels.length === 0) {
      return {
        totalLevels: allLevels.length,
        activeLevels: 0,
        averageDiscount: 0,
        levelsWithDiscount: 0
      }
    }

    const discounts = levelsWithDiscount.map(l => l.discount || 0)
    const averageDiscount = discounts.length > 0 
      ? discounts.reduce((a, b) => a + b, 0) / discounts.length 
      : 0

    return {
      totalLevels: allLevels.length,
      activeLevels: activeLevels.length,
      averageDiscount: Math.round(averageDiscount * 100) / 100,
      levelsWithDiscount: levelsWithDiscount.length
    }
  }

  /**
   * تصدير المستويات
   */
  exportLevels(): string {
    const levels = this.getLevels(true)
    return JSON.stringify(levels, null, 2)
  }

  /**
   * استيراد المستويات
   */
  importLevels(jsonData: string): { success: boolean, imported: number, errors: string[] } {
    try {
      const importedLevels = JSON.parse(jsonData) as Level[]
      const existingLevels = this.getLevels(true)
      const errors: string[] = []
      let imported = 0

      importedLevels.forEach((level, index) => {
        // التحقق من صحة البيانات
        const validation = this.validateLevel(level)
        if (validation.length > 0) {
          errors.push(`المستوى ${index + 1}: ${validation.join(', ')}`)
          return
        }

        // التحقق من التكرار
        const exists = existingLevels.find(l => 
          l.name.toLowerCase() === level.name.toLowerCase()
        )

        if (exists) {
          // تحديث المستوى الموجود
          this.updateLevel(exists.id, {
            description: level.description,
            discount: level.discount,
            color: level.color,
            isActive: level.isActive
          })
        } else {
          // إضافة مستوى جديد
          const newLevel = this.addLevel({
            name: level.name,
            description: level.description,
            discount: level.discount,
            color: level.color,
            isActive: level.isActive
          })
          if (newLevel) imported++
        }
      })

      return {
        success: errors.length === 0,
        imported,
        errors
      }
    } catch (error) {
      return {
        success: false,
        imported: 0,
        errors: [`خطأ في تحليل البيانات: ${error}`]
      }
    }
  }

  /**
   * التحقق من صحة بيانات المستوى
   */
  validateLevel(level: Partial<Level>): string[] {
    const errors: string[] = []

    if (!level.name || level.name.trim().length < 2) {
      errors.push('اسم المستوى يجب أن يكون على الأقل حرفين')
    }

    if (!level.description || level.description.trim().length < 5) {
      errors.push('وصف المستوى يجب أن يكون على الأقل 5 أحرف')
    }

    if (level.discount !== undefined && (level.discount < 0 || level.discount > 100)) {
      errors.push('نسبة الخصم يجب أن تكون بين 0 و 100')
    }

    if (!level.color || !this.getAvailableColors().some(c => c.value === level.color)) {
      errors.push('اللون المحدد غير صحيح')
    }

    return errors
  }

  /**
   * إعادة تعيين المستويات للقيم الافتراضية
   */
  resetToDefaults(): boolean {
    localStorage.removeItem(this.STORAGE_KEY)
    this.initializeDefaults()
    return true
  }

  /**
   * الحصول على المستويات بلون معين
   */
  getLevelsByColor(color: string): Level[] {
    const levels = this.getLevels()
    return levels.filter(l => l.color === color)
  }

  /**
   * الحصول على المستويات التي لها خصم
   */
  getLevelsWithDiscount(): Level[] {
    const levels = this.getLevels()
    return levels.filter(l => l.discount && l.discount > 0)
  }

  /**
   * الحصول على أحدث المستويات المضافة
   */
  getRecentLevels(limit = 3): Level[] {
    const levels = this.getLevels()
    return levels
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit)
  }

  /**
   * تكرار مستوى موجود
   */
  duplicateLevel(id: string, newName?: string): Level | null {
    const level = this.getLevelById(id)
    if (!level) return null

    const duplicatedLevel = {
      ...level,
      name: newName || `${level.name} - نسخة`,
      id: undefined,
      createdAt: undefined,
      updatedAt: undefined,
      sortOrder: undefined
    }

    delete (duplicatedLevel as any).id
    delete (duplicatedLevel as any).createdAt
    delete (duplicatedLevel as any).updatedAt
    delete (duplicatedLevel as any).sortOrder

    return this.addLevel(duplicatedLevel)
  }

  /**
   * الحصول على المستوى التالي في الترتيب
   */
  getNextLevel(currentLevelId: string): Level | null {
    const levels = this.getLevels()
    const currentLevel = levels.find(l => l.id === currentLevelId)
    
    if (!currentLevel) return null

    return levels.find(l => l.sortOrder === currentLevel.sortOrder + 1) || null
  }

  /**
   * الحصول على المستوى السابق في الترتيب
   */
  getPreviousLevel(currentLevelId: string): Level | null {
    const levels = this.getLevels()
    const currentLevel = levels.find(l => l.id === currentLevelId)
    
    if (!currentLevel) return null

    return levels.find(l => l.sortOrder === currentLevel.sortOrder - 1) || null
  }
}

export const levelService = new LevelService()
