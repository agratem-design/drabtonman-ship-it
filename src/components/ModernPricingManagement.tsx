import React, { useState, useEffect } from 'react'
import {
  DollarSign,
  Save,
  RotateCcw,
  Plus,
  Trash2,
  X,
  Settings
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { newPricingService } from '@/services/newPricingService'
import { PriceList, BillboardSize, PriceListType } from '@/types'

interface ModernPricingManagementProps {
  onClose: () => void
}

const ModernPricingManagement: React.FC<ModernPricingManagementProps> = ({ onClose }) => {
  const [pricing, setPricing] = useState<PriceList | null>(null)
  const [activePriceList, setActivePriceList] = useState<PriceListType>('A')
  const [activeDuration, setActiveDuration] = useState<number>(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showAddSize, setShowAddSize] = useState(false)
  const [newSize, setNewSize] = useState('')
  const [newSizePrice, setNewSizePrice] = useState<number>(1000)

  const packages = newPricingService.getPackages()
  const priceListTypes = newPricingService.getPriceListTypes()

  useEffect(() => {
    loadPricing()
  }, [])

  const loadPricing = () => {
    const currentPricing = newPricingService.getPricing()
    setPricing(currentPricing)
  }

  const updateABPrice = (zone: string, priceList: PriceListType, duration: number, size: BillboardSize, newPrice: number) => {
    if (!pricing) return

    // نسخ الكائن بطريقة مبسطة
    const updatedPricing = JSON.parse(JSON.stringify(pricing))
    
    if (!updatedPricing.zones[zone].abPrices) {
      updatedPricing.zones[zone].abPrices = { A: {}, B: {} }
    }
    
    if (!updatedPricing.zones[zone].abPrices[priceList]) {
      updatedPricing.zones[zone].abPrices[priceList] = {}
    }
    
    if (!updatedPricing.zones[zone].abPrices[priceList][duration.toString()]) {
      updatedPricing.zones[zone].abPrices[priceList][duration.toString()] = {}
    }
    
    updatedPricing.zones[zone].abPrices[priceList][duration.toString()][size] = newPrice

    setPricing(updatedPricing)
  }

  const updateCustomerPrice = (zone: string, customerType: string, size: BillboardSize, newPrice: number) => {
    if (!pricing) return

    // نسخ الكائن بطريقة مبسطة
    const updatedPricing = JSON.parse(JSON.stringify(pricing))
    
    if (!updatedPricing.zones[zone].prices) {
      updatedPricing.zones[zone].prices = { marketers: {}, individuals: {}, companies: {} }
    }
    
    if (!updatedPricing.zones[zone].prices[customerType]) {
      updatedPricing.zones[zone].prices[customerType] = {}
    }
    
    updatedPricing.zones[zone].prices[customerType][size] = newPrice

    setPricing(updatedPricing)
  }

  const savePricing = async () => {
    if (!pricing) return

    setLoading(true)
    const result = newPricingService.updatePricing(pricing)

    if (result.success) {
      setSuccess('تم حفظ الأسعار بنجاح')
      setTimeout(() => setSuccess(''), 3000)
    } else {
      setError(result.error || 'حدث خطأ في حفظ الأسعار')
      setTimeout(() => setError(''), 5000)
    }
    setLoading(false)
  }

  const resetPricing = () => {
    if (window.confirm('هل أنت متأكد من إعادة تعيين جميع الأسعار للقيم الافتراضية؟')) {
      loadPricing()
      setSuccess('تم إعادة تعيين الأسعار للقيم الافتراضية')
      setTimeout(() => setSuccess(''), 3000)
    }
  }

  const addNewSize = () => {
    if (!newSize.trim() || !newPricingService.validateSize(newSize)) {
      setError('يرجى إدخال مقاس صحيح بصيغة مثل "7x15"')
      setTimeout(() => setError(''), 5000)
      return
    }

    const result = newPricingService.addSizeToAllZones(newSize, newSizePrice)
    if (result) {
      loadPricing()
      setNewSize('')
      setNewSizePrice(1000)
      setShowAddSize(false)
      setSuccess(`تم إضافة المقاس "${newSize}" بنجاح`)
      setTimeout(() => setSuccess(''), 3000)
    } else {
      setError('المقاس موجود مسبقاً أو حدث خطأ')
      setTimeout(() => setError(''), 5000)
    }
  }

  const removeSize = (size: BillboardSize) => {
    if (newPricingService.sizes.length <= 1) {
      setError('لا يمكن حذف آخر مقاس')
      setTimeout(() => setError(''), 5000)
      return
    }

    if (window.confirm(`هل أنت متأكد من حذف المقاس "${size}" من جميع القوائم؟`)) {
      const result = newPricingService.removeSizeFromAllZones(size)
      if (result) {
        loadPricing()
        setSuccess(`تم حذف المقاس "${size}" بنجاح`)
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError('حدث خطأ في حذف المقاس')
        setTimeout(() => setError(''), 5000)
      }
    }
  }

  const getPrice = (obj: any, path: string[], defaultValue = 0): number => {
    let current = obj
    for (const key of path) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key]
      } else {
        return defaultValue
      }
    }
    return typeof current === 'number' ? current : defaultValue
  }

  if (!pricing) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-8">
          <div className="text-center">جاري تحميل البيانات...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* رأس النافذة */}
        <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 p-6 text-black">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <DollarSign className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-black">الأسعار</h1>
                <p className="text-sm opacity-80">إدارة قوائم الأسعار الذكية</p>
              </div>
            </div>
            <Button
              onClick={onClose}
              variant="outline"
              size="sm"
              className="bg-white/20 border-white/30 text-black hover:bg-white/30"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* رسائل النجاح والخطأ */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4">
              {success}
            </div>
          )}

          {/* أزرار التحكم الرئيسية */}
          <div className="flex flex-wrap gap-3 mb-6">
            <Button
              onClick={savePricing}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 text-white font-bold px-6"
            >
              <Save className="w-4 h-4 mr-2" />
              حفظ الأسعار
            </Button>
            <Button
              onClick={resetPricing}
              variant="outline"
              className="border-blue-500 text-blue-600 hover:bg-blue-50 px-4"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              إعادة تعيين
            </Button>
            <Button
              onClick={() => setShowAddSize(true)}
              variant="outline"
              className="border-yellow-500 text-yellow-600 hover:bg-yellow-50 px-4"
            >
              <Plus className="w-4 h-4 mr-2" />
              إض��فة مقاس جديد
            </Button>
          </div>

          {/* تبويبات المستويات - كما في التصميم */}
          <div className="mb-6">
            <div className="flex gap-2">
              {priceListTypes.map((type) => (
                <Button
                  key={type.value}
                  onClick={() => setActivePriceList(type.value)}
                  className={`px-4 py-2 rounded-full font-bold text-sm transition-all ${ 
                    activePriceList === type.value
                      ? type.value === 'A' 
                        ? 'bg-yellow-500 text-black shadow-md' 
                        : 'bg-green-500 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {type.label}
                </Button>
              ))}
            </div>
          </div>

          {/* تبويبات المدد */}
          <div className="mb-6">
            <h3 className="text-lg font-bold text-gray-900 mb-3">المدة الزمنية</h3>
            <div className="flex flex-wrap gap-2">
              {packages.map((pkg) => (
                <Button
                  key={pkg.value}
                  onClick={() => setActiveDuration(pkg.value)}
                  className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                    activeDuration === pkg.value
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                  }`}
                >
                  {pkg.label}
                  {pkg.discount > 0 && (
                    <Badge className="mr-2 bg-red-500 text-white text-xs">
                      -{pkg.discount}%
                    </Badge>
                  )}
                </Button>
              ))}
            </div>
          </div>

          {/* جدول الأسعار - مطابق للتصميم */}
          {Object.entries(pricing.zones).map(([zoneName, zone]) => (
            <Card key={zoneName} className="mb-6 overflow-hidden border border-gray-200">
              <div className="bg-yellow-100 p-4 border-b border-yellow-200">
                <h3 className="text-xl font-black text-gray-900">
                  أسعار الإجمالي حسب فئة العميل - شهرياً
                </h3>
                <p className="text-sm text-gray-600">المنطقة: {zone.name}</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-yellow-50 border-b border-yellow-200">
                      <th className="p-4 text-right font-bold text-gray-900">الحجم</th>
                      <th className="p-4 text-center font-bold text-green-700">مسوقين</th>
                      <th className="p-4 text-center font-bold text-blue-700">أفراد</th>
                      <th className="p-4 text-center font-bold text-purple-700">شركات</th>
                      <th className="p-4 text-center font-bold text-gray-700">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {newPricingService.sizes.map((size, index) => (
                      <tr key={size} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="p-4 font-bold text-gray-900 bg-yellow-50">
                          {size}
                        </td>
                        <td className="p-2 text-center">
                          <Input
                            type="number"
                            value={getPrice(zone, ['prices', 'marketers', size])}
                            onChange={(e) => updateCustomerPrice(zoneName, 'marketers', size, parseInt(e.target.value) || 0)}
                            className="text-center font-bold text-green-700 border-green-300 w-24 mx-auto"
                            min="0"
                          />
                        </td>
                        <td className="p-2 text-center">
                          <Input
                            type="number"
                            value={getPrice(zone, ['prices', 'individuals', size])}
                            onChange={(e) => updateCustomerPrice(zoneName, 'individuals', size, parseInt(e.target.value) || 0)}
                            className="text-center font-bold text-blue-700 border-blue-300 w-24 mx-auto"
                            min="0"
                          />
                        </td>
                        <td className="p-2 text-center">
                          <Input
                            type="number"
                            value={getPrice(zone, ['prices', 'companies', size])}
                            onChange={(e) => updateCustomerPrice(zoneName, 'companies', size, parseInt(e.target.value) || 0)}
                            className="text-center font-bold text-purple-700 border-purple-300 w-24 mx-auto"
                            min="0"
                          />
                        </td>
                        <td className="p-4 text-center">
                          <Button
                            onClick={() => removeSize(size)}
                            variant="outline"
                            size="sm"
                            className="text-red-600 border-red-300 hover:bg-red-50"
                            disabled={newPricingService.sizes.length <= 1}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* قسم أسعار القائمة النشطة */}
              <div className="bg-gray-50 p-4 border-t border-gray-200">
                <h4 className="font-bold text-gray-900 mb-3">
                  أسعار {priceListTypes.find(p => p.value === activePriceList)?.label} - {packages.find(p => p.value === activeDuration)?.label}
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {newPricingService.sizes.map((size) => {
                    const price = getPrice(zone, ['abPrices', activePriceList, activeDuration.toString(), size])
                    
                    return (
                      <div key={size} className="text-center">
                        <label className="block text-sm font-semibold text-gray-700 mb-1">
                          {size}
                        </label>
                        <Input
                          type="number"
                          value={price}
                          onChange={(e) => updateABPrice(zoneName, activePriceList, activeDuration, size, parseInt(e.target.value) || 0)}
                          className={`text-center font-bold w-20 ${
                            activePriceList === 'A' 
                              ? 'text-yellow-700 border-yellow-300' 
                              : 'text-green-700 border-green-300'
                          }`}
                          min="0"
                        />
                      </div>
                    )
                  })}
                </div>
              </div>
            </Card>
          ))}

          {/* معلومات إضافية */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4 bg-blue-50 border-blue-200">
              <div className="text-center">
                <Settings className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                <div className="text-2xl font-black text-blue-900">
                  {newPricingService.sizes.length}
                </div>
                <div className="text-sm text-blue-700 font-semibold">مقاسات متاحة</div>
              </div>
            </Card>
            <Card className="p-4 bg-green-50 border-green-200">
              <div className="text-center">
                <DollarSign className="w-8 h-8 mx-auto mb-2 text-green-600" />
                <div className="text-2xl font-black text-green-900">
                  {Object.keys(pricing.zones).length}
                </div>
                <div className="text-sm text-green-700 font-semibold">مناطق سعرية</div>
              </div>
            </Card>
            <Card className="p-4 bg-yellow-50 border-yellow-200">
              <div className="text-center">
                <Badge className="w-8 h-8 mx-auto mb-2 bg-yellow-600 flex items-center justify-center text-white">
                  {activePriceList}
                </Badge>
                <div className="text-2xl font-black text-yellow-900">
                  {activeDuration}
                </div>
                <div className="text-sm text-yellow-700 font-semibold">شهر - القائمة النشطة</div>
              </div>
            </Card>
          </div>
        </div>

        {/* نافذة إضافة مقاس جديد */}
        {showAddSize && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-60">
            <Card className="w-full max-w-md p-6">
              <h3 className="text-xl font-bold mb-4">إضافة مقاس جديد</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    المقاس (مثال: 7x15)
                  </label>
                  <Input
                    value={newSize}
                    onChange={(e) => setNewSize(e.target.value)}
                    placeholder="أدخل المقاس"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        addNewSize()
                      }
                    }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    السعر الافتراضي
                  </label>
                  <Input
                    type="number"
                    value={newSizePrice}
                    onChange={(e) => setNewSizePrice(parseInt(e.target.value) || 1000)}
                    placeholder="السعر الافتراضي"
                    min="0"
                  />
                </div>
              </div>

              <div className="flex gap-2 mt-6">
                <Button
                  onClick={addNewSize}
                  disabled={!newSize.trim()}
                  className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-black font-bold"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  إضافة
                </Button>
                <Button
                  onClick={() => {
                    setShowAddSize(false)
                    setNewSize('')
                    setNewSizePrice(1000)
                  }}
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

export default ModernPricingManagement
