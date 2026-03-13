import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { TrendingUp } from 'lucide-react';
import { authService } from '@/services/auth.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/toaster';
import { useState } from 'react';

const schema = z
  .object({
    password: z
      .string()
      .min(8, 'Mínimo 8 caracteres')
      .regex(/[A-Z]/, 'Deve ter ao menos 1 letra maiúscula')
      .regex(/[a-z]/, 'Deve ter ao menos 1 letra minúscula')
      .regex(/[0-9]/, 'Deve ter ao menos 1 número'),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, { message: 'Senhas não conferem', path: ['confirm'] });

type FormData = z.infer<typeof schema>;

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: FormData) {
    setLoading(true);
    try {
      await authService.resetPassword(token, data.password);
      toast({ title: 'Senha redefinida com sucesso!' });
      navigate('/login');
    } catch {
      toast({ title: 'Erro', description: 'Token inválido ou expirado.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold">FinTrack</span>
          </div>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Redefinir senha</CardTitle>
            <CardDescription>Crie uma nova senha para sua conta</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Nova senha</Label>
                <Input id="password" type="password" placeholder="Mín. 8 caracteres" {...register('password')} />
                {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">Confirmar senha</Label>
                <Input id="confirm" type="password" placeholder="Repita a senha" {...register('confirm')} />
                {errors.confirm && <p className="text-sm text-destructive">{errors.confirm.message}</p>}
              </div>
              <Button type="submit" className="w-full" disabled={loading || !token}>
                {loading ? 'Salvando...' : 'Redefinir senha'}
              </Button>
            </form>
            <p className="text-center text-sm text-muted-foreground mt-4">
              <Link to="/login" className="text-primary hover:underline">Voltar para o login</Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
