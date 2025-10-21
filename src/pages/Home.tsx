// ... existing code ...
const HomePage = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [communities, setCommunities] = useState<any[]>([]);
  const [selectedCommunity, setSelectedCommunity] = useState<any>(null);

  useEffect(() => {
    const fetchCommunities = async () => {
      const supabase = getSupabase();
      const { data, error } = await supabase.from("communities").select("*");
      if (error) {
        console.error("Error fetching communities:", error);
      } else {
// ... existing code ...
    fetchCommunities();
  }, []);

  const handleCommunitySelect = (community: any) => {
// ... existing code ...
