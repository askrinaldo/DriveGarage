import { useState, useMemo } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetClub,
  useListForumPosts,
  useCreateForumPost,
  useDeleteForumPost,
  useToggleForumPostLike,
  useUpdateForumPost,
  useListForumNotifications,
  useMarkNotificationsRead,
  getGetClubQueryKey,
  getListForumPostsQueryKey,
  getListForumNotificationsQueryKey,
  type ForumPost,
} from "@workspace/api-client-react";
import { useClubSocket } from "@/hooks/use-club-socket";
import { useClubAuth, type ClubRole } from "@/hooks/use-club-auth";
import { useUserAuth } from "@/hooks/use-user-auth";
import { LoadingState, ErrorState } from "@/components/ui-states";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft, MessageSquare, Heart, Plus, Pin,
  Wrench, Hammer, Calendar, Tag, MoreVertical, Trash2,
  Bell, Loader2, Image, Video, ChevronLeft, ChevronRight,
  Megaphone, HelpCircle, RefreshCw, LogIn, LogOut, Shield,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Params { id: string }

const CATEGORIES = [
  { value: "all", label: "Alle kategorier", icon: null },
  { value: "general", label: "Generelt", icon: <Megaphone className="w-3.5 h-3.5" /> },
  { value: "technical_help", label: "Teknisk hjelp", icon: <HelpCircle className="w-3.5 h-3.5" /> },
  { value: "restoration", label: "Restaurering", icon: <Hammer className="w-3.5 h-3.5" /> },
  { value: "meetup", label: "Treff", icon: <Calendar className="w-3.5 h-3.5" /> },
  { value: "parts_for_sale", label: "Deler til salgs", icon: <Tag className="w-3.5 h-3.5" /> },
];

const POST_TYPES = [
  { value: "text", label: "Tekst" },
  { value: "image", label: "Bilde" },
  { value: "video", label: "Video" },
  { value: "project_update", label: "Prosjektoppdatering" },
  { value: "maintenance", label: "Vedlikehold" },
];

const categoryColors: Record<string, string> = {
  general: "bg-slate-500/20 text-slate-300",
  technical_help: "bg-blue-500/20 text-blue-300",
  restoration: "bg-amber-500/20 text-amber-300",
  meetup: "bg-emerald-500/20 text-emerald-300",
  parts_for_sale: "bg-purple-500/20 text-purple-300",
};

const postTypeLabels: Record<string, string> = {
  text: "Tekst",
  image: "Bilde",
  video: "Video",
  project_update: "Prosjekt",
  maintenance: "Vedlikehold",
};

const postTypeIcons: Record<string, React.ReactNode> = {
  text: <MessageSquare className="w-3.5 h-3.5" />,
  image: <Image className="w-3.5 h-3.5" />,
  video: <Video className="w-3.5 h-3.5" />,
  project_update: <RefreshCw className="w-3.5 h-3.5" />,
  maintenance: <Wrench className="w-3.5 h-3.5" />,
};

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Akkurat nå";
  if (mins < 60) return `${mins} min siden`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} t siden`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days} d siden`;
  return new Date(d).toLocaleDateString("nb-NO", { day: "numeric", month: "short" });
}

const PAGE_SIZE = 20;

export default function ClubForum() {
  const params = useParams<Params>();
  const clubId = parseInt(params.id, 10);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { session, login, logout, hasRole, isAuthenticated } = useClubAuth(clubId);
  const { name: myUserName, email: myUserEmail, isAuthLoading } = useUserAuth();

  const [tempName, setTempName] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  const [activeCategory, setActiveCategory] = useState("all");
  const [page, setPage] = useState(1);

  const [newPostOpen, setNewPostOpen] = useState(false);
  const [postForm, setPostForm] = useState({
    category: "general",
    postType: "text",
    title: "",
    content: "",
    imageUrl: "",
    videoUrl: "",
  });

  const [showNotifications, setShowNotifications] = useState(false);

  const { data: club, isLoading: isClubLoading } = useGetClub(clubId, {
    query: { queryKey: getGetClubQueryKey(clubId) },
  });

  // Check if the Clerk-signed-in user is already a club member (matched by name or email).
  // When true, we skip the club-JWT login screen entirely — the backend already accepts
  // the Clerk Bearer token via the global resolveClubActorFromUser middleware.
  const clerkMembership = useMemo(() => {
    if (isAuthenticated || !club?.members) return null; // club JWT takes precedence
    const candidates = [myUserName, myUserEmail]
      .filter((c): c is string => !!c)
      .map((c) => c.toLowerCase());
    if (candidates.length === 0) return null;
    return (club.members as Array<{ memberName: string; role: string }>).find(
      (m) => candidates.includes(m.memberName.toLowerCase())
    ) ?? null;
  }, [isAuthenticated, club?.members, myUserName, myUserEmail]);

  const isClerkMember = !!clerkMembership;
  const isFullyAuthenticated = isAuthenticated || isClerkMember;

  // Effective identity — falls back to Clerk membership when no club JWT is present
  const effectiveMyName = session?.memberName ?? clerkMembership?.memberName ?? "";
  const effectiveRole = (session?.role ?? clerkMembership?.role ?? "member") as ClubRole;
  const ROLE_RANK: Record<string, number> = { owner: 4, admin: 3, moderator: 2, member: 1 };
  const effectiveHasRole = (minRole: ClubRole): boolean =>
    (session ? hasRole(minRole) : (ROLE_RANK[effectiveRole] ?? 0) >= (ROLE_RANK[minRole] ?? 0));

  const forumParams = {
    ...(activeCategory !== "all" ? { category: activeCategory } : {}),
    ...(effectiveMyName ? { memberName: effectiveMyName } : {}),
    page,
    pageSize: PAGE_SIZE,
  };

  const {
    data: forumData,
    isLoading,
    isError,
    refetch,
  } = useListForumPosts(clubId, forumParams, {
    query: {
      queryKey: getListForumPostsQueryKey(clubId, forumParams),
      enabled: isFullyAuthenticated,
    },
  });

  const { data: notifications } = useListForumNotifications(
    clubId,
    { memberName: effectiveMyName },
    {
      query: {
        queryKey: getListForumNotificationsQueryKey(clubId, { memberName: effectiveMyName }),
        enabled: isFullyAuthenticated,
      },
    }
  );

  const unreadCount = (notifications ?? []).filter((n) => !n.isRead).length;

  const createMutation = useCreateForumPost();
  const deleteMutation = useDeleteForumPost();
  const likeMutation = useToggleForumPostLike();
  const pinMutation = useUpdateForumPost();
  const markReadMutation = useMarkNotificationsRead();

  const invalidateForum = () => {
    queryClient.invalidateQueries({ queryKey: [`/api/clubs/${clubId}/forum/posts`] });
  };
  const invalidateNotif = () => {
    queryClient.invalidateQueries({ queryKey: [`/api/clubs/${clubId}/notifications`] });
  };

  useClubSocket(clubId, {
    new_post: () => invalidateForum(),
    post_updated: () => invalidateForum(),
    post_deleted: () => invalidateForum(),
    post_liked: () => invalidateForum(),
    new_comment: () => { invalidateForum(); invalidateNotif(); },
  });

  async function handleLogin() {
    const n = tempName.trim();
    if (!n) return;
    setLoggingIn(true);
    setLoginError("");
    const result = await login(n);
    setLoggingIn(false);
    if (!result.ok) {
      setLoginError(result.error);
    }
  }

  async function handleCreatePost() {
    if (!postForm.content.trim()) {
      toast({ title: "Innhold er påkrevd", variant: "destructive" });
      return;
    }
    try {
      await createMutation.mutateAsync({
        clubId,
        data: {
          memberName: effectiveMyName,
          category: postForm.category,
          postType: postForm.postType,
          title: postForm.title || undefined,
          content: postForm.content,
          imageUrl: postForm.imageUrl || undefined,
          videoUrl: postForm.videoUrl || undefined,
        },
      });
      toast({ title: "Innlegg publisert" });
      setNewPostOpen(false);
      setPostForm({ category: "general", postType: "text", title: "", content: "", imageUrl: "", videoUrl: "" });
    } catch (err: unknown) {
      const msg = (err as { data?: { message?: string } })?.data?.message;
      toast({ title: msg ?? "Noe gikk galt", variant: "destructive" });
    }
  }

  async function handleLike(post: ForumPost) {
    if (!isFullyAuthenticated) { toast({ title: "Logg inn for å like", variant: "destructive" }); return; }
    await likeMutation.mutateAsync({ clubId, postId: post.id, data: { memberName: effectiveMyName } });
    invalidateForum();
  }

  async function handleDelete(postId: number) {
    await deleteMutation.mutateAsync({ clubId, postId });
    toast({ title: "Innlegg slettet" });
    invalidateForum();
  }

  async function handlePin(post: ForumPost) {
    if (!effectiveHasRole("moderator")) { toast({ title: "Krever moderatortilgang", variant: "destructive" }); return; }
    await pinMutation.mutateAsync({ clubId, postId: post.id, data: { isPinned: post.isPinned ? 0 : 1 } });
    invalidateForum();
  }

  async function handleMarkRead() {
    await markReadMutation.mutateAsync({ clubId, data: { memberName: effectiveMyName } });
    invalidateNotif();
    setShowNotifications(false);
  }

  const posts = forumData?.posts ?? [];
  const totalPages = forumData?.totalPages ?? 1;

  // ─── Login screen ──────────────────────────────────────────────────────────
  // Show a spinner while we're still determining if the Clerk user is a member
  if (!isFullyAuthenticated && (isAuthLoading || isClubLoading)) {
    return <LoadingState message="Laster forum..." />;
  }

  if (!isFullyAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-md">
          <CardContent className="pt-8 pb-8 space-y-4">
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-3">
                <LogIn className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-xl font-bold mb-2">Logg inn i forumet</h2>
              <p className="text-muted-foreground text-sm">
                Skriv inn ditt klubbnavn for å delta i diskusjoner. Du må være registrert som klubbmedlem.
              </p>
            </div>
            <div className="space-y-3">
              <Input
                value={tempName}
                onChange={(e) => { setTempName(e.target.value); setLoginError(""); }}
                placeholder="Ditt navn i klubben..."
                onKeyDown={(e) => e.key === "Enter" && !loggingIn && handleLogin()}
                autoFocus
              />
              {loginError && (
                <p className="text-sm text-destructive">{loginError}</p>
              )}
              <Button
                className="w-full"
                onClick={handleLogin}
                disabled={!tempName.trim() || loggingIn}
              >
                {loggingIn ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <LogIn className="w-4 h-4 mr-2" />
                )}
                Logg inn
              </Button>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Ikke medlem ennå?{" "}
              <button
                className="underline hover:text-foreground"
                onClick={() => navigate(`/clubs/${clubId}`)}
              >
                Bli med i klubben
              </button>
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-0 flex gap-0">
      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col w-56 shrink-0 mr-6 space-y-1 pt-1">
        <div className="flex items-center gap-2 mb-4 px-2">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate(`/clubs/${clubId}`)}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <span className="font-semibold text-sm truncate">{club?.name}</span>
        </div>
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => { setActiveCategory(cat.value); setPage(1); }}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-left transition-colors ${
              activeCategory === cat.value
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {cat.icon}
            {cat.label}
          </button>
        ))}

        {/* Role badge in sidebar */}
        <div className="pt-4 px-2">
          <div className="text-xs text-muted-foreground/60 uppercase tracking-wide mb-1">Din rolle</div>
          <RoleBadge role={effectiveRole} />
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 min-w-0 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4 lg:hidden">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/clubs/${clubId}`)}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-xl font-bold flex-1 truncate">{club?.name} — Forum</h1>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="lg:hidden">
            <Select value={activeCategory} onValueChange={(v) => { setActiveCategory(v); setPage(1); }}>
              <SelectTrigger className="w-44 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="hidden lg:block">
            <h1 className="text-2xl font-bold">
              {CATEGORIES.find((c) => c.value === activeCategory)?.label ?? "Forum"}
            </h1>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {/* Notifications */}
            <div className="relative">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowNotifications((s) => !s)}
                className="relative"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-primary-foreground text-[10px] rounded-full flex items-center justify-center font-bold">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Button>
              {showNotifications && (
                <div className="absolute right-0 top-10 z-50 w-80 bg-popover border border-border rounded-lg shadow-xl overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                    <span className="font-medium text-sm">Varsler</span>
                    {unreadCount > 0 && (
                      <Button size="sm" variant="ghost" className="h-6 text-xs px-2" onClick={handleMarkRead}>
                        Merk alle lest
                      </Button>
                    )}
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    {(notifications ?? []).length === 0 ? (
                      <div className="py-8 text-center text-muted-foreground text-sm">Ingen varsler</div>
                    ) : (
                      (notifications ?? []).map((n) => (
                        <div
                          key={n.id}
                          className={`px-3 py-2.5 border-b border-border/50 text-sm cursor-pointer hover:bg-muted/50 ${!n.isRead ? "bg-primary/5" : ""}`}
                          onClick={() => {
                            if (n.postId) navigate(`/clubs/${clubId}/forum/${n.postId}`);
                            setShowNotifications(false);
                          }}
                        >
                          <p className="leading-snug">{n.message}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{timeAgo(n.createdAt)}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <Button onClick={() => setNewPostOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Nytt innlegg
            </Button>
          </div>
        </div>

        {/* Session info bar */}
        <div className="flex items-center gap-3 text-sm text-muted-foreground border border-border/40 rounded-lg px-3 py-2 bg-muted/20">
          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
            {effectiveMyName[0]?.toUpperCase()}
          </div>
          <span className="font-medium text-foreground">{effectiveMyName}</span>
          <RoleBadge role={effectiveRole} size="sm" />
          {session && (
            <button
              className="ml-auto flex items-center gap-1 text-xs opacity-60 hover:opacity-100 hover:text-destructive transition-colors"
              onClick={() => { logout(); }}
            >
              <LogOut className="w-3 h-3" />
              Logg ut
            </button>
          )}
        </div>

        {/* Posts */}
        {isLoading ? (
          <LoadingState message="Laster innlegg..." />
        ) : isError ? (
          <ErrorState onRetry={refetch} />
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <MessageSquare className="w-12 h-12 text-muted-foreground/30 mb-4" />
            <h3 className="font-semibold text-lg mb-2">Ingen innlegg ennå</h3>
            <p className="text-muted-foreground text-sm mb-6">Bli den første til å starte en diskusjon.</p>
            <Button onClick={() => setNewPostOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Nytt innlegg
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                myName={effectiveMyName}
                isModerator={effectiveHasRole("moderator")}
                clubId={clubId}
                onLike={() => handleLike(post)}
                onDelete={() => handleDelete(post.id)}
                onPin={() => handlePin(post)}
              />
            ))}

            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-2">
                <p className="text-sm text-muted-foreground">Side {page} av {totalPages}</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* New Post Dialog */}
      <Dialog open={newPostOpen} onOpenChange={setNewPostOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nytt innlegg</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Kategori</Label>
                <Select value={postForm.category} onValueChange={(v) => setPostForm((f) => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.filter((c) => c.value !== "all").map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={postForm.postType} onValueChange={(v) => setPostForm((f) => ({ ...f, postType: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {POST_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Tittel (valgfritt)</Label>
              <Input
                value={postForm.title}
                onChange={(e) => setPostForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Gi innlegget en tittel..."
              />
            </div>
            <div className="space-y-1.5">
              <Label>Innhold</Label>
              <Textarea
                value={postForm.content}
                onChange={(e) => setPostForm((f) => ({ ...f, content: e.target.value }))}
                placeholder="Hva vil du dele?"
                rows={4}
              />
            </div>
            {(postForm.postType === "image" || postForm.postType === "video") && (
              <div className="space-y-1.5">
                <Label>{postForm.postType === "image" ? "Bilde-URL" : "Video-URL"}</Label>
                <Input
                  value={postForm.postType === "image" ? postForm.imageUrl : postForm.videoUrl}
                  onChange={(e) =>
                    setPostForm((f) =>
                      postForm.postType === "image"
                        ? { ...f, imageUrl: e.target.value }
                        : { ...f, videoUrl: e.target.value }
                    )
                  }
                  placeholder="https://..."
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Avbryt</Button>
            </DialogClose>
            <Button onClick={handleCreatePost} disabled={createMutation.isPending || !postForm.content.trim()}>
              {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Publiser
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RoleBadge({ role, size = "default" }: { role: string; size?: "default" | "sm" }) {
  const configs: Record<string, { label: string; className: string }> = {
    owner: { label: "Eier", className: "bg-amber-500/20 text-amber-300 border-amber-500/30" },
    admin: { label: "Admin", className: "bg-blue-500/20 text-blue-300 border-blue-500/30" },
    moderator: { label: "Moderator", className: "bg-purple-500/20 text-purple-300 border-purple-500/30" },
    member: { label: "Medlem", className: "bg-slate-500/20 text-slate-400 border-slate-500/30" },
  };
  const cfg = configs[role] ?? configs["member"]!;
  return (
    <Badge
      variant="outline"
      className={`${cfg.className} ${size === "sm" ? "text-[10px] px-1 py-0" : "text-[11px] px-1.5 py-0"} flex items-center gap-1`}
    >
      {(role === "owner" || role === "admin" || role === "moderator") && (
        <Shield className={size === "sm" ? "w-2 h-2" : "w-2.5 h-2.5"} />
      )}
      {cfg.label}
    </Badge>
  );
}

function PostCard({
  post,
  myName,
  isModerator,
  clubId,
  onLike,
  onDelete,
  onPin,
}: {
  post: ForumPost;
  myName: string;
  isModerator: boolean;
  clubId: number;
  onLike: () => void;
  onDelete: () => void;
  onPin: () => void;
}) {
  const isAuthor = myName && post.memberName.toLowerCase() === myName.toLowerCase();
  const canDelete = isAuthor || isModerator;
  const canPin = isModerator;

  return (
    <Card className={`group transition-all border-border hover:border-primary/30 ${post.isPinned ? "border-l-2 border-l-primary" : ""}`}>
      <CardContent className="p-5">
        <div className="flex gap-3">
          <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center shrink-0 text-sm font-bold text-primary">
            {post.memberName[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className="font-semibold text-sm">{post.memberName}</span>
              <span className="text-muted-foreground text-xs">{timeAgo(post.createdAt)}</span>
              <Badge className={`text-[11px] px-1.5 py-0 border-0 ${categoryColors[post.category] ?? "bg-muted text-muted-foreground"}`}>
                {CATEGORIES.find((c) => c.value === post.category)?.label ?? post.category}
              </Badge>
              <Badge variant="secondary" className="text-[11px] px-1.5 py-0 flex items-center gap-1">
                {postTypeIcons[post.postType]}
                {postTypeLabels[post.postType] ?? post.postType}
              </Badge>
              {!!post.isPinned && (
                <Badge className="text-[11px] px-1.5 py-0 bg-primary/20 text-primary border-0">
                  <Pin className="w-2.5 h-2.5 mr-1" /> Festet
                </Badge>
              )}
            </div>

            {post.title && (
              <h3 className="font-bold text-base mb-1 leading-tight">{post.title}</h3>
            )}
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap line-clamp-4">{post.content}</p>

            {post.imageUrl && (
              <img
                src={post.imageUrl}
                alt=""
                className="mt-3 rounded-lg max-h-64 object-cover border border-border"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
              />
            )}

            {post.videoUrl && (
              <div className="mt-3">
                <a
                  href={post.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <Video className="w-4 h-4" />
                  Se video
                </a>
              </div>
            )}

            <div className="flex items-center gap-4 mt-4">
              <button
                onClick={onLike}
                className={`flex items-center gap-1.5 text-sm transition-colors ${
                  post.liked ? "text-red-400 hover:text-red-300" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Heart className={`w-4 h-4 ${post.liked ? "fill-current" : ""}`} />
                <span>{post.likesCount}</span>
              </button>

              <Link href={`/clubs/${clubId}/forum/${post.id}`}>
                <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                  <MessageSquare className="w-4 h-4" />
                  <span>{post.commentsCount} kommentarer</span>
                </button>
              </Link>

              {(canDelete || canPin) && (
                <div className="ml-auto">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {canPin && (
                        <DropdownMenuItem onClick={onPin}>
                          <Pin className="w-4 h-4 mr-2" />
                          {post.isPinned ? "Fjern festing" : "Fest innlegg"}
                        </DropdownMenuItem>
                      )}
                      {canDelete && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem
                              onSelect={(e) => e.preventDefault()}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Slett innlegg
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Slett innlegg?</AlertDialogTitle>
                              <AlertDialogDescription>Innlegget kan ikke gjenopprettes.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Avbryt</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={onDelete}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Slett
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
