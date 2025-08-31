import React, { useState, useEffect } from 'react'
import {
  Save,
  Edit3,
  Plus,
  Trash2,
  RefreshCw,
  Settings,
  Database,
  FileSpreadsheet,
  Download,
  Upload,
  X,
  Check,
  AlertTriangle,
  CheckCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { databasePricingService, PricingTableRow, CityMultiplierRow } from '@/services/databasePricingService'

interface ModernPricingInterfaceProps {
  onClose: () => void
}

const ModernPricingInterface: React.FC<ModernPricingInterfaceProps> = ({ onClose }) => {
  // State للأسعار
  const [pricingData, setPricingData] = useState<PricingTableRow[]>([])
  const [cityMultipliers, setCityMultipliers] = useState<CityMultiplierRow[]>([])
  const [selectedCategory, setSelectedCategory] = useState<'A' | 'B'>('A')
  const [selectedZone, setSelectedZone] = useState<string>('مصراتة')
  
  // State للتحكم
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [editingCell, setEditingCell] = useState<{ 
    size: string, 
    duration: number, 
    type: 'price' | 'multiplier',
    city?: string 
  } | null>(null)
  const [tempValue, setTempValue] = useState('')

  // State لإضافة مقاس جديد
  const [showAddSize, setShowAddSize] = useState(false)
  const [newSize, setNewSize] = useState('')
  const [newSizePriceA, setNewSizePriceA] = useState(1000)
  const [newSizePriceB, setNewSizePriceB] = useState(800)

  // المدد المتاحة
  const availableDurations = databasePricingService.getAvailableDurations()
  const mainCities = databasePricingService.getMainCities()
  const availableZones = ['مصراتة', 'طرابلس', 'بنغازي']

  useEffect(() => {
    loadData()
  }, [])

  const showNotification = (type: 'success' | 'error', message: string) => {
    if (type === 'success') {
      setSuccess(message)
      setError('')
      setTimeout(() => setSuccess(''), 3000)
    } else {
      setError(message)
      setSuccess('')
      setTimeout(() => setError(''), 5000)
    }
  }

  const loadData = async () => {
    setLoading(true)
    try {
      const [pricing, multipliers] = await Promise.all([
        databasePricingService.getPricingTable(),
        databasePricingService.getCityMultiplierTable()
      ])
      
      setPricingData(pricing)
      setCityMultipliers(multipliers)
    } catch (err) {
      showNotification('error', 'خطأ في تحميل البيانات')
    } finally {
      setLoading(false)
    }
  }

  const initializeDatabase = async () => {
    setLoading(true)
    try {
      const result = await databasePricingService.initializeTables()
      if (result.success) {
        showNotification('success', result.message)
        await loadData()
      } else {
        showNotification('error', result.message)
      }
    } catch (err) {
      showNotification('error', 'خطأ في تهيئة قاعدة البيانات')
    } finally {
      setLoading(false)
    }
  }

  const handleCellEdit = (size: string, duration?: number, city?: string) => {
    if (duration) {
      // تحرير سعر
      const row = pricingData.find(r => r.billboard_size === size)
      const currentPrice = row?.prices[duration]?.[selectedCategory] || 0
      setEditingCell({ size, duration, type: 'price' })
      setTempValue(currentPrice.toString())
    } else if (city) {
      // تحرير معامل مدينة
      const currentMultiplier = cityMultipliers[0]?.multipliers[city] || 1.0
      setEditingCell({ size: '', duration: 0, type: 'multiplier', city })
      setTempValue(currentMultiplier.toString())
    }
  }

  const saveCell = async () => {
    if (!editingCell) return

    setSaving(true)
    try {
      const value = parseFloat(tempValue)
      if (isNaN(value) || value <= 0) {
        showNotification('error', 'يرجى إدخال قيمة صحيحة')
        return
      }

      if (editingCell.type === 'price') {
        const result = await databasePricingService.updatePrice(
          editingCell.size,
          editingCell.duration,
          selectedCategory,
          selectedZone,
          value
        )
        
        if (result.success) {
          showNotification('success', 'تم تحديث السعر بنجاح')
          await loadData()
        } else {
          showNotification('error', result.message)
        }
      } else if (editingCell.type === 'multiplier' && editingCell.city) {
        const result = await databasePricingService.updateCityMultiplier(
          editingCell.city,
          value
        )
        
        if (result.success) {
          showNotification('success', 'تم تحديث معامل المدينة بنجاح')
          await loadData()
        } else {
          showNotification('error', result.message)
        }
      }
    } catch (err) {
      showNotification('error', 'خطأ في حفظ البيانات')
    } finally {
      setSaving(false)
      setEditingCell(null)
      setTempValue('')
    }
  }

  const cancelEdit = () => {
    setEditingCell(null)
    setTempValue('')
  }

  const addNewSize = async () => {
    if (!newSize.trim()) {
      showNotification('error', 'يرجى إدخال اسم المقاس')
      return
    }

    setSaving(true)
    try {
      const result = await databasePricingService.addNewSize(newSize, {
        A: newSizePriceA,
        B: newSizePriceB
      })

      if (result.success) {
        showNotification('success', 'تم إضافة المقاس الجديد بنجاح')
        setShowAddSize(false)
        setNewSize('')
        setNewSizePriceA(1000)
        setNewSizePriceB(800)
        await loadData()
      } else {
        showNotification('error', result.message)
      }
    } catch (err) {
      showNotification('error', 'خطأ في إضافة المقاس الجديد')
    } finally {
      setSaving(false)
    }
  }

  const getDurationLabel = (months: number): string => {
    if (months === 1) return 'شهر'
    if (months === 2) return 'شهرين'
    if (months === 3) return '3 شهور'
    if (months === 6) return '6 شهور'
    if (months === 12) return 'سنة'
    return `${months} شهر`
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-8 text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-lg font-semibold">جاري تحميل البيانات...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-7xl max-h-[95vh] overflow-hidden">
        
        {/* رأس النافذة */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">إدارة الأسعار المتقدمة</h1>
              <p className="text-blue-100">نظام قاعدة البيانات المتكامل</p>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={initializeDatabase}
                className="bg-green-600 hover:bg-green-700 text-white"
                disabled={loading}
              >
                <Database className="w-4 h-4 mr-2" />
                تهيئة قاعدة البيانات
              </Button>
              <Button
                onClick={onClose}
                variant="outline"
                className="bg-white/20 border-white/30 text-white hover:bg-white/30"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="overflow-y-auto max-h-[calc(95vh-120px)]">
          <div className="p-6 space-y-6">

            {/* رسائل التنبيه */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <span className="text-red-800">{error}</span>
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-green-800">{success}</span>
              </div>
            )}

            {/* أدوات التحكم */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-bold text-gray-900">إعدادات العرض</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  
                  {/* اختيار الفئة */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      فئة الأسعار
                    </label>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => setSelectedCategory('A')}
                        variant={selectedCategory === 'A' ? 'default' : 'outline'}
                        className={selectedCategory === 'A' ? 'bg-amber-500 hover:bg-amber-600' : ''}
                      >
                        A - مستوى أول
                      </Button>
                      <Button
                        onClick={() => setSelectedCategory('B')}
                        variant={selectedCategory === 'B' ? 'default' : 'outline'}
                        className={selectedCategory === 'B' ? 'bg-blue-500 hover:bg-blue-600' : ''}
                      >
                        B - مستوى ثاني
                      </Button>
                    </div>
                  </div>

                  {/* اختيار المنطقة */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      المنطقة السعرية
                    </label>
                    <select
                      value={selectedZone}
                      onChange={(e) => setSelectedZone(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {availableZones.map(zone => (
                        <option key={zone} value={zone}>{zone}</option>
                      ))}
                    </select>
                  </div>

                  {/* إضافة مقاس جديد */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      إضافة مقاس
                    </label>
                    <Button
                      onClick={() => setShowAddSize(true)}
                      className="w-full bg-green-600 hover:bg-green-700 text-white"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      إضافة مقاس جديد
                    </Button>
                  </div>

                </div>
              </CardContent>
            </Card>

            {/* جدول الأسعار الرئيسي */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                  جدول الأسعار - فئة {selectedCategory} - منطقة {selectedZone}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border border-gray-300 px-4 py-3 text-right font-bold text-gray-900">
                          الحجم
                        </th>
                        {availableDurations.map(duration => (
                          <th key={duration} className="border border-gray-300 px-4 py-3 text-center font-bold text-gray-900">
                            {getDurationLabel(duration)}
                          </th>
                        ))}
                        <th className="border border-gray-300 px-4 py-3 text-center font-bold text-gray-900">
                          إجراءات
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {pricingData.map((row) => (
                        <tr key={row.billboard_size} className="hover:bg-yellow-50">
                          <td className="border border-gray-300 px-4 py-3 font-semibold text-gray-900">
                            {row.billboard_size}
                          </td>
                          {availableDurations.map(duration => (
                            <td key={duration} className="border border-gray-300 px-4 py-3 text-center">
                              {editingCell?.size === row.billboard_size && 
                               editingCell?.duration === duration && 
                               editingCell?.type === 'price' ? (
                                <div className="flex items-center gap-2">
                                  <Input
                                    type="number"
                                    value={tempValue}
                                    onChange={(e) => setTempValue(e.target.value)}
                                    className="w-20 h-8 text-sm text-center"
                                    autoFocus
                                  />
                                  <Button
                                    onClick={saveCell}
                                    size="sm"
                                    className="h-8 w-8 p-0 bg-green-600 hover:bg-green-700"
                                    disabled={saving}
                                  >
                                    <Check className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    onClick={cancelEdit}
                                    size="sm"
                                    variant="outline"
                                    className="h-8 w-8 p-0"
                                  >
                                    <X className="w-4 h-4" />
                                  </Button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => handleCellEdit(row.billboard_size, duration)}
                                  className="w-full h-full px-2 py-1 hover:bg-blue-50 rounded transition-colors group"
                                >
                                  <div className="flex items-center justify-center gap-1">
                                    <span className="font-semibold text-blue-900">
                                      {row.prices[duration]?.[selectedCategory]?.toLocaleString() || '0'}
                                    </span>
                                    <Edit3 className="w-3 h-3 text-gray-400 group-hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                                  </div>
                                  <span className="text-xs text-gray-500">د.ل</span>
                                </button>
                              )}
                            </td>
                          ))}
                          <td className="border border-gray-300 px-4 py-3 text-center">
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* جدول معاملات المدن */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-green-600" />
                  معاملات المدن
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border border-gray-300 px-4 py-3 text-right font-bold text-gray-900">
                          المدن
                        </th>
                        {mainCities.map(city => (
                          <th key={city} className="border border-gray-300 px-4 py-3 text-center font-bold text-gray-900">
                            {city}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {cityMultipliers.map((row, index) => (
                        <tr key={index} className="hover:bg-green-50">
                          <td className="border border-gray-300 px-4 py-3 font-semibold text-gray-900">
                            معاملات الضرب
                          </td>
                          {mainCities.map(city => (
                            <td key={city} className="border border-gray-300 px-4 py-3 text-center">
                              {editingCell?.city === city && editingCell?.type === 'multiplier' ? (
                                <div className="flex items-center gap-2 justify-center">
                                  <Input
                                    type="number"
                                    step="0.1"
                                    value={tempValue}
                                    onChange={(e) => setTempValue(e.target.value)}
                                    className="w-20 h-8 text-sm text-center"
                                    autoFocus
                                  />
                                  <Button
                                    onClick={saveCell}
                                    size="sm"
                                    className="h-8 w-8 p-0 bg-green-600 hover:bg-green-700"
                                    disabled={saving}
                                  >
                                    <Check className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    onClick={cancelEdit}
                                    size="sm"
                                    variant="outline"
                                    className="h-8 w-8 p-0"
                                  >
                                    <X className="w-4 h-4" />
                                  </Button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => handleCellEdit('', undefined, city)}
                                  className="w-full h-full px-2 py-1 hover:bg-green-50 rounded transition-colors group"
                                >
                                  <div className="flex items-center justify-center gap-1">
                                    <span className="font-semibold text-green-900">
                                      {row.multipliers[city]?.toFixed(2) || '1.00'}
                                    </span>
                                    <Edit3 className="w-3 h-3 text-gray-400 group-hover:text-green-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                                  </div>
                                </button>
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-2">ملاحظة:</h4>
                  <p className="text-sm text-blue-800">
                    معاملات المدن تؤثر على السعر النهائي. المعامل 1.0 يعني السعر الأساسي، 
                    أكثر من 1.0 يزيد السعر، وأقل من 1.0 يقلل السعر.
                  </p>
                </div>
              </CardContent>
            </Card>

          </div>
        </div>

        {/* نافذة إضافة مقاس جديد */}
        {showAddSize && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md">
              <h3 className="text-xl font-bold text-gray-900 mb-4">إضافة مقاس جديد</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    اسم المقاس (مثال: 6x18)
                  </label>
                  <Input
                    value={newSize}
                    onChange={(e) => setNewSize(e.target.value)}
                    placeholder="6x18"
                    className="w-full"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      سعر فئة A
                    </label>
                    <Input
                      type="number"
                      value={newSizePriceA}
                      onChange={(e) => setNewSizePriceA(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      سعر فئة B
                    </label>
                    <Input
                      type="number"
                      value={newSizePriceB}
                      onChange={(e) => setNewSizePriceB(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <Button
                  onClick={addNewSize}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  disabled={saving}
                >
                  {saving ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                  إضافة المقاس
                </Button>
                <Button
                  onClick={() => setShowAddSize(false)}
                  variant="outline"
                  className="flex-1"
                >
                  إلغاء
                </Button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

export default ModernPricingInterface
