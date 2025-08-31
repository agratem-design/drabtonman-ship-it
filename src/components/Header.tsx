import React from 'react'
import { Settings, DollarSign, Wrench, LogOut, User, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/contexts/AuthContext'

interface HeaderProps {
  onOpenSettings?: () => void
  onOpenPricing?: () => void
  onOpenInstallationPricing?: () => void
}

export default function Header({ onOpenSettings, onOpenPricing, onOpenInstallationPricing }: HeaderProps) {
  const { user, logout } = useAuth()

  return (
    <header className="bg-gradient-to-r from-yellow-500 via-yellow-400 to-yellow-500 text-black py-6 shadow-2xl relative overflow-hidden">
      {/* خلفية زخرفية */}
      <div className="absolute inset-0 bg-gradient-to-r from-yellow-600/20 via-transparent to-yellow-600/20"></div>
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="flex items-center justify-between">
          {/* الشعار ومعلومات الشركة */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center shadow-lg backdrop-blur-sm">
                <img src="/logo-symbol.svg" alt="رمز الشركة" className="w-12 h-12 object-contain" />
              </div>
              <div className="text-right">
                <h1 className="text-3xl font-black tracking-tight leading-tight">الفــــارس الذهبــــي</h1>
                <p className="text-lg font-bold opacity-90">للدعــــــاية والإعـــلان</p>
                <p className="text-sm font-medium opacity-75">نظام إدارة اللوحات الإعلانية</p>
              </div>
            </div>
          </div>

          {/* معلومات المستخدم وأزرار الإدارة */}
          <div className="flex items-center gap-4">
            {/* معلومات المستخدم */}
            {user && (
              <div className="bg-white/20 rounded-xl px-4 py-3 backdrop-blur-sm shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/30 rounded-full flex items-center justify-center">
                    <User className="w-6 h-6" />
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-sm">{user.username}</div>
                    <div className="flex items-center gap-2">
                      <Badge 
                        className={`text-xs font-bold ${
                          user.role === 'admin' 
                            ? 'bg-red-100 text-red-800 border border-red-300' 
                            : 'bg-blue-100 text-blue-800 border border-blue-300'
                        }`}
                      >
                        {user.role === 'admin' ? 'مدير' : 'مستخدم'}
                      </Badge>
                      {user.assignedClient && (
                        <Badge className="bg-green-100 text-green-800 border border-green-300 text-xs">
                          {user.assignedClient}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* أزرار الإدارة للمدراء */}
            {(user?.role === 'admin' || user?.permissions.some(p => p.name === 'admin_access')) && (
              <div className="flex items-center gap-2">
                {user?.permissions.some(p => p.name === 'manage_users') && (
                  <Button
                    onClick={onOpenSettings}
                    variant="outline"
                    size="sm"
                    className="bg-white/20 border-white/30 text-black hover:bg-white/30 backdrop-blur-sm font-bold"
                    title="إعدادات النظام"
                  >
                    <Settings className="w-4 h-4" />
                  </Button>
                )}
                
                <Button
                  onClick={onOpenPricing}
                  variant="outline"
                  size="sm"
                  className="bg-white/20 border-white/30 text-black hover:bg-white/30 backdrop-blur-sm font-bold"
                  title="إدارة الأسعار"
                >
                  <DollarSign className="w-4 h-4" />
                </Button>
                
                <Button
                  onClick={onOpenInstallationPricing}
                  variant="outline"
                  size="sm"
                  className="bg-white/20 border-white/30 text-black hover:bg-white/30 backdrop-blur-sm font-bold"
                  title="أسعار التركيب"
                >
                  <Wrench className="w-4 h-4" />
                </Button>
              </div>
            )}

            {/* زر تسجيل الخروج */}
            <Button
              onClick={logout}
              variant="outline"
              size="sm"
              className="bg-red-100/80 border-red-300 text-red-700 hover:bg-red-200 backdrop-blur-sm font-bold"
              title="تسجيل الخروج"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}