import { localBillboardService } from '@/services/localBillboardService'
import { pricingService } from '@/services/pricingService'
import { newPricingService } from '@/services/newPricingService'
import { installationPricingService } from '@/services/installationPricingService'

/**
 * اختبار شامل لنظام الفوترة والأسعار
 */
export class SystemTest {
  
  /**
   * اختبار تحميل البيانات المحلية
   */
  async testLocalDataLoading() {
    console.log('🔄 اختبار تحميل البيانات المحلية...')
    
    try {
      const billboards = await localBillboardService.getBillboards()
      
      if (billboards.length === 0) {
        throw new Error('لا توجد بيانات لوحات')
      }
      
      console.log(`✅ تم تحميل ${billboards.length} لوحة بنجاح`)
      
      // اختبار البيانات المطلوبة
      const firstBillboard = billboards[0]
      const requiredFields = ['id', 'name', 'size', 'municipality', 'priceCategory']
      
      for (const field of requiredFields) {
        if (!firstBillboard[field]) {
          throw new Error(`الحقل ${field} مفقود في بيانات اللوحة`)
        }
      }
      
      console.log('✅ جميع الحقول المطلوبة موجودة')
      return true
    } catch (error) {
      console.error('❌ خطأ في تحميل البيانات المحلية:', error)
      return false
    }
  }

  /**
   * اختبار خدمة الأسعار القديمة
   */
  testOldPricingService() {
    console.log('🔄 اختبار خدمة الأسعار القديمة...')
    
    try {
      const pricing = pricingService.getPricing()
      
      if (!pricing || !pricing.zones || !pricing.currency) {
        throw new Error('بيانات الأسعار غير صحيحة')
      }
      
      // اختبار حس��ب سعر لوحة
      const price = pricingService.getBillboardPrice('5x13', 'مصراتة', 'companies')
      
      if (price === 0) {
        throw new Error('لا يمكن حساب السعر')
      }
      
      console.log(`✅ السعر المحسوب: ${price} ${pricing.currency}`)
      
      // اختبار تحديد المنطقة السعرية
      const zone = pricingService.determinePricingZone('مصراتة', 'مصراتة')
      console.log(`✅ المنطقة السعرية: ${zone}`)
      
      return true
    } catch (error) {
      console.error('❌ خطأ في خدمة الأسعار القديمة:', error)
      return false
    }
  }

  /**
   * اختبار خدمة الأسعار الجديدة
   */
  testNewPricingService() {
    console.log('🔄 اختبار خدمة الأسعار الجديدة...')
    
    try {
      const pricing = newPricingService.getPricing()
      
      if (!pricing || !pricing.zones || !pricing.currency) {
        throw new Error('بيانات الأسعار الجديدة غير صحيحة')
      }
      
      // اختبار الحصول على الباقات
      const packages = newPricingService.getPackages()
      
      if (packages.length === 0) {
        throw new Error('لا توجد باقات زمن��ة')
      }
      
      console.log(`✅ عدد الباقات المتاحة: ${packages.length}`)
      
      // اختبار حساب سعر مع مدة
      const price = newPricingService.getBillboardPriceABWithDuration('5x13', 'مصراتة', 'A', 3)
      
      if (price === 0) {
        throw new Error('لا يمكن حساب السعر مع المدة')
      }
      
      console.log(`✅ السعر لمدة 3 أشهر: ${price} ${pricing.currency}`)
      
      return true
    } catch (error) {
      console.error('❌ خطأ في خدمة الأسعار الجديدة:', error)
      return false
    }
  }

  /**
   * اختبار خدمة أسعار التركيب
   */
  testInstallationPricingService() {
    console.log('🔄 اختبار خدمة أسعار التركيب...')
    
    try {
      const installationPricing = installationPricingService.getInstallationPricing()
      
      if (!installationPricing || !installationPricing.zones) {
        throw new Error('بيانات أسعار التركيب غير صحيحة')
      }
      
      // اختبار حساب سعر تركيب
      const price = installationPricingService.getInstallationPrice('5x13', 'مصراتة')
      
      if (price === 0) {
        throw new Error('لا يمكن حساب سعر التركيب')
      }
      
      console.log(`✅ سعر التركيب: ${price} ${installationPricing.currency}`)
      
      return true
    } catch (error) {
      console.error('❌ خطأ في خدمة أسعار التركيب:', error)
      return false
    }
  }

  /**
   * اختبار إنشاء فاتورة
   */
  async testQuoteGeneration() {
    console.log('🔄 اختبار إنشاء فاتورة...')
    
    try {
      const billboards = await localBillboardService.getBillboards()
      const testBillboards = billboards.slice(0, 2) // أول لوحتين للاختبار
      
      const customerInfo = {
        name: 'عميل تجريبي',
        email: 'test@example.com',
        phone: '123456789',
        company: 'شركة تجريبية',
        type: 'companies' as const
      }
      
      const packages = newPricingService.getPackages()
      const testPackage = packages[0]
      
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
      
      console.log(`✅ تم إنشاء فاتورة بنجاح - رقم: ${quote.id}`)
      console.log(`✅ عدد البنود: ${quote.items.length}`)
      console.log(`✅ الإجمالي: ${quote.total} ${quote.currency}`)
      
      return true
    } catch (error) {
      console.error('❌ خطأ في إنشاء فاتورة:', error)
      return false
    }
  }

  /**
   * اختبار متكامل للنظام
   */
  async runFullSystemTest() {
    console.log('🚀 بدء الاختبار الشامل للنظام...')
    console.log('=' .repeat(50))
    
    const tests = [
      { name: 'تحميل البيانات المحلية', test: () => this.testLocalDataLoading() },
      { name: 'خدمة الأسعار القديمة', test: () => this.testOldPricingService() },
      { name: 'خدمة الأسعار الجديدة', test: () => this.testNewPricingService() },
      { name: 'خدمة أسعار التركيب', test: () => this.testInstallationPricingService() },
      { name: 'إنشاء فاتورة', test: () => this.testQuoteGeneration() }
    ]
    
    const results = []
    
    for (const { name, test } of tests) {
      const result = await test()
      results.push({ name, success: result })
      console.log('---')
    }
    
    console.log('=' .repeat(50))
    console.log('📊 نتائج الاختبار:')
    
    const successCount = results.filter(r => r.success).length
    const totalCount = results.length
    
    results.forEach(({ name, success }) => {
      console.log(`${success ? '✅' : '❌'} ${name}`)
    })
    
    console.log('---')
    console.log(`📈 معدل النجاح: ${successCount}/${totalCount} (${Math.round(successCount/totalCount*100)}%)`)
    
    if (successCount === totalCount) {
      console.log('🎉 جميع الاختبارات نجحت! النظام يعمل بشكل مثالي.')
    } else {
      console.log('⚠️ بعض الاختبارات فشلت. يرجى مراجعة الأخطاء أعلاه.')
    }
    
    return { successCount, totalCount, results }
  }

  /**
   * اختبار سريع للتأكد من عمل النظام
   */
  async quickTest() {
    console.log('⚡ اختبار سريع...')
    
    try {
      // اختبار البيانات
      const billboards = await localBillboardService.getBillboards()
      const firstBillboard = billboards[0]
      
      // اختبار حساب السعر
      const price = pricingService.getBillboardPrice(firstBillboard.size, 'مصراتة', 'companies')
      
      // اختبار خدمة الأسعار الجديدة
      const newPrice = newPricingService.getBillboardPriceABWithDuration(
        firstBillboard.size, 
        'مصراتة', 
        firstBillboard.priceCategory || 'A', 
        1
      )
      
      if (billboards.length > 0 && price > 0 && newPrice > 0) {
        console.log('✅ النظام يعمل بشكل صحيح!')
        console.log(`📊 البيانات: ${billboards.length} لوحة`)
        console.log(`💰 السعر القديم: ${price} د.ل`)
        console.log(`💰 السعر الجديد: ${newPrice} د.ل`)
        return true
      } else {
        throw new Error('فشل في الاختبار السريع')
      }
    } catch (error) {
      console.error('❌ فشل الاختبار السريع:', error)
      return false
    }
  }
}

// إنشاء نسخة مفردة من أداة الاختبار
export const systemTest = new SystemTest()

// تشغيل اختبار سريع عند التحميل (في وضع التطوير فقط)
if (typeof window !== 'undefined' && import.meta.env && import.meta.env.DEV) {
  // تشغيل الاختبار بعد ثانية واحدة لضمان تحميل النظام
  setTimeout(() => {
    systemTest.quickTest()
  }, 1000)

  // إضافة دوال مساعدة لوحدة التحكم
  ;(window as any).runSystemTest = () => systemTest.runFullSystemTest()
  ;(window as any).quickSystemTest = () => systemTest.quickTest()

  console.log('🛠️ أدوات المطور متاحة:')
  console.log('- runSystemTest() - تشغيل اختبار شامل')
  console.log('- quickSystemTest() - تشغيل اختبار سريع')
}
