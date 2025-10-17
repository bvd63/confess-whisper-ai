import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Search } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { UserSearch } from "@/components/UserSearch";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useLanguage } from "@/contexts/LanguageContext";

const SearchUsers = () => {
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const { t } = useLanguage();

  useEffect(() => {
    if (!user) {
      navigate('/auth');
    }
  }, [user, navigate]);

  if (!user) return null;

  return (
    <AppLayout>
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 md:py-8 max-w-2xl">
        <div className="flex items-center gap-2 sm:gap-3 mb-6 sm:mb-8">
          <Search className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">{t.search_users}</h1>
        </div>

        <UserSearch currentUserId={user.id} />
      </div>
    </AppLayout>
  );
};

export default SearchUsers;
