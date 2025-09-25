import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { Save, User } from "lucide-react";

const driverSchema = z.object({
    name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres").max(100, "Nome muito longo"),
    email: z.string().email("Email inválido").max(255, "Email muito longo"),
    phone: z.string().min(10, "Telefone deve ter pelo menos 10 dígitos").max(15, "Telefone muito longo"),
    cpf: z.string().length(11, "CPF deve ter 11 dígitos"),
    rg: z.string().min(5, "RG inválido").max(20, "RG muito longo"),
    cnh: z.string().length(11, "CNH deve ter 11 dígitos"),
    cnhCategory: z.enum(["A", "B", "AB", "C", "D", "E"], {
        required_error: "Selecione uma categoria de CNH"
    }),
    address: z.string().min(10, "Endereço deve ter pelo menos 10 caracteres").max(200, "Endereço muito longo"),
    birthDate: z.string().min(1, "Data de nascimento é obrigatória"),
    hireDate: z.string().min(1, "Data de contratação é obrigatória"),
    salary: z.string().min(1, "Salário é obrigatório"),
    observations: z.string().max(500, "Observações muito longas").optional()
});

type DriverFormData = z.infer<typeof driverSchema>;

export default function RegisterDriver() {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState<Partial<DriverFormData>>({});
    const [errors, setErrors] = useState<Partial<Record<keyof DriverFormData, string>>>({});

    const validateField = (name: keyof DriverFormData, value: string) => {
        try {
            const fieldSchema = driverSchema.shape[name];
            fieldSchema.parse(value);
            setErrors(prev => ({ ...prev, [name]: undefined }));
        } catch (error) {
            if (error instanceof z.ZodError) {
                setErrors(prev => ({ ...prev, [name]: error.errors[0].message }));
            }
        }
    };

    const handleInputChange = (name: keyof DriverFormData, value: string) => {
        setFormData(prev => ({ ...prev, [name]: value }));
        validateField(name, value);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const validatedData = driverSchema.parse(formData);

            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1500));

            toast({
                title: "Motorista cadastrado com sucesso!",
                description: `${validatedData.name} foi adicionado ao sistema.`,
                variant: "default"
            });

            // Reset form
            setFormData({});
            setErrors({});

        } catch (error) {
            if (error instanceof z.ZodError) {
                const fieldErrors: Partial<Record<keyof DriverFormData, string>> = {};
                error.errors.forEach(err => {
                    if (err.path[0]) {
                        fieldErrors[err.path[0] as keyof DriverFormData] = err.message;
                    }
                });
                setErrors(fieldErrors);

                toast({
                    title: "Erro de validação",
                    description: "Por favor, corrija os campos destacados.",
                    variant: "destructive"
                });
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AdminLayout title="Cadastrar Motorista">
            <div className="mx-auto max-w-4xl">
                <Card className="shadow-form">
                    <CardHeader className="space-y-2">
                        <div className="flex items-center space-x-2">
                            <User className="h-6 w-6 text-primary" />
                            <CardTitle className="text-2xl">Cadastrar Novo Motorista</CardTitle>
                        </div>
                        <CardDescription>
                            Preencha os dados do motorista para cadastrá-lo no sistema
                        </CardDescription>
                    </CardHeader>

                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Dados Pessoais */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-medium text-foreground border-b border-border pb-2">
                                    Dados Pessoais
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="name">Nome Completo *</Label>
                                        <Input
                                            id="name"
                                            value={formData.name || ""}
                                            onChange={(e) => handleInputChange("name", e.target.value)}
                                            className={errors.name ? "border-destructive" : ""}
                                            placeholder="Digite o nome completo"
                                        />
                                        {errors.name && (
                                            <p className="text-sm text-destructive">{errors.name}</p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="email">Email *</Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            value={formData.email || ""}
                                            onChange={(e) => handleInputChange("email", e.target.value)}
                                            className={errors.email ? "border-destructive" : ""}
                                            placeholder="exemplo@email.com"
                                        />
                                        {errors.email && (
                                            <p className="text-sm text-destructive">{errors.email}</p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="phone">Telefone *</Label>
                                        <Input
                                            id="phone"
                                            value={formData.phone || ""}
                                            onChange={(e) => handleInputChange("phone", e.target.value)}
                                            className={errors.phone ? "border-destructive" : ""}
                                            placeholder="(11) 99999-9999"
                                        />
                                        {errors.phone && (
                                            <p className="text-sm text-destructive">{errors.phone}</p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="birthDate">Data de Nascimento *</Label>
                                        <Input
                                            id="birthDate"
                                            type="date"
                                            value={formData.birthDate || ""}
                                            onChange={(e) => handleInputChange("birthDate", e.target.value)}
                                            className={errors.birthDate ? "border-destructive" : ""}
                                        />
                                        {errors.birthDate && (
                                            <p className="text-sm text-destructive">{errors.birthDate}</p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="cpf">CPF *</Label>
                                        <Input
                                            id="cpf"
                                            value={formData.cpf || ""}
                                            onChange={(e) => handleInputChange("cpf", e.target.value)}
                                            className={errors.cpf ? "border-destructive" : ""}
                                            placeholder="12345678900"
                                            maxLength={11}
                                        />
                                        {errors.cpf && (
                                            <p className="text-sm text-destructive">{errors.cpf}</p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="rg">RG *</Label>
                                        <Input
                                            id="rg"
                                            value={formData.rg || ""}
                                            onChange={(e) => handleInputChange("rg", e.target.value)}
                                            className={errors.rg ? "border-destructive" : ""}
                                            placeholder="12.345.678-9"
                                        />
                                        {errors.rg && (
                                            <p className="text-sm text-destructive">{errors.rg}</p>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="address">Endereço Completo *</Label>
                                    <Textarea
                                        id="address"
                                        value={formData.address || ""}
                                        onChange={(e) => handleInputChange("address", e.target.value)}
                                        className={errors.address ? "border-destructive" : ""}
                                        placeholder="Rua, número, bairro, cidade, estado, CEP"
                                        rows={3}
                                    />
                                    {errors.address && (
                                        <p className="text-sm text-destructive">{errors.address}</p>
                                    )}
                                </div>
                            </div>

                            {/* Dados Profissionais */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-medium text-foreground border-b border-border pb-2">
                                    Dados Profissionais
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="cnh">CNH *</Label>
                                        <Input
                                            id="cnh"
                                            value={formData.cnh || ""}
                                            onChange={(e) => handleInputChange("cnh", e.target.value)}
                                            className={errors.cnh ? "border-destructive" : ""}
                                            placeholder="12345678900"
                                            maxLength={11}
                                        />
                                        {errors.cnh && (
                                            <p className="text-sm text-destructive">{errors.cnh}</p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="cnhCategory">Categoria CNH *</Label>
                                        <Select
                                            value={formData.cnhCategory || ""}
                                            onValueChange={(value) => handleInputChange("cnhCategory", value)}
                                        >
                                            <SelectTrigger className={errors.cnhCategory ? "border-destructive" : ""}>
                                                <SelectValue placeholder="Selecione a categoria" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="A">A - Motocicleta</SelectItem>
                                                <SelectItem value="B">B - Carro</SelectItem>
                                                <SelectItem value="AB">AB - Carro e Moto</SelectItem>
                                                <SelectItem value="C">C - Caminhão</SelectItem>
                                                <SelectItem value="D">D - Ônibus</SelectItem>
                                                <SelectItem value="E">E - Carreta</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        {errors.cnhCategory && (
                                            <p className="text-sm text-destructive">{errors.cnhCategory}</p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="hireDate">Data de Contratação *</Label>
                                        <Input
                                            id="hireDate"
                                            type="date"
                                            value={formData.hireDate || ""}
                                            onChange={(e) => handleInputChange("hireDate", e.target.value)}
                                            className={errors.hireDate ? "border-destructive" : ""}
                                        />
                                        {errors.hireDate && (
                                            <p className="text-sm text-destructive">{errors.hireDate}</p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="salary">Salário *</Label>
                                        <Input
                                            id="salary"
                                            type="number"
                                            step="0.01"
                                            value={formData.salary || ""}
                                            onChange={(e) => handleInputChange("salary", e.target.value)}
                                            className={errors.salary ? "border-destructive" : ""}
                                            placeholder="0,00"
                                        />
                                        {errors.salary && (
                                            <p className="text-sm text-destructive">{errors.salary}</p>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="observations">Observações</Label>
                                    <Textarea
                                        id="observations"
                                        value={formData.observations || ""}
                                        onChange={(e) => handleInputChange("observations", e.target.value)}
                                        className={errors.observations ? "border-destructive" : ""}
                                        placeholder="Informações adicionais sobre o motorista"
                                        rows={3}
                                    />
                                    {errors.observations && (
                                        <p className="text-sm text-destructive">{errors.observations}</p>
                                    )}
                                </div>
                            </div>

                            {/* Submit Button */}
                            <div className="flex justify-end space-x-4 pt-6 border-t border-border">
                                <Button type="button" variant="secondary">
                                    Cancelar
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={isLoading}
                                    className="min-w-[120px]"
                                >
                                    {isLoading ? (
                                        "Salvando..."
                                    ) : (
                                        <>
                                            <Save className="mr-2 h-4 w-4" />
                                            Cadastrar
                                        </>
                                    )}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </AdminLayout>
    );
}