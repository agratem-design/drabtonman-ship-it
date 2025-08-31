export interface Category {
  id: string
  name: string
  description?: string
  color: string
  multiplier: number // مضاعف السعر للفئة
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface CategoryStats {
  totalCategories: number
  activeCategories: number
  averageMultiplier: number
  mostUsedColor: string
}

/**
 * خدمة إدارة فئات العملاء
 */
class CategoryService {
  private readonly STORAGE_KEY = 'al-fares-categories'

  constructor() {
    this.initializeDefaults()
  }

  /**
   * تهيئة الفئات الافتراضية
   */
  private initializeDefaults() {
    if (!localStorage.getItem(this.STORAGE_KEY)) {
      const defaultCategories: Category[] = [
        {
          id: 'marketers',
          name: 'مسوقين',
          description: 'خصم خاص للمسوقين',
          color: 'blue',
          multiplier: 0.85, // خصم 15%
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'individuals',
          name: 'أفراد',
          description: 'الأسعار العادية للأفراد',
          color: 'purple',
          multiplier: 1.0, // السعر الأساسي
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'companies',
          name: 'شركات',
          description: 'أسعار الشركات والمؤسسات',
          color: 'green',
          multiplier: 1.15, // زيادة 15%
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'vip',
          name: 'VIP',
          description: 'عملاء مميزين',
          color: 'gold',
          multiplier: 0.75, // خصم 25%
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ]
      this.saveCategories(defaultCategories)
    }
  }

  /**
   * الحصول على جميع الفئات
   */
  getCategories(includeInactive = false): Category[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      const categories = stored ? JSON.parse(stored) : []
      
      if (includeInactive) {
        return categories
      }
      
      return categories.filter((cat: Category) => cat.isActive)
    } catch {
      return []
    }
  }

  /**
   * حفظ الفئات
   */
  private saveCategories(categories: Category[]): boolean {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(categories))
      return true
    } catch {
      return false
    }
  }

  /**
   * إضافة فئة جديدة
   */
  addCategory(category: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>): Category | null {
    const categories = this.getCategories(true)
    
    // التحقق من عدم تكرار الاسم
    if (categories.some(c => c.name.toLowerCase() === category.name.toLowerCase())) {
      return null
    }

    const newCategory: Category = {
      ...category,
      id: this.generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    categories.push(newCategory)
    
    if (this.saveCategories(categories)) {
      return newCategory
    }
    
    return null
  }

  /**
   * تحديث فئة
   */
  updateCategory(id: string, updates: Partial<Omit<Category, 'id' | 'createdAt'>>): boolean {
    const categories = this.getCategories(true)
    const index = categories.findIndex(c => c.id === id)
    
    if (index === -1) return false

    // التحقق من عدم تكرار الاسم
    if (updates.name) {
      const nameExists = categories.some(c => 
        c.id !== id && c.name.toLowerCase() === updates.name!.toLowerCase()
      )
      if (nameExists) return false
    }

    categories[index] = {
      ...categories[index],
      ...updates,
      updatedAt: new Date().toISOString()
    }
    
    return this.saveCategories(categories)
  }

  /**
   * حذف فئة (إلغاء تفعيل)
   */
  deleteCategory(id: string): boolean {
    return this.updateCategory(id, { isActive: false })
  }

  /**
   * حذف فئة نهائياً
   */
  permanentDeleteCategory(id: string): boolean {
    const categories = this.getCategories(true)
    const filtered = categories.filter(c => c.id !== id)
    
    if (filtered.length === categories.length) return false
    
    return this.saveCategories(filtered)
  }

  /**
   * تفعيل فئة
   */
  activateCategory(id: string): boolean {
    return this.updateCategory(id, { isActive: true })
  }

  /**
   * البحث في الفئات
   */
  searchCategories(query: string, includeInactive = false): Category[] {
    const categories = this.getCategories(includeInactive)
    const searchTerm = query.toLowerCase().trim()
    
    if (!searchTerm) return categories

    return categories.filter(c =>
      c.name.toLowerCase().includes(searchTerm) ||
      c.description?.toLowerCase().includes(searchTerm)
    )
  }

  /**
   * الحصول على فئة بالمعرف
   */
  getCategoryById(id: string): Category | null {
    const categories = this.getCategories(true)
    return categories.find(c => c.id === id) || null
  }

  /**
   * الحصول على فئة بالاسم
   */
  getCategoryByName(name: string): Category | null {
    const categories = this.getCategories(true)
    return categories.find(c => c.name.toLowerCase() === name.toLowerCase()) || null
  }

  /**
   * حساب السعر بناءً على الفئة
   */
  calculatePriceForCategory(basePrice: number, categoryId: string): number {
    const category = this.getCategoryById(categoryId)
    if (!category) return basePrice
    
    return Math.round(basePrice * category.multiplier)
  }

  /**
   * الحصول على الألوان المتاحة
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
      { value: 'gold', label: 'ذهبي', hex: '#D4AF37' }
    ]
  }

  /**
   * إنشاء معرف فريد
   */
  private generateId(): string {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9)
  }

  /**
   * الحصول على إحصائيات الفئات
   */
  getStatistics(): CategoryStats {
    const allCategories = this.getCategories(true)
    const activeCategories = allCategories.filter(c => c.isActive)
    
    if (allCategories.length === 0) {
      return {
        totalCategories: 0,
        activeCategories: 0,
        averageMultiplier: 1.0,
        mostUsedColor: 'blue'
      }
    }

    const multipliers = activeCategories.map(c => c.multiplier)
    const averageMultiplier = multipliers.reduce((a, b) => a + b, 0) / multipliers.length

    // الحصول على اللون الأكثر استخداماً
    const colorCounts: Record<string, number> = {}
    activeCategories.forEach(c => {
      colorCounts[c.color] = (colorCounts[c.color] || 0) + 1
    })
    
    const mostUsedColor = Object.entries(colorCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'blue'

    return {
      totalCategories: allCategories.length,
      activeCategories: activeCategories.length,
      averageMultiplier: Math.round(averageMultiplier * 100) / 100,
      mostUsedColor
    }
  }

  /**
   * ترتيب الفئات
   */
  sortCategories(categories: Category[], sortBy: 'name' | 'multiplier' | 'createdAt' = 'name'): Category[] {
    return [...categories].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name, 'ar')
        case 'multiplier':
          return a.multiplier - b.multiplier
        case 'createdAt':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        default:
          return 0
      }
    })
  }

  /**
   * تصدير الفئات
   */
  exportCategories(): string {
    const categories = this.getCategories(true)
    return JSON.stringify(categories, null, 2)
  }

  /**
   * استيراد الفئات
   */
  importCategories(jsonData: string): { success: boolean, imported: number, errors: string[] } {
    try {
      const importedCategories = JSON.parse(jsonData) as Category[]
      const existingCategories = this.getCategories(true)
      const errors: string[] = []
      let imported = 0

      importedCategories.forEach((category, index) => {
        // التحقق من صحة البيانات
        const validation = this.validateCategory(category)
        if (validation.length > 0) {
          errors.push(`الفئة ${index + 1}: ${validation.join(', ')}`)
          return
        }

        // التحقق من التكرار
        const exists = existingCategories.find(c => 
          c.name.toLowerCase() === category.name.toLowerCase()
        )

        if (exists) {
          // تحديث الفئة الموجودة
          this.updateCategory(exists.id, {
            description: category.description,
            color: category.color,
            multiplier: category.multiplier,
            isActive: category.isActive
          })
        } else {
          // إضافة فئة جديدة
          const newCategory = this.addCategory({
            name: category.name,
            description: category.description,
            color: category.color,
            multiplier: category.multiplier,
            isActive: category.isActive
          })
          if (newCategory) imported++
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
   * التحقق من صحة بيانات الفئة
   */
  validateCategory(category: Partial<Category>): string[] {
    const errors: string[] = []

    if (!category.name || category.name.trim().length < 2) {
      errors.push('اسم الفئة يجب أن يكون على الأقل حرفين')
    }

    if (category.multiplier === undefined || category.multiplier <= 0) {
      errors.push('مضاعف السعر يجب أن يكون رقم موجب')
    }

    if (category.multiplier !== undefined && category.multiplier > 5) {
      errors.push('مضاعف السعر يبدو كبير جداً (أكبر من 5)')
    }

    if (!category.color || !this.getAvailableColors().some(c => c.value === category.color)) {
      errors.push('اللون المحدد غير صحيح')
    }

    return errors
  }

  /**
   * إعادة تعيين الفئات للقيم الافتراضية
   */
  resetToDefaults(): boolean {
    localStorage.removeItem(this.STORAGE_KEY)
    this.initializeDefaults()
    return true
  }

  /**
   * الحصول على الفئات بلون معين
   */
  getCategoriesByColor(color: string): Category[] {
    const categories = this.getCategories()
    return categories.filter(c => c.color === color)
  }

  /**
   * الحصول على الفئات ضمن نطاق مضاعف معين
   */
  getCategoriesByMultiplierRange(min: number, max: number): Category[] {
    const categories = this.getCategories()
    return categories.filter(c => c.multiplier >= min && c.multiplier <= max)
  }

  /**
   * الحصول على أحدث الفئات المضافة
   */
  getRecentCategories(limit = 5): Category[] {
    const categories = this.getCategories()
    return categories
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit)
  }

  /**
   * تكرار فئة موجودة
   */
  duplicateCategory(id: string, newName?: string): Category | null {
    const category = this.getCategoryById(id)
    if (!category) return null

    const duplicatedCategory = {
      ...category,
      name: newName || `${category.name} - نسخة`,
      id: undefined,
      createdAt: undefined,
      updatedAt: undefined
    }

    delete (duplicatedCategory as any).id
    delete (duplicatedCategory as any).createdAt
    delete (duplicatedCategory as any).updatedAt

    return this.addCategory(duplicatedCategory)
  }
}

export const categoryService = new CategoryService()
