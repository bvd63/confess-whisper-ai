import { Moon, Sun, Laptop } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const ThemeToggle = () => {
  const { t } = useLanguage();
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initialTheme = savedTheme || (prefersDark ? "dark" : "light");
    
    setTheme(initialTheme);
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(initialTheme);
    if (initialTheme === "dark") {
      document.documentElement.classList.add("dark");
    }
  }, []);

  const changeTheme = (newTheme: "light" | "dark") => {
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(newTheme);
    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-all shadow-ios"
          aria-label={t.common_theme_aria}
        >
          {theme === "light" ? (
            <Moon className="w-5 h-5" />
          ) : (
            <Sun className="w-5 h-5" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem 
          onClick={() => changeTheme("light")} 
          className="cursor-pointer gap-2"
        >
          <Sun className="w-4 h-4 text-amber-500" />
          <span className="font-medium">Light</span>
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => changeTheme("dark")} 
          className="cursor-pointer gap-2"
        >
          <Moon className="w-4 h-4 text-indigo-400" />
          <span className="font-medium">Dark</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ThemeToggle;
