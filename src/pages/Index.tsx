import { Button } from "@/components/ui/button";
import { NavLink } from "@/components/NavLink";
import { ArrowRight, Car, Fuel, MapPin, Settings2, WalletCards } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background/95 to-background/90 text-foreground">
      <header className="border-b border-border/60 bg-background/60 backdrop-blur-md sticky top-0 z-30">
        <div className="container flex items-center justify-between py-4">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-primary to-accent flex items-center justify-center text-primary-foreground shadow-lg shadow-[hsl(var(--shadow-strong))]/40">
              <Car className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Plataforma de Frotas</p>
              <p className="font-semibold leading-tight">Sistema de Gestão de Veículos</p>
            </div>
          </div>

          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <a href="#funcionalidades" className="hover:text-primary transition-colors">
              Funcionalidades
            </a>
            <a href="#como-funciona" className="hover:text-primary transition-colors">
              Como funciona
            </a>
            <a href="#beneficios" className="hover:text-primary transition-colors">
              Benefícios
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <NavLink to="/auth" className="hidden text-sm font-medium text-muted-foreground hover:text-primary md:inline-flex">
              Entrar no sistema
            </NavLink>
            <Button asChild variant="default" size="sm">
              <NavLink to="/auth" className="inline-flex items-center gap-2">
                Acesso Admin / Motorista
                <ArrowRight className="h-4 w-4" />
              </NavLink>
            </Button>
          </div>
        </div>
      </header>

      <main className="relative overflow-hidden">
        <section className="relative">
          <div className="pointer-events-none absolute -left-32 top-[-120px] h-64 w-64 rounded-full bg-primary/25 blur-3xl" />
          <div className="pointer-events-none absolute right-[-120px] top-20 h-72 w-72 rounded-full bg-accent/25 blur-3xl" />

          <div className="container flex flex-col items-center gap-10 py-16 md:flex-row md:items-start md:py-20 lg:py-24">
            <div className="relative z-10 max-w-xl space-y-6">
              <p className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-secondary/60 px-3 py-1 text-xs font-medium text-primary shadow-sm shadow-[hsl(var(--shadow-soft))]/60">
                Monitorização em tempo real · Gestão financeira · Frotas corporativas
              </p>

              <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
                Controle total da sua frota em uma única plataforma.
              </h1>

              <p className="text-balance text-sm leading-relaxed text-muted-foreground sm:text-base">
                Monitore veículos em tempo real, planeie viagens, acompanhe manutenções, combústivel e finanças com uma
                interface moderna e intuitiva pensada para frotas corporativas.
              </p>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button asChild size="lg" className="shadow-lg shadow-[hsl(var(--shadow-strong))]/40">
                  <NavLink to="/auth" className="inline-flex items-center gap-2">
                    Aceder ao painel
                    <ArrowRight className="h-4 w-4" />
                  </NavLink>
                </Button>
                <p className="text-xs text-muted-foreground sm:text-sm">
                  Admin acede com número <span className="font-semibold text-foreground">912345678</span> e senha
                  <span className="font-semibold text-foreground"> 123456789</span>. Registos são criados como
                  motoristas.
                </p>
              </div>

              <dl className="grid gap-4 text-xs text-muted-foreground sm:grid-cols-3 sm:text-sm">
                <div>
                  <dt className="font-medium text-foreground">Rastreamento em tempo real</dt>
                  <dd>Integração com GPS / Traccar para localização contínua dos veículos.</dd>
                </div>
                <div>
                  <dt className="font-medium text-foreground">Finanças & combustível</dt>
                  <dd>Controle de abastecimentos, despesas e eficiência por veículo.</dd>
                </div>
                <div>
                  <dt className="font-medium text-foreground">Manutenção inteligente</dt>
                  <dd>Lembretes por quilometragem ou tempo com histórico detalhado.</dd>
                </div>
              </dl>
            </div>

            <div className="relative z-10 w-full max-w-md">
              <div className="absolute inset-0 -z-10 rounded-3xl bg-hero-grid opacity-40" />
              <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-card/80 p-5 shadow-[0_18px_60px_rgba(0,0,0,0.55)] backdrop-blur-xl">
                <div className="mb-4 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Visão geral</p>
                    <p className="text-sm font-semibold">Painel de frota em tempo real</p>
                  </div>
                  <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-300">
                    Online · 24/7
                  </span>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-border/70 bg-secondary/70 p-3 shadow-sm">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-[11px] text-muted-foreground">Veículos activos</p>
                        <p className="text-xl font-semibold">32</p>
                      </div>
                      <div className="rounded-xl bg-primary/15 p-2 text-primary">
                        <MapPin className="h-4 w-4" />
                      </div>
                    </div>
                    <p className="mt-1 text-[10px] text-emerald-300">+6 em relação a ontem</p>
                  </div>

                  <div className="rounded-2xl border border-border/70 bg-secondary/70 p-3 shadow-sm">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-[11px] text-muted-foreground">Consumo médio</p>
                        <p className="text-xl font-semibold">7,4 L/100km</p>
                      </div>
                      <div className="rounded-xl bg-accent/15 p-2 text-accent">
                        <Fuel className="h-4 w-4" />
                      </div>
                    </div>
                    <p className="mt-1 text-[10px] text-amber-200">Em linha com a meta da frota</p>
                  </div>

                  <div className="rounded-2xl border border-border/70 bg-secondary/70 p-3 shadow-sm">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-[11px] text-muted-foreground">Despesas do mês</p>
                        <p className="text-xl font-semibold">Kz 18.240</p>
                      </div>
                      <div className="rounded-xl bg-primary/10 p-2 text-primary">
                        <WalletCards className="h-4 w-4" />
                      </div>
                    </div>
                    <p className="mt-1 text-[10px] text-emerald-300">-12% vs. média trimestral</p>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 text-[11px] text-muted-foreground sm:grid-cols-2">
                  <div className="space-y-2 rounded-2xl border border-border/70 bg-background/40 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-medium text-foreground">Viagens de hoje</p>
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                        18 em curso
                      </span>
                    </div>
                    <ul className="space-y-1">
                      <li className="flex items-center justify-between">
                        <span>Rota logística Norte</span>
                        <span className="text-emerald-300">A decorrer</span>
                      </li>
                      <li className="flex items-center justify-between">
                        <span>Distribuição urbana Sul</span>
                        <span className="text-amber-200">A iniciar</span>
                      </li>
                    </ul>
                  </div>

                  <div className="space-y-2 rounded-2xl border border-border/70 bg-background/40 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-medium text-foreground">Alertas de manutenção</p>
                      <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-medium text-destructive">
                        3 pendentes
                      </span>
                    </div>
                    <ul className="space-y-1">
                      <li className="flex items-center justify-between">
                        <span>Revisão preventiva · VH-23-AB</span>
                        <span>+1 200 km</span>
                      </li>
                      <li className="flex items-center justify-between">
                        <span>Troca de pneus · VH-89-CD</span>
                        <span>Prazo amanhã</span>
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between text-[11px] text-muted-foreground">
                  <p>Links de rastreio podem ser partilhados com clientes em tempo real.</p>
                  <span className="hidden rounded-full border border-border/70 px-2 py-1 text-[10px] md:inline-flex">
                    GPS · App móvel · Traccar
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="funcionalidades" className="border-t border-border/60 bg-background/60">
          <div className="container space-y-8 py-12 md:py-16">
            <header className="max-w-2xl space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Funcionalidades
                principais
              </p>
              <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
                Tudo o que precisa para gerir veículos, motoristas e finanças.
              </h2>
              <p className="text-sm text-muted-foreground md:text-base">
                Uma solução única que centraliza rastreamento, planeamento de viagens, manutenções, fornecedores,
                combustível, finanças e relatórios operacionais.
              </p>
            </header>

            <div className="grid gap-5 md:grid-cols-3">
              <article className="group flex flex-col justify-between rounded-2xl border border-border/70 bg-card/80 p-5 shadow-sm transition-transform hover:-translate-y-1 hover:shadow-[0_18px_60px_rgba(0,0,0,0.65)]">
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                    <MapPin className="h-3 w-3" />
                    Rastreamento & viagens
                  </div>
                  <p className="text-sm font-semibold">Localização em tempo real e histórico de rotas.</p>
                  <p className="text-sm text-muted-foreground">
                    Visualize veículos no mapa, acompanhe rotas anteriores, agrupe frotas e gere links únicos de
                    rastreio para partilhar com clientes.
                  </p>
                </div>
                <p className="mt-4 text-xs text-muted-foreground">Integra com GPS, app móvel ou servidor Traccar.</p>
              </article>

              <article className="group flex flex-col justify-between rounded-2xl border border-border/70 bg-card/80 p-5 shadow-sm transition-transform hover:-translate-y-1 hover:shadow-[0_18px_60px_rgba(0,0,0,0.65)]">
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-2 rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
                    <Settings2 className="h-3 w-3" />
                    Manutenção & inventário
                  </div>
                  <p className="text-sm font-semibold">Lembretes inteligentes e controlo de peças.</p>
                  <p className="text-sm text-muted-foreground">
                    Crie lembretes por quilometragem ou tempo, registe manutenções, associe peças usadas e receba
                    alertas de stock baixo no inventário.
                  </p>
                </div>
                <p className="mt-4 text-xs text-muted-foreground">Histórico completo por veículo e por oficina.</p>
              </article>

              <article className="group flex flex-col justify-between rounded-2xl border border-border/70 bg-card/80 p-5 shadow-sm transition-transform hover:-translate-y-1 hover:shadow-[0_18px_60px_rgba(0,0,0,0.65)]">
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                    <WalletCards className="h-3 w-3" />
                    Combustível & finanças
                  </div>
                  <p className="text-sm font-semibold">Despesas sob controlo, em tempo real.</p>
                  <p className="text-sm text-muted-foreground">
                    Registe abastecimentos, calcule eficiência, acompanhe despesas por veículo e gere relatórios
                    mensais ou anuais com contas bancárias integradas.
                  </p>
                </div>
                <p className="mt-4 text-xs text-muted-foreground">Relatórios financeiros e operacionais num clique.</p>
              </article>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/60 bg-background/80">
        <div className="container flex flex-col gap-4 py-6 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} Sistema de Gestão de Veículos. Todos os direitos reservados.</p>
          <p>
            Admin: número de acesso <span className="font-semibold text-foreground">912345678</span> · senha
            <span className="font-semibold text-foreground"> 123456789</span> · utilizadores registados entram como
            motoristas.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
