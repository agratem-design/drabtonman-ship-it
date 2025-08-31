/**
 * مكون رأس الصفحة - Header Component
 * يحتوي على شع��ر الشركة وزر الحجز الرئيسي
 * يعرض اسم الشركة باللغتين العربية والإنجليزية
 * يحتوي على معلومات المستخدم وأزرار المصادقة
 */

import { useState } from "react"
import { LogOut, Settings, User, ChevronDown, DollarSign, Wrench } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/AuthContext"

interface HeaderProps {
  onOpenSettings?: () => void
  onOpenPricing?: () => void
  onOpenInstallationPricing?: () => void
}

export default function Header({ onOpenSettings, onOpenPricing, onOpenInstallationPricing }: HeaderProps) {
  const { user, logout } = useAuth()
  const [showUserMenu, setShowUserMenu] = useState(false)

  const handleLogout = () => {
    logout()
    setShowUserMenu(false)
  }

  return (
    <header className="bg-gradient-to-r from-black via-gray-900 to-black text-white shadow-2xl border-b-4 border-yellow-500 relative z-[9999]">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6 rtl:space-x-reverse">
            <div className="relative">
              <div className="flex items-center gap-4 flex-row">
                <img src="/new-logo.svg" alt="شعار الشركة" className="h-20 object-contain" />
              </div>
              <div className="absolute -top-1 -right-1 w-6 h-6 bg-yellow-400 rounded-full animate-pulse"></div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* زر الحجز الرئيسي */}
            <Button className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-black px-8 py-3 rounded-full shadow-lg transform hover:scale-105 transition-all duration-300 text-lg">
              احجز موقعك الآن
            </Button>

            {/* معلومات المستخدم */}
            {user && (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 transition-all duration-300"
                >
                  <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-black" />
                  </div>
                  <div className="text-right hidden md:block">
                    <p className="text-sm font-bold text-yellow-400">
                      {user.role === 'admin' ? 'المدير' : 'مستخدم'}
                    </p>
                    <p className="text-xs text-gray-300">{user.username}</p>
                  </div>
                  <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showUserMenu ? 'rotate-180' : ''}`} />
                </button>

                {/* قائمة المستخدم المنسدلة */}
                {showUserMenu && (
                  <div className="absolute left-0 top-full mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden z-[99999]">
                    <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 p-4 text-black">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                          <User className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="font-bold text-lg">{user.username}</p>
                          <p className="text-sm opacity-80">{user.email}</p>
                          <p className="text-xs opacity-70">
                            {user.role === 'admin' ? 'مدير النظام' : 'مستخدم عادي'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="p-2">
                      {(user.role === 'admin' || user.permissions.some(p => p.name === 'admin_access')) && (
                        <>
                          <button
                            onClick={() => {
                              onOpenPricing?.()
                              setShowUserMenu(false)
                            }}
                            className="w-full flex items-center gap-3 px-4 py-3 text-right hover:bg-green-50 rounded-lg transition-colors text-gray-700"
                          >
                            <DollarSign className="w-5 h-5 text-green-600" />
                            <div>
                              <p className="font-semibold">إدارة الأسعار</p>
                              <p className="text-sm text-gray-500">تحديد أسعار اللوحات الإعلانية</p>
                            </div>
                          </button>

                          <button
                            onClick={() => {
                              onOpenInstallationPricing?.()
                              setShowUserMenu(false)
                            }}
                            className="w-full flex items-center gap-3 px-4 py-3 text-right hover:bg-orange-50 rounded-lg transition-colors text-gray-700"
                          >
                            <Wrench className="w-5 h-5 text-orange-600" />
                            <div>
                              <p className="font-semibold">أسعار التركيب</p>
                              <p className="text-sm text-gray-500">إدارة أسعار تركيب اللوحات</p>
                            </div>
                          </button>
                        </>
                      )}

                      {user.permissions.some(p => p.name === 'manage_users') && (
                        <button
                          onClick={() => {
                            onOpenSettings?.()
                            setShowUserMenu(false)
                          }}
                          className="w-full flex items-center gap-3 px-4 py-3 text-right hover:bg-gray-50 rounded-lg transition-colors text-gray-700"
                        >
                          <Settings className="w-5 h-5 text-gray-500" />
                          <div>
                            <p className="font-semibold">إعدادات النظام</p>
                            <p className="text-sm text-gray-500">إدارة المستخدمين والصلاحيات</p>
                          </div>
                        </button>
                      )}

                      <div className="border-t border-gray-200 my-2"></div>

                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 text-right hover:bg-red-50 rounded-lg transition-colors text-red-600"
                      >
                        <LogOut className="w-5 h-5" />
                        <div>
                          <p className="font-semibold">تسجيل الخروج</p>
                          <p className="text-sm text-red-500">الخروج من النظام</p>
                        </div>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* إغلاق القائمة عند النقر خارجها */}
      {showUserMenu && (
        <div
          className="fixed inset-0 z-[99998]"
          onClick={() => setShowUserMenu(false)}
        />
      )}
    </header>
  )
}
