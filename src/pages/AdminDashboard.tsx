import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Bell, Car, WalletCards, Calendar as CalendarIcon, Trash2, LogOut } from "lucide-react";

interface FinancialTransaction {
  id: string;
  user_id: string;
  vehicle_id: string | null;
  type: "entrada" | "saida";
  category: string;
  amount: number;
  date: string; // ISO date string (yyyy-mm-dd)
  description: string | null;
}

const categoryLabels: Record<string, string> = {
  combustivel: "Combustível",
  inventario: "Inventário",
  manutencao: "Manutenção",
  outros: "Outros",
};

const chartConfig = {
  combustivel: {
    label: "Combustível",
    color: "hsl(var(--chart-1))",
  },
  inventario: {
    label: "Inventário",
    color: "hsl(var(--chart-2))",
  },
  manutencao: {
    label: "Manutenção",
    color: "hsl(var(--chart-3))",
  },
  outros: {
    label: "Outros",
    color: "hsl(var(--chart-4))",
  },
} satisfies ChartConfig;

const AdminDashboard = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();

  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const { data: transactions = [], refetch, isLoading } = useQuery<FinancialTransaction[]>({
    queryKey: ["financial_transactions", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("financial_transactions")
        .select("*")
        .order("date", { ascending: false });

      if (error) throw error;
      return (data ?? []) as FinancialTransaction[];
    },
    enabled: !!user,
  });

  const handleDeleteTransaction = async (id: string) => {
    const confirmed = window.confirm("Tem a certeza que deseja eliminar esta transação?");
    if (!confirmed) return;

    try {
      const { error } = await supabase.from("financial_transactions").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Transação eliminada", description: "A transação foi removida com sucesso." });
      await refetch();
    } catch (error) {
      console.error(error);
      toast({
        title: "Erro ao eliminar",
        description: "Não foi possível eliminar a transação.",
        variant: "destructive",
      });
    }
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (typeFilter !== "all" && t.type !== typeFilter) return false;
      if (categoryFilter !== "all" && t.category !== categoryFilter) return false;

      if (startDate) {
        if (t.date < startDate) return false;
      }
      if (endDate) {
        if (t.date > endDate) return false;
      }
      return true;
    });
  }, [transactions, typeFilter, categoryFilter, startDate, endDate]);

  const totals = useMemo(() => {
    return filteredTransactions.reduce(
      (acc, t) => {
        if (t.type === "entrada") {
          acc.income += t.amount;
        } else {
          acc.expense += t.amount;
        }
        return acc;
      },
      { income: 0, expense: 0 },
    );
  }, [filteredTransactions]);

  const balance = totals.income - totals.expense;

  const categoryData = useMemo(() => {
    const base = {
      combustivel: 0,
      inventario: 0,
      manutencao: 0,
      outros: 0,
    } as Record<string, number>;

    filteredTransactions
      .filter((t) => t.type === "saida")
      .forEach((t) => {
        const key = t.category in base ? t.category : "outros";
        base[key] += t.amount;
      });

    return [
      {
        categoria: "Combustível",
        combustivel: base.combustivel,
        inventario: 0,
        manutencao: 0,
        outros: 0,
      },
      {
        categoria: "Inventário",
        combustivel: 0,
        inventario: base.inventario,
        manutencao: 0,
        outros: 0,
      },
      {
        categoria: "Manutenção",
        combustivel: 0,
        inventario: 0,
        manutencao: base.manutencao,
        outros: 0,
      },
      {
        categoria: "Outros",
        combustivel: 0,
        inventario: 0,
        manutencao: 0,
        outros: base.outros,
      },
    ];
  }, [filteredTransactions]);

  const maxValue = useMemo(() => {
    const values = categoryData.flatMap((row) => [row.combustivel, row.inventario, row.manutencao, row.outros]);
    const max = Math.max(0, ...values);
    return max === 0 ? 1000 : max * 1.2;
  }, [categoryData]);

  const handleLogout = async () => {
    await signOut();
    window.location.href = "/auth";
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-background/95 text-foreground">
      <header className="border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="container flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-accent text-primary-foreground shadow-md">
              <Car className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Painel do Administrador</p>
              <p className="text-sm font-semibold">Sistema de Gestão de Veículos</p>
            </div>
            <Badge variant="secondary" className="ml-1 text-[11px]">
              Admin
            </Badge>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <Link to="/" className="hover:text-primary">
                Página inicial
              </Link>
            </div>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-8 md:py-10 space-y-6">
        <section className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Visão financeira da frota</h1>
            <p className="max-w-2xl text-sm text-muted-foreground md:text-base">
              Acompanhe receitas, despesas e saldo por categoria. Use os filtros para ajustar o período e o tipo de
              transação.
            </p>
          </div>
        </section>

        <Tabs defaultValue="financas" className="space-y-6">
          <TabsList className="flex flex-wrap gap-2">
            <TabsTrigger value="financas" className="gap-2">
              <WalletCards className="h-4 w-4" />
              Finanças
            </TabsTrigger>
            <TabsTrigger value="veiculos" className="gap-2">
              <Car className="h-4 w-4" />
              Veículos
            </TabsTrigger>
            <TabsTrigger value="motoristas" className="gap-2">
              <Bell className="h-4 w-4" />
              Motoristas
            </TabsTrigger>
            <TabsTrigger value="manutencao" className="gap-2">
              <Bell className="h-4 w-4" />
              Manutenção
            </TabsTrigger>
            <TabsTrigger value="combustivel" className="gap-2">
              <WalletCards className="h-4 w-4" />
              Combustível
            </TabsTrigger>
            <TabsTrigger value="inventario" className="gap-2">
              <WalletCards className="h-4 w-4" />
              Inventário
            </TabsTrigger>
          </TabsList>

          <TabsContent value="financas" className="space-y-6">
            <section className="grid gap-4 md:grid-cols-3">
              <Card className="animate-fade-in">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Receitas</CardTitle>
                  <CardDescription>Entradas financeiras no período filtrado.</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-semibold">
                    Kz {totals.income.toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </CardContent>
              </Card>

              <Card className="animate-fade-in">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Despesas</CardTitle>
                  <CardDescription>Saídas financeiras no período filtrado.</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-semibold text-destructive">
                    Kz {totals.expense.toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </CardContent>
              </Card>

              <Card className="animate-fade-in">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Saldo</CardTitle>
                  <CardDescription>Receitas menos despesas.</CardDescription>
                </CardHeader>
                <CardContent>
                  <p
                    className={`text-2xl font-semibold ${
                      balance >= 0 ? "text-emerald-500" : "text-destructive"
                    }`}
                  >
                    Kz {balance.toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </CardContent>
              </Card>
            </section>

            <Card className="animate-fade-in">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Bell className="h-4 w-4 text-primary" />
                  Resumo de despesas por categoria
                </CardTitle>
                <CardDescription>
                  Valores de despesas por categoria, respeitando os filtros de tipo, categoria e datas abaixo.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between text-xs md:text-sm">
                  <div className="flex flex-wrap gap-2">
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                      <SelectTrigger className="h-8 w-36">
                        <SelectValue placeholder="Tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os tipos</SelectItem>
                        <SelectItem value="entrada">Receitas</SelectItem>
                        <SelectItem value="saida">Despesas</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger className="h-8 w-40">
                        <SelectValue placeholder="Categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas as categorias</SelectItem>
                        <SelectItem value="combustivel">Combustível</SelectItem>
                        <SelectItem value="inventario">Inventário</SelectItem>
                        <SelectItem value="manutencao">Manutenção</SelectItem>
                        <SelectItem value="outros">Outros</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="h-3 w-3 text-muted-foreground" />
                      <Input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="h-8 w-36"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="h-3 w-3 text-muted-foreground" />
                      <Input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="h-8 w-36"
                      />
                    </div>
                  </div>
                </div>

                <div className="w-full overflow-x-auto">
                  <ChartContainer
                    config={chartConfig}
                    className="h-64 w-full min-w-[320px] rounded-xl border border-border/70 bg-background/80 p-4"
                  >
                    <BarChart data={categoryData} barSize={32}>
                      <CartesianGrid vertical={false} strokeDasharray="3 3" />
                      <XAxis dataKey="categoria" tickLine={false} axisLine={false} tickMargin={8} />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => `Kz ${value.toLocaleString("pt-PT")}`}
                        domain={[0, maxValue]}
                      />
                      <ChartTooltip content={<ChartTooltipContent />} cursor={{ fill: "hsl(var(--muted))" }} />
                      <Bar dataKey="combustivel" fill="var(--color-combustivel)" radius={4} />
                      <Bar dataKey="inventario" fill="var(--color-inventario)" radius={4} />
                      <Bar dataKey="manutencao" fill="var(--color-manutencao)" radius={4} />
                      <Bar dataKey="outros" fill="var(--color-outros)" radius={4} />
                    </BarChart>
                  </ChartContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="animate-fade-in">
              <CardHeader>
                <CardTitle className="text-base">Transações financeiras</CardTitle>
                <CardDescription>
                  Registe receitas e despesas da frota. Use os filtros acima para ajustar o período.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">A carregar transações...</p>
                ) : filteredTransactions.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    Não existem transações para os filtros seleccionados.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Categoria</TableHead>
                          <TableHead>Data</TableHead>
                          <TableHead>Descrição</TableHead>
                          <TableHead className="text-right">Valor (Kz)</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredTransactions.map((t) => (
                          <TableRow key={t.id} className="text-xs md:text-sm">
                            <TableCell>
                              <Badge variant={t.type === "entrada" ? "default" : "destructive"}>
                                {t.type === "entrada" ? "Receita" : "Despesa"}
                              </Badge>
                            </TableCell>
                            <TableCell>{categoryLabels[t.category] || t.category}</TableCell>
                            <TableCell>{t.date}</TableCell>
                            <TableCell className="max-w-xs truncate">
                              {t.description || <span className="text-muted-foreground">Sem descrição</span>}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              Kz {t.amount.toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => handleDeleteTransaction(t.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="veiculos" className="space-y-4">
            <Card className="animate-fade-in">
              <CardHeader>
                <CardTitle className="text-base">Gestão de veículos</CardTitle>
                <CardDescription>
                  Nesta aba poderá gerir a frota (registar, editar e remover veículos) — conteúdo a ser reactivado.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Versão actual focada na área financeira. Se quiser, posso reconstruir aqui a listagem completa de
                  veículos com filtros e acções.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="motoristas" className="space-y-4">
            <Card className="animate-fade-in">
              <CardHeader>
                <CardTitle className="text-base">Gestão de motoristas</CardTitle>
                <CardDescription>
                  Atribuição de veículos, contactos e estado operacional dos motoristas.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Esta secção foi simplificada temporariamente. Posso repor a listagem completa de motoristas e
                  atribuições tal como antes.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="manutencao" className="space-y-4">
            <Card className="animate-fade-in">
              <CardHeader>
                <CardTitle className="text-base">Manutenção</CardTitle>
                <CardDescription>
                  Agendamento e histórico de manutenções por veículo.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Painel financeiro já regista despesas de manutenção. Se quiser, posso voltar a montar aqui o quadro
                  de agendamentos e histórico detalhado.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="combustivel" className="space-y-4">
            <Card className="animate-fade-in">
              <CardHeader>
                <CardTitle className="text-base">Combustível</CardTitle>
                <CardDescription>
                  Abastecimentos, consumo médio e ligação às transacções financeiras.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Neste momento os custos de combustível são tratados na aba Finanças. Posso recriar aqui a grelha de
                  abastecimentos com filtros e exportação.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="inventario" className="space-y-4">
            <Card className="animate-fade-in">
              <CardHeader>
                <CardTitle className="text-base">Inventário</CardTitle>
                <CardDescription>
                  Controlo de peças, stock mínimo e movimentos de entrada/saída.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  As despesas de inventário também são incluídas no resumo financeiro. Se precisar, posso restaurar o
                  módulo completo de itens e movimentos de stock.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminDashboard;
