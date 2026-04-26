import React from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TrendingUp, LogOut, Settings, FileSpreadsheet, BarChart3, Boxes } from "lucide-react";

const initials = (name) =>
  (name || "")
    .split(" ")
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || "U";

const NavLink = ({ to, icon: Icon, label, active, testId }) => (
  <Link
    to={to}
    data-testid={testId}
    className={`flex items-center gap-2 px-3 h-9 rounded-lg text-sm font-display font-semibold transition-colors ${
      active
        ? "bg-emerald-50 text-emerald-800"
        : "text-charcoal/65 hover:text-emerald-800 hover:bg-emerald-50"
    }`}
  >
    <Icon className="h-4 w-4" strokeWidth={2.2} />
    <span className="hidden lg:inline">{label}</span>
  </Link>
);

const AppShell = ({ children, action }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  const isDashboard = location.pathname.startsWith("/dashboard");
  const isInventory = location.pathname.startsWith("/inventario");
  const isOnboarding = location.pathname.startsWith("/onboarding");

  return (
    <div className="min-h-screen bg-mint-glow">
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-emerald-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/dashboard" className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-emerald-600 grid place-items-center text-white">
                <TrendingUp className="h-5 w-5" strokeWidth={2.4} />
              </div>
              <div className="leading-none">
                <p className="font-display font-bold text-lg text-charcoal">Econo Smart</p>
                <p className="text-[10px] uppercase tracking-wider text-emerald-700/70">PyME Insights</p>
              </div>
            </Link>

            <nav className="hidden sm:flex items-center gap-1">
              <NavLink testId="nav-dashboard" to="/dashboard" icon={BarChart3} label="Dashboard" active={isDashboard} />
              <NavLink testId="nav-inventory" to="/inventario" icon={Boxes} label="Inventario" active={isInventory} />
              <NavLink testId="nav-business" to="/onboarding" icon={FileSpreadsheet} label="Mi negocio" active={isOnboarding} />
            </nav>
          </div>

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
                <DropdownMenuItem onClick={() => navigate("/dashboard")}>
                  <BarChart3 className="h-4 w-4 mr-2" /> Dashboard
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/inventario")}>
                  <Boxes className="h-4 w-4 mr-2" /> Inventario
                </DropdownMenuItem>
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

        {/* Mobile nav */}
        <div className="sm:hidden border-t border-emerald-50 bg-white/60">
          <nav className="max-w-7xl mx-auto px-4 h-11 flex items-center gap-1 overflow-x-auto">
            <NavLink to="/dashboard" icon={BarChart3} label="Dashboard" active={isDashboard} />
            <NavLink to="/inventario" icon={Boxes} label="Inventario" active={isInventory} />
            <NavLink to="/onboarding" icon={FileSpreadsheet} label="Mi negocio" active={isOnboarding} />
          </nav>
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
