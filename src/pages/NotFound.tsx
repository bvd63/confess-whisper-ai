import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { EnhancedButton } from "@/components/EnhancedButton";
import { AnimatedCard } from "@/components/AnimatedCard";
import { GradientText } from "@/components/GradientText";

import { HomeIcon } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  const { t } = useLanguage();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-mesh p-4">
      <AnimatedCard hover="glow" glass className="text-center p-4 sm:p-6 max-w-md">
        <h1 className="mb-3 sm:mb-4 text-5xl sm:text-6xl font-bold">
          <GradientText variant="hero">{t.notfound_404}</GradientText>
        </h1>
        <p className="mb-6 sm:mb-8 text-lg sm:text-xl text-muted-foreground">
          {t.notfound_title}
        </p>
        <EnhancedButton asChild lift>
          <Link to="/" className="inline-flex items-center gap-2 text-sm">
            <HomeIcon className="w-4 h-4" />
            {t.notfound_return_home}
          </Link>
        </EnhancedButton>
      </AnimatedCard>
    </div>
  );
};

export default NotFound;
