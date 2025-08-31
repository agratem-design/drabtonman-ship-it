// خدمة إدارة صور ومعلومات المدن
export interface CityInfo {
  name: string
  englishName: string
  multiplier: number
  description: string
  imageUrl: string
  population?: number
  region: 'شرق' | 'غرب' | 'جنوب' | 'وسط'
  economicLevel: 'مرتفع' | 'متوسط' | 'منخفض'
  marketDemand: 'عالي' | 'متوسط' | 'منخفض'
  color: string
}

export class CityImageService {
  private readonly CITIES_INFO: CityInfo[] = [
    {
      name: 'طرابلس',
      englishName: 'Tripoli',
      multiplier: 1.2,
      description: 'العاصمة الليبية - أعلى كثافة سك��نية وأنشطة تجارية',
      imageUrl: 'https://cdn.builder.io/api/v1/image/assets%2Ffc68c2d70dd74affa9a5bbf7eee66f4a%2F1c9e3c78f90d491896fc44d8e3acf961?format=webp&width=150',
      population: 1126000,
      region: 'غرب',
      economicLevel: 'مرتفع',
      marketDemand: 'عالي',
      color: '#DC2626' // أحمر
    },
    {
      name: 'بنغازي',
      englishName: 'Benghazi',
      multiplier: 1.1,
      description: 'ثاني أكبر المدن - مركز تجاري مهم في الشرق',
      imageUrl: 'https://cdn.builder.io/api/v1/image/assets%2Ffc68c2d70dd74affa9a5bbf7eee66f4a%2F1617ca2a62584070824c253b8a8a1c38?format=webp&width=150',
      population: 650000,
      region: 'شرق',
      economicLevel: 'مرتفع',
      marketDemand: 'عالي',
      color: '#2563EB' // أزرق
    },
    {
      name: 'مصراتة',
      englishName: 'Misrata',
      multiplier: 1.0,
      description: 'المدينة المرجعية للأسعار - مركز صناعي وتجاري',
      imageUrl: '/cities/misrata.jpg',
      population: 330000,
      region: 'وسط',
      economicLevel: 'متوسط',
      marketDemand: 'متوسط',
      color: '#059669' // أخضر
    },
    {
      name: 'صبراتة',
      englishName: 'Sabratha',
      multiplier: 0.9,
      description: 'مدينة ساحلية تاريخية - نشاط سياحي متوسط',
      imageUrl: '/cities/sabratha.jpg',
      population: 102000,
      region: 'غرب',
      economicLevel: 'متوسط',
      marketDemand: 'متوسط',
      color: '#7C3AED' // بنفسجي
    },
    {
      name: 'سبها',
      englishName: 'Sabha',
      multiplier: 0.8,
      description: 'عاصمة الجنوب - مركز تجاري للمناطق الجنوبية',
      imageUrl: '/cities/sebha.jpg',
      population: 130000,
      region: 'جنوب',
      economicLevel: 'منخفض',
      marketDemand: 'منخفض',
      color: '#EA580C' // برتقالي
    },
    {
      name: 'طبرق',
      englishName: 'Tobruk',
      multiplier: 0.85,
      description: 'مدينة ساحلية شرقية - ميناء مهم للنفط',
      imageUrl: '/cities/tobruk.jpg',
      population: 120000,
      region: 'شرق',
      economicLevel: 'متوسط',
      marketDemand: 'منخفض',
      color: '#0891B2' // سماوي
    }
  ]

  /**
   * الحصول على معلومات جميع المدن
   */
  getAllCities(): CityInfo[] {
    return this.CITIES_INFO
  }

  /**
   * الحصول على معلومات مدينة معينة
   */
  getCityInfo(cityName: string): CityInfo | null {
    return this.CITIES_INFO.find(city => 
      city.name === cityName || city.englishName.toLowerCase() === cityName.toLowerCase()
    ) || null
  }

  /**
   * الحصول على معامل مدينة
   */
  getCityMultiplier(cityName: string): number {
    const city = this.getCityInfo(cityName)
    return city ? city.multiplier : 1.0
  }

  /**
   * الحصول على صورة مدينة
   */
  getCityImageUrl(cityName: string): string {
    const city = this.getCityInfo(cityName)
    return city ? city.imageUrl : '/cities/default.jpg'
  }

  /**
   * الحصول على لون مدينة للواجهة
   */
  getCityColor(cityName: string): string {
    const city = this.getCityInfo(cityName)
    return city ? city.color : '#6B7280'
  }

  /**
   * الحصول على المدن مرتبة حسب الأهمية الاقتصادية
   */
  getCitiesByEconomicImportance(): CityInfo[] {
    return [...this.CITIES_INFO].sort((a, b) => {
      const economicOrder = { 'مرتفع': 3, 'متوسط': 2, 'منخفض': 1 }
      return economicOrder[b.economicLevel] - economicOrder[a.economicLevel]
    })
  }

  /**
   * الحصول على المدن حسب المنطقة
   */
  getCitiesByRegion(): Record<string, CityInfo[]> {
    const regions: Record<string, CityInfo[]> = {}
    
    this.CITIES_INFO.forEach(city => {
      if (!regions[city.region]) {
        regions[city.region] = []
      }
      regions[city.region].push(city)
    })

    return regions
  }

  /**
   * الحصول على إحصائيات المعاملات
   */
  getMultiplierStatistics() {
    const multipliers = this.CITIES_INFO.map(city => city.multiplier)
    
    return {
      highest: Math.max(...multipliers),
      lowest: Math.min(...multipliers),
      average: Number((multipliers.reduce((a, b) => a + b, 0) / multipliers.length).toFixed(2)),
      cities: this.CITIES_INFO.map(city => ({
        name: city.name,
        multiplier: city.multiplier,
        impact: city.multiplier > 1 ? 'زيادة' : city.multiplier < 1 ? 'تخفيض' : 'محايد'
      }))
    }
  }

  /**
   * البحث عن مدن بناءً على النص
   */
  searchCities(query: string): CityInfo[] {
    const searchTerm = query.toLowerCase().trim()
    
    return this.CITIES_INFO.filter(city =>
      city.name.includes(searchTerm) ||
      city.englishName.toLowerCase().includes(searchTerm) ||
      city.description.includes(searchTerm) ||
      city.region.includes(searchTerm)
    )
  }

  /**
   * تحديث معامل مدينة
   */
  updateCityMultiplier(cityName: string, newMultiplier: number): boolean {
    const cityIndex = this.CITIES_INFO.findIndex(city => city.name === cityName)
    
    if (cityIndex !== -1 && newMultiplier > 0) {
      this.CITIES_INFO[cityIndex].multiplier = newMultiplier
      return true
    }
    
    return false
  }

  /**
   * الحصول على توصيات التسعير لمدينة
   */
  getPricingRecommendations(cityName: string): {
    multiplier: number
    reasoning: string
    suggestions: string[]
  } {
    const city = this.getCityInfo(cityName)
    
    if (!city) {
      return {
        multiplier: 1.0,
        reasoning: 'مدينة غير مسجلة، سيتم استخدام السعر الأساسي',
        suggestions: ['إضافة المدينة لقاعدة البيانات', 'تحديد المعامل المناسب']
      }
    }

    const suggestions = []
    let reasoning = `معامل ${city.multiplier} مناسب لمدينة ${city.name} `

    if (city.economicLevel === 'مرتفع') {
      reasoning += 'بسبب المستوى الاقتصادي المرتفع'
      suggestions.push('مراجعة المعامل دورياً لضمان المنافسية')
    } else if (city.economicLevel === 'متوسط') {
      reasoning += 'لموازنة السعر مع الظروف الاقتصادية المتوسطة'
      suggestions.push('مراقبة نشاط السوق لتعديل المعامل')
    } else {
      reasoning += 'لجعل الأسعار في متناول السوق المحلي'
      suggestions.push('دراسة إمكانية خصومات إضافية للعملاء المحليين')
    }

    if (city.marketDemand === 'عالي') {
      suggestions.push('النظر في زيادة المعامل لاستغلال الطلب العالي')
    } else if (city.marketDemand === 'منخفض') {
      suggestions.push('النظر في خصومات ترويجية لتنشيط السوق')
    }

    return {
      multiplier: city.multiplier,
      reasoning,
      suggestions
    }
  }

  /**
   * إنشاء تقرير شامل عن المدن
   */
  generateCitiesReport(): {
    totalCities: number
    regionDistribution: Record<string, number>
    economicDistribution: Record<string, number>
    multiplierRange: { min: number, max: number, average: number }
    topCities: CityInfo[]
  } {
    const regionDistribution: Record<string, number> = {}
    const economicDistribution: Record<string, number> = {}

    this.CITIES_INFO.forEach(city => {
      regionDistribution[city.region] = (regionDistribution[city.region] || 0) + 1
      economicDistribution[city.economicLevel] = (economicDistribution[city.economicLevel] || 0) + 1
    })

    const multipliers = this.CITIES_INFO.map(c => c.multiplier)
    const topCities = [...this.CITIES_INFO]
      .sort((a, b) => b.multiplier - a.multiplier)
      .slice(0, 3)

    return {
      totalCities: this.CITIES_INFO.length,
      regionDistribution,
      economicDistribution,
      multiplierRange: {
        min: Math.min(...multipliers),
        max: Math.max(...multipliers),
        average: Number((multipliers.reduce((a, b) => a + b, 0) / multipliers.length).toFixed(2))
      },
      topCities
    }
  }
}

export const cityImageService = new CityImageService()
