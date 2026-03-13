import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { TrendingUp } from 'lucide-react';
import { authService } from '@/services/auth.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/toaster';
import { useState } from 'react';

const schema = z.object({ email: z.string().email('E-mail inválido') });
type FormData = z.infer<typeof schema>;

export function ForgotPasswordPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: FormData) {
    setLoading(true);
    try {
      await authService.forgotPassword(data.email);
      setSent(true);
      toast({ title: 'E-mail enviado', description: 'Verifique sua caixa de entrada.' });
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível enviar o e-mail.', variant: 'destructive' });
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
            <CardTitle>Esqueci minha senha</CardTitle>
            <CardDescription>Informe seu e-mail para receber o link de redefinição</CardDescription>
          </CardHeader>
          <CardContent>
            {sent ? (
              <p className="text-sm text-center text-muted-foreground">
                Verifique seu e-mail e siga as instruções para redefinir sua senha.
              </p>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input id="email" type="email" placeholder="seu@email.com" {...register('email')} />
                  {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Enviando...' : 'Enviar link'}
                </Button>
              </form>
            )}
            <p className="text-center text-sm text-muted-foreground mt-4">
              <Link to="/login" className="text-primary hover:underline">Voltar para o login</Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
