import { useEffect, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Billboard } from "@/types"

interface InteractiveMapProps {
  billboards: Billboard[]
  onImageView: (imageUrl: string) => void
}

declare global {
  interface Window {
    L: any
  }
}

export default function InteractiveMap({ billboards, onImageView }: InteractiveMapProps) {
  const mapRef = useRef<any>(null)
  const mapInstanceRef = useRef<any>(null)

  // دالة لتحديد لون اللوحة حسب حالتها
  const getBillboardColor = (billboard: Billboard) => {
    switch (billboard.status) {
      case "متاح":
        return "bg-green-500"
      case "قريباً":
        return "bg-red-500" // أحمر للوحات قريبة الانتهاء
      case "محجوز":
        return "bg-orange-500"
      default:
        return "bg-gray-500"
    }
  }

  // دالة لتحديد أيقونة حالة اللوحة
  const getStatusIcon = (billboard: Billboard) => {
    switch (billboard.status) {
      case "متاح":
        return `<svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>`
      case "قريباً":
        return `<svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>`
      case "محجوز":
        return `<svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>`
      default:
        return `<svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>`
    }
  }

  const addBillboardMarkers = (map: any, billboardsToShow: Billboard[]) => {
    if (!map || !window.L) return

    // إزالة العلامات السابقة للوحات
    map.eachLayer((layer: any) => {
      if (layer.options?.billboardId) {
        map.removeLayer(layer)
      }
    })

    // إضافة علامات جديدة للوحات
    billboardsToShow.forEach((billboard) => {
      const coords = billboard.coordinates.split(",").map((coord) => Number.parseFloat(coord.trim()))
      if (coords.length !== 2 || isNaN(coords[0]) || isNaN(coords[1])) return

      const [lat, lng] = coords
      const colorClass = getBillboardColor(billboard)
      const statusIcon = getStatusIcon(billboard)

      const billboardIcon = window.L.divIcon({
        html: `<div class="w-8 h-8 ${colorClass} rounded-full border-2 border-white shadow-lg hover:scale-125 transition-all duration-300 cursor-pointer flex items-center justify-center">
                 ${statusIcon}
               </div>`,
        className: "custom-billboard-icon",
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      })

      const marker = window.L.marker([lat, lng], {
        icon: billboardIcon,
        billboardId: billboard.id,
      }).addTo(map)

      // تحديد لون شارة الحالة في النافذة المنبثقة
      const getStatusBadgeClass = (status: string) => {
        switch (status) {
          case "متاح":
            return "bg-green-100 text-green-800"
          case "قريباً":
            return "bg-red-100 text-red-800"
          case "محجوز":
            return "bg-orange-100 text-orange-800"
          default:
            return "bg-gray-100 text-gray-800"
        }
      }

      const statusBadgeClass = getStatusBadgeClass(billboard.status)

      const popupContent = `
        <div class="p-4 min-w-72" dir="rtl" style="font-family: 'Tajawal', Arial, sans-serif; direction: rtl; text-align: right;">
          <h3 class="font-bold text-lg mb-2" style="direction: rtl; text-align: right;">${billboard.name}</h3>
          <p class="text-gray-600 mb-3" style="direction: rtl; text-align: right;">${billboard.location}</p>
          
          <div class="flex flex-wrap gap-2 mb-3" style="justify-content: flex-end;">
            <span class="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-bold">${billboard.size}</span>
            <span class="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-bold">${billboard.municipality}</span>
            <span class="${statusBadgeClass} px-2 py-1 rounded-full text-xs font-bold">${billboard.status}</span>
          </div>
          
          ${billboard.contractNumber && billboard.contractNumber.trim() !== '' ? `
            <div class="mb-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
              <h4 class="text-sm font-bold text-blue-800 mb-2" style="direction: rtl; text-align: right;">بيانات العميل</h4>
              <div class="space-y-1">
                <div class="flex text-xs" style="direction: rtl; justify-content: space-between;">
                  <span class="text-blue-700 font-semibold">:رقم العقد</span>
                  <span class="text-blue-900 font-bold">${billboard.contractNumber}</span>
                </div>
                ${billboard.clientName && billboard.clientName.trim() !== '' ? `
                  <div class="flex text-xs" style="direction: rtl; justify-content: space-between;">
                    <span class="text-blue-700 font-semibold">:اسم العميل</span>
                    <span class="text-blue-900 font-bold">${billboard.clientName}</span>
                  </div>
                ` : ''}
                ${billboard.advertisementType && billboard.advertisementType.trim() !== '' ? `
                  <div class="flex text-xs" style="direction: rtl; justify-content: space-between;">
                    <span class="text-blue-700 font-semibold">:نوع الإعلان</span>
                    <span class="text-blue-900 font-bold">${billboard.advertisementType}</span>
                  </div>
                ` : ''}
                ${billboard.expiryDate ? `
                  <div class="flex text-xs" style="direction: rtl; justify-content: space-between;">
                    <span class="text-blue-700 font-semibold">:تاريخ الانتهاء</span>
                    <span class="text-blue-900 font-bold">${billboard.expiryDate}</span>
                  </div>
                ` : ''}
              </div>
            </div>
          ` : ''}
          
          ${billboard.status === "قريباً" && billboard.expiryDate ? `
            <div class="mb-3 text-center">
              <span class="bg-red-50 text-red-700 px-2 py-1 rounded-full text-xs font-bold border border-red-200">
                ينتهي في: ${billboard.expiryDate}
              </span>
            </div>
          ` : ''}
          
          <div class="flex gap-2" style="justify-content: center;">
            <button onclick="window.open('${billboard.gpsLink}', '_blank')" 
                    class="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-bold">
              خرائط جوجل
            </button>
            <button onclick="document.dispatchEvent(new CustomEvent('showBillboardImage', {detail: '${billboard.imageUrl}'}))"
                    class="bg-yellow-500 hover:bg-yellow-600 text-black px-3 py-1 rounded-full text-xs font-bold">
              عرض الصورة
            </button>
          </div>
        </div>
      `

      marker.bindPopup(popupContent)
    })
  }

  useEffect(() => {
    const initializeMap = async () => {
      // تحميل CSS الخاص بـ Leaflet
      if (!document.querySelector('link[href*="leaflet"]')) {
        const leafletCSS = document.createElement("link")
        leafletCSS.rel = "stylesheet"
        leafletCSS.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        document.head.appendChild(leafletCSS)
      }

      // تحميل مكتبة Leaflet
      if (!window.L) {
        await new Promise((resolve) => {
          const script = document.createElement("script")
          script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
          script.onload = resolve
          document.head.appendChild(script)
        })
      }

      // إنشاء الخريطة
      if (mapRef.current && window.L && !mapInstanceRef.current) {
        const map = window.L.map(mapRef.current).setView([32.7, 13.2], 8)

        // إضافة طبقة صور الأقمار الصناعية
        window.L.tileLayer(
          "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
          {
            attribution:
              '&copy; <a href="https://www.esri.com/">Esri</a> &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
            maxZoom: 18,
          },
        ).addTo(map)

        // إضافة علامة مقر الشركة
        const companyIcon = window.L.divIcon({
          html: `<div class="flex flex-col items-center">
                   <div class="w-16 h-16 bg-white rounded-full border-4 border-yellow-500 shadow-2xl flex items-center justify-center animate-bounce mb-2">
                     <img src="/logo-symbol.svg" alt="شعار الشركة" class="w-10 h-10 object-contain" />
                   </div>
                 </div>`,
          className: "custom-div-icon",
          iconSize: [80, 80],
          iconAnchor: [40, 40],
        })

        window.L.marker([32.4847, 14.5959], { icon: companyIcon })
          .addTo(map)
          .bindPopup(`
            <div class="text-center p-4" dir="rtl" style="font-family: 'Tajawal', Arial, sans-serif;">
              <div class="flex flex-col items-center mb-3">
                <img src="/logo-symbol.svg" alt="شعار الشركة" class="w-12 h-12 object-contain mb-2" />
              </div>
              <h3 class="font-bold text-lg text-yellow-600 mb-2">مقر الفارس الذهبي</h3>
              <p class="text-gray-600 mb-3">للدعاية والإعلان</p>
              <button onclick="window.open('https://www.google.com/maps?q=32.4847,14.5959', '_blank')" 
                      class="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black px-4 py-2 rounded-full text-sm font-bold shadow-lg transform hover:scale-105 transition-all duration-300">
                فتح في خرائط جوجل
              </button>
            </div>
          `)

        mapInstanceRef.current = map
        addBillboardMarkers(map, billboards)
      }
    }

    initializeMap()
  }, [billboards])

  useEffect(() => {
    if (mapInstanceRef.current) {
      addBillboardMarkers(mapInstanceRef.current, billboards)
    }
  }, [billboards])

  useEffect(() => {
    const handleShowImage = (event: any) => {
      onImageView(event.detail)
    }

    document.addEventListener("showBillboardImage", handleShowImage)
    return () => document.removeEventListener("showBillboardImage", handleShowImage)
  }, [onImageView])

  return (
    <div className="mb-12">
      <Card className="overflow-hidden shadow-2xl border-4 border-yellow-300">
        <CardContent className="p-0">
          <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-black p-4">
            <h3 className="text-2xl font-black text-center">
              خريطة المواقع الإعلانية التفاعلية - صور الأقمار الصناعية
            </h3>
            <p className="text-center mt-2 text-sm font-semibold">
              يمكنك التحرك والتكبير بحرية - النقاط مثبتة على الإحداثيات الصحيحة
            </p>
            <div className="flex justify-center gap-4 mt-3 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span>متاح</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span>قريباً</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                <span>محجوز</span>
              </div>
            </div>
          </div>
          <div className="h-96 relative">
            <div ref={mapRef} className="w-full h-full" style={{ minHeight: "400px" }} />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
