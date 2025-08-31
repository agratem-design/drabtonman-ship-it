import { User, LoginCredentials, Permission } from '@/types'
import { supabase as supabaseClient } from '@/supabaseClient'

// صلاحيات النظام
const PERMISSIONS: Permission[] = [
  { id: '1', name: 'view_billboards', description: 'عرض اللوحات الإعلانية' },
  { id: '2', name: 'manage_users', description: 'إدارة المستخدمين' },
  { id: '3', name: 'admin_access', description: 'صلاحيات الإدارة الكاملة' },
  { id: '4', name: 'view_specific_client', description: 'عرض زبون محدد فقط' }
]

// المستخدم الإداري الافتراضي (للطوارئ فقط عند عدم توفر قاعدة البيانات)
const DEFAULT_USERS: User[] = [
  {
    id: '1',
    username: 'admin',
    email: 'admin@alfaresaldahabi.com',
    role: 'admin',
    permissions: PERMISSIONS,
    createdAt: new Date().toISOString(),
    isActive: true
  }
]

// كلمات المرور الافتراضية المحلية (للطوارئ فقط)
const USER_PASSWORDS: Record<string, string> = {
  admin: 'aukg-123'
}

// نوع صف المستخدم في Supabase
type UserRow = {
  id: string
  username: string
  email: string
  role: 'admin' | 'user'
  permissions: any | null
  assigned_client?: string | null
  pricing_category?: 'A' | 'B' | 'companies' | 'individuals' | 'marketers' | null
  is_active: boolean
  created_at?: string | null
  password?: string | null // تنبيه: يفضل استخدام Auth أو تخزين مشفر
}

function mapRowToUser(row: UserRow): User {
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    role: row.role,
    permissions: Array.isArray(row.permissions) ? row.permissions : PERMISSIONS,
    assignedClient: row.assigned_client || undefined,
    pricingCategory: row.pricing_category || undefined,
    createdAt: row.created_at || new Date().toISOString(),
    isActive: row.is_active,
    lastLogin: undefined
  }
}

class AuthService {
  private readonly STORAGE_KEY = 'al-fares-auth'
  private readonly USERS_KEY = 'al-fares-users'
  private readonly PASSWORDS_KEY = 'al-fares-passwords'

  constructor() {
    this.initializeDefaultData()
  }

  private initializeDefaultData() {
    // لا تكتب بيانات افتراضية إذا كانت قاعدة البيانات متاحة
    if (!supabaseClient) {
      if (!localStorage.getItem(this.USERS_KEY)) {
        localStorage.setItem(this.USERS_KEY, JSON.stringify(DEFAULT_USERS))
      }
      if (!localStorage.getItem(this.PASSWORDS_KEY)) {
        localStorage.setItem(this.PASSWORDS_KEY, JSON.stringify(USER_PASSWORDS))
      }
    }
  }

  async login(credentials: LoginCredentials): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      // أولاً: حاول من Supabase إن كانت متاحة
      if (supabaseClient) {
        const identifier = credentials.username.trim()
        const byEmail = identifier.includes('@')
        const { data, error } = await supabaseClient
          .from('users')
          .select('*')
          .ilike(byEmail ? 'email' : 'username', identifier)
          .maybeSingle()

        if (!error && data) {
          const row = data as unknown as UserRow
          if (!row.is_active) return { success: false, error: 'الحساب غير نشط' }
          // تطابق كلمة المرور البسيط (يفضل التبديل إلى Supabase Auth لاحقاً)
          if (row.password && row.password === credentials.password) {
            const user = mapRowToUser(row)
            user.lastLogin = new Date().toISOString()
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(user))
            return { success: true, user }
          } else {
            return { success: false, error: 'كلمة المرور غير صحيحة' }
          }
        }
      }

      //Fallback محلي
      const users = this.getUsers()
      const passwords = this.getPasswords()
      const user = users.find(u => u.username === credentials.username && u.isActive)
      if (!user) return { success: false, error: 'اسم المستخدم غير صحيح' }
      const storedPassword = passwords[user.username]
      if (storedPassword !== credentials.password) return { success: false, error: 'كلمة المرور غير صحيحة' }
      user.lastLogin = new Date().toISOString()
      this.updateUser(user)
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(user))
      return { success: true, user }
    } catch (error) {
      console.error('خطأ في تسجيل الدخول:', error)
      return { success: false, error: 'حدث خطأ في تسجيل الدخول' }
    }
  }

  logout(): void {
    localStorage.removeItem(this.STORAGE_KEY)
  }

  getCurrentUser(): User | null {
    try {
      const userData = localStorage.getItem(this.STORAGE_KEY)
      if (!userData) return null
      const user = JSON.parse(userData) as User

      // إذا كانت القاعدة متاحة، تحقّق من حالة المستخدم من Supabase
      if (supabaseClient) {
        // Optional: could validate active status remotely
        return user
      }

      const users = this.getUsers()
      const currentUser = users.find(u => u.id === user.id)
      return currentUser?.isActive ? currentUser : null
    } catch {
      return null
    }
  }

  getUsers(): User[] {
    try {
      if (supabaseClient) {
        // ملاحظة: يجب استخدام دوال async للبيئة الحقيقية،
        // هنا نُرجع من LocalStorage كقائمة مؤقتة إذا لزم الأمر
        const cache = localStorage.getItem(this.USERS_KEY)
        return cache ? JSON.parse(cache) : []
      }
      const usersData = localStorage.getItem(this.USERS_KEY)
      return usersData ? JSON.parse(usersData) : DEFAULT_USERS
    } catch {
      return DEFAULT_USERS
    }
  }

  
async fetchUsers(): Promise<User[]> {
  if (!supabaseClient) return this.getUsers()
  const { data, error } = await supabaseClient.from('users').select('*')
  if (error || !data) return []
  const rows = data as unknown as UserRow[]
  rows.sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime())
  const users = rows.map(mapRowToUser)
  localStorage.setItem(this.USERS_KEY, JSON.stringify(users))
  return users
}

  getPasswords(): Record<string, string> {
    try {
      const passwordsData = localStorage.getItem(this.PASSWORDS_KEY)
      return passwordsData ? JSON.parse(passwordsData) : USER_PASSWORDS
    } catch {
      return USER_PASSWORDS
    }
  }

  async addUser(userData: Omit<User, 'id' | 'createdAt'>, password: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (supabaseClient) {
        const row = {
          username: userData.username,
          email: userData.email,
          role: userData.role,
          permissions: userData.permissions,
          assigned_client: userData.assignedClient || null,
          pricing_category: userData.pricingCategory || null,
          is_active: userData.isActive,
          password
        }
        const { error } = await supabaseClient.from('users').insert(row as any)
        if (error) return { success: false, error: error.message }
        await this.fetchUsers()
        return { success: true }
      }

      const users = this.getUsers()
      const passwords = this.getPasswords()
      if (users.some(u => u.username === userData.username)) return { success: false, error: 'اسم المستخدم موجود بالفعل' }
      if (users.some(u => u.email === userData.email)) return { success: false, error: 'البريد الإلكتروني موجود بالفعل' }
      const newUser: User = { ...userData, id: Date.now().toString(), createdAt: new Date().toISOString() }
      users.push(newUser)
      passwords[newUser.username] = password
      localStorage.setItem(this.USERS_KEY, JSON.stringify(users))
      localStorage.setItem(this.PASSWORDS_KEY, JSON.stringify(passwords))
      return { success: true }
    } catch (error) {
      console.error('خطأ في إضافة المستخدم:', error)
      return { success: false, error: 'حدث خطأ في إضافة المستخدم' }
    }
  }

  async updateUser(updatedUser: User): Promise<{ success: boolean; error?: string }> {
    try {
      if (supabaseClient) {
        const { error } = await supabaseClient
          .from('users')
          .update({
            username: updatedUser.username,
            email: updatedUser.email,
            role: updatedUser.role,
            permissions: updatedUser.permissions,
            assigned_client: updatedUser.assignedClient || null,
            pricing_category: updatedUser.pricingCategory || null,
            is_active: updatedUser.isActive
          } as any)
          .eq('id', updatedUser.id)
        if (error) return { success: false, error: error.message }
        await this.fetchUsers()
        const currentUser = this.getCurrentUser()
        if (currentUser && currentUser.id === updatedUser.id) {
          localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updatedUser))
        }
        return { success: true }
      }

      const users = this.getUsers()
      const userIndex = users.findIndex(u => u.id === updatedUser.id)
      if (userIndex === -1) return { success: false, error: 'المستخدم غير موجود' }
      users[userIndex] = updatedUser
      localStorage.setItem(this.USERS_KEY, JSON.stringify(users))
      const currentUser = this.getCurrentUser()
      if (currentUser && currentUser.id === updatedUser.id) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updatedUser))
      }
      return { success: true }
    } catch (error) {
      console.error('خطأ في تحديث المستخدم:', error)
      return { success: false, error: 'حدث خطأ في تحديث المستخدم' }
    }
  }

  async updatePassword(username: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (supabaseClient) {
        const { error } = await supabaseClient.from('users').update({ password: newPassword } as any).ilike('username', username)
        if (error) return { success: false, error: error.message }
        return { success: true }
      }
      const passwords = this.getPasswords()
      passwords[username] = newPassword
      localStorage.setItem(this.PASSWORDS_KEY, JSON.stringify(passwords))
      return { success: true }
    } catch (error) {
      console.error('خطأ في تحديث كلمة المرور:', error)
      return { success: false, error: 'حدث خطأ في تحديث كلمة المرور' }
    }
  }

  async deleteUser(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (supabaseClient) {
        // منع حذف المستخدم الإداري الأساسي حسب السياسة لديك
        const { error } = await supabaseClient.from('users').delete().eq('id', userId)
        if (error) return { success: false, error: error.message }
        await this.fetchUsers()
        return { success: true }
      }

      const users = this.getUsers()
      const passwords = this.getPasswords()
      const userToDelete = users.find(u => u.id === userId)
      if (!userToDelete) return { success: false, error: 'المستخدم غير موجود' }
      if (userToDelete.username === 'admin') return { success: false, error: 'لا يمكن حذف المستخدم الإداري الأساسي' }
      const updatedUsers = users.filter(u => u.id !== userId)
      delete passwords[userToDelete.username]
      localStorage.setItem(this.USERS_KEY, JSON.stringify(updatedUsers))
      localStorage.setItem(this.PASSWORDS_KEY, JSON.stringify(passwords))
      return { success: true }
    } catch (error) {
      console.error('خطأ في حذف المستخدم:', error)
      return { success: false, error: 'حدث خطأ في حذف المستخدم' }
    }
  }

  getPermissions(): Permission[] {
    return PERMISSIONS
  }

  hasPermission(user: User | null, permissionName: string): boolean {
    if (!user) return false
    return user.permissions.some(p => p.name === permissionName)
  }
}

export const authService = new AuthService()
