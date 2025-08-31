import React, { useState, useEffect } from 'react'
import {
  DollarSign,
  Save,
  RotateCcw,
  Plus,
  Trash2,
  Edit3,
  X,
  Calculator,
  TrendingUp,
  TrendingDown,
  ArrowUpDown,
  Settings,
  Database,
  Wifi,
  WifiOff,
  RefreshCw,
  CheckCircle,
  AlertTriangle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { newPricingService } from '@/services/newPricingService'
import { cloudDatabase } from '@/services/cloudDatabase'
import { PriceList, BillboardSize, PriceListType, CustomerType } from '@/types'

interface EnhancedPricingManagementProps {
  onClose: () => void
}

const EnhancedPricingManagement: React.FC<EnhancedPricingManagementProps> = ({ onClose }) => {
  const [pricing, setPricing] = useState<PriceList | null>(null)
  const [editingZone, setEditingZone] = useState<string | null>(null)
  const [newZoneName, setNewZoneName] = useState('')
  const [showAddZone, setShowAddZone] = useState(false)
  const [activePriceList, setActivePriceList] = useState<PriceListType>('A')
  const [activeCustomerType, setActiveCustomerType] = useState<CustomerType>('individuals')
  const [activeDuration, setActiveDuration] = useState<number>(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showComparison, setShowComparison] = useState(false)
  const [cloudStatus, setCloudStatus] = useState<'connected' | 'disconnected' | 'syncing'>('disconnected')
  const [lastSync, setLastSync] = useState<string | null>(null)
  const [showAddSize, setShowAddSize] = useState(false)
  const [newSize, setNewSize] = useState('')
  const [newSizePrice, setNewSizePrice] = useState<number>(1000)

  const packages = newPricingService.getPackages()
  const priceListTypes = newPricingService.getPriceListTypes()
  const customerTypes = [
    { value: 'marketers' as CustomerType, label: 'مسوقين', color: 'bg-blue-100 text-blue-800' },
    { value: 'individuals' as CustomerType, label: 'أفراد', color: 'bg-purple-100 text-purple-800' },
    { value: 'companies' as CustomerType, label: 'شركات', color: 'bg-green-100 text-green-800' }
  ]

  useEffect(() => {
    loadPricing()
    checkCloudConnection()
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

  const checkCloudConnection = async () => {
    try {
      setCloudStatus('syncing')
      const cloudPricing = await cloudDatabase.getRentalPricing()
      setCloudStatus('connected')
      if (cloudPricing) {
        setLastSync(new Date().toISOString())
      }
    } catch (error) {
      setCloudStatus('disconnected')
      console.warn('قاعدة البيانات السحابية غير متاحة، سيتم استخدام التخزين المحلي')
    }
  }

  const loadPricing = async () => {
    try {
      setLoading(true)
      
      // محاولة تحميل من السحابة أولاً
      let currentPricing = await cloudDatabase.getRentalPricing()
      
      if (!currentPricing) {
        // استخدام البيانات المحلية كبديل
        currentPricing = newPricingService.getPricing()
      }
      
      setPricing(currentPricing)
    } catch (error) {
      console.error('خطأ في تحميل الأسعار:', error)
      showNotification('error', 'حدث خطأ في تحميل البيانات')
      // استخدام البيانات المحلية كبديل
      setPricing(newPricingService.getPricing())
    } finally {
      setLoading(false)
    }
  }

  const syncWithCloud = async () => {
    if (!pricing) return
    
    try {
      setCloudStatus('syncing')
      const success = await cloudDatabase.saveRentalPricing(pricing)
      
      if (success) {
        setCloudStatus('connected')
        setLastSync(new Date().toISOString())
        showNotification('success', 'تم رفع البيانات للسحابة بنجاح')
      } else {
        setCloudStatus('disconnected')
        showNotification('error', 'فشل في رفع البيانات للسحابة')
      }
    } catch (error) {
      setCloudStatus('disconnected')
      showNotification('error', 'خطأ في الاتصال بقاعدة البيانات')
    }
  }

  const updatePrice = (zone: string, customerType: CustomerType, size: BillboardSize, newPrice: number) => {
    if (!pricing) return

    const updatedPricing = {
      ...pricing,
      zones: {
        ...pricing.zones,
        [zone]: {
          ...pricing.zones[zone],
          prices: {
            ...pricing.zones[zone].prices,
            [customerType]: {
              ...pricing.zones[zone].prices[customerType],
              [size]: newPrice
            }
          }
        }
      }
    }

    setPricing(updatedPricing)
  }

  const updateABPrice = (zone: string, priceList: PriceListType, duration: number, size: BillboardSize, newPrice: number) => {
    if (!pricing) return

    const updatedPricing = {
      ...pricing,
      zones: {
        ...pricing.zones,
        [zone]: {
          ...pricing.zones[zone],
          abPrices: {
            ...pricing.zones[zone].abPrices,
            [priceList]: {
              ...pricing.zones[zone].abPrices[priceList],
              [duration.toString()]: {
                ...pricing.zones[zone].abPrices[priceList][duration.toString()],
                [size]: newPrice
              }
            }
          }
        }
      }
    }

    setPricing(updatedPricing)
  }

  const addNewZone = () => {
    if (!pricing || !newZoneName.trim()) return

    const defaultCustomerPrices = {
      marketers: {
        '5x13': 3000,
        '4x12': 2400,
        '4x10': 1900,
        '3x8': 1300,
        '3x6': 900,
        '3x4': 700
      } as Record<BillboardSize, number>,
      individuals: {
        '5x13': 3500,
        '4x12': 2800,
        '4x10': 2200,
        '3x8': 1500,
        '3x6': 1000,
        '3x4': 800
      } as Record<BillboardSize, number>,
      companies: {
        '5x13': 4000,
        '4x12': 3200,
        '4x10': 2500,
        '3x8': 1700,
        '3x6': 1200,
        '3x4': 900
      } as Record<BillboardSize, number>
    }

    const defaultABPrices = {
      A: {
        '1': { ...defaultCustomerPrices.individuals },
        '3': Object.fromEntries(Object.entries(defaultCustomerPrices.individuals).map(([k, v]) => [k, Math.round(v * 0.95)])),
        '6': Object.fromEntries(Object.entries(defaultCustomerPrices.individuals).map(([k, v]) => [k, Math.round(v * 0.90)])),
        '12': Object.fromEntries(Object.entries(defaultCustomerPrices.individuals).map(([k, v]) => [k, Math.round(v * 0.80)]))
      },
      B: {
        '1': Object.fromEntries(Object.entries(defaultCustomerPrices.individuals).map(([k, v]) => [k, Math.round(v * 1.2)])),
        '3': Object.fromEntries(Object.entries(defaultCustomerPrices.individuals).map(([k, v]) => [k, Math.round(v * 1.2 * 0.95)])),
        '6': Object.fromEntries(Object.entries(defaultCustomerPrices.individuals).map(([k, v]) => [k, Math.round(v * 1.2 * 0.90)])),
        '12': Object.fromEntries(Object.entries(defaultCustomerPrices.individuals).map(([k, v]) => [k, Math.round(v * 1.2 * 0.80)]))
      }
    }

    const updatedPricing = {
      ...pricing,
      zones: {
        ...pricing.zones,
        [newZoneName]: {
          name: newZoneName,
          prices: defaultCustomerPrices,
          abPrices: defaultABPrices
        }
      }
    }

    setPricing(updatedPricing)
    setNewZoneName('')
    setShowAddZone(false)
    showNotification('success', `تم إضافة المنطقة "${newZoneName}" بنجاح`)
  }

  const deleteZone = (zoneName: string) => {
    if (!pricing) return

    if (Object.keys(pricing.zones).length <= 1) {
      showNotification('error', 'لا يمكن حذف آخر منطقة سعرية')
      return
    }

    if (!window.confirm(`هل أنت متأكد من حذف منطقة "${zoneName}"؟`)) return

    const { [zoneName]: deleted, ...remainingZones } = pricing.zones

    const updatedPricing = {
      ...pricing,
      zones: remainingZones
    }

    setPricing(updatedPricing)
    showNotification('success', `تم حذف المنطقة "${zoneName}" بنجاح`)
  }

  const savePricing = async () => {
    if (!pricing) return

    setLoading(true)
    try {
      // حفظ محلياً أولاً
      const localResult = newPricingService.updatePricing(pricing)
      
      if (localResult.success) {
        // محاولة الحفظ في السحابة
        if (cloudStatus === 'connected') {
          await syncWithCloud()
        }
        showNotification('success', 'تم حفظ الأسعار بنجاح')
      } else {
        showNotification('error', localResult.error || 'حدث خطأ في حفظ الأسعار')
      }
    } catch (error) {
      showNotification('error', 'حدث خطأ في حفظ الأسعار')
    } finally {
      setLoading(false)
    }
  }

  const resetPricing = () => {
    if (window.confirm('هل أنت متأكد من إعادة تعيين جميع الأسعار للقيم الافتراضية؟')) {
      loadPricing()
      showNotification('success', 'تم إعادة تعيين الأسعار للقيم الافتراضية')
    }
  }

  const addNewSize = () => {
    if (!newSize.trim() || !newPricingService.validateSize(newSize)) {
      showNotification('error', 'يرجى إدخال مقاس صحيح بصيغة مثل "7x15"')
      return
    }

    const result = newPricingService.addSizeToAllZones(newSize, newSizePrice)
    if (result) {
      loadPricing()
      setNewSize('')
      setNewSizePrice(1000)
      setShowAddSize(false)
      showNotification('success', `تم إضافة المقاس "${newSize}" بنجاح`)
    } else {
      showNotification('error', 'المقاس موجود مسبقاً أو حدث خطأ')
    }
  }

  const removeSize = (size: BillboardSize) => {
    if (newPricingService.sizes.length <= 1) {
      showNotification('error', 'لا يمكن حذف آخر مقاس')
      return
    }

    if (window.confirm(`هل أنت متأكد من حذف المقاس "${size}" من جميع القوائم؟`)) {
      const result = newPricingService.removeSizeFromAllZones(size)
      if (result) {
        loadPricing()
        showNotification('success', `تم حذف المقاس "${size}" بنجاح`)
      } else {
        showNotification('error', 'حدث خطأ في حذف المقاس')
      }
    }
  }

  const getPrice = (obj: any, path: string[], defaultValue: number = 0): number => {
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

  const copyPricesFromAToB = (zoneName: string) => {
    if (!pricing) return
    
    const zone = pricing.zones[zoneName]
    if (!zone || !zone.abPrices) return

    const updatedPricing = {
      ...pricing,
      zones: {
        ...pricing.zones,
        [zoneName]: {
          ...zone,
          abPrices: {
            ...zone.abPrices,
            B: JSON.parse(JSON.stringify(zone.abPrices.A))
          }
        }
      }
    }

    setPricing(updatedPricing)
    showNotification('success', `تم نسخ أسعار القائمة A إلى القائمة B للمنطقة "${zoneName}"`)
  }

  const copyPricesFromBToA = (zoneName: string) => {
    if (!pricing) return
    
    const zone = pricing.zones[zoneName]
    if (!zone || !zone.abPrices) return

    const updatedPricing = {
      ...pricing,
      zones: {
        ...pricing.zones,
        [zoneName]: {
          ...zone,
          abPrices: {
            ...zone.abPrices,
            A: JSON.parse(JSON.stringify(zone.abPrices.B))
          }
        }
      }
    }

    setPricing(updatedPricing)
    showNotification('success', `تم نسخ أسعار القائمة B إلى القائمة A للمنطقة "${zoneName}"`)
  }

  if (!pricing) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-8 shadow-2xl">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-4 border-yellow-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <div className="text-gray-900 font-semibold">جاري تحميل البيانات...</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-7xl max-h-[95vh] overflow-hidden">
        {/* رأس النافذة المحسن */}
        <div className="bg-gradient-to-r from-yellow-500 via-yellow-400 to-yellow-500 p-6 text-black relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-yellow-600/20 via-transparent to-yellow-600/20"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center shadow-lg backdrop-blur-sm">
                  <DollarSign className="w-7 h-7" />
                </div>
                <div>
                  <h1 className="text-3xl font-black mb-1">إدارة قوائم الأسعار</h1>
                  <p className="text-sm opacity-80 font-medium">نظام متطور لإدارة أسعار اللوحات الإعلانية</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {/* حالة الاتصال بقاعدة البيانات */}
                <div className="flex items-center gap-2 bg-white/20 rounded-lg px-3 py-2 backdrop-blur-sm">
                  {cloudStatus === 'connected' && <Wifi className="w-4 h-4 text-green-600" />}
                  {cloudStatus === 'disconnected' && <WifiOff className="w-4 h-4 text-red-600" />}
                  {cloudStatus === 'syncing' && <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />}
                  <span className="text-xs font-semibold">
                    {cloudStatus === 'connected' && 'متصل'}
                    {cloudStatus === 'disconnected' && 'محلي'}
                    {cloudStatus === 'syncing' && 'مزامنة...'}
                  </span>
                </div>
                <Button
                  onClick={onClose}
                  variant="outline"
                  size="sm"
                  className="bg-white/20 border-white/30 text-black hover:bg-white/30 backdrop-blur-sm"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(95vh-120px)] bg-gradient-to-br from-gray-50 to-blue-50">
          {/* رسائل النجاح والخطأ */}
          {error && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-lg mb-6 shadow-sm">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <p className="text-red-700 font-semibold">{error}</p>
              </div>
            </div>
          )}

          {success && (
            <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded-lg mb-6 shadow-sm">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <p className="text-green-700 font-semibold">{success}</p>
              </div>
            </div>
          )}

          {/* أزرار التحكم الرئيسية */}
          <div className="flex flex-wrap gap-4 mb-8">
            <Button
              onClick={savePricing}
              disabled={loading}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold px-6 py-3 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
            >
              <Save className="w-5 h-5 mr-2" />
              حفظ الأسعار
            </Button>
            
            {cloudStatus === 'disconnected' && (
              <Button
                onClick={syncWithCloud}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold px-6 py-3"
              >
                <Database className="w-5 h-5 mr-2" />
                رفع للسحابة
              </Button>
            )}
            
            <Button
              onClick={resetPricing}
              variant="outline"
              className="border-2 border-blue-500 text-blue-600 hover:bg-blue-50 px-6 py-3 font-bold"
            >
              <RotateCcw className="w-5 h-5 mr-2" />
              إعادة تعيين
            </Button>
            
            <Button
              onClick={() => setShowAddZone(true)}
              variant="outline"
              className="border-2 border-yellow-500 text-yellow-600 hover:bg-yellow-50 px-6 py-3 font-bold"
            >
              <Plus className="w-5 h-5 mr-2" />
              إضافة منطقة
            </Button>
            
            <Button
              onClick={() => setShowAddSize(true)}
              variant="outline"
              className="border-2 border-purple-500 text-purple-600 hover:bg-purple-50 px-6 py-3 font-bold"
            >
              <Plus className="w-5 h-5 mr-2" />
              إضافة مقاس
            </Button>
            
            <Button
              onClick={() => setShowComparison(!showComparison)}
              variant="outline"
              className="border-2 border-indigo-500 text-indigo-600 hover:bg-indigo-50 px-6 py-3 font-bold"
            >
              <ArrowUpDown className="w-5 h-5 mr-2" />
              {showComparison ? 'إخفاء المقارنة' : 'مقارنة الأسعار'}
            </Button>
          </div>

          {/* معلومات الاتصال */}
          {lastSync && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2 text-blue-800">
                <Database className="w-5 h-5" />
                <span className="font-semibold">آخر مزامنة: {new Date(lastSync).toLocaleString('ar-SA')}</span>
              </div>
            </div>
          )}

          {/* تبويبات نوع العرض */}
          <div className="mb-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4">اختر نوع العرض</h3>
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() => setActiveCustomerType('individuals')}
                className={`px-6 py-3 rounded-xl font-bold transition-all ${
                  activeCustomerType === 'individuals'
                    ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg transform scale-105'
                    : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                }`}
              >
                أسعار الأفراد
              </Button>
              <Button
                onClick={() => setActiveCustomerType('companies')}
                className={`px-6 py-3 rounded-xl font-bold transition-all ${
                  activeCustomerType === 'companies'
                    ? 'bg-gradient-to-r from-green-600 to-green-700 text-white shadow-lg transform scale-105'
                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                }`}
              >
                أسعار الشركات
              </Button>
              <Button
                onClick={() => setActiveCustomerType('marketers')}
                className={`px-6 py-3 rounded-xl font-bold transition-all ${
                  activeCustomerType === 'marketers'
                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg transform scale-105'
                    : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                }`}
              >
                أسعار المسوقين
              </Button>
            </div>
          </div>

          {/* تبويبات قوائم A/B */}
          <div className="mb-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4">قوائم الأسعار المتقدمة</h3>
            <div className="flex gap-3 mb-4">
              {priceListTypes.map((type) => (
                <Button
                  key={type.value}
                  onClick={() => setActivePriceList(type.value)}
                  className={`px-8 py-3 rounded-xl font-bold transition-all ${
                    activePriceList === type.value
                      ? type.value === 'A'
                        ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-black shadow-lg transform scale-105'
                        : 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg transform scale-105'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {type.label}
                </Button>
              ))}
            </div>

            {/* تبويبات المدد */}
            <div className="flex flex-wrap gap-2">
              {packages.map((pkg) => (
                <Button
                  key={pkg.value}
                  onClick={() => setActiveDuration(pkg.value)}
                  className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                    activeDuration === pkg.value
                      ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md'
                      : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
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

          {/* عرض المقارنة */}
          {showComparison && (
            <Card className="mb-8 p-6 bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 shadow-lg">
              <h4 className="text-xl font-bold text-purple-900 mb-6 flex items-center gap-3">
                <ArrowUpDown className="w-6 h-6" />
                مقارنة الأسعار بين القائمتين A و B
              </h4>
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {Object.entries(pricing.zones).map(([zoneName, zone]) => {
                  const comparison = newPricingService.comparePriceListsForZone ? newPricingService.comparePriceListsForZone(zoneName) : null
                  if (!comparison) return null

                  return (
                    <div key={zoneName} className="bg-white rounded-xl p-4 border border-purple-200 shadow-md">
                      <h5 className="font-bold text-purple-900 mb-4 text-center">{zone.name}</h5>
                      <div className="space-y-3">
                        {comparison.sizes.map(({ size, priceA, priceB, difference, percentDifference }) => (
                          <div key={size} className="flex items-center justify-between text-sm bg-purple-50 rounded-lg p-3">
                            <span className="font-semibold text-purple-900">{size}:</span>
                            <div className="flex items-center gap-3">
                              <span className="text-blue-600 font-bold">A: {priceA.toLocaleString()}</span>
                              <span className="text-green-600 font-bold">B: {priceB.toLocaleString()}</span>
                              <Badge 
                                variant={difference > 0 ? "default" : "secondary"}
                                className={`text-xs font-bold ${difference > 0 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}
                              >
                                {difference > 0 ? '+' : ''}{percentDifference}%
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </Card>
          )}

          {/* جداول الأسعار */}
          {Object.entries(pricing.zones).map(([zoneName, zone]) => (
            <Card key={zoneName} className="mb-8 overflow-hidden shadow-xl border-2 border-gray-200">
              {/* رأس الجدول */}
              <div className="bg-gradient-to-r from-gray-100 to-gray-200 p-6 border-b border-gray-300">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-black text-gray-900 mb-2">
                      {editingZone === zoneName ? (
                        <Input
                          value={zone.name}
                          onChange={(e) => {
                            const updatedPricing = {
                              ...pricing,
                              zones: {
                                ...pricing.zones,
                                [zoneName]: {
                                  ...zone,
                                  name: e.target.value
                                }
                              }
                            }
                            setPricing(updatedPricing)
                          }}
                          onBlur={() => setEditingZone(null)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              setEditingZone(null)
                            }
                          }}
                          className="text-2xl font-black bg-white border-2 border-yellow-400"
                          autoFocus
                        />
                      ) : (
                        <div className="flex items-center gap-3">
                          <span>منطقة {zone.name}</span>
                          <Button
                            onClick={() => setEditingZone(zoneName)}
                            variant="ghost"
                            size="sm"
                            className="text-gray-600 hover:text-gray-900"
                          >
                            <Edit3 className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </h3>
                    <p className="text-gray-600 font-medium">
                      أسعار {customerTypes.find(t => t.value === activeCustomerType)?.label} - شهرياً
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => copyPricesFromAToB(zoneName)}
                      variant="outline"
                      size="sm"
                      className="text-blue-600 border-blue-300 hover:bg-blue-50"
                      title="نسخ من A إلى B"
                    >
                      A→B
                    </Button>
                    <Button
                      onClick={() => copyPricesFromBToA(zoneName)}
                      variant="outline"
                      size="sm"
                      className="text-green-600 border-green-300 hover:bg-green-50"
                      title="نسخ من B إلى A"
                    >
                      B→A
                    </Button>
                    <Button
                      onClick={() => deleteZone(zoneName)}
                      variant="outline"
                      size="sm"
                      className="text-red-600 border-red-300 hover:bg-red-50"
                      disabled={Object.keys(pricing.zones).length <= 1}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* جدول أسعار العملاء */}
              <div className="overflow-x-auto bg-white">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gradient-to-r from-yellow-400 to-yellow-500">
                      <th className="border border-yellow-600 p-4 text-right font-black text-black min-w-[120px]">
                        المقاس
                      </th>
                      <th className="border border-yellow-600 p-4 text-center font-black text-black min-w-[150px]">
                        {customerTypes.find(t => t.value === activeCustomerType)?.label}
                      </th>
                      <th className="border border-yellow-600 p-4 text-center font-black text-black min-w-[100px]">
                        الإجراءات
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {newPricingService.sizes.map((size, index) => (
                      <tr key={size} className={`hover:bg-yellow-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                        <td className="border border-gray-300 p-4 font-bold text-gray-900 bg-yellow-100">
                          <div className="flex items-center justify-between">
                            <span className="text-lg">{size}</span>
                            <Badge className="bg-yellow-200 text-yellow-800 text-xs">
                              {size}
                            </Badge>
                          </div>
                        </td>
                        <td className="border border-gray-300 p-3">
                          <Input
                            type="number"
                            value={getPrice(zone, ['prices', activeCustomerType, size])}
                            onChange={(e) => updatePrice(zoneName, activeCustomerType, size, parseInt(e.target.value) || 0)}
                            className="text-center font-bold text-lg border-2 border-emerald-300 focus:border-emerald-500 bg-white shadow-sm"
                            min="0"
                          />
                        </td>
                        <td className="border border-gray-300 p-4 text-center">
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

              {/* جدول أسعار A/B */}
              <div className="bg-gray-50 p-6 border-t border-gray-200">
                <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-indigo-600" />
                  أسعار {priceListTypes.find(p => p.value === activePriceList)?.label} - {packages.find(p => p.value === activeDuration)?.label}
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {newPricingService.sizes.map((size) => {
                    const price = getPrice(zone, ['abPrices', activePriceList, activeDuration.toString(), size])
                    
                    return (
                      <div key={size} className="text-center">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          {size}
                        </label>
                        <Input
                          type="number"
                          value={price}
                          onChange={(e) => updateABPrice(zoneName, activePriceList, activeDuration, size, parseInt(e.target.value) || 0)}
                          className={`text-center font-bold text-lg border-2 shadow-sm ${
                            activePriceList === 'A' 
                              ? 'text-yellow-700 border-yellow-300 focus:border-yellow-500' 
                              : 'text-green-700 border-green-300 focus:border-green-500'
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

          {/* إحصائيات النظام */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 shadow-lg">
              <div className="text-center">
                <Calculator className="w-10 h-10 mx-auto mb-3 text-blue-600" />
                <div className="text-3xl font-black text-blue-900">
                  {Object.keys(pricing.zones).length}
                </div>
                <div className="text-sm text-blue-700 font-semibold">مناطق سعرية</div>
              </div>
            </Card>
            
            <Card className="p-6 bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200 shadow-lg">
              <div className="text-center">
                <TrendingDown className="w-10 h-10 mx-auto mb-3 text-green-600" />
                <div className="text-3xl font-black text-green-900">
                  {Math.min(...Object.values(pricing.zones).flatMap(zone => 
                    zone.prices[activeCustomerType] ? Object.values(zone.prices[activeCustomerType]) : [0]
                  ))}
                </div>
                <div className="text-sm text-green-700 font-semibold">أقل سعر</div>
              </div>
            </Card>
            
            <Card className="p-6 bg-gradient-to-br from-orange-50 to-orange-100 border-2 border-orange-200 shadow-lg">
              <div className="text-center">
                <TrendingUp className="w-10 h-10 mx-auto mb-3 text-orange-600" />
                <div className="text-3xl font-black text-orange-900">
                  {Math.max(...Object.values(pricing.zones).flatMap(zone => 
                    zone.prices[activeCustomerType] ? Object.values(zone.prices[activeCustomerType]) : [0]
                  ))}
                </div>
                <div className="text-sm text-orange-700 font-semibold">أعلى سعر</div>
              </div>
            </Card>
            
            <Card className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-200 shadow-lg">
              <div className="text-center">
                <DollarSign className="w-10 h-10 mx-auto mb-3 text-purple-600" />
                <div className="text-3xl font-black text-purple-900">
                  {Math.round(Object.values(pricing.zones).flatMap(zone => 
                    zone.prices[activeCustomerType] ? Object.values(zone.prices[activeCustomerType]) : [0]
                  ).reduce((a, b) => a + b, 0) / Object.values(pricing.zones).flatMap(zone => 
                    zone.prices[activeCustomerType] ? Object.values(zone.prices[activeCustomerType]) : [0]
                  ).length)}
                </div>
                <div className="text-sm text-purple-700 font-semibold">متوسط السعر</div>
              </div>
            </Card>
          </div>
        </div>

        {/* نافذة إضافة منطقة جديدة */}
        {showAddZone && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-60">
            <Card className="w-full max-w-md p-6 shadow-2xl">
              <h3 className="text-xl font-bold mb-4 text-gray-900">إضافة منطقة سعرية جديدة</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    اسم المنطقة
                  </label>
                  <Input
                    value={newZoneName}
                    onChange={(e) => setNewZoneName(e.target.value)}
                    placeholder="أدخل اسم المنطقة"
                    className="border-2 border-gray-300 focus:border-yellow-500"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        addNewZone()
                      }
                    }}
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <Button
                  onClick={addNewZone}
                  disabled={!newZoneName.trim()}
                  className="flex-1 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-bold"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  إضافة
                </Button>
                <Button
                  onClick={() => {
                    setShowAddZone(false)
                    setNewZoneName('')
                  }}
                  variant="outline"
                  className="flex-1 border-2 border-gray-300"
                >
                  إلغاء
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* نافذة إضافة مقاس جديد */}
        {showAddSize && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-60">
            <Card className="w-full max-w-md p-6 shadow-2xl">
              <h3 className="text-xl font-bold mb-4 text-gray-900">إضافة مقاس جديد</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    المقاس (مثال: 7x15)
                  </label>
                  <Input
                    value={newSize}
                    onChange={(e) => setNewSize(e.target.value)}
                    placeholder="أدخل المقاس"
                    className="border-2 border-gray-300 focus:border-purple-500"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        addNewSize()
                      }
                    }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    السعر الافتراضي
                  </label>
                  <Input
                    type="number"
                    value={newSizePrice}
                    onChange={(e) => setNewSizePrice(parseInt(e.target.value) || 1000)}
                    placeholder="السعر الافتراضي"
                    className="border-2 border-gray-300 focus:border-purple-500"
                    min="0"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <Button
                  onClick={addNewSize}
                  disabled={!newSize.trim()}
                  className="flex-1 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-bold"
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
                  className="flex-1 border-2 border-gray-300"
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

export default EnhancedPricingManagement