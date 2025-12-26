import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Car, LogIn, UserPlus } from "lucide-react";
import { z } from "zod";

const loginSchema = z.object({
  phone: z.string().min(9, "Telefone deve ter pelo menos 9 dígitos"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
});

const signupSchema = loginSchema.extend({
  fullName: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
});

export default function Auth() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // Login state
  const [loginPhone, setLoginPhone] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Signup state
  const [signupPhone, setSignupPhone] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupFullName, setSignupFullName] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validar dados
      loginSchema.parse({ phone: loginPhone, password: loginPassword });

      // Fazer login usando telefone como email (formato: phone@fleet.local)
      const email = `${loginPhone}@fleet.local`;
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: loginPassword,
      });

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          toast({
            title: "Erro ao entrar",
            description: "Telefone ou senha incorretos.",
            variant: "destructive",
          });
        } else {
          throw error;
        }
        return;
      }

      // Verificar a role do utilizador
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", (await supabase.auth.getUser()).data.user?.id)
        .single();

      const redirectPath = roleData?.role === "admin" ? "/admin" : "/motorista";

      toast({
        title: "Bem-vindo!",
        description: "Login efetuado com sucesso.",
      });

      navigate(redirectPath);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Erro de validação",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erro ao entrar",
          description: "Não foi possível fazer login. Tente novamente.",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validar dados
      signupSchema.parse({
        phone: signupPhone,
        password: signupPassword,
        fullName: signupFullName,
      });

      // Criar conta usando telefone como email (formato: phone@fleet.local)
      const email = `${signupPhone}@fleet.local`;
      const redirectUrl = `${window.location.origin}/admin`;

      const { error } = await supabase.auth.signUp({
        email,
        password: signupPassword,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            phone: signupPhone,
            full_name: signupFullName,
          },
        },
      });

      if (error) {
        if (error.message.includes("User already registered")) {
          toast({
            title: "Conta já existe",
            description: "Este telefone já está registado. Por favor, faça login.",
            variant: "destructive",
          });
        } else {
          throw error;
        }
        return;
      }

      toast({
        title: "Conta criada!",
        description: "Registo efetuado com sucesso. Pode agora fazer login.",
      });

      // Limpar formulário e mudar para aba de login
      setSignupPhone("");
      setSignupPassword("");
      setSignupFullName("");
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Erro de validação",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erro ao registar",
          description: "Não foi possível criar a conta. Tente novamente.",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-accent/10 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <Car className="h-7 w-7 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Gestão de Frotas</CardTitle>
          <CardDescription>Entre ou registe-se para aceder à plataforma</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">
                <LogIn className="mr-2 h-4 w-4" />
                Entrar
              </TabsTrigger>
              <TabsTrigger value="signup">
                <UserPlus className="mr-2 h-4 w-4" />
                Registar
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-phone">Telefone</Label>
                  <Input
                    id="login-phone"
                    type="tel"
                    placeholder="912345678"
                    value={loginPhone}
                    onChange={(e) => setLoginPhone(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Senha</Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "A entrar..." : "Entrar"}
                </Button>
                <p className="mt-3 text-xs text-center text-muted-foreground">
                  Use o seu número de telefone como utilizador e a senha definida no registo.
                </p>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Nome Completo</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="João Silva"
                    value={signupFullName}
                    onChange={(e) => setSignupFullName(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-phone">Telefone</Label>
                  <Input
                    id="signup-phone"
                    type="tel"
                    placeholder="912345678"
                    value={signupPhone}
                    onChange={(e) => setSignupPhone(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Senha</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="••••••••"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "A registar..." : "Registar"}
                </Button>
              </form>
              <p className="mt-4 text-xs text-center text-muted-foreground">
                Novos registos serão criados como motoristas
              </p>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
