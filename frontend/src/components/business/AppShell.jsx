import React from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TrendingUp, LogOut, Settings, FileSpreadsheet } from "lucide-react";

const initials = (name) =>
  (name || "")
    .split(" ")
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || "U";

const AppShell = ({ children, action }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-mint-glow">
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-emerald-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-emerald-600 grid place-items-center text-white">
              <TrendingUp className="h-5 w-5" strokeWidth={2.4} />
            </div>
            <div className="leading-none">
              <p className="font-display font-bold text-lg text-charcoal">Econo Smart</p>
              <p className="text-[10px] uppercase tracking-wider text-emerald-700/70">PyME Insights</p>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            {action}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button data-testid="user-menu-trigger" className="flex items-center gap-2 rounded-full pr-2 hover:bg-emerald-50 transition-colors p-1">
                  <Avatar className="h-9 w-9 ring-2 ring-emerald-100">
                    <AvatarImage src={user?.picture} alt={user?.name} />
                    <AvatarFallback className="bg-emerald-100 text-emerald-800 font-display font-semibold">
                      {initials(user?.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:block text-sm font-medium text-charcoal max-w-[140px] truncate">
                    {user?.name || user?.email}
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-display">
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold">{user?.name}</span>
                    <span className="text-xs text-charcoal/50 truncate">{user?.email}</span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/onboarding")} data-testid="menu-edit-business">
                  <FileSpreadsheet className="h-4 w-4 mr-2" /> Editar mi negocio
                </DropdownMenuItem>
                <DropdownMenuItem disabled>
                  <Settings className="h-4 w-4 mr-2" /> Preferencias
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} data-testid="menu-logout" className="text-destructive focus:text-destructive">
                  <LogOut className="h-4 w-4 mr-2" /> Cerrar sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>

      <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center text-xs text-charcoal/50">
        © {new Date().getFullYear()} Econo Smart · Inteligencia financiera para PyMEs
      </footer>
    </div>
  );
};

export default AppShell;
