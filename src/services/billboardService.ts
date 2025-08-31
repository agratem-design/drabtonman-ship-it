import { Billboard } from '@/types'
import * as XLSX from 'xlsx'

// رابط ملف الإكسل على Google Sheets
const EXCEL_URL = 'https://docs.google.com/spreadsheets/d/1Hs8wOJmkzQVQkQVQkQVQkQVQkQVQkQVQkQVQkQVQkQVQ/export?format=xlsx'

// بيانات احتياطية محلية محسنة
const FALLBACK_BILLBOARDS: Billboard[] = [
  {
    id: '1',
    name: 'لوحة مدخل مصراتة الشرقي',
    location: 'شارع طرابلس الرئيسي - مدخل المدينة',
    municipality: 'مصراتة',
    city: 'مصراتة',
    area: 'مصراتة',
    size: '5x13',
    level: 'A',
    status: 'متاح',
    expiryDate: null,
    coordinates: '32.3745,15.0919',
    imageUrl: 'https://lh3.googleusercontent.com/d/13yTnaEWp2tFSxCmg8AuXH1e9QvPNMYWq',
    gpsLink: 'https://maps.google.com/?q=32.3745,15.0919',
    priceCategory: 'A'
  },
  {
    id: '2',
    name: 'لوحة ميدان الشهداء',
    location: 'ميدان الشهداء - وسط البلد',
    municipality: 'مصراتة',
    city: 'مصراتة',
    area: 'مصراتة',
    size: '4x12',
    level: 'A',
    status: 'محجوز',
    expiryDate: '2024-12-15',
    coordinates: '32.3745,15.0919',
    imageUrl: 'https://lh3.googleusercontent.com/d/13yTnaEWp2tFSxCmg8AuXH1e9QvPNMYWq',
    gpsLink: 'https://maps.google.com/?q=32.3745,15.0919',
    contractNumber: 'C-1108',
    clientName: 'شركة الإعلانات المتطورة',
    advertisementType: 'إعلان تجاري',
    priceCategory: 'A'
  },
  {
    id: '3',
    name: 'لوحة طريق المطار',
    location: 'طريق المطار الدولي - الكيلو 7',
    municipality: 'مصراتة',
    city: 'مصراتة',
    area: 'مصراتة',
    size: '4x10',
    level: 'B',
    status: 'قريباً',
    expiryDate: '2024-09-30',
    coordinates: '32.3745,15.0919',
    imageUrl: 'https://lh3.googleusercontent.com/d/13yTnaEWp2tFSxCmg8AuXH1e9QvPNMYWq',
    gpsLink: 'https://maps.google.com/?q=32.3745,15.0919',
    contractNumber: 'C-1109',
    clientName: 'مؤسسة النجم الذهبي',
    advertisementType: 'إعلان خدمي',
    priceCategory: 'B'
  },
  {
    id: '4',
    name: 'لوحة شارع قرطاجنة',
    location: 'شارع قرطاجنة التجاري - أبو سليم',
    municipality: 'أبو سليم',
    city: 'طرابلس',
    area: 'أبو سليم',
    size: '3x8',
    level: 'A',
    status: 'متاح',
    expiryDate: null,
    coordinates: '32.7767,13.1857',
    imageUrl: 'https://lh3.googleusercontent.com/d/13yTnaEWp2tFSxCmg8AuXH1e9QvPNMYWq',
    gpsLink: 'https://maps.google.com/?q=32.7767,13.1857',
    priceCategory: 'A'
  },
  {
    id: '5',
    name: 'لوحة دوار العجيلات',
    location: 'دوار العجيلات الرئيسي - طرابلس',
    municipality: 'طرابلس المركز',
    city: 'طرابلس',
    area: 'طرابلس المركز',
    size: '3x6',
    level: 'B',
    status: 'متاح',
    expiryDate: null,
    coordinates: '32.8872,13.1913',
    imageUrl: 'https://lh3.googleusercontent.com/d/13yTnaEWp2tFSxCmg8AuXH1e9QvPNMYWq',
    gpsLink: 'https://maps.google.com/?q=32.8872,13.1913',
    priceCategory: 'B'
  },
  {
    id: '6',
    name: 'لوحة شارع الجمهورية',
    location: 'شارع الجمهورية الرئيسي - طرابلس',
    municipality: 'طرابلس',
    city: 'طرابلس',
    area: 'طرابلس',
    size: '5x13',
    level: 'A',
    status: 'محجوز',
    expiryDate: '2024-11-20',
    coordinates: '32.8872,13.1913',
    imageUrl: 'https://lh3.googleusercontent.com/d/13yTnaEWp2tFSxCmg8AuXH1e9QvPNMYWq',
    gpsLink: 'https://maps.google.com/?q=32.8872,13.1913',
    contractNumber: 'C-1110',
    clientName: 'شركة التسويق الحديث',
    advertisementType: 'إعلان تجاري',
    priceCategory: 'A'
  },
  {
    id: '7',
    name: 'لوحة طريق السواني',
    location: 'طريق السواني السريع - طرابلس',
    municipality: 'طرابلس',
    city: 'طرابلس',
    area: 'طرابلس',
    size: '4x12',
    level: 'A',
    status: 'متاح',
    expiryDate: null,
    coordinates: '32.8872,13.1913',
    imageUrl: 'https://lh3.googleusercontent.com/d/13yTnaEWp2tFSxCmg8AuXH1e9QvPNMYWq',
    gpsLink: 'https://maps.google.com/?q=32.8872,13.1913',
    priceCategory: 'A'
  },
  {
    id: '8',
    name: 'لوحة مدخل زليتن',
    location: 'مدخل مدينة زليتن الرئيسي',
    municipality: 'زليتن',
    city: 'زليتن',
    area: 'زليتن',
    size: '4x10',
    level: 'A',
    status: 'متاح',
    expiryDate: null,
    coordinates: '32.4673,14.5687',
    imageUrl: 'https://lh3.googleusercontent.com/d/13yTnaEWp2tFSxCmg8AuXH1e9QvPNMYWq',
    gpsLink: 'https://maps.google.com/?q=32.4673,14.5687',
    priceCategory: 'A'
  },
  {
    id: '9',
    name: 'لوحة بنغازي المركزية',
    location: 'شارع جمال عبد الناصر - بنغازي',
    municipality: 'بنغازي',
    city: 'بنغازي',
    area: 'بنغازي',
    size: '5x13',
    level: 'A',
    status: 'محجوز',
    expiryDate: '2024-10-15',
    coordinates: '32.1167,20.0667',
    imageUrl: 'https://lh3.googleusercontent.com/d/13yTnaEWp2tFSxCmg8AuXH1e9QvPNMYWq',
    gpsLink: 'https://maps.google.com/?q=32.1167,20.0667',
    contractNumber: 'C-1111',
    clientName: 'مكتب الإعلان الشرقي',
    advertisementType: 'إعلان ثقافي',
    priceCategory: 'A'
  },
  {
    id: '10',
    name: 'لوحة شارع الكورنيش',
    location: 'كورنيش بنغازي - المنطقة السياحية',
    municipality: 'بنغازي',
    city: 'بنغازي',
    area: 'بنغازي',
    size: '3x4',
    level: 'B',
    status: 'متاح',
    expiryDate: null,
    coordinates: '32.1167,20.0667',
    imageUrl: 'https://lh3.googleusercontent.com/d/13yTnaEWp2tFSxCmg8AuXH1e9QvPNMYWq',
    gpsLink: 'https://maps.google.com/?q=32.1167,20.0667',
    priceCategory: 'B'
  }
]

/**
 * تحميل بيانات اللوحات من ملف الإكسل مع نظام fallback محسن
 */
export async function loadBillboardsFromExcel(): Promise<Billboard[]> {
  console.log('🔄 بدء تحميل بيانات اللوحات...')

  try {
    // أولاً: محاولة تحميل من ملف الإكسل المحلي
    const localExcelResponse = await fetch('/billboards.xlsx')
    
    if (localExcelResponse.ok) {
      console.log('📁 تم العثور على ملف الإكسل المحلي')
      const arrayBuffer = await localExcelResponse.arrayBuffer()
      const billboards = await parseExcelData(arrayBuffer)
      
      if (billboards.length > 0) {
        console.log(`✅ تم تحميل ${billboards.length} لوحة من الملف المحلي`)
        // حفظ البيانات محلياً كنسخة احتياطية
        localStorage.setItem('al-fares-billboards-cache', JSON.stringify(billboards))
        return billboards
      }
    }

    // ثانياً: محاولة تحميل من Google Sheets (إذا كان الرابط متاحاً)
    if (EXCEL_URL?.includes('docs.google.com')) {
      console.log('☁️ محاولة تحميل من Google Sheets...')
      
      try {
        const response = await fetch(EXCEL_URL, {
          method: 'GET',
          headers: {
            'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          }
        })

        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer()
          const billboards = await parseExcelData(arrayBuffer)
          
          if (billboards.length > 0) {
            console.log(`✅ تم تحميل ${billboards.length} لوحة من Google Sheets`)
            localStorage.setItem('al-fares-billboards-cache', JSON.stringify(billboards))
            return billboards
          }
        }
      } catch (sheetsError) {
        console.warn('⚠️ فشل في تحميل من Google Sheets:', sheetsError)
      }
    }

    // ثالثاً: محاولة استخدام البيانات المحفوظة محلياً
    const cachedData = localStorage.getItem('al-fares-billboards-cache')
    if (cachedData) {
      try {
        const billboards = JSON.parse(cachedData) as Billboard[]
        if (billboards.length > 0) {
          console.log(`📦 تم تحميل ${billboards.length} لوحة من الذاكرة المحلية`)
          return billboards
        }
      } catch (cacheError) {
        console.warn('⚠️ خطأ في قراءة البيانات المحفوظة:', cacheError)
      }
    }

    // رابعاً: استخدام البيانات الاحتياطية
    console.log('🔄 استخدام البيانات الاحتياطية المدمجة')
    return FALLBACK_BILLBOARDS

  } catch (error) {
    console.error('❌ خطأ عام في تحميل البيانات:', error)
    console.log('🔄 استخدام البيانات الاحتياطية')
    return FALLBACK_BILLBOARDS
  }
}

/**
 * تحليل بيانات ملف الإكسل وتحويلها إلى كائنات Billboard
 */
async function parseExcelData(arrayBuffer: ArrayBuffer): Promise<Billboard[]> {
  try {
    const workbook = XLSX.read(arrayBuffer, { type: 'array' })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    
    // تحويل البيانات إلى JSON
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]
    
    if (!jsonData || jsonData.length < 2) {
      return []
    }

    // استخراج العناوين من الصف الأول
    const headers = jsonData[0].map((header: any) => 
      (header || '').toString().trim().toLowerCase()
    )

    // تعيين فهارس الأعمدة
    const columnIndexes = {
      name: findColumnIndex(headers, ['اسم اللوحة', 'الاسم', 'name']),
      location: findColumnIndex(headers, ['الموقع', 'location']),
      municipality: findColumnIndex(headers, ['البلدية', 'municipality']),
      city: findColumnIndex(headers, ['المدينة', 'city']),
      area: findColumnIndex(headers, ['المنطقة', 'area']),
      size: findColumnIndex(headers, ['المقاس', 'size']),
      level: findColumnIndex(headers, ['المستوى', 'level']),
      status: findColumnIndex(headers, ['الحالة', 'status']),
      expiryDate: findColumnIndex(headers, ['تاريخ الانتهاء', 'expiry']),
      coordinates: findColumnIndex(headers, ['الإحداثيات', 'coordinates']),
      imageUrl: findColumnIndex(headers, ['رابط الصورة', 'image']),
      gpsLink: findColumnIndex(headers, ['رابط الخريطة', 'gps']),
      contractNumber: findColumnIndex(headers, ['رقم العقد', 'contract']),
      clientName: findColumnIndex(headers, ['اسم العميل', 'client']),
      advertisementType: findColumnIndex(headers, ['نوع الإعلان', 'ad_type'])
    }

    const billboards: Billboard[] = []

    // معالجة كل صف من البيانات
    for (let i = 1; i < jsonData.length; i++) {
      const row = jsonData[i]
      
      // تخطي الصفوف الفارغة
      if (!row || row.length === 0 || !row[columnIndexes.name]) {
        continue
      }

      try {
        const billboard: Billboard = {
          id: `billboard_${i}_${Date.now()}`,
          name: getCellValue(row, columnIndexes.name) || `لوحة ${i}`,
          location: getCellValue(row, columnIndexes.location) || 'موقع غير محدد',
          municipality: getCellValue(row, columnIndexes.municipality) || 'غير محدد',
          city: getCellValue(row, columnIndexes.city) || 'غير محدد',
          area: getCellValue(row, columnIndexes.area) || 'غير محدد',
          size: getCellValue(row, columnIndexes.size) || '3x4',
          level: getCellValue(row, columnIndexes.level) || 'A',
          status: getCellValue(row, columnIndexes.status) || 'متاح',
          expiryDate: getCellValue(row, columnIndexes.expiryDate) || null,
          coordinates: getCellValue(row, columnIndexes.coordinates) || '32.3745,15.0919',
          imageUrl: getCellValue(row, columnIndexes.imageUrl) || 'https://lh3.googleusercontent.com/d/13yTnaEWp2tFSxCmg8AuXH1e9QvPNMYWq',
          gpsLink: getCellValue(row, columnIndexes.gpsLink) || 'https://maps.google.com/?q=32.3745,15.0919',
          contractNumber: getCellValue(row, columnIndexes.contractNumber) || undefined,
          clientName: getCellValue(row, columnIndexes.clientName) || undefined,
          advertisementType: getCellValue(row, columnIndexes.advertisementType) || undefined,
          priceCategory: (getCellValue(row, columnIndexes.level) === 'B' ? 'B' : 'A') as 'A' | 'B'
        }

        // تنظيف وتحسين البيانات
        billboard.name = billboard.name.trim()
        billboard.location = billboard.location.trim()
        billboard.municipality = billboard.municipality.trim()
        
        // تحديد فئة السعر بناءً على المستوى
        if (billboard.level && billboard.level.toUpperCase().includes('B')) {
          billboard.priceCategory = 'B'
        } else {
          billboard.priceCategory = 'A'
        }

        // التحقق من صحة الإحداثيات
        if (billboard.coordinates && !isValidCoordinates(billboard.coordinates)) {
          billboard.coordinates = '32.3745,15.0919' // إحداثيات افتراضية
        }

        billboards.push(billboard)
      } catch (rowError) {
        console.warn(`⚠️ خطأ في معالجة الصف ${i}:`, rowError)
        // تخطي الصف المعطوب والمتابعة
        continue
      }
    }

    console.log(`✅ تم تحليل ${billboards.length} لوحة من ملف الإكسل`)
    return billboards

  } catch (error) {
    console.error('❌ خطأ في تحليل ملف الإكسل:', error)
    throw error
  }
}

/**
 * البحث عن فهرس العمود بناءً على أسماء محتملة
 */
function findColumnIndex(headers: string[], possibleNames: string[]): number {
  for (const name of possibleNames) {
    const index = headers.findIndex(header => 
      header.includes(name.toLowerCase()) || 
      name.toLowerCase().includes(header)
    )
    if (index !== -1) {
      return index
    }
  }
  return -1
}

/**
 * الحصول على قيمة الخلية مع معالجة الأخطاء
 */
function getCellValue(row: any[], index: number): string | null {
  if (index === -1 || !row[index]) {
    return null
  }
  
  const value = row[index]
  
  // معالجة التواريخ
  if (typeof value === 'number' && value > 40000 && value < 50000) {
    // تاريخ Excel (عدد الأيام منذ 1900)
    const date = new Date((value - 25569) * 86400 * 1000)
    return date.toISOString().split('T')[0]
  }
  
  return value.toString().trim()
}

/**
 * التحقق من صحة الإحداثيات
 */
function isValidCoordinates(coordinates: string): boolean {
  if (!coordinates || typeof coordinates !== 'string') {
    return false
  }
  
  const parts = coordinates.split(',')
  if (parts.length !== 2) {
    return false
  }
  
  const lat = parseFloat(parts[0].trim())
  const lng = parseFloat(parts[1].trim())
  
  return !isNaN(lat) && !isNaN(lng) && 
         lat >= -90 && lat <= 90 && 
         lng >= -180 && lng <= 180
}

/**
 * حفظ البيانات في ملف إكسل جديد
 */
export function exportBillboardsToExcel(billboards: Billboard[], filename: string = 'billboards.xlsx'): void {
  try {
    const headers = [
      'اسم اللوحة',
      'الموقع', 
      'البلدية',
      'المدينة',
      'المنطقة',
      'المقاس',
      'المستوى',
      'الحالة',
      'تاريخ الانتهاء',
      'الإحداثيات',
      'رابط الصورة',
      'رابط الخريطة',
      'رقم العقد',
      'اسم العميل',
      'ن��ع الإعلان'
    ]

    const data = [
      headers,
      ...billboards.map(billboard => [
        billboard.name,
        billboard.location,
        billboard.municipality,
        billboard.city,
        billboard.area,
        billboard.size,
        billboard.level,
        billboard.status,
        billboard.expiryDate || '',
        billboard.coordinates,
        billboard.imageUrl,
        billboard.gpsLink,
        billboard.contractNumber || '',
        billboard.clientName || '',
        billboard.advertisementType || ''
      ])
    ]

    const worksheet = XLSX.utils.aoa_to_sheet(data)
    const workbook = XLSX.utils.book_new()
    
    // تنسيق العرض
    worksheet['!cols'] = [
      { width: 25 }, // اسم اللوحة
      { width: 30 }, // الموقع
      { width: 15 }, // البلدية
      { width: 15 }, // المدينة
      { width: 15 }, // المنطقة
      { width: 10 }, // المقاس
      { width: 10 }, // المستوى
      { width: 10 }, // الحالة
      { width: 15 }, // تاريخ الانتهاء
      { width: 20 }, // الإحداثيات
      { width: 40 }, // رابط الصورة
      { width: 40 }, // رابط الخريطة
      { width: 15 }, // رقم العقد
      { width: 20 }, // اسم العميل
      { width: 15 }  // نوع الإعلان
    ]

    XLSX.utils.book_append_sheet(workbook, worksheet, 'اللوحات الإعلانية')
    XLSX.writeFile(workbook, filename)
    
    console.log(`✅ تم تصدير البيانات إلى ${filename}`)
  } catch (error) {
    console.error('❌ خطأ في تصدير البيانات:', error)
    throw error
  }
}

/**
 * الحصول على إحصائيات البيانات
 */
export function getBillboardStats(billboards: Billboard[]): {
  total: number
  available: number
  booked: number
  expiringSoon: number
  byMunicipality: Record<string, number>
  bySize: Record<string, number>
  byStatus: Record<string, number>
} {
  const stats = {
    total: billboards.length,
    available: 0,
    booked: 0,
    expiringSoon: 0,
    byMunicipality: {} as Record<string, number>,
    bySize: {} as Record<string, number>,
    byStatus: {} as Record<string, number>
  }

  const today = new Date()
  const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)

  billboards.forEach(billboard => {
    // إحصائيات الحالة
    if (billboard.status === 'متاح') stats.available++
    if (billboard.status === 'محجوز') stats.booked++

    // اللوحات التي تنتهي قريباً
    if (billboard.expiryDate) {
      const expiryDate = new Date(billboard.expiryDate)
      if (expiryDate <= thirtyDaysFromNow && expiryDate >= today) {
        stats.expiringSoon++
      }
    }

    // إحصائيات البلديات
    stats.byMunicipality[billboard.municipality] = 
      (stats.byMunicipality[billboard.municipality] || 0) + 1

    // إحصائيات المقاسات
    stats.bySize[billboard.size] = 
      (stats.bySize[billboard.size] || 0) + 1

    // إحصائيات الحالات
    stats.byStatus[billboard.status] = 
      (stats.byStatus[billboard.status] || 0) + 1
  })

  return stats
}
