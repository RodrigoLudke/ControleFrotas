import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, Phone, MessageCircle } from "lucide-react";

export default function Help() {
    const handleEmailContact = () => {
        window.location.href = "mailto:suporte@controledefrotas.com.br";
    };

    const handlePhoneContact = () => {
        window.location.href = "tel:+5511999999999";
    };

    const handleWhatsAppContact = () => {
        window.open("https://wa.me/5511999999999?text=Olá, preciso de ajuda com o sistema de Controle de Frotas", "_blank");
    };

    return (
        <AdminLayout title="Ajuda">
            <div className="max-w-4xl mx-auto space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Central de Ajuda</CardTitle>
                        <CardDescription>
                            Entre em contato conosco através dos canais abaixo. Nossa equipe está pronta para ajudá-lo.
                        </CardDescription>
                    </CardHeader>
                </Card>

                <div className="grid gap-6 md:grid-cols-3">
                    <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={handleEmailContact}>
                        <CardHeader className="text-center">
                            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                                <Mail className="h-6 w-6 text-primary" />
                            </div>
                            <CardTitle className="text-lg">Email</CardTitle>
                            <CardDescription>
                                Envie-nos uma mensagem
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="text-center">
                            <Button variant="outline" className="w-full" onClick={handleEmailContact}>
                                suporte@controledefrotas.com.br
                            </Button>
                        </CardContent>
                    </Card>

                    <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={handlePhoneContact}>
                        <CardHeader className="text-center">
                            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                                <Phone className="h-6 w-6 text-primary" />
                            </div>
                            <CardTitle className="text-lg">Telefone</CardTitle>
                            <CardDescription>
                                Ligue para nossa central
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="text-center">
                            <Button variant="outline" className="w-full" onClick={handlePhoneContact}>
                                (11) 99999-9999
                            </Button>
                        </CardContent>
                    </Card>

                    <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={handleWhatsAppContact}>
                        <CardHeader className="text-center">
                            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                                <MessageCircle className="h-6 w-6 text-primary" />
                            </div>
                            <CardTitle className="text-lg">WhatsApp</CardTitle>
                            <CardDescription>
                                Fale conosco pelo WhatsApp
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="text-center">
                            <Button variant="outline" className="w-full" onClick={handleWhatsAppContact}>
                                Iniciar conversa
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Horário de Atendimento</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Segunda a Sexta:</span>
                            <span className="font-medium">08:00 - 18:00</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Sábado:</span>
                            <span className="font-medium">09:00 - 13:00</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Domingo:</span>
                            <span className="font-medium">Fechado</span>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AdminLayout>
    );
}