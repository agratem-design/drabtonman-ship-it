import React, { useState, useEffect } from 'react'
import {
  Settings,
  Save,
  RotateCcw,
  Plus,
  Trash2,
  Edit3,
  Check,
  X,
  Search,
  Calculator,
  AlertTriangle,
  CheckCircle,
  MapPin,
  Building2,
  Wrench,
  TrendingUp,
  Download,
  FileText
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { installationPricingService } from '@/services/installationPricingService'
import { newPricingService } from '@/services/newPricingService'
import { InstallationPricing, InstallationPriceZone, BillboardSize, InstallationQuote } from '@/types'

interface InstallationPricingManagementProps {
  onClose: () => void
}

interface UnsavedChanges {
  hasChanges: boolean
  changedCells: Set<string>
}

const InstallationPricingManagement: React.FC<InstallationPricingManagementProps> = ({ onClose }) => {
  // State Management
  const [pricing, setPricing] = useState<InstallationPricing>({
    zones: {},
    sizes: [],
    currency: 'د.ل',
    lastUpdated: new Date().toISOString()
  })
  
  const [editingCell, setEditingCell] = useState<string | null>(null)
  const [editingValue, setEditingValue] = useState<string>('')
  const [unsavedChanges, setUnsavedChanges] = useState<UnsavedChanges>({ hasChanges: false, changedCells: new Set() })
  const [loading, setLoading] = useState(false)
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddZoneModal, setShowAddZoneModal] = useState(false)
  const [newZone, setNewZone] = useState({ name: '', multiplier: 1.0, description: '' })
  const [showQuoteModal, setShowQuoteModal] = useState(false)
  const [quoteItems, setQuoteItems] = useState<{ size: BillboardSize; zone: string; quantity: number; description?: string }[]>([])
  const [customerInfo, setCustomerInfo] = useState({ name: '', email: '', phone: '', company: '' })
  const [discount, setDiscount] = useState(0)
  const [quoteNotes, setQuoteNotes] = useState('')
  const [showImportZones, setShowImportZones] = useState(false)
  const [systemZones, setSystemZones] = useState<string[]>([])
  const [selectedSystemZones, setSelectedSystemZones] = useState<Set<string>>(new Set())

  // Load pricing data on component mount
  useEffect(() => {
    loadPricingDataFromCloud()
  }, [])

  // تحميل البيانات من السحابة مع fallback محلي
  const loadPricingDataFromCloud = async () => {
    try {
      setLoading(true)
      
      // محاولة تحميل من السحابة أولاً
      const cloudData = await cloudDatabase.getInstallationPricing()
      
      if (cloudData) {
        setPricing(cloudData)
        console.log('✅ تم تحميل أسعار التركيب من السحابة')
      } else {
        // استخدام البيانات المحلية كبديل
        const localData = installationPricingService.getInstallationPricing()
        setPricing(localData)
        console.log('⚠️ تم تحميل أسعار التركيب محلياً (السحابة غير متاحة)')
      }
      
      setUnsavedChanges({ hasChanges: false, changedCells: new Set() })
    } catch (error) {
      console.error('Error loading installation pricing from cloud:', error)
      // استخدام البيانات المحلية في حالة الخطأ
      const localData = installationPricingService.getInstallationPricing()
      setPricing(localData)
      showNotification('error', 'تم تحميل البيانات محلياً بسبب خطأ في السحابة')
    } finally {
      setLoading(false)
    }
  }

  // Load zones from system pricing when opening import modal
  useEffect(() => {
    if (showImportZones) {
      try {
        const zones = newPricingService.getPricingZones()
        const existing = new Set(Object.keys(pricing.zones))
        setSystemZones(zones.filter(z => !existing.has(z)))
        setSelectedSystemZones(new Set())
      } catch (e) {
        setSystemZones([])
      }
    }
  }, [showImportZones])

  // Show notification temporarily
  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 3000)
  }

  // Load pricing data from service
  const loadPricingData = () => {
    try {
      setLoading(true)
      const data = installationPricingService.getInstallationPricing()
      setPricing(data)
      setUnsavedChanges({ hasChanges: false, changedCells: new Set() })
    } catch (error) {
      console.error('Error loading installation pricing:', error)
      showNotification('error', 'حدث خطأ في تحميل البيانات')
    } finally {
      setLoading(false)
    }
  }

  // Save pricing data
  const savePricingData = async () => {
    try {
      setLoading(true)
      const result = installationPricingService.updateInstallationPricing(pricing)
      
      if (result.success) {
        setUnsavedChanges({ hasChanges: false, changedCells: new Set() })
        showNotification('success', 'تم حفظ أسعار التركيب بنجاح')
        
        // محاولة المزامنة مع السحابة
        try {
          const cloudSuccess = await cloudDatabase.saveInstallationPricing(pricing)
          if (cloudSuccess) {
            showNotification('success', 'تم رفع البيانات للسحابة بنجاح')
          } else {
            showNotification('success', 'تم الحفظ محلياً (السحابة غير متاحة)')
          }
        } catch (cloudError) {
          console.warn('خطأ في رفع البيانات للسحابة:', cloudError)
          showNotification('success', 'تم الحفظ محلياً (السحابة غير متاحة)')
        }
      } else {
        showNotification('error', result.message)
      }
    } catch (error) {
      console.error('Error saving installation pricing:', error)
      showNotification('error', 'حدث خطأ في حفظ البيانات')
    } finally {
      setLoading(false)
    }
  }

  // Reset all changes
  const resetChanges = () => {
    if (window.confirm('هل أنت متأكد من إلغاء جميع التغييرات؟')) {
      loadPricingData()
      showNotification('success', 'تم إلغاء جميع التغييرات')
    }
  }

  // Handle cell editing
  const startEdit = (_zone: string, size: BillboardSize) => {
    const cellKey = `base-${size}`
    setEditingCell(cellKey)
    const base = (pricing as InstallationPricing).basePrices?.[size] ?? pricing.zones[Object.keys(pricing.zones)[0]]?.prices[size] ?? ''
    setEditingValue(base.toString())
  }

  const saveEdit = () => {
    if (!editingCell) return
    const [, size] = editingCell.split('-')
    const value = parseInt(editingValue) || 0
    if (value < 0) {
      showNotification('error', 'لا يمكن أن يكون السعر أقل من صفر')
      return
    }

    setPricing(prev => {
      const updated: InstallationPricing = {
        ...prev,
        basePrices: { ...(prev.basePrices || {}), [size as BillboardSize]: value },
        zones: { ...prev.zones }
      }
      Object.keys(updated.zones).forEach(z => {
        updated.zones[z] = {
          ...updated.zones[z],
          prices: { ...updated.zones[z].prices, [size as BillboardSize]: value }
        }
      })
      return updated
    })

    setUnsavedChanges(prev => ({
      hasChanges: true,
      changedCells: new Set([...prev.changedCells, editingCell])
    }))

    setEditingCell(null)
    showNotification('success', 'تم تحديث السعر الأساسي للمقاس بنجاح')
  }

  const cancelEdit = () => {
    setEditingCell(null)
    setEditingValue('')
  }

  // Add new size
  const addSize = () => {
    const newSize = prompt('أدخل المقاس الجديد (مثال: 6x14):')
    if (!newSize || !installationPricingService.validateSize(newSize)) {
      showNotification('error', 'يرجى إدخال مقاس صحيح بصيغة رقمxرقم')
      return
    }

    if (pricing.sizes.includes(newSize)) {
      showNotification('error', 'هذا المقاس موجود بالفعل')
      return
    }

    const defaultPrice = parseInt(prompt('أدخل السعر الافتراضي للمقاس الجديد:') || '500')
    if (defaultPrice < 0) {
      showNotification('error', 'السعر يجب أن يكون أكبر من أو يساوي صفر')
      return
    }

    const result = installationPricingService.addSizeToAllZones(newSize, defaultPrice)
    if (result.success) {
      loadPricingData()
      showNotification('success', result.message)
    } else {
      showNotification('error', result.message)
    }
  }

  // Remove size
  const removeSize = (size: BillboardSize) => {
    if (!window.confirm(`هل أنت متأكد من حذف مقاس "${size}"؟`)) return

    const result = installationPricingService.removeSizeFromAllZones(size)
    if (result.success) {
      loadPricingData()
      showNotification('success', result.message)
    } else {
      showNotification('error', result.message)
    }
  }

  // Add new zone
  const addZone = () => {
    if (!newZone.name.trim()) {
      showNotification('error', 'يرجى إدخال اسم المنطقة')
      return
    }

    const result = installationPricingService.addZone(newZone.name, newZone.multiplier, newZone.description)
    if (result.success) {
      loadPricingData()
      setNewZone({ name: '', multiplier: 1.0, description: '' })
      setShowAddZoneModal(false)
      showNotification('success', result.message)
    } else {
      showNotification('error', result.message)
    }
  }

  // Remove zone
  const removeZone = (zoneName: string) => {
    if (!window.confirm(`هل أنت متأكد من حذف منطقة "${zoneName}"؟`)) return

    const result = installationPricingService.removeZone(zoneName)
    if (result.success) {
      loadPricingData()
      showNotification('success', result.message)
    } else {
      showNotification('error', result.message)
    }
  }

  // Update zone multiplier
  const updateZoneMultiplier = (zoneName: string, multiplier: number) => {
    const updatedPricing = {
      ...pricing,
      zones: {
        ...pricing.zones,
        [zoneName]: {
          ...pricing.zones[zoneName],
          multiplier: multiplier
        }
      }
    }

    setPricing(updatedPricing)

    // Save immediately to localStorage to ensure multipliers are persisted
    installationPricingService.updateInstallationPricing(updatedPricing)

    setUnsavedChanges(prev => ({
      hasChanges: true,
      changedCells: new Set([...prev.changedCells, `zone-${zoneName}`])
    }))

    showNotification('success', `تم تحديث معامل ${zoneName} إلى ${multiplier}`)
  }

  // Calculate final price with multiplier
  const getFinalPrice = (basePrice: number, multiplier: number): number => {
    return Math.round(basePrice * multiplier)
  }

  // Format price with currency
  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price) + ' د.ل'
  }

  // Filter sizes based on search
  const filteredSizes = pricing.sizes.filter(size =>
    size.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Generate installation quote
  const generateQuote = () => {
    if (quoteItems.length === 0 || !customerInfo.name.trim()) {
      showNotification('error', 'يرجى إضافة عناصر للفاتورة ومعلومات العميل')
      return
    }

    const quote = installationPricingService.generateInstallationQuote(
      quoteItems,
      customerInfo,
      discount,
      quoteNotes
    )

    // Print the quote
    installationPricingService.printInstallationQuote(quote)
    
    // Reset quote modal
    setShowQuoteModal(false)
    setQuoteItems([])
    setCustomerInfo({ name: '', email: '', phone: '', company: '' })
    setDiscount(0)
    setQuoteNotes('')
    
    showNotification('success', 'تم إنشاء فاتورة العرض بنجاح')
  }

  // Add item to quote
  const addQuoteItem = () => {
    const newItem = {
      size: pricing.sizes[0] || '3x4',
      zone: Object.keys(pricing.zones)[0] || 'مصراتة',
      quantity: 1,
      description: ''
    }
    setQuoteItems(prev => [...prev, newItem])
  }

  // Update quote item
  const updateQuoteItem = (index: number, field: string, value: any) => {
    setQuoteItems(prev => prev.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    ))
  }

  // Remove quote item
  const removeQuoteItem = (index: number) => {
    setQuoteItems(prev => prev.filter((_, i) => i !== index))
  }

  // Get pricing statistics
  const stats = installationPricingService.getPricingStatistics()

  if (loading && Object.keys(pricing.zones).length === 0) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-8 text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">جاري تحميل البيانات...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-7xl max-h-[95vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-600 to-red-600 p-6 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-orange-700/20 via-transparent to-red-700/20"></div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center shadow-lg backdrop-blur-sm">
                <Wrench className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-3xl font-black mb-1">إدارة أسعار التركيب</h1>
                <p className="text-sm opacity-80 font-medium">نظام متطور لإدارة أسعار تركيب اللوحات الإعلانية</p>
              </div>
            </div>
            <Button
              onClick={onClose}
              variant="outline"
              size="sm"
              className="bg-white/20 border-white/30 text-white hover:bg-white/30 backdrop-blur-sm"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(95vh-120px)] bg-gradient-to-br from-gray-50 to-orange-50">
          {/* Notification */}
          {notification && (
            <div className={`mb-6 p-4 rounded-lg border-l-4 ${
              notification.type === 'success' 
                ? 'bg-green-50 border-green-400 text-green-700' 
                : 'bg-red-50 border-red-400 text-red-700'
            }`}>
              <div className="flex items-center gap-2">
                {notification.type === 'success' ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  <AlertTriangle className="w-5 h-5" />
                )}
                <span className="font-semibold">{notification.message}</span>
              </div>
            </div>
          )}

          {/* Unsaved Changes Bar */}
          {unsavedChanges.hasChanges && (
            <div className="sticky top-0 z-10 mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-yellow-800">
                  <AlertTriangle className="w-5 h-5" />
                  <span className="font-semibold">لديك تغييرات غير محفوظة</span>
                  <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
                    {unsavedChanges.changedCells.size} تغيير
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={savePricingData}
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white"
                    disabled={loading}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    حفظ الكل
                  </Button>
                  <Button
                    onClick={resetChanges}
                    variant="outline"
                    size="sm"
                    className="text-yellow-800 border-yellow-300"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    تراجع الكل
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Explanation Card */}
          <Card className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200">
            <div className="p-4">
              <h3 className="text-lg font-bold text-blue-900 mb-2 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                كيفية عمل أسعار التركيب
              </h3>
              <div className="text-sm text-blue-800 space-y-1">
                <p>• السعر الأساسي: السعر المدخل لكل مقاس</p>
                <p>• المعامل: رقم يضرب في السعر الأساسي حسب المنطقة</p>
                <p>• السعر النهائي: السعر الأساسي × المعامل</p>
                <p>• مثال: سعر أساسي 1000 د.ل × معامل 1.2 = 1200 د.ل (السعر النهائي)</p>
              </div>
            </div>
          </Card>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{stats.totalZones}</h3>
                  <p className="text-sm text-gray-600">منطقة</p>
                </div>
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{stats.totalSizes}</h3>
                  <p className="text-sm text-gray-600">مقاس</p>
                </div>
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{formatPrice(stats.averagePrice)}</h3>
                  <p className="text-sm text-gray-600">متوسط السعر</p>
                </div>
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                  <Calculator className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{formatPrice(stats.maxPrice)}</h3>
                  <p className="text-sm text-gray-600">أعلى سعر</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="البحث في المقاسات..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64 border-2 border-orange-300 focus:border-orange-500 rounded-xl"
                />
              </div>
              <Button
                onClick={addSize}
                variant="outline"
                className="text-green-600 border-2 border-green-300 hover:bg-green-50 font-bold px-4 py-2 rounded-xl"
              >
                <Plus className="w-4 h-4 mr-2" />
                إضافة مقاس
              </Button>
              <Button
                onClick={() => setShowAddZoneModal(true)}
                variant="outline"
                className="text-blue-600 border-2 border-blue-300 hover:bg-blue-50 font-bold px-4 py-2 rounded-xl"
              >
                <Plus className="w-4 h-4 mr-2" />
                إضافة منطقة
              </Button>
              <Button
                onClick={() => setShowImportZones(true)}
                variant="outline"
                className="text-purple-600 border-2 border-purple-300 hover:bg-purple-50 font-bold px-4 py-2 rounded-xl"
              >
                <Plus className="w-4 h-4 mr-2" />
                إضافة مناطق من النظام
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setShowQuoteModal(true)}
                className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-bold px-6 py-2 rounded-xl shadow-lg"
              >
                <FileText className="w-4 h-4 mr-2" />
                إنشاء فاتورة عرض
              </Button>
            </div>
          </div>

          {/* Base Prices (sizes only) */}
          <Card className="mb-6 shadow-xl rounded-xl overflow-hidden border-2 border-emerald-200">
            <div className="p-6 bg-gradient-to-r from-emerald-50 to-emerald-100 border-b border-emerald-200">
              <h3 className="text-2xl font-black text-gray-900 flex items-center gap-3 mb-2">
                <Wrench className="w-6 h-6 text-emerald-600" />
                الأسعار الأساسية حسب المقاسات
              </h3>
              <p className="text-sm text-gray-700 font-medium">هذه الأسعار موحدة لكل المناطق. يمكن تعديلها بالنقر على أي مقاس.</p>
            </div>
            <div className="overflow-x-auto bg-white">
              <table className="w-full border-collapse">
                <thead className="sticky top-0 bg-white shadow-sm">
                  <tr>
                    {pricing.sizes.map(size => (
                      <th key={size} className="border border-gray-200 p-4 text-center font-black text-white min-w-[120px] bg-gradient-to-r from-emerald-500 to-emerald-600 shadow-lg">
                        <div className="leading-tight">
                          <div className="text-lg">{size}</div>
                          <div className="text-xs opacity-90 mt-1">سعر أساسي</div>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    {pricing.sizes.map(size => {
                      const cellKey = `base-${size}`
                      const basePrice = (pricing as InstallationPricing).basePrices?.[size] ?? 0
                      const isEditing = editingCell === cellKey
                      const hasChanges = unsavedChanges.changedCells.has(cellKey)
                      return (
                        <td key={size} className={`border border-gray-200 p-2 text-center ${hasChanges ? 'bg-yellow-100' : ''}`}>
                          {isEditing ? (
                            <div className="flex items-center gap-1 justify-center">
                              <Input type="number" value={editingValue} onChange={(e) => setEditingValue(e.target.value)} className="w-24 text-center font-bold text-sm" min="0" autoFocus />
                              <Button onClick={saveEdit} size="sm" className="bg-green-600 hover:bg-green-700 text-white p-1"><Check className="w-3 h-3" /></Button>
                              <Button onClick={cancelEdit} size="sm" variant="outline" className="text-red-600 border-red-300 p-1"><X className="w-3 h-3" /></Button>
                            </div>
                          ) : (
                            <div className="cursor-pointer group py-2 px-3 hover:bg-emerald-50 rounded-lg transition-all" onClick={() => startEdit('base', size)} title={`السعر الأساسي: ${formatPrice(basePrice)}`}>
                              <span className="font-bold text-gray-800 text-sm bg-gray-100 px-2 py-1 rounded">{formatPrice(basePrice)}</span>
                            </div>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>

          {/* Pricing Table */}
          <Card className="mb-6 shadow-xl rounded-xl overflow-hidden border-2 border-gray-200">
            <div className="p-6 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
              <h3 className="text-2xl font-black text-gray-900 flex items-center gap-3 mb-2">
                <Calculator className="w-6 h-6 text-orange-600" />
                أسعار التركيب حسب المناطق والمقاسات
              </h3>
              <p className="text-sm text-gray-700 font-medium">جميع الأسعار شاملة تكلفة التركيب والتأسيس</p>
            </div>
            <div className="overflow-x-auto bg-white">
              <table className="w-full border-collapse">
                <thead className="sticky top-0 bg-white shadow-sm">
                  <tr>
                    <th className="border border-gray-200 p-4 text-right font-black bg-gradient-to-r from-orange-100 to-orange-200 text-gray-900 min-w-[150px] shadow-sm">
                      المنطقة
                    </th>
                    <th className="border border-gray-200 p-4 text-center font-black bg-gradient-to-r from-orange-100 to-orange-200 text-gray-900 min-w-[120px] shadow-sm">
                      المعامل
                    </th>
                    <th className="border border-gray-200 p-4 text-center font-black bg-gradient-to-r from-red-500 to-red-600 text-white min-w-[120px] shadow-sm">
                      الإجراءات
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {Object.values(pricing.zones).map((zone, index) => (
                    <tr key={zone.name} className={`hover:bg-orange-50 transition-all duration-200 ${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}>
                      <td className="border border-gray-200 p-4 font-bold text-gray-900 bg-gradient-to-r from-orange-50 to-orange-100">
                        <div>
                          <div className="font-black text-lg">{zone.name}</div>
                          {zone.description && (
                            <div className="text-sm text-gray-600 mt-1 font-medium">{zone.description}</div>
                          )}
                        </div>
                      </td>
                      <td className="border border-gray-200 p-3 text-center">
                        <Input
                          type="number"
                          value={zone.multiplier}
                          onChange={(e) => {
                            const newMultiplier = parseFloat(e.target.value) || 1.0
                            updateZoneMultiplier(zone.name, newMultiplier)
                          }}
                          onBlur={() => {
                            // Force save when user finishes editing
                            savePricingData()
                          }}
                          className="w-24 text-center font-bold text-lg border-2 border-purple-300 focus:border-purple-500 bg-white rounded-lg shadow-sm"
                          step="0.1"
                          min="0"
                          placeholder="1.0"
                        />
                      </td>
                      <td className="border border-gray-200 p-4 text-center">
                        <Button
                          onClick={() => removeZone(zone.name)}
                          variant="outline"
                          size="sm"
                          className="text-red-600 border-2 border-red-300 hover:bg-red-50 transition-colors font-bold rounded-lg"
                          disabled={Object.keys(pricing.zones).length <= 1}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Size Management */}
          <Card className="mb-6 shadow-lg rounded-xl border-2 border-blue-200">
            <div className="p-6 bg-gradient-to-r from-blue-50 to-blue-100 border-b border-blue-200">
              <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
                <Building2 className="w-6 h-6 text-blue-600" />
                إدارة المقاسات
              </h3>
            </div>
            <div className="p-6 bg-white">
              <div className="flex flex-wrap gap-2">
                {pricing.sizes.map(size => (
                  <div key={size} className="flex items-center gap-2 bg-gradient-to-r from-blue-100 to-blue-200 px-4 py-3 rounded-xl border border-blue-300 shadow-sm">
                    <span className="font-bold text-blue-900 text-lg">{size}</span>
                    <Button
                      onClick={() => removeSize(size)}
                      size="sm"
                      variant="outline"
                      className="text-red-600 border-red-300 hover:bg-red-50 p-1 h-7 w-7 rounded-lg"
                      disabled={pricing.sizes.length <= 1}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  onClick={addSize}
                  size="sm"
                  variant="outline"
                  className="text-green-600 border-2 border-green-300 hover:bg-green-50 font-bold px-4 py-3 rounded-xl"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  إضافة مقاس
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Import Zones Modal */}
        {showImportZones && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-60">
            <Card className="w-full max-w-lg p-6">
              <h3 className="text-xl font-bold mb-4">إضافة مناطق من النظام</h3>
              <div className="mb-3 text-sm text-gray-600">اختر البلديات الموجودة في نظام التسعير لإضافتها هنا (المعامل الافتراضي 1.0)</div>
              <div className="max-h-80 overflow-y-auto border rounded-md p-3 space-y-2 bg-white">
                {systemZones.length === 0 && (
                  <div className="text-sm text-gray-500">لا توجد مناطق جديدة للإضافة</div>
                )}
                {systemZones.map(name => (
                  <label key={name} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedSystemZones.has(name)}
                      onChange={(e) => {
                        const next = new Set(selectedSystemZones)
                        if (e.target.checked) next.add(name); else next.delete(name)
                        setSelectedSystemZones(next)
                      }}
                    />
                    <span className="font-semibold">{name}</span>
                  </label>
                ))}
              </div>
              <div className="flex gap-2 mt-6">
                <Button
                  onClick={async () => {
                    for (const name of Array.from(selectedSystemZones)) {
                      installationPricingService.addZone(name, 1.0)
                    }
                    loadPricingData()
                    setShowImportZones(false)
                  }}
                  disabled={selectedSystemZones.size === 0}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
                >
                  إضافة المناطق المحددة
                </Button>
                <Button onClick={() => setShowImportZones(false)} variant="outline" className="flex-1">إلغاء</Button>
              </div>
            </Card>
          </div>
        )}

        {/* Add Zone Modal */}
        {showAddZoneModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-60">
            <Card className="w-full max-w-md p-6">
              <h3 className="text-xl font-bold mb-4">إضافة منطقة جديدة</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">اسم المنطقة</label>
                  <Input
                    value={newZone.name}
                    onChange={(e) => setNewZone(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="أدخل اسم المنطقة"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">المعامل</label>
                  <Input
                    type="number"
                    value={newZone.multiplier}
                    onChange={(e) => setNewZone(prev => ({ ...prev, multiplier: parseFloat(e.target.value) || 1.0 }))}
                    placeholder="1.0"
                    step="0.1"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">الوصف (اختياري)</label>
                  <Input
                    value={newZone.description}
                    onChange={(e) => setNewZone(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="وصف المنطقة"
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-6">
                <Button
                  onClick={addZone}
                  disabled={!newZone.name.trim()}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  إ��افة
                </Button>
                <Button
                  onClick={() => setShowAddZoneModal(false)}
                  variant="outline"
                  className="flex-1"
                >
                  إلغاء
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Quote Modal */}
        {showQuoteModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-60">
            <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6">
              <h3 className="text-xl font-bold mb-4">إنشاء فاتورة عرض التركيب</h3>
              
              {/* Customer Info */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <Input
                  placeholder="اسم العميل *"
                  value={customerInfo.name}
                  onChange={(e) => setCustomerInfo(prev => ({ ...prev, name: e.target.value }))}
                />
                <Input
                  placeholder="اسم الشركة"
                  value={customerInfo.company}
                  onChange={(e) => setCustomerInfo(prev => ({ ...prev, company: e.target.value }))}
                />
                <Input
                  placeholder="البريد الإلكتروني"
                  value={customerInfo.email}
                  onChange={(e) => setCustomerInfo(prev => ({ ...prev, email: e.target.value }))}
                />
                <Input
                  placeholder="رقم الهاتف"
                  value={customerInfo.phone}
                  onChange={(e) => setCustomerInfo(prev => ({ ...prev, phone: e.target.value }))}
                />
              </div>

              {/* Quote Items */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-bold">عناصر الفاتورة</h4>
                  <Button onClick={addQuoteItem} size="sm" className="bg-green-600 hover:bg-green-700 text-white">
                    <Plus className="w-4 h-4 mr-2" />
                    إضافة عنصر
                  </Button>
                </div>
                
                {quoteItems.map((item, index) => (
                  <div key={index} className="grid grid-cols-5 gap-2 mb-3 p-3 border rounded-lg">
                    <select
                      value={item.size}
                      onChange={(e) => updateQuoteItem(index, 'size', e.target.value)}
                      className="p-2 border rounded"
                    >
                      {pricing.sizes.map(size => (
                        <option key={size} value={size}>{size}</option>
                      ))}
                    </select>
                    
                    <select
                      value={item.zone}
                      onChange={(e) => updateQuoteItem(index, 'zone', e.target.value)}
                      className="p-2 border rounded"
                    >
                      {Object.keys(pricing.zones).map(zone => (
                        <option key={zone} value={zone}>{zone}</option>
                      ))}
                    </select>
                    
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateQuoteItem(index, 'quantity', parseInt(e.target.value) || 1)}
                      placeholder="الكمية"
                      min="1"
                    />
                    
                    <Input
                      value={item.description}
                      onChange={(e) => updateQuoteItem(index, 'description', e.target.value)}
                      placeholder="الوصف"
                    />
                    
                    <Button
                      onClick={() => removeQuoteItem(index)}
                      variant="outline"
                      size="sm"
                      className="text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>

              {/* Discount and Notes */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-bold mb-1">الخصم (%)</label>
                  <Input
                    type="number"
                    value={discount}
                    onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                    min="0"
                    max="100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1">ملاحظات</label>
                  <Input
                    value={quoteNotes}
                    onChange={(e) => setQuoteNotes(e.target.value)}
                    placeholder="ملاح��ات إضافية"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={generateQuote}
                  disabled={quoteItems.length === 0 || !customerInfo.name.trim()}
                  className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  إنشاء وطباعة الفاتورة
                </Button>
                <Button
                  onClick={() => setShowQuoteModal(false)}
                  variant="outline"
                  className="flex-1"
                >
                  إلغاء
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}

export default InstallationPricingManagement
