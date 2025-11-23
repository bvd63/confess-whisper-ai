import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users, UserCheck, UserX, Shield, ShieldCheck, Ban } from "lucide-react";
import { useCommunityMembers, type CommunityMember } from "@/hooks/useCommunities";
import { useLanguage } from "@/contexts/LanguageContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface CommunityManagementProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  communityId: string;
  isAdmin: boolean;
  isModerator: boolean;
}

export const CommunityManagement = ({ 
  open, 
  onOpenChange, 
  communityId,
  isAdmin,
  isModerator 
}: CommunityManagementProps) => {
  const { t } = useLanguage();
  const { 
    members, 
    pendingRequests, 
    approveMember, 
    rejectMember, 
    updateMemberRole, 
    kickMember 
  } = useCommunityMembers(communityId);

  const activeMembers = (members || []).filter((m) => m.status === 'active');

  const getProfileNickname = (member: Pick<CommunityMember, 'profiles'>) =>
    member.profiles?.nickname || t.communities_anonymous;

  const getProfileInitial = (member: Pick<CommunityMember, 'profiles'>) =>
    member.profiles?.nickname?.[0]?.toUpperCase() || 'U';

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-primary text-primary-foreground';
      case 'moderator': return 'bg-secondary text-secondary-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>{t.communities_manage}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="members" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="members">
              <Users className="w-4 h-4 mr-2" />
              {t.communities_members}
            </TabsTrigger>
            <TabsTrigger value="requests">
              <UserCheck className="w-4 h-4 mr-2" />
              {t.communities_requests}
              {pendingRequests && pendingRequests.length > 0 && (
                <Badge variant="destructive" className="ml-2 h-5 px-1.5">
                  {pendingRequests.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="members" className="mt-4">
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-3">
                {activeMembers.map((member) => (
                  <div 
                    key={member.id} 
                    className="flex items-center justify-between p-3 rounded-lg border border-border bg-card"
                  >
                    <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback>
                            {getProfileInitial(member)}
                          </AvatarFallback>
                        </Avatar>
                      <div>
                        <p className="font-medium">
                          {getProfileNickname(member)}
                        </p>
                        <Badge className={getRoleColor(member.role || 'member')} variant="outline">
                          {member.role === 'admin' && <Shield className="w-3 h-3 mr-1" />}
                          {member.role === 'moderator' && <ShieldCheck className="w-3 h-3 mr-1" />}
                          {member.role || 'member'}
                        </Badge>
                      </div>
                    </div>

                    {isAdmin && member.role !== 'admin' && (
                      <div className="flex gap-2">
                        {member.role === 'member' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateMemberRole({ membershipId: member.id, newRole: 'moderator' })}
                          >
                            <ShieldCheck className="w-4 h-4 mr-1" />
                            {t.communities_promote}
                          </Button>
                        )}
                        {member.role === 'moderator' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateMemberRole({ membershipId: member.id, newRole: 'member' })}
                          >
                            <UserX className="w-4 h-4 mr-1" />
                            {t.communities_demote}
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => kickMember(member.id)}
                        >
                          <Ban className="w-4 h-4" />
                        </Button>
                      </div>
                    )}

                    {isModerator && !isAdmin && member.role === 'member' && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => kickMember(member.id)}
                      >
                        <Ban className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="requests" className="mt-4">
            <ScrollArea className="h-[400px] pr-4">
              {pendingRequests && pendingRequests.length > 0 ? (
                <div className="space-y-3">
                  {pendingRequests.map((request) => (
                    <div 
                      key={request.id} 
                      className="flex items-center justify-between p-3 rounded-lg border border-border bg-card"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback>
                            {getProfileInitial(request)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">
                            {getProfileNickname(request)}
                          </p>
                          <Badge variant="secondary">{t.communities_pending}</Badge>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => approveMember(request.id)}
                        >
                          <UserCheck className="w-4 h-4 mr-1" />
                          {t.communities_approve}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => rejectMember(request.id)}
                        >
                          <UserX className="w-4 h-4 mr-1" />
                          {t.communities_reject}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-[300px] text-center">
                  <UserCheck className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">{t.communities_no_requests}</p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
