import {ReactNode, useState} from "react";
import {Button} from "@/components/ui/button";
import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar";
import {Bell, LogOut, Menu} from "lucide-react";
import {useNavigate} from "react-router-dom";
import {AdminSidebar} from "./AdminSidebar";

interface AdminLayoutProps {
    children: ReactNode;
    title?: string;
}

export function AdminLayout({children, title}: AdminLayoutProps) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-background">
            <AdminSidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}/>

            {/* Main Content */}
            <div className="lg:pl-64">
                {/* Header */}
                <header className="bg-card border-b h-16 flex items-center justify-between px-6">
                    <div className="flex items-center space-x-4">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="lg:hidden"
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                        >
                            <Menu className="h-4 w-4"/>
                        </Button>
                        <div>
                            <h1 className="text-xl font-semibold">{title || "Dashboard"}</h1>
                            <p className="text-sm text-muted-foreground">Visão geral da frota</p>
                        </div>
                    </div>

                    <div className="flex items-center space-x-4">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate("/")}
                        >
                            <LogOut className="h-4 w-4"/>
                        </Button>
                    </div>
                </header>

                {/* Main Content */}
                <main className="p-6">
                    {children}
                </main>
            </div>
        </div>
    );
}