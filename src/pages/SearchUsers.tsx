import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { UserSearch } from "@/components/UserSearch";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useLanguage } from "@/contexts/LanguageContext";
import { InstagramBottomNav } from "@/components/InstagramBottomNav";
import { UnifiedShopDialog } from "@/components/UnifiedShopDialog";

const SearchUsers = () => {
  const navigate = useNavigate();
  const { user, isLoading } = useCurrentUser();
  const { t } = useLanguage();
  const [manageSubDialogOpen, setManageSubDialogOpen] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      navigate('/auth');
    }
  }, [user, isLoading, navigate]);

  if (isLoading) return null;
  if (!user) return null;

  return (
    <>
    <AppLayout onManageSubscription={() => setManageSubDialogOpen(true)}>
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 md:py-8 max-w-2xl pb-24">
        <div className="flex items-center gap-1.5 sm:gap-2 mb-4 sm:mb-6">
          <Search className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 text-primary" />
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">{t.search_users}</h1>
        </div>

        <UserSearch currentUserId={user.id} />
      </div>
      
      <InstagramBottomNav />
    </AppLayout>
    <UnifiedShopDialog open={manageSubDialogOpen} onOpenChange={setManageSubDialogOpen} />
    </>
  );
};

export default SearchUsers;
