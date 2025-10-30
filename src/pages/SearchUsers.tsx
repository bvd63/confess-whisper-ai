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
        <div className="flex items-center gap-2 sm:gap-3 mb-6 sm:mb-8">
          <Search className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">{t.search_users}</h1>
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
