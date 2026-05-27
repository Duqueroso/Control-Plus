import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Users, Shield, ShieldOff, Pencil, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { usersService } from '../services/users-service'
import { useAuthStore } from '@/features/auth/store/auth-store'
import { toast } from 'sonner'
import type { Profile, UserRole } from '@/types'

function formatDate(date: string): string {
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export default function UsersPage() {
  const queryClient = useQueryClient()
  const { user: currentUser } = useAuthStore()
  const [editingUser, setEditingUser] = useState<Profile | null>(null)
  const [selectedRole, setSelectedRole] = useState<UserRole>('employee')

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ['profiles'],
    queryFn: usersService.getProfiles,
  })

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: UserRole }) =>
      usersService.updateProfileRole(id, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] })
      toast.success('Rol actualizado')
      setEditingUser(null)
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`)
    },
  })

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      usersService.toggleProfileStatus(id, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] })
      toast.success('Estado actualizado')
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`)
    },
  })

  const openEditDialog = (profile: Profile) => {
    setEditingUser(profile)
    setSelectedRole(profile.role)
  }

  const closeEditDialog = () => {
    setEditingUser(null)
    setSelectedRole('employee')
  }

  const handleUpdateRole = () => {
    if (!editingUser) return
    updateRoleMutation.mutate({ id: editingUser.id, role: selectedRole })
  }

  const admins = profiles.filter((p) => p.role === 'admin')
  const employees = profiles.filter((p) => p.role === 'employee')
  const inactiveUsers = profiles.filter((p) => !p.is_active)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Usuarios</h1>
        <p className="text-muted-foreground mt-1">
          Gestión de usuarios y permisos del sistema
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Usuarios
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              <Users className="h-5 w-5" />
              {profiles.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Administradores
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary flex items-center gap-2">
              <Shield className="h-5 w-5" />
              {admins.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Empleados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              <Users className="h-5 w-5" />
              {employees.length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Usuarios del Sistema</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-muted/50 rounded animate-pulse" />
              ))}
            </div>
          ) : profiles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay usuarios registrados
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha de registro</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profiles.map((profile) => (
                  <TableRow key={profile.id}>
                    <TableCell className="font-medium">{profile.email}</TableCell>
                    <TableCell>
                      <Badge
                        className={
                          profile.role === 'admin'
                            ? 'bg-primary/10 text-primary'
                            : 'bg-muted'
                        }
                      >
                        {profile.role === 'admin' ? (
                          <Shield className="h-3 w-3 mr-1" />
                        ) : null}
                        {profile.role === 'admin' ? 'Administrador' : 'Empleado'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={profile.is_active ? 'default' : 'destructive'}
                      >
                        {profile.is_active ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      {formatDate(profile.created_at)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(profile)}
                          disabled={profile.id === currentUser?.id}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            toggleStatusMutation.mutate({
                              id: profile.id,
                              isActive: !profile.is_active,
                            })
                          }
                          disabled={profile.id === currentUser?.id}
                        >
                          {profile.is_active ? (
                            <ShieldOff className="h-4 w-4 text-destructive" />
                          ) : (
                            <Shield className="h-4 w-4 text-green-600" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {inactiveUsers.length > 0 && (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-muted-foreground">
              Usuarios Inactivos ({inactiveUsers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {inactiveUsers.map((user) => (
                <Badge key={user.id} variant="outline" className="text-muted-foreground">
                  {user.email}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!editingUser} onOpenChange={() => closeEditDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Usuario</DialogTitle>
          </DialogHeader>
          {editingUser && (
            <div className="space-y-4 py-4">
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="font-medium">{editingUser.email}</p>
                <p className="text-sm text-muted-foreground">
                  ID: {editingUser.id.slice(0, 8)}...
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Rol</label>
                <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as UserRole)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employee">Empleado</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={closeEditDialog}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateRole} disabled={updateRoleMutation.isPending}>
              {updateRoleMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Guardando...
                </>
              ) : (
                'Actualizar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}