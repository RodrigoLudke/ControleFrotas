import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
    LayoutDashboard,
    Users,
    Car,
    UserPlus,
    CarFront,
    Settings,
    LogOut,
    Truck,
    MapPin,
    Fuel,
    Shield
} from "lucide-react";

interface AdminSidebarProps {
    sidebarOpen: boolean;
    setSidebarOpen: (open: boolean) => void;
}

export function AdminSidebar({ sidebarOpen, setSidebarOpen }: AdminSidebarProps) {
    const navigate = useNavigate();
    const location = useLocation();

    return (
        <>
            <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-card border-r transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
                <div className="flex h-16 items-center border-b px-6">
                    <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
                            <Truck className="h-4 w-4 text-primary-foreground" />
                        </div>
                        <span className="font-semibold">Controle Frotas</span>
                    </div>
                </div>

                <nav className="p-6 space-y-2">
                    <Button
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={() => navigate("/dashboard")}
                        data-active={location.pathname === "/dashboard"}
                    >
                        <LayoutDashboard className="mr-2 h-4 w-4" />
                        Dashboard
                    </Button>
                    <Button
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={() => navigate("/drivers")}
                        data-active={location.pathname === "/drivers"}
                    >
                        <Users className="mr-2 h-4 w-4" />
                        Motoristas
                    </Button>
                    <Button
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={() => navigate("/vehicles")}
                        data-active={location.pathname === "/vehicles"}
                    >
                        <Car className="mr-2 h-4 w-4" />
                        Veículos
                    </Button>
                    <Button
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={() => navigate("/registrarmotoristas")}
                        data-active={location.pathname === "/RegistrarMotoristas"}
                    >
                        <UserPlus className="mr-2 h-4 w-4" />
                        Cadastrar Motorista
                    </Button>
                    <Button
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={() => navigate("/registrarveiculos")}
                        data-active={location.pathname === "/RegistrarVeiculos"}
                    >
                        <CarFront className="mr-2 h-4 w-4" />
                        Cadastrar Veículo
                    </Button>
                    <Button
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={() => navigate("/settings")}
                        data-active={location.pathname === "/settings"}
                    >
                        <Settings className="mr-2 h-4 w-4" />
                        Configurações
                    </Button>
                </nav>
            </aside>

            {/* Sidebar Overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}
        </>
    );
}