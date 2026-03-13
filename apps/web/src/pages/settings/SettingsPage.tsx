import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory, usePaymentMethods, useCreatePaymentMethod, useUpdatePaymentMethod, useDeletePaymentMethod } from '@/hooks/useSettings';
import { useGroupMembers, useGroups } from '@/hooks/useGroups';
import { useGroupStore } from '@/store/group.store';
import { useAuthStore } from '@/store/auth.store';
import { useToast } from '@/components/ui/toaster';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { groupsService } from '@/services/groups.service';
import type { Category, PaymentMethod, GroupMember } from '@/types';

export function SettingsPage() {
  const { activeGroup } = useGroupStore();
  const { data: members } = useGroupMembers(activeGroup?.id);
  const { user } = useAuthStore();

  const currentMember = members?.find((m) => m.userId === user?.id);
  const isAdmin = currentMember?.role === 'ADMIN';

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Configurações</h1>
      <Tabs defaultValue="categories">
        <TabsList>
          <TabsTrigger value="categories">Categorias</TabsTrigger>
          <TabsTrigger value="payment-methods">Meios de Pagamento</TabsTrigger>
          <TabsTrigger value="members">Membros</TabsTrigger>
        </TabsList>
        <TabsContent value="categories" className="mt-4">
          <CategoriesTab isAdmin={isAdmin} />
        </TabsContent>
        <TabsContent value="payment-methods" className="mt-4">
          <PaymentMethodsTab isAdmin={isAdmin} />
        </TabsContent>
        <TabsContent value="members" className="mt-4">
          <MembersTab isAdmin={isAdmin} members={members ?? []} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ── Categories ── */
function CategoriesTab({ isAdmin }: { isAdmin: boolean }) {
  const { data: categories } = useCategories();
  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();
  const deleteMutation = useDeleteCategory();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Category | undefined>();
  const [name, setName] = useState('');
  const [color, setColor] = useState('#6366f1');

  function openCreate() { setEditing(undefined); setName(''); setColor('#6366f1'); setDialogOpen(true); }
  function openEdit(c: Category) { setEditing(c); setName(c.name); setColor(c.color ?? '#6366f1'); setDialogOpen(true); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, data: { name, color } });
        toast({ title: 'Categoria atualizada!' });
      } else {
        await createMutation.mutateAsync({ name, color });
        toast({ title: 'Categoria criada!' });
      }
      setDialogOpen(false);
    } catch {
      toast({ title: 'Erro ao salvar categoria.', variant: 'destructive' });
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Confirmar exclusão?')) return;
    try {
      await deleteMutation.mutateAsync(id);
      toast({ title: 'Categoria excluída.' });
    } catch {
      toast({ title: 'Erro ao excluir.', variant: 'destructive' });
    }
  }

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <span className="text-sm text-muted-foreground">{categories?.length ?? 0} categorias</span>
        {isAdmin && <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Nova categoria</Button>}
      </div>
      <div className="space-y-2">
        {(categories ?? []).map((c) => (
          <div key={c.id} className="flex items-center justify-between rounded-lg border p-3">
            <div className="flex items-center gap-3">
              <span className="h-4 w-4 rounded-full shrink-0" style={{ backgroundColor: c.color ?? '#ccc' }} />
              <span className="text-sm font-medium">{c.name}</span>
              {c.isDefault && <span className="text-xs text-muted-foreground">(padrão)</span>}
            </div>
            {isAdmin && (
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(c)}><Pencil className="h-3.5 w-3.5" /></Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(c.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            )}
          </div>
        ))}
      </div>
      <Dialog open={dialogOpen} onOpenChange={(v) => !v && setDialogOpen(false)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Editar categoria' : 'Nova categoria'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input placeholder="Ex: Alimentação" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Cor</Label>
              <div className="flex gap-2 items-center">
                <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-10 w-16 rounded cursor-pointer" />
                <Input value={color} onChange={(e) => setColor(e.target.value)} className="w-32" placeholder="#6366f1" />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit">{editing ? 'Salvar' : 'Criar'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ── Payment Methods ── */
function PaymentMethodsTab({ isAdmin }: { isAdmin: boolean }) {
  const { data: methods } = usePaymentMethods();
  const createMutation = useCreatePaymentMethod();
  const updateMutation = useUpdatePaymentMethod();
  const deleteMutation = useDeletePaymentMethod();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PaymentMethod | undefined>();
  const [name, setName] = useState('');

  function openCreate() { setEditing(undefined); setName(''); setDialogOpen(true); }
  function openEdit(pm: PaymentMethod) { setEditing(pm); setName(pm.name); setDialogOpen(true); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, name });
        toast({ title: 'Meio de pagamento atualizado!' });
      } else {
        await createMutation.mutateAsync(name);
        toast({ title: 'Meio de pagamento criado!' });
      }
      setDialogOpen(false);
    } catch {
      toast({ title: 'Erro ao salvar.', variant: 'destructive' });
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Confirmar exclusão?')) return;
    try {
      await deleteMutation.mutateAsync(id);
      toast({ title: 'Excluído.' });
    } catch {
      toast({ title: 'Erro ao excluir.', variant: 'destructive' });
    }
  }

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <span className="text-sm text-muted-foreground">{methods?.length ?? 0} meios de pagamento</span>
        {isAdmin && <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Novo meio</Button>}
      </div>
      <div className="space-y-2">
        {(methods ?? []).map((pm) => (
          <div key={pm.id} className="flex items-center justify-between rounded-lg border p-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{pm.name}</span>
              {pm.isDefault && <span className="text-xs text-muted-foreground">(padrão)</span>}
            </div>
            {isAdmin && (
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(pm)}><Pencil className="h-3.5 w-3.5" /></Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(pm.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            )}
          </div>
        ))}
      </div>
      <Dialog open={dialogOpen} onOpenChange={(v) => !v && setDialogOpen(false)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Editar meio de pagamento' : 'Novo meio de pagamento'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input placeholder="Ex: Nubank" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit">{editing ? 'Salvar' : 'Criar'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ── Members ── */
function MembersTab({ isAdmin, members }: { isAdmin: boolean; members: GroupMember[] }) {
  const { activeGroup } = useGroupStore();
  const { user } = useAuthStore();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [email, setEmail] = useState('');

  const addMutation = useMutation({
    mutationFn: (email: string) => groupsService.addMember(activeGroup!.id, email),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['groups', activeGroup?.id, 'members'] }),
  });

  const removeMutation = useMutation({
    mutationFn: (userId: string) => groupsService.removeMember(activeGroup!.id, userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['groups', activeGroup?.id, 'members'] }),
  });

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    try {
      await addMutation.mutateAsync(email);
      toast({ title: 'Membro adicionado!' });
      setEmail('');
    } catch {
      toast({ title: 'Erro ao adicionar membro.', variant: 'destructive' });
    }
  }

  async function handleRemove(userId: string) {
    if (!confirm('Confirmar remoção?')) return;
    try {
      await removeMutation.mutateAsync(userId);
      toast({ title: 'Membro removido.' });
    } catch {
      toast({ title: 'Erro ao remover membro.', variant: 'destructive' });
    }
  }

  return (
    <div className="space-y-4">
      {isAdmin && (
        <form onSubmit={handleAdd} className="flex gap-2">
          <Input placeholder="E-mail do membro" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="max-w-xs" />
          <Button type="submit" size="sm" disabled={addMutation.isPending}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar
          </Button>
        </form>
      )}
      <div className="space-y-2">
        {members.map((m) => (
          <div key={m.id} className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">{m.user.name}</p>
              <p className="text-xs text-muted-foreground">{m.user.email}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground capitalize">{m.role === 'ADMIN' ? 'Admin' : 'Membro'}</span>
              {isAdmin && m.userId !== user?.id && (
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleRemove(m.userId)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
