import {useState} from "react";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Button} from "@/components/ui/button";
import {Lock, Mail, Truck} from "lucide-react";
import {useNavigate} from "react-router-dom";
import {useToast} from "@/hooks/use-toast";
import {apiFetch} from "@/services/api";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [senha, setSenha] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const router = useNavigate();
    const {toast} = useToast();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");

        try {
            const response = await apiFetch("/index", {
                method: "POST",
                body: JSON.stringify({email, senha}),
            });

            const data = await response.json();

            if (response.ok && data.accessToken) {
                // Salva os tokens no localStorage
                localStorage.setItem("token", data.accessToken);
                localStorage.setItem("refreshToken", data.refreshToken);

                toast({
                    title: "Login realizado com sucesso!",
                    description: "Redirecionando para o dashboard...",
                });

                router("/dashboard");
            } else {
                setError(data.error || "Falha no login. Verifique suas credenciais.");
                toast({
                    title: "Erro no login",
                    description: data.error || "Credenciais inválidas",
                    variant: "destructive",
                });
            }
        } catch (err) {
            setError("Não foi possível conectar ao servidor.");
            toast({
                title: "Erro no servidor",
                description: "Não foi possível conectar ao backend.",
                variant: "destructive",
            });
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div
            className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Logo and Header */}
                <div className="text-center mb-8">
                    <div
                        className="inline-flex items-center justify-center w-16 h-16 bg-gradient-primary rounded-2xl mb-4 shadow-primary">
                        <Truck className="h-8 w-8 text-primary-foreground"/>
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight">Controle de Frotas</h1>
                    <p className="text-muted-foreground mt-2">Painel Administrativo</p>
                </div>

                {/* Login Card */}
                <Card className="shadow-lg border-0 bg-gradient-card">
                    <CardHeader className="space-y-1 text-center">
                        <CardTitle className="text-2xl font-semibold">Acesso ao Sistema</CardTitle>
                        <CardDescription>
                            Digite suas credenciais para acessar o painel
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleLogin} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground"/>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="seu@email.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="pl-10 h-12"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="senha">Senha</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground"/>
                                    <Input
                                        id="senha"
                                        type="password"
                                        placeholder="••••••••"
                                        value={senha}
                                        onChange={(e) => setSenha(e.target.value)}
                                        className="pl-10 h-12"
                                        required
                                    />
                                </div>
                            </div>

                            <Button
                                type="submit"
                                variant="fleet"
                                size="lg"
                                className="w-full"
                                disabled={isLoading}
                            >
                                {isLoading ? "Entrando..." : "Entrar no Sistema"}
                            </Button>
                        </form>

                        {error && (
                            <p className="text-destructive text-sm text-center mt-3">{error}</p>
                        )}

                        <div className="mt-6 text-center">
                            <p className="text-sm text-muted-foreground">
                                Esqueceu sua senha?{" "}
                                <button className="text-primary hover:underline">
                                    Recuperar acesso
                                </button>
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Footer */}
                <div className="text-center mt-8 text-sm text-muted-foreground">
                    <p>© {new Date().getFullYear()} Sistema de Controle de Frotas</p>
                </div>
            </div>
        </div>
    );
}