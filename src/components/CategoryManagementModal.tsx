import React, { useState, useEffect } from 'react'
import {
  Plus,
  Edit3,
  Trash2,
  Check,
  X,
  Users,
  AlertTriangle,
  CheckCircle,
  Info,
  Download,
  Upload,
  RotateCcw
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { categoryService, Category } from '@/services/categoryService'
import { formatGregorianDate } from '@/lib/dateUtils'

interface CategoryManagementModalProps {
  isOpen: boolean
  onClose: () => void
  onCategoryAdded?: (category: Category) => void
  onCategoryUpdated?: (category: Category) => void
  onCategoryDeleted?: (categoryId: string) => void
}

const CategoryManagementModal: React.FC<CategoryManagementModalProps> = ({
  isOpen,
  onClose,
  onCategoryAdded,
  onCategoryUpdated,
  onCategoryDeleted
}) => {
  const [categories, setCategories] = useState<Category[]>([])
  const [editingCategory, setEditingCategory] = useState<string | null>(null)
  const [newCategory, setNewCategory] = useState({
    name: '',
    description: '',
    color: 'blue',
    multiplier: 1.0
  })
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'warning' | 'info'
    message: string
  } | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [showInactive, setShowInactive] = useState(false)

  const availableColors = categoryService.getAvailableColors()

  // Load categories
  useEffect(() => {
    if (isOpen) {
      loadCategories()
    }
  }, [isOpen])

  // Show notification
  const showNotification = (type: 'success' | 'error' | 'warning' | 'info', message: string) => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 3000)
  }

  // Load categories from service
  const loadCategories = () => {
    const loadedCategories = categoryService.getCategories(showInactive)
    setCategories(loadedCategories)
  }

  // Add new category
  const addCategory = () => {
    if (!newCategory.name.trim()) {
      showNotification('error', 'اسم الفئة مطلوب')
      return
    }

    if (newCategory.multiplier <= 0) {
      showNotification('error', 'مضاعف السعر يجب أن يكون أكبر من صفر')
      return
    }

    const category = categoryService.addCategory({
      name: newCategory.name,
      description: newCategory.description,
      color: newCategory.color,
      multiplier: newCategory.multiplier,
      isActive: true
    })

    if (category) {
      setCategories(prev => [...prev, category])
      setNewCategory({ name: '', description: '', color: 'blue', multiplier: 1.0 })
      setShowAddForm(false)
      showNotification('success', `تم إضافة فئة "${category.name}" بنجاح`)
      onCategoryAdded?.(category)
    } else {
      showNotification('error', 'اسم الفئة موجود بالفعل')
    }
  }

  // Update category
  const updateCategory = (id: string, updates: Partial<Category>) => {
    const success = categoryService.updateCategory(id, updates)
    
    if (success) {
      loadCategories()
      setEditingCategory(null)
      showNotification('success', 'تم تحديث الفئة بنجاح')
      
      const updatedCategory = categoryService.getCategoryById(id)
      if (updatedCategory) {
        onCategoryUpdated?.(updatedCategory)
      }
    } else {
      showNotification('error', 'فشل في تحديث الفئة')
    }
  }

  // Delete category
  const deleteCategory = (id: string, permanent = false) => {
    const category = categoryService.getCategoryById(id)
    if (!category) return

    if (!window.confirm(`هل أنت متأكد من ${permanent ? 'حذف' : 'إلغاء تفعيل'} فئة "${category.name}"؟`)) return

    const success = permanent 
      ? categoryService.permanentDeleteCategory(id)
      : categoryService.deleteCategory(id)

    if (success) {
      loadCategories()
      showNotification('success', `تم ${permanent ? 'حذف' : 'إلغاء تفعيل'} الفئة بنجاح`)
      onCategoryDeleted?.(id)
    } else {
      showNotification('error', `فشل في ${permanent ? 'حذف' : 'إلغاء تفعيل'} الفئة`)
    }
  }

  // Activate category
  const activateCategory = (id: string) => {
    const success = categoryService.activateCategory(id)
    
    if (success) {
      loadCategories()
      showNotification('success', 'تم تفعيل الفئة بنجاح')
    } else {
      showNotification('error', 'فشل في تفعيل الفئة')
    }
  }

  // Export categories
  const exportCategories = () => {
    try {
      const exportData = categoryService.exportCategories()
      const blob = new Blob([exportData], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'categories.json'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      showNotification('success', 'تم تصدير الفئات بنجاح')
    } catch (error) {
      showNotification('error', 'فشل في تصدير الفئات')
    }
  }

  // Import categories
  const importCategories = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string
        const result = categoryService.importCategories(content)
        
        if (result.success) {
          loadCategories()
          showNotification('success', `تم استيراد ${result.imported} فئة بنجاح`)
        } else {
          showNotification('error', `خطأ في الاستيراد: ${result.errors.join(', ')}`)
        }
      } catch (error) {
        showNotification('error', 'فشل في قراءة الملف')
      }
    }
    reader.readAsText(file)
  }

  // Reset to defaults
  const resetToDefaults = () => {
    if (!window.confirm('هل أنت متأكد من إعادة تعيين الفئات للقيم الافتراضية؟ سيتم حذف جميع الفئات المخصصة.')) return

    const success = categoryService.resetToDefaults()
    if (success) {
      loadCategories()
      showNotification('success', 'تم إعادة تعيين الفئات للقيم الافتراضية')
    } else {
      showNotification('error', 'فشل في إعادة التعيين')
    }
  }

  // Filter categories based on search
  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    category.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Get color display
  const getColorDisplay = (colorValue: string) => {
    const color = availableColors.find(c => c.value === colorValue)
    return color || { value: colorValue, label: colorValue, hex: '#6B7280' }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-60 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">إدارة فئات العملاء</h2>
                <p className="text-sm opacity-90">إضافة وتعديل فئات العملاء ومضاعفات الأسعار</p>
              </div>
            </div>
            <Button
              onClick={onClose}
              variant="outline"
              size="sm"
              className="bg-white/20 border-white/30 text-white hover:bg-white/30"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Notification */}
          {notification && (
            <div className={`mb-6 p-4 rounded-lg border-l-4 ${
              notification.type === 'success' ? 'bg-green-50 border-green-400 text-green-700' :
              notification.type === 'error' ? 'bg-red-50 border-red-400 text-red-700' :
              notification.type === 'warning' ? 'bg-yellow-50 border-yellow-400 text-yellow-700' :
              'bg-blue-50 border-blue-400 text-blue-700'
            }`}>
              <div className="flex items-center gap-2">
                {notification.type === 'success' && <CheckCircle className="w-5 h-5" />}
                {notification.type === 'error' && <AlertTriangle className="w-5 h-5" />}
                {notification.type === 'warning' && <AlertTriangle className="w-5 h-5" />}
                {notification.type === 'info' && <Info className="w-5 h-5" />}
                <span className="font-semibold">{notification.message}</span>
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Input
                  placeholder="البحث في الفئات..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-64"
                />
              </div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={showInactive}
                  onChange={(e) => {
                    setShowInactive(e.target.checked)
                    setTimeout(() => loadCategories(), 100)
                  }}
                  className="rounded"
                />
                <span className="text-sm">إظهار المحذوفة</span>
              </label>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setShowAddForm(true)}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                إضافة فئة
              </Button>
              <input
                type="file"
                accept=".json"
                onChange={importCategories}
                className="hidden"
                id="import-categories"
              />
              <Button
                onClick={() => document.getElementById('import-categories')?.click()}
                variant="outline"
                className="text-blue-600 border-blue-300"
              >
                <Upload className="w-4 h-4 mr-2" />
                استيراد
              </Button>
              <Button
                onClick={exportCategories}
                variant="outline"
                className="text-green-600 border-green-300"
              >
                <Download className="w-4 h-4 mr-2" />
                تصدير
              </Button>
              <Button
                onClick={resetToDefaults}
                variant="outline"
                className="text-orange-600 border-orange-300"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                إعادة تعيين
              </Button>
            </div>
          </div>

          {/* Add Category Form */}
          {showAddForm && (
            <Card className="mb-6 p-4 border-green-200 bg-green-50">
              <h3 className="text-lg font-bold text-green-800 mb-4">إضافة فئة جديدة</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">اسم الفئة</label>
                  <Input
                    value={newCategory.name}
                    onChange={(e) => setNewCategory(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="أدخل اسم الفئة"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">الوصف (اختياري)</label>
                  <Input
                    value={newCategory.description}
                    onChange={(e) => setNewCategory(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="وصف الفئة"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">اللون</label>
                  <select
                    value={newCategory.color}
                    onChange={(e) => setNewCategory(prev => ({ ...prev, color: e.target.value }))}
                    className="w-full p-2 border border-gray-300 rounded-lg"
                  >
                    {availableColors.map(color => (
                      <option key={color.value} value={color.value}>
                        {color.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">مضاعف السعر</label>
                  <Input
                    type="number"
                    value={newCategory.multiplier}
                    onChange={(e) => setNewCategory(prev => ({ 
                      ...prev, 
                      multiplier: parseFloat(e.target.value) || 1.0 
                    }))}
                    placeholder="1.0"
                    step="0.1"
                    min="0.1"
                    max="10"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    1.0 = السعر الأساسي، أقل من 1.0 = خصم، أكبر من 1.0 = زيادة
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={addCategory}
                  disabled={!newCategory.name.trim()}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  إضافة
                </Button>
                <Button
                  onClick={() => {
                    setShowAddForm(false)
                    setNewCategory({ name: '', description: '', color: 'blue', multiplier: 1.0 })
                  }}
                  variant="outline"
                >
                  إلغاء
                </Button>
              </div>
            </Card>
          )}

          {/* Categories List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCategories.map((category) => {
              const colorDisplay = getColorDisplay(category.color)
              const isEditing = editingCategory === category.id

              return (
                <Card key={category.id} className={`p-4 transition-all hover:shadow-lg ${
                  !category.isActive ? 'opacity-60 border-gray-300' : 'border-gray-200'
                }`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded-full border-2 border-gray-300"
                        style={{ backgroundColor: colorDisplay.hex }}
                      ></div>
                      {isEditing ? (
                        <Input
                          value={category.name}
                          onChange={(e) => {
                            const updatedCategories = categories.map(c =>
                              c.id === category.id ? { ...c, name: e.target.value } : c
                            )
                            setCategories(updatedCategories)
                          }}
                          className="text-lg font-bold"
                          autoFocus
                        />
                      ) : (
                        <h4 className="text-lg font-bold text-gray-900">{category.name}</h4>
                      )}
                    </div>
                    <div className="flex gap-1">
                      {category.isActive ? (
                        <>
                          <Button
                            onClick={() => setEditingCategory(isEditing ? null : category.id)}
                            variant="outline"
                            size="sm"
                            className="p-1"
                          >
                            {isEditing ? <Check className="w-3 h-3" /> : <Edit3 className="w-3 h-3" />}
                          </Button>
                          <Button
                            onClick={() => deleteCategory(category.id, false)}
                            variant="outline"
                            size="sm"
                            className="text-red-600 border-red-300 p-1"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </>
                      ) : (
                        <Button
                          onClick={() => activateCategory(category.id)}
                          variant="outline"
                          size="sm"
                          className="text-green-600 border-green-300"
                        >
                          تفعيل
                        </Button>
                      )}
                    </div>
                  </div>

                  {isEditing ? (
                    <div className="space-y-2">
                      <Input
                        value={category.description || ''}
                        onChange={(e) => {
                          const updatedCategories = categories.map(c =>
                            c.id === category.id ? { ...c, description: e.target.value } : c
                          )
                          setCategories(updatedCategories)
                        }}
                        placeholder="الوصف"
                      />
                      <Input
                        type="number"
                        value={category.multiplier}
                        onChange={(e) => {
                          const updatedCategories = categories.map(c =>
                            c.id === category.id ? { ...c, multiplier: parseFloat(e.target.value) || 1.0 } : c
                          )
                          setCategories(updatedCategories)
                        }}
                        step="0.1"
                        min="0.1"
                        max="10"
                      />
                      <select
                        value={category.color}
                        onChange={(e) => {
                          const updatedCategories = categories.map(c =>
                            c.id === category.id ? { ...c, color: e.target.value } : c
                          )
                          setCategories(updatedCategories)
                        }}
                        className="w-full p-2 border border-gray-300 rounded-lg"
                      >
                        {availableColors.map(color => (
                          <option key={color.value} value={color.value}>
                            {color.label}
                          </option>
                        ))}
                      </select>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => updateCategory(category.id, {
                            name: category.name,
                            description: category.description,
                            color: category.color,
                            multiplier: category.multiplier
                          })}
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          حفظ
                        </Button>
                        <Button
                          onClick={() => {
                            setEditingCategory(null)
                            loadCategories() // Reset changes
                          }}
                          variant="outline"
                          size="sm"
                        >
                          إلغاء
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {category.description && (
                        <p className="text-sm text-gray-600 mb-2">{category.description}</p>
                      )}
                      <div className="flex items-center justify-between">
                        <Badge
                          className={`bg-${category.color}-100 text-${category.color}-800 border-${category.color}-200`}
                        >
                          مضاعف: {category.multiplier}×
                        </Badge>
                        {!category.isActive && (
                          <Badge variant="outline" className="bg-gray-100 text-gray-600">
                            معطل
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-2">
                        آخر تحديث: {formatGregorianDate(category.updatedAt)}
                      </div>
                    </>
                  )}
                </Card>
              )
            })}
          </div>

          {filteredCategories.length === 0 && (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">لا توجد فئات</h3>
              <p className="text-gray-500 mb-4">
                {searchTerm ? 'لا توجد فئات تطابق البحث' : 'لم يتم إنشاء أي فئات بعد'}
              </p>
              {!searchTerm && (
                <Button
                  onClick={() => setShowAddForm(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  إضافة أول فئة
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default CategoryManagementModal
