import * as XLSX from 'xlsx'
import { Billboard } from '@/types'

// تطبيع أحجام اللوحات لتكون متوافقة مع مفاتيح التسعير
const normalizeBillboardSize = (size: string): string => {
  if (!size) return '4x12'

  // تحويل النص إلى صغير وإزالة المسافات
  let normalized = size.toString().trim().toLowerCase()

  // استبدال X بـ x
  normalized = normalized.replace(/[×xX]/g, 'x')

  // إزالة أي مسافات أو رموز إضافية
  normalized = normalized.replace(/[^\dx]/g, '')

  // معالجة الأحجام الشائعة
  const sizeMap: Record<string, string> = {
    '12x4': '4x12',
    '13x5': '5x13',
    '10x4': '4x10',
    '8x3': '3x8',
    '6x3': '3x6',
    '4x3': '3x4',
    '18x6': '6x18',
    '15x5': '5x15'
  }

  // تطبيق الخريطة إذا وجدت
  if (sizeMap[normalized]) {
    return sizeMap[normalized]
  }

  // إذا لم توجد في الخريطة، التأكد من التنسيق الصحيح
  const parts = normalized.split('x')
  if (parts.length === 2) {
    const [width, height] = parts.map(p => parseInt(p)).filter(n => !isNaN(n))
    if (width && height) {
      // ترتيب الأبعاد: العرض × الارتفاع (الأصغر أولاً عادة)
      if (width <= height) {
        return `${width}x${height}`
      } else {
        return `${height}x${width}`
      }
    }
  }

  // افتراضي
  return '4x12'
}

const ONLINE_URL =
  "https://docs.google.com/spreadsheets/d/1fF9BUgBcW9OW3nWT97Uke_z2Pq3y_LC0/export?format=xlsx&gid=0&usp=sharing"
const CSV_URL =
  "https://docs.google.com/spreadsheets/d/1fF9BUgBcW9OW3nWT97Uke_z2Pq3y_LC0/gviz/tq?tqx=out:csv&gid=0&usp=sharing"

async function testUrlAccess(url: string) {
  try {
    const response = await fetch(url, { method: "HEAD" })
    console.log(`[Service] اختبار الوصول للرابط: ${response.status} ${response.statusText}`)
    return response.ok
  } catch (error: any) {
    console.log(`[Service] فشل اختبار الوصول للرابط: ${error.message}`)
    return false
  }
}

async function readCsvFromUrl(url: string, timeoutMs = 10000) {
  try {
    console.log(`[Service] محاولة تحميل ملف CSV من الرابط: ${url}`)

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)

    const cacheBuster = Date.now()
    const urlWithCacheBuster = `${url}&cachebuster=${cacheBuster}`

    const res = await fetch(urlWithCacheBuster, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    })
    clearTimeout(timeout)

    console.log(`[Service] استجابة CSV: ${res.status} ${res.statusText}`)
    console.log(`[Service] الرابط النهائي بعد التوجيه: ${res.url}`)

    if (res.status === 307 || res.status === 308) {
      const location = res.headers.get("location")
      console.log(`[Service] تم توجيه الطلب إلى: ${location}`)
      if (location) {
        return await readCsvFromUrl(location, timeoutMs)
      }
    }

    if (!res.ok) {
      throw new Error(`فشل تحميل ملف CSV: ${res.status} ${res.statusText}`)
    }

    const csvText = await res.text()
    console.log(`[Service] تم تحميل ${csvText.length} حرف من ملف CSV`)

    if (csvText.length === 0) {
      throw new Error("ملف CSV فارغ")
    }

    const workbook = XLSX.read(csvText, { type: "string" })
    return workbook
  } catch (error: any) {
    console.warn(`[Service] خطأ في قراءة CSV: ${error.message}`)
    throw error
  }
}

async function readExcelFromUrl(url: string, timeoutMs = 10000, retries = 2) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`[Service] محاولة ${attempt} من ${retries} لتحميل الملف من الرابط...`)

      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), timeoutMs)

      const cacheBuster = Date.now()
      const urlWithCacheBuster = `${url}&cachebuster=${cacheBuster}`

      console.log(`[Service] الرابط المستخدم: ${urlWithCacheBuster}`)

      const res = await fetch(urlWithCacheBuster, {
        signal: controller.signal,
        redirect: "follow",
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      })
      clearTimeout(timeout)

      console.log(`[Service] استجابة الخادم: ${res.status} ${res.statusText}`)
      console.log(`[Service] الرابط النهائي بعد التوجيه: ${res.url}`)
      console.log(`[Service] نوع المحتوى: ${res.headers.get("content-type")}`)
      console.log(`[Service] حجم المحتوى: ${res.headers.get("content-length")}`)

      if (res.status === 307 || res.status === 308) {
        const location = res.headers.get("location")
        console.log(`[Service] تم توجيه الطلب إلى: ${location}`)
        if (location) {
          return await readExcelFromUrl(location, timeoutMs, retries)
        }
      }

      if (!res.ok) {
        if (res.status === 403) {
          throw new Error(`الملف غير متاح للوصول العام. تأكد من أن الملف مشارك للعامة. كود الخطأ: ${res.status}`)
        } else if (res.status === 404) {
          throw new Error(`الملف غير موجود. تأكد من صحة رابط Google Sheets. كود الخطأ: ${res.status}`)
        } else if (res.status === 429) {
          throw new Error(`تم تجاوز حد الطلبات. حاول مرة أخرى لاحقاً. كود الخطأ: ${res.status}`)
        } else {
          throw new Error(`فشل تحميل ملف الإكسل من الرابط: ${res.status} ${res.statusText}`)
        }
      }

      const buffer = await res.arrayBuffer()
      console.log(`[Service] تم تحميل ${buffer.byteLength} بايت من الرابط`)

      if (buffer.byteLength === 0) {
        throw new Error("الملف المحمل فارغ")
      }

      const uint8Array = new Uint8Array(buffer)
      const isExcel = uint8Array[0] === 0x50 && uint8Array[1] === 0x4b // ZIP signature (Excel files are ZIP-based)
      const isOldExcel = uint8Array[0] === 0xd0 && uint8Array[1] === 0xcf // OLE signature (old Excel format)

      if (!isExcel && !isOldExcel) {
        console.log(
          `[Service] تحذير: الملف المحمل قد لا يكون ملف إكسل صحيح. البايتات الأولى: ${Array.from(uint8Array.slice(0, 10))
            .map((b) => b.toString(16))
            .join(" ")}`,
        )
      }

      return buffer
    } catch (error: any) {
      console.warn(`[Service] فشلت المحاولة ${attempt}:`, error.message)

      if (attempt === retries) {
        throw error
      }

      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt))
    }
  }

  throw new Error("فشل في جميع المحاولات")
}

function safeReadExcel(fileBuffer: ArrayBuffer) {
  const readOptions = [
    { type: "array" as const, cellDates: true, codepage: 65001, dateNF: "yyyy-mm-dd" },
    { type: "array" as const, cellDates: true, codepage: 1256, dateNF: "yyyy-mm-dd" },
    { type: "array" as const, cellDates: true, raw: false },
    { type: "array" as const, codepage: 65001 },
    { type: "array" as const, codepage: 1256 },
    { type: "array" as const, raw: true },
    { type: "array" as const, bookVBA: false, bookSheets: true },
  ]

  for (const options of readOptions) {
    try {
      console.log("[Service] محاولة قراءة الملف بخيارات:", JSON.stringify(options))
      const workbook = XLSX.read(fileBuffer, options)
      console.log("[Service] نجحت قراءة الملف بالخيارات:", JSON.stringify(options))
      return workbook
    } catch (error: any) {
      console.warn("[Service] فشل بالخيارات:", JSON.stringify(options), "الخطأ:", error.message)
      continue
    }
  }

  throw new Error("فشل في قراءة ملف الإكسل بجميع الخيارات المتاحة")
}

// دالة لتحويل التاريخ من Excel إلى تاريخ JavaScript صحيح
function parseExcelDate(dateValue: any): Date | null {
  if (!dateValue) return null
  
  // إذا كان التاريخ بالفعل كائن Date
  if (dateValue instanceof Date) {
    return isNaN(dateValue.getTime()) ? null : dateValue
  }
  
  // إذا كان رقم (Excel serial date)
  if (typeof dateValue === 'number') {
    try {
      // استخدام XLSX لتحويل الرقم التسلسلي إلى تاريخ
      const excelDate = XLSX.SSF.parse_date_code(dateValue)
      if (excelDate) {
        return new Date(excelDate.y, excelDate.m - 1, excelDate.d)
      }
    } catch (error) {
      console.warn("[Service] فشل في تحويل الرقم التسلسلي للتاريخ:", dateValue, error)
    }
  }
  
  // إذا كان نص
  if (typeof dateValue === 'string') {
    const dateStr = dateValue.trim()
    if (!dateStr) return null
    
    // محاولة تحويل النص إلى تاريخ
    const formats = [
      // صيغ التاريخ المختلفة
      /^\d{4}-\d{2}-\d{2}$/, // 2024-12-31
      /^\d{2}\/\d{2}\/\d{4}$/, // 31/12/2024
      /^\d{1,2}\/\d{1,2}\/\d{4}$/, // 1/1/2024
      /^\d{4}\/\d{2}\/\d{2}$/, // 2024/12/31
    ]
    
    for (const format of formats) {
      if (format.test(dateStr)) {
        const date = new Date(dateStr)
        if (!isNaN(date.getTime())) {
          return date
        }
      }
    }
    
    // محاولة أخيرة مع Date constructor
    const date = new Date(dateStr)
    if (!isNaN(date.getTime())) {
      return date
    }
  }
  
  console.warn("[Service] لا يمكن تحويل القيمة إلى تاريخ:", dateValue, typeof dateValue)
  return null
}

// دالة لمعالجة بيانات اللوحة الواحدة
function processBillboardData(billboard: any, index: number): Billboard {
  const id = billboard['ر.م'] || billboard['رقم اللوحة'] || `BILLBOARD-${index + 1}`
  const name = billboard['اسم لوحة'] || billboard['اسم اللوحة'] || `لوحة-${index + 1}`
  const location = billboard['اقرب نقطة دالة'] || billboard['أقرب نقطة دالة'] || 'موقع غير محدد'
  const municipality = billboard['البلدية'] || 'غير محدد'
  const city = billboard['مدينة'] || billboard['المدينة'] || 'غير محدد'

  // معالجة خاصة لحقل المنطقة للتأكد من عدم وجود تاريخ
  let areaValue = billboard['منطقة'] || billboard['المنطقة'] || municipality

  // التحقق من كون القيمة تاريخ وتحويلها لنص
  if (areaValue instanceof Date) {
    console.warn('[Service] تم العثور على تاريخ في حقل المنطقة، استخدام البلدية بدلاً منه:', areaValue)
    areaValue = municipality
  } else if (typeof areaValue === 'string' && areaValue.includes('GMT')) {
    console.warn('[Service] تم العثور على تاريخ نصي في حقل المنطقة، استخدام البلدية بدلاً منه:', areaValue)
    areaValue = municipality
  }

  const area = areaValue.toString().trim() || municipality
  const rawSize = billboard['حجم'] || billboard['الحجم'] || billboard['المقاس مع الدغاية'] || '12X4'
  const size = normalizeBillboardSize(rawSize.toString())
  const coordinates = billboard['احداثي - GPS'] || billboard['الإحداثيات GPS'] || '32.8872,13.1913'

  // بيانات العميل - استخدام أسماء الأعمدة الصحيحة
  const contractNumber = (billboard['رقم العقد'] || '').toString()
  const clientName = (billboard['اسم الزبون'] || billboard['اسم العميل'] || billboard['العميل'] || '').toString()
  const advertisementType = (billboard['نوع الاعلان'] || '').toString()

  let imageUrl = billboard['image_url'] || billboard['@IMAGE'] || '/roadside-billboard.png'
  if (imageUrl.includes('drive.google.com')) {
    const fileId = imageUrl.match(/id=([a-zA-Z0-9_-]+)/)?.[1] || 
                   imageUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)?.[1]
    if (fileId) {
      imageUrl = `https://drive.google.com/uc?export=view&id=${fileId}`
    }
  }

  const expiryDateValue = billboard['تاريخ انتهاء الايجار'] || billboard['تاريخ الانتهاء'] || billboard['تاريخ انتهاء العقد'] || null
  let status = billboard['الحالة'] || 'متاح'
  let expiryDate = null

  // تحديد الحالة بناءً على وجود عقد
  if (contractNumber && contractNumber.trim() !== '' && contractNumber !== '#N/A') {
    status = 'محجوز'

    // إذا كان هناك تاريخ انتهاء، تحقق من اقرب من الانتهاء
    if (expiryDateValue) {
      expiryDate = parseExcelDate(expiryDateValue)
      if (expiryDate) {
        const today = new Date()
        today.setHours(0, 0, 0, 0) // تصفير الوقت للمقارنة بالتاريخ فقط
        expiryDate.setHours(0, 0, 0, 0)
        
        const diffTime = expiryDate.getTime() - today.getTime()
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

        console.log(`[Service] Billboard ${id}: expiry value ${expiryDateValue}, parsed date: ${expiryDate.toISOString().split('T')[0]}, days remaining: ${diffDays}`)

        if (diffDays <= 30 && diffDays > 0) {
          status = "قريباً"
        } else if (diffDays <= 0) {
          // إذا انتهت المدة، تصبح اللوحة متاحة
          status = "متاح"
        }
      } else {
        console.warn(`[Service] فشل في تحويل تاريخ الانتهاء لل��حة ${id}: ${expiryDateValue}`)
      }
    }
  } else {
    // لوحة متاحة
    status = 'متاح'
  }
  
  const coords = coordinates.toString().split(',').map((c: string) => c.trim())
  const gpsLink = coords.length >= 2 
    ? `https://www.google.com/maps?q=${coords[0]},${coords[1]}`
    : 'https://www.google.com/maps?q=32.8872,13.1913'
  
  // تحديد فئة السعر من مستوى اللوحة
  const levelValue = billboard['مستوى'] || billboard['المستوى'] || billboard['تصنيف'] || 'A'
  const priceCategory = (levelValue === 'A' || levelValue === 'B') ? levelValue : 'A'

  return {
    id: id.toString(),
    name: name.toString(),
    location: location.toString(),
    municipality: municipality.toString(),
    city: city.toString(),
    area: area.toString(),
    size: size.toString(),
    level: levelValue.toString(),
    status: status.toString(),
    expiryDate: expiryDate ? expiryDate.toISOString().split('T')[0] : null,
    coordinates: coordinates.toString(),
    imageUrl,
    gpsLink,
    // بيانات العميل
    contractNumber: contractNumber,
    clientName: clientName,
    advertisementType: advertisementType,
    // تصنيف السعر (A أو B) - يتم أخذه من مستوى اللوحة
    priceCategory: priceCategory as 'A' | 'B',
  }
}

export async function loadBillboardsFromExcel(): Promise<Billboard[]> {
  try {
    console.log('[Service] تحميل بيانات اللوحات من Google Sheets...')
    
    let workbook: XLSX.WorkBook

    console.log(`[Service] التحقق من صحة الرابط: ${ONLINE_URL}`)

    const isUrlAccessible = await testUrlAccess(ONLINE_URL)
    console.log(`[Service] هل الرابط متاح؟ ${isUrlAccessible}`)

    try {
      console.log("[Service] محاولة قراءة البيانات بصيغة CSV...")
      workbook = await readCsvFromUrl(CSV_URL, 15000)
      console.log("[Service] تم تحميل البيانات بصيغة CSV بنجاح ✅")
    } catch (csvError: any) {
      console.warn("[Service] فشل تحميل CSV:", csvError.message)

      // جرّب روابط CSV بديلة أولاً
      const alternativeCsvUrls = [
        "https://docs.google.com/spreadsheets/d/1fF9BUgBcW9OW3nWT97Uke_z2Pq3y_LC0/gviz/tq?tqx=out:csv&gid=0",
        "https://docs.google.com/spreadsheets/d/1fF9BUgBcW9OW3nWT97Uke_z2Pq3y_LC0/gviz/tq?tqx=out:csv&sheet=Sheet1",
        "https://docs.google.com/spreadsheets/d/1fF9BUgBcW9OW3nWT97Uke_z2Pq3y_LC0/export?format=csv&gid=0",
        "https://docs.google.com/spreadsheets/d/1fF9BUgBcW9OW3nWT97Uke_z2Pq3y_LC0/export?format=csv",
      ]

      for (const url of alternativeCsvUrls) {
        try {
          console.log(`[Service] محاولة قراءة CSV بديل: ${url}`)
          const altWb = await readCsvFromUrl(url, 15000)
          workbook = altWb
          console.log("[Service] تم تحميل CSV البديل بنجاح ✅")
          break
        } catch (err: any) {
          console.warn(`[Service] فشل CSV البديل ${url}:`, err.message)
          continue
        }
      }

      // إذا لم ننجح مع CSV، نحاول Excel
      if (!workbook) {
        const alternativeUrls = [
          ONLINE_URL,
          ONLINE_URL.replace("&gid=0", ""),
          ONLINE_URL.replace("export?format=xlsx", "export?format=xlsx&exportFormat=xlsx"),
          "https://docs.google.com/spreadsheets/d/1fF9BUgBcW9OW3nWT97Uke_z2Pq3y_LC0/export?format=xlsx&id=1fF9BUgBcW9OW3nWT97Uke_z2Pq3y_LC0&usp=sharing",
          "https://docs.google.com/spreadsheets/d/1fF9BUgBcW9OW3nWT97Uke_z2Pq3y_LC0/export?format=xlsx",
        ]

        let fileBuffer: ArrayBuffer | null = null
        let lastError: Error | null = null

        for (const url of alternativeUrls) {
          try {
            console.log(`[Service] محاولة قراءة ملف الإكسل من الرابط: ${url}`)
            fileBuffer = await readExcelFromUrl(url, 15000, 2)
            console.log("[Service] تم تحميل ملف الإكسل من الرابط بنجاح ✅")
            break
          } catch (err: any) {
            console.warn(`[Service] فشل قراءة الملف من الرابط ${url}:`, err.message)
            lastError = err
            continue
          }
        }

        if (!fileBuffer) {
          console.log("[Service] محاولة قراءة ملف الإكسل من الملف المحلي...")
          try {
            const response = await fetch('/billboards.xlsx')

            if (!response.ok) {
              throw new Error('فشل في تحميل ملف Excel المحلي')
            }

            fileBuffer = await response.arrayBuffer()
            console.log("[Service] تم تحميل ملف الإكسل المحلي ✅")
          } catch (localError: any) {
            console.error("[Service] فشل في قراءة الملف المحلي أيضاً:", localError.message)
            throw new Error(
              `فشل في قراءة الملف من الرابط والملف المحلي. آخر خطأ من الرابط: ${lastError?.message}. خطأ الملف المحلي: ${localError.message}`,
            )
          }
        }

        if (!fileBuffer || fileBuffer.byteLength === 0) {
          throw new Error("ملف الإكسل فارغ أو تالف")
        }

        console.log("[Service] حجم الملف:", fileBuffer.byteLength, "بايت")
        workbook = safeReadExcel(fileBuffer)
      }
    }

    const sheetName = workbook.SheetNames[0]
    if (!sheetName) {
      throw new Error("لا توجد أوراق في ملف الإكسل")
    }

    const worksheet = workbook.Sheets[sheetName]
    if (!worksheet) {
      throw new Error("لا يمكن قراءة الورقة الأولى من ملف الإكسل")
    }

    const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" })
    if (jsonData.length === 0) {
      throw new Error("ملف الإكسل فارغ")
    }

    console.log("[Service] أعمدة الملف المتاحة:", Object.keys(jsonData[0] || {}))

    // عرض جميع اللوحات (المتاحة والمحجوزة)
    const billboards = jsonData.map((billboard: any, index: number) => 
      processBillboardData(billboard, index)
    )

    console.log('[Service] تم تحميل', billboards.length, 'لوحة من Google Sheets')
    return billboards
  } catch (error) {
    console.error('[Service] خطأ في تحميل ملف Excel من Google Sheets:', error)
    
    // محاولة تحميل الملف المحلي كبديل
    try {
      console.log('[Service] محاولة تحميل الملف المحلي كبديل...')
      const response = await fetch('/billboards.xlsx')
      
      if (!response.ok) {
        throw new Error('فشل في تحميل ملف Excel المحلي')
      }
      
      const buffer = await response.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: 'array', cellDates: true })
      
      const sheetName = workbook.SheetNames[0]
      if (!sheetName) {
        throw new Error('لا توجد أوراق في ملف Excel المحلي')
      }
      
      const worksheet = workbook.Sheets[sheetName]
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' })
      
      if (jsonData.length === 0) {
        throw new Error('ملف Excel المحلي فارغ')
      }
      
      // معالجة البيانات المحلية بنفس الطريقة - عرض جميع اللوحات
      const billboards = jsonData.map((billboard: any, index: number) => 
        processBillboardData(billboard, index)
      )

      console.log('[Service] تم تحميل', billboards.length, 'لوحة من الملف المحلي')
      return billboards
    } catch (localError) {
      console.error('[Service] فشل في تحميل الملف المحلي أيضاً:', localError)
      
      // بيانات احتياطية
      const today = new Date()
      const in5Days = new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000)
      const in10Days = new Date(today.getTime() + 10 * 24 * 60 * 60 * 1000)
      const in15Days = new Date(today.getTime() + 15 * 24 * 60 * 60 * 1000)
      const in18Days = new Date(today.getTime() + 18 * 24 * 60 * 60 * 1000)

      console.log('[Service] استخدام البيانات الاحتياطية - Using fallback data')

      return [
        {
          id: "132",
          name: "KH-SK0132",
          location: "الجزيرة الجديدة مدخل شارع 20",
          municipality: "الخمس",
          city: "الخمس",
          area: "الخمس",
          size: "12X4",
          level: "B",
          status: "قريباً",
          expiryDate: in5Days.toISOString().split('T')[0],
          coordinates: "32.639466,14.265113",
          imageUrl: "https://lh3.googleusercontent.com/d/1IXWjRnWIqrRnsCIR1UEdsrWqqNeDW8eL",
          gpsLink: "https://www.google.com/maps?q=32.639466,14.265113",
          contractNumber: "CT-2024-001",
          clientName: "شركة الفارس ��لذهبي",
          advertisementType: "تجاري",
          priceCategory: "B",
        },
        {
          id: "943",
          name: "TR-TG0943",
          location: "امام كلية الهندسة العسكرية باتجاه الشرق",
          municipality: "تاجوراء",
          city: "طرابلس",
          area: "طرابلس",
          size: "12X4",
          level: "A",
          status: "قريباً",
          expiryDate: in10Days.toISOString().split('T')[0],
          coordinates: "32.77941062678118,13.202820303855821",
          imageUrl: "https://lh3.googleusercontent.com/d/1y3u807ziWfFgaYpsUlA3Rufmu7vyzY7u",
          gpsLink: "https://www.google.com/maps?q=32.77941062678118,13.202820303855821",
          contractNumber: "CT-2024-002",
          clientName: "مؤسسة النور للإعلان",
          advertisementType: "خدمي",
          priceCategory: "A",
        },
        {
          id: "134",
          name: "KH-SK0134",
          location: "بجوار كوبري سوق الخميس باتجاه الشرق",
          municipality: "الخمس",
          city: "الخمس",
          area: "الخمس",
          size: "12X4",
          level: "B",
          status: "متاح",
          expiryDate: null,
          coordinates: "32.566533,14.344944",
          imageUrl: "https://lh3.googleusercontent.com/d/1J1D2ZEhnQZbRuSKxNVE4XTifkhvHabYs",
          gpsLink: "https://www.google.com/maps?q=32.566533,14.344944",
          contractNumber: "CT-2024-003",
          clientName: "بنك الجمهورية",
          advertisementType: "مصرفي",
          priceCategory: "B",
        },
        {
          id: "917",
          name: "TR-JZ0917",
          location: "بعد مخرج السراج بـ800 متر",
          municipality: "جنزور",
          city: "طرابلس",
          area: "طرابلس",
          size: "12x4",
          level: "A",
          status: "محجوز",
          expiryDate: in15Days.toISOString().split('T')[0],
          coordinates: "32.838179,13.071658",
          imageUrl: "/roadside-billboard.png",
          gpsLink: "https://www.google.com/maps?q=32.838179,13.071658",
          contractNumber: "CT-2024-004",
          clientName: "شركة الاتصالات الليبية",
          advertisementType: "اتصالات",
          priceCategory: "A",
        },
        {
          id: "130",
          name: "KH-SK0130",
          location: "بجوار جسر سوق الخميس با��جاه الغرب",
          municipality: "الخمس",
          city: "الخمس",
          area: "الخمس",
          size: "12X4",
          level: "B",
          status: "متاح",
          expiryDate: null,
          coordinates: "32.566533,14.344944",
          imageUrl: "https://lh3.googleusercontent.com/d/1iHHF-cuvAvgs0-gpW65zkxFrLU2qV7bE",
          gpsLink: "https://www.google.com/maps?q=32.566533,14.344944",
          contractNumber: "",
          clientName: "",
          advertisementType: "",
          priceCategory: "B",
        },
        {
          id: "140",
          name: "ZL-ZL0140",
          location: "مدخل المدينة الغربي بجوار كمرة كعام باتجاه الشرق",
          municipality: "زليتن",
          city: "زليتن",
          area: "زليتن",
          size: "12X4",
          level: "B",
          status: "قريباً",
          expiryDate: in18Days.toISOString().split('T')[0],
          coordinates: "32.498982,14.446801",
          imageUrl: "https://lh3.googleusercontent.com/d/1_js8MPBTvM_ymwPNm1oedZfjtDuMPIfj",
          gpsLink: "https://www.google.com/maps?q=32.498982,14.446801",
          contractNumber: "CT-2024-006",
          clientName: "شركة المدار الجديد",
          advertisementType: "اتصالات",
          priceCategory: "B",
        },
        {
          id: "150",
          name: "MS-MS0150",
          location: "مدخل مصراتة الشرقي بجوار المطار",
          municipality: "مصراتة",
          city: "مصراتة",
          area: "مصراتة",
          size: "18X6",
          level: "A",
          status: "متاح",
          expiryDate: null,
          coordinates: "32.374116,15.087794",
          imageUrl: "/roadside-billboard.png",
          gpsLink: "https://www.google.com/maps?q=32.374116,15.087794",
          contractNumber: "",
          clientName: "",
          advertisementType: "",
          priceCategory: "A",
        },
      ]
    }
  }
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
      'نوع الإعلان'
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
