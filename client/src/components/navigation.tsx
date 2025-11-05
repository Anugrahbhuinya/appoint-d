
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Menu, User, LogOut } from "lucide-react";

export default function Navigation() {
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <nav className="sticky top-0 z-50 bg-card/80 backdrop-blur-md border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-4">
            <Link href="/">
              <div className="flex items-center space-x-2 cursor-pointer" data-testid="logo">
                
                <span className="text-xl font-bold text-primary" style={{ fontFamily: 'Comfortaa' }}>appoint'd</span>
              </div>
            </Link>
          </div>
          
          <div className="hidden md:flex items-center space-x-8">
            <Link href="/">
              <span className={`text-muted-foreground hover:text-foreground nav-transition cursor-pointer ${location === "/" ? "text-foreground" : ""}`}>
                Home
              </span>
            </Link>
            
            {user ? (
              <Link href={user.role === "patient" ? "/patient" : user.role === "doctor" ? "/doctor" : "/admin"}>
                <span className="text-muted-foreground hover:text-foreground nav-transition cursor-pointer">
                  {user.role === "patient" ? "Find Doctors" : "Dashboard"}
                </span>
              </Link>
            ) : (
              <Link href="/auth">
                <span className="text-muted-foreground hover:text-foreground nav-transition cursor-pointer">
                  Find Doctors
                </span>
              </Link>
            )}

            <Link href="/about">
              <span className={`text-muted-foreground hover:text-foreground nav-transition cursor-pointer ${location === "/about" ? "text-foreground" : ""}`}>
                About
              </span>
            </Link>
            <Link href="/contact">
              <span className={`text-muted-foreground hover:text-foreground nav-transition cursor-pointer ${location === "/contact" ? "text-foreground" : ""}`}>
                Contact
              </span>
            </Link>
            <Link href="/faq">
              <span className={`text-muted-foreground hover:text-foreground nav-transition cursor-pointer ${location === "/faq" ? "text-foreground" : ""}`}>
                FAQ
              </span>
            </Link>
          </div>

          <div className="flex items-center space-x-3">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" data-testid="user-menu">
                    <User className="h-4 w-4 mr-2" />
                    {user.firstName || user.username}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href={user.role === "patient" ? "/patient" : user.role === "doctor" ? "/doctor" : "/admin"}>
                      Dashboard
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} data-testid="menu-logout">
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Link href="/auth">
                  <Button variant="ghost" size="sm" data-testid="button-login">
                    <User className="h-4 w-4 mr-2" />
                    Get Started
                  </Button>
                </Link>
                
               
              </>
            )}

            {/* Mobile menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="md:hidden" data-testid="mobile-menu">
                  <Menu className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="md:hidden">
                <DropdownMenuItem asChild>
                  <Link href="/">Home</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/about">About</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/contact">Contact</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/faq">FAQ</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </nav>
  );
}
