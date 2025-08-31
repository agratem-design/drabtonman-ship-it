import { loadBillboardsFromExcel } from '@/services/billboardService'
import { pricingService } from '@/services/pricingService'
import { newPricingService } from '@/services/newPricingService'
import { installationPricingService } from '@/services/installationPricingService'

/**
 * اختبار للنظام المختلط (بيانات من الإكسل + أسعار محلية)
 */
export class HybridSystemTest {
  
  /**
   * اختبار تحميل بيانات اللوحات من ملف الإكسل
   */
  async testExcelDataLoading() {
    console.log('🔄 اختب��ر تحميل بيانات اللوحات من ملف الإكسل...')
    
    try {
      const startTime = Date.now()
      const billboards = await loadBillboardsFromExcel()
      const loadTime = Date.now() - startTime
      
      if (billboards.length === 0) {
        throw new Error('لا توجد بيانات لوحات من ملف الإكسل')
      }
      
      console.log(`✅ تم تحميل ${billboards.length} لوحة من ملف الإكسل في ${loadTime}ms`)
      
      // اختبار البيانات المطلوبة
      const firstBillboard = billboards[0]
      const requiredFields = ['id', 'name', 'size', 'municipality', 'location']
      
      for (const field of requiredFields) {
        if (!firstBillboard[field]) {
          throw new Error(`الحقل ${field} مفقود في بيانات اللوحة من الإكسل`)
        }
      }
      
      console.log('✅ جميع الحقول المطلوبة موجودة في بيانات الإكسل')
      
      // اختبار تنوع البيانات
      const municipalities = [...new Set(billboards.map(b => b.municipality))]
      const sizes = [...new Set(billboards.map(b => b.size))]
      const statuses = [...new Set(billboards.map(b => b.status))]
      
      console.log("📊 إحصائيا�� البيانات:")
      console.log(`   - البلديات: ${municipalities.length} (${municipalities.join(', ')})`)
      console.log(`   - المقاسات: ${sizes.length} (${sizes.join(', ')})`)
      console.log(`   - الحالات: ${statuses.length} (${statuses.join(', ')})`)
      
      return { success: true, billboards, loadTime }
    } catch (error) {
      console.error('❌ خطأ في تحميل بيانات الإكسل:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * اختبار الأسعار المحلية
   */
  testLocalPricing() {
    console.log('🔄 اختبار الأسعار المحلية...')
    
    try {
      // اختبار خدمة الأسعار القديمة
      const pricing = pricingService.getPricing()
      if (!pricing || !pricing.zones || !pricing.currency) {
        throw new Error('بيانات الأسعار القديمة غير صحيحة')
      }
      
      // اختبار حساب سعر
      const oldPrice = pricingService.getBillboardPrice('5x13', 'مصراتة', 'companies')
      if (oldPrice === 0) {
        throw new Error('لا يمكن حساب السعر القديم')
      }
      
      console.log(`✅ خدمة الأسعار القديمة: ${oldPrice} ${pricing.currency}`)
      
      // اختبار خدمة الأسعار الجديدة
      const newPricing = newPricingService.getPricing()
      if (!newPricing || !newPricing.zones || !newPricing.currency) {
        throw new Error('بيانات الأسعار الجديدة غير صحيحة')
      }
      
      const newPrice = newPricingService.getBillboardPriceABWithDuration('5x13', 'مصراتة', 'A', 1)
      if (newPrice === 0) {
        throw new Error('لا يمكن حساب السعر الجديد')
      }
      
      console.log(`✅ خدمة الأسعار الجديدة: ${newPrice} ${newPricing.currency}`)
      
      // اختبار أسعار التركيب
      const installationPricing = installationPricingService.getInstallationPricing()
      if (!installationPricing || !installationPricing.zones) {
        throw new Error('بيانات أسعار التركيب غير صحيحة')
      }
      
      const installationPrice = installationPricingService.getInstallationPrice('5x13', 'م��راتة')
      if (installationPrice === 0) {
        throw new Error('لا يمكن حساب سعر التركيب')
      }
      
      console.log(`✅ أسعار التركيب: ${installationPrice} ${installationPricing.currency}`)
      
      return { 
        success: true, 
        oldPrice, 
        newPrice, 
        installationPrice,
        currency: pricing.currency 
      }
    } catch (error) {
      console.error('❌ خطأ في الأسعار المحلية:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * اختبار التكامل بين البيانات والأسعار
   */
  async testDataPricingIntegration() {
    console.log('🔄 اختبار التكامل بين بيانات الإكسل والأسعار المحلية...')
    
    try {
      // تحميل البيانات
      const billboards = await loadBillboardsFromExcel()
      if (billboards.length === 0) {
        throw new Error('لا توجد بيانات للاختبار')
      }
      
      const testBillboard = billboards[0]
      console.log(`🔍 اختبار اللوحة: ${testBillboard.name} (${testBillboard.size})`)
      
      // تحديد المنطقة السعرية
      const zone = pricingService.determinePricingZone(testBillboard.municipality, testBillboard.area)
      console.log(`📍 المنطقة السعرية المحددة: ${zone}`)
      
      // حساب الأسعار المختلفة
      const prices = {
        companies: pricingService.getBillboardPrice(testBillboard.size, zone, 'companies'),
        individuals: pricingService.getBillboardPrice(testBillboard.size, zone, 'individuals'),
        marketers: pricingService.getBillboardPrice(testBillboard.size, zone, 'marketers')
      }
      
      console.log("💰 الأسعار حسب نوع العميل:")
      console.log(`   - الشركات: ${prices.companies} د.ل`)
      console.log(`   - الأفراد: ${prices.individuals} د.ل`)
      console.log(`   - المسوقين: ${prices.marketers} د.ل`)
      
      // اختبار الأسعار الجديدة A/B
      const priceA = newPricingService.getBillboardPriceABWithDuration(testBillboard.size, zone, 'A', 1)
      const priceB = newPricingService.getBillboardPriceABWithDuration(testBillboard.size, zone, 'B', 1)
      
      console.log("📋 أسعار قوائم A/B:")
      console.log(`   - قائمة A: ${priceA} د.ل`)
      console.log(`   - قائمة B: ${priceB} د.ل`)
      
      // اختبار سعر التركيب
      const installationPrice = installationPricingService.getInstallationPrice(testBillboard.size, zone)
      console.log(`🔧 سعر التركيب: ${installationPrice} د.ل`)
      
      // التحقق من أن جميع الأسعار أكبر من 0
      const allPrices = [
        ...Object.values(prices),
        priceA,
        priceB,
        installationPrice
      ]
      
      if (allPrices.some(price => price <= 0)) {
        throw new Error('بعض الأسعار المحسوبة تساوي صفر')
      }
      
      console.log('✅ جميع الأسعار محسوبة بشكل صحيح')
      
      return { 
        success: true, 
        testBillboard: {
          name: testBillboard.name,
          size: testBillboard.size,
          municipality: testBillboard.municipality,
          zone
        },
        prices: {
          ...prices,
          priceA,
          priceB,
          installationPrice
        }
      }
    } catch (error) {
      console.error('❌ خطأ في اختبار التكامل:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * اختبار إنشاء فاتورة بالنظام المختلط
   */
  async testQuoteGeneration() {
    console.log('🔄 اختبار إنشاء فاتورة بالنظام المختلط...')
    
    try {
      const billboards = await loadBillboardsFromExcel()
      const testBillboards = billboards.slice(0, 2) // أول لوحتين للاختبار
      
      const customerInfo = {
        name: 'عميل تجريبي - نظام مختلط',
        email: 'test@example.com',
        phone: '123456789',
        company: 'شركة تجريبية',
        type: 'companies' as const
      }
      
      const packages = newPricingService.getPackages()
      const testPackage = packages[1] // باقة 3 أشهر
      
      const quote = newPricingService.generateQuote(
        customerInfo,
        testBillboards.map(b => ({
          id: b.id,
          name: b.name,
          location: b.location,
          municipality: b.municipality,
          area: b.area,
          size: b.size,
          status: b.status,
          imageUrl: b.imageUrl,
          level: b.level,
          priceCategory: b.priceCategory
        })),
        testPackage
      )
      
      if (!quote || !quote.id || quote.items.length === 0) {
        throw new Error('فشل في إنشاء الفاتورة')
      }
      
      console.log("✅ تم إنشاء فاتورة بنجاح:")
      console.log(`   - رقم الفاتورة: ${quote.id}`)
      console.log(`   - عدد البنود: ${quote.items.length}`)
      console.log(`   - الباقة: ${testPackage.label}`)
      console.log(`   - المجموع الفرعي: ${quote.subtotal} ${quote.currency}`)
      console.log(`   - الخصم: ${quote.totalDiscount} ${quote.currency}`)
      console.log(`   - الإجمالي النهائي: ${quote.total} ${quote.currency}`)
      
      // اختبار تفاصيل البنود
      quote.items.forEach((item, index) => {
        console.log(`   📄 البند ${index + 1}: ${item.name} - ${item.finalPrice} ${quote.currency}`)
      })
      
      return { success: true, quote }
    } catch (error) {
      console.error('❌ خطأ في إنشاء فاتورة:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * تشغيل اختبار شامل للنظام المختلط
   */
  async runFullHybridTest() {
    console.log('🚀 بدء الاختبار الشامل للنظام المختلط...')
    console.log('📝 النظام المختلط: بيانات من الإكسل + أسعار محلية')
    console.log('=' .repeat(60))
    
    const tests = [
      { name: 'تحميل بيانات اللوحات من الإكسل', test: () => this.testExcelDataLoading() },
      { name: 'الأسعار المحلية', test: () => this.testLocalPricing() },
      { name: 'التكامل بين البيانات والأسعار', test: () => this.testDataPricingIntegration() },
      { name: 'إنشاء فاتورة', test: () => this.testQuoteGeneration() }
    ]
    
    const results = []
    
    for (const { name, test } of tests) {
      console.log(`\n🧪 تشغي�� اختبار: ${name}`)
      console.log('-'.repeat(40))
      
      const result = await test()
      results.push({ name, success: result.success, details: result })
      
      if (result.success) {
        console.log(`✅ ${name}: نجح`)
      } else {
        console.log(`❌ ${name}: فشل - ${result.error}`)
      }
    }
    
    console.log('\n' + '=' .repeat(60))
    console.log('📊 نتائج الاختبار الشامل للنظام المختلط:')
    
    const successCount = results.filter(r => r.success).length
    const totalCount = results.length
    
    results.forEach(({ name, success }) => {
      console.log(`${success ? '✅' : '❌'} ${name}`)
    })
    
    console.log('---')
    console.log(`📈 معدل النجاح: ${successCount}/${totalCount} (${Math.round(successCount/totalCount*100)}%)`)
    
    if (successCount === totalCount) {
      console.log('🎉 النظام المختلط يعمل بشكل مثالي!')
      console.log('📋 بيانات اللوحات من ملف الإكسل: ✅')
      console.log('💰 الأسعار محلية وموثوقة: ✅')
      console.log('🔗 التكامل بين النظامين: ✅')
      console.log('📄 إنشاء الفواتير: ✅')
    } else {
      console.log('⚠️ بعض الاختبارات فشلت. يرجى مراجعة الأخطاء أعلاه.')
    }
    
    return { successCount, totalCount, results }
  }

  /**
   * اختبار سريع للنظام المختلط
   */
  async quickHybridTest() {
    console.log('⚡ اختبار سريع للنظام المختلط...')
    
    try {
      // اختبار تحميل بيانات الإكسل
      const billboards = await loadBillboardsFromExcel()
      if (billboards.length === 0) {
        throw new Error('لا توجد بيانات من الإكسل')
      }
      
      // اختبار الأسعار المحلية
      const price = pricingService.getBillboardPrice('5x13', 'مصراتة', 'companies')
      if (price === 0) {
        throw new Error('الأسعار المحلية لا تعمل')
      }
      
      // اختبار التكامل
      const firstBillboard = billboards[0]
      const zone = pricingService.determinePricingZone(firstBillboard.municipality, firstBillboard.area)
      const billboardPrice = pricingService.getBillboardPrice(firstBillboard.size, zone, 'companies')
      
      if (billboardPrice === 0) {
        throw new Error('التكامل بين البيانات والأسعار لا يعمل')
      }
      
      console.log('✅ النظام المختلط يعمل بشكل صحيح!')
      console.log(`📊 البيانات: ${billboards.length} لوحة من الإكسل`)
      console.log("💰 الأسعار: محلية وموثوقة")
      console.log(`🔗 التكامل: اللوحة ${firstBillboard.name} - ${billboardPrice} د.ل`)
      
      return true
    } catch (error) {
      console.error('❌ فشل الاختبار السريع للنظام المختلط:', error)
      return false
    }
  }
}

// إنشاء نسخة من أداة الاختبار
export const hybridSystemTest = new HybridSystemTest()

// تشغيل اختبار سريع عند التحميل (في وضع التطوير فقط)
if (typeof window !== 'undefined' && import.meta.env && import.meta.env.DEV) {
  setTimeout(() => {
    hybridSystemTest.quickHybridTest()
  }, 2000)

  // إضافة دوال مساعدة لوحدة التحكم
  ;(window as any).runHybridSystemTest = () => hybridSystemTest.runFullHybridTest()
  ;(window as any).quickHybridTest = () => hybridSystemTest.quickHybridTest()
  
  console.log('🛠️ أدوات اختبار النظام المختلط متاحة:')
  console.log('- runHybridSystemTest() - اختبار ��امل')
  console.log('- quickHybridTest() - اختبار سريع')
}
