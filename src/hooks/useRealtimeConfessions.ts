// ... existing code ...
export const useRealtimeConfessions = (communityId: number, addConfession: (confession: any) => void) => {
  useEffect(() => {
    if (!communityId) return;

    const supabase = getSupabase();
    const channel = supabase.channel(`realtime-confessions:${communityId}`);

    channel
      .on(
// ... existing code ...
    return () => {
      supabase.removeChannel(channel);
    };
  }, [communityId, addConfession]);
};
