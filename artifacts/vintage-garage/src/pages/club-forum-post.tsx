import { useState } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetForumPost,
  useCreateForumComment,
  useDeleteForumComment,
  useToggleForumPostLike,
  useDeleteForumPost,
  useUpdateForumPost,
  getGetForumPostQueryKey,
  type ForumComment,
} from "@workspace/api-client-react";
import { useClubSocket } from "@/hooks/use-club-socket";
import { LoadingState, ErrorState } from "@/components/ui-states";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
  ArrowLeft, Heart, MessageSquare, Trash2, Pin,
  Loader2, Send, Image, Video,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Params { id: string; postId: string }

const categoryLabels: Record<string, string> = {
  general: "Generelt",
  technical_help: "Teknisk hjelp",
  restoration: "Restaurering",
  meetup: "Treff",
  parts_for_sale: "Deler til salgs",
};

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
  project_update: "Prosjektoppdatering",
  maintenance: "Vedlikehold",
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
  return new Date(d).toLocaleDateString("nb-NO", { day: "numeric", month: "short", year: "numeric" });
}

export default function ClubForumPost() {
  const params = useParams<Params>();
  const clubId = parseInt(params.id, 10);
  const postId = parseInt(params.postId, 10);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const myName = localStorage.getItem("forum_member_name") ?? "";

  const [commentText, setCommentText] = useState("");

  const {
    data: post,
    isLoading,
    isError,
    refetch,
  } = useGetForumPost(clubId, postId, { memberName: myName || undefined }, {
    query: { queryKey: getGetForumPostQueryKey(clubId, postId, { memberName: myName || undefined }) },
  });

  const createCommentMutation = useCreateForumComment();
  const deleteCommentMutation = useDeleteForumComment();
  const likeMutation = useToggleForumPostLike();
  const deletePostMutation = useDeleteForumPost();
  const pinMutation = useUpdateForumPost();

  const invalidatePost = () => {
    queryClient.invalidateQueries({ queryKey: getGetForumPostQueryKey(clubId, postId, {}) });
  };

  useClubSocket(clubId, {
    new_comment: (data) => {
      const d = data as { postId: number };
      if (d.postId === postId) invalidatePost();
    },
    post_liked: (data) => {
      if (data.postId === postId) invalidatePost();
    },
    post_deleted: (data) => {
      if (data.postId === postId) navigate(`/clubs/${clubId}/forum`);
    },
  });

  async function handleComment() {
    if (!commentText.trim()) return;
    if (!myName) { toast({ title: "Angi navn for å kommentere", variant: "destructive" }); return; }
    try {
      await createCommentMutation.mutateAsync({
        clubId,
        postId,
        data: { memberName: myName, content: commentText.trim() },
      });
      setCommentText("");
      invalidatePost();
    } catch {
      toast({ title: "Feil ved kommentering", variant: "destructive" });
    }
  }

  async function handleDeleteComment(commentId: number) {
    await deleteCommentMutation.mutateAsync({ clubId, commentId });
    invalidatePost();
    toast({ title: "Kommentar slettet" });
  }

  async function handleLike() {
    if (!myName) { toast({ title: "Angi navn for å like", variant: "destructive" }); return; }
    await likeMutation.mutateAsync({ clubId, postId, data: { memberName: myName } });
    invalidatePost();
  }

  async function handlePin() {
    if (!post) return;
    await pinMutation.mutateAsync({ clubId, postId, data: { isPinned: post.isPinned ? 0 : 1 } });
    invalidatePost();
  }

  async function handleDeletePost() {
    await deletePostMutation.mutateAsync({ clubId, postId });
    navigate(`/clubs/${clubId}/forum`);
    toast({ title: "Innlegg slettet" });
  }

  if (isLoading) return <LoadingState message="Laster innlegg..." />;
  if (isError || !post) return <ErrorState onRetry={refetch} />;

  const isAuthor = myName && post.memberName.toLowerCase() === myName.toLowerCase();
  const comments = (post.comments ?? []) as ForumComment[];

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Back */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/clubs/${clubId}/forum`)}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <Link href={`/clubs/${clubId}/forum`}>
          <span className="text-sm text-muted-foreground hover:text-foreground transition-colors">Tilbake til forum</span>
        </Link>
      </div>

      {/* Post */}
      <Card className={`border-border ${post.isPinned ? "border-l-2 border-l-primary" : ""}`}>
        <CardContent className="p-6 space-y-4">
          {/* Author + meta */}
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0 text-base font-bold text-primary">
              {post.memberName[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="font-semibold">{post.memberName}</span>
                <span className="text-muted-foreground text-sm">{timeAgo(post.createdAt)}</span>
                <Badge className={`text-[11px] px-1.5 py-0 border-0 ${categoryColors[post.category] ?? ""}`}>
                  {categoryLabels[post.category] ?? post.category}
                </Badge>
                <Badge variant="secondary" className="text-[11px] px-1.5 py-0">
                  {postTypeLabels[post.postType] ?? post.postType}
                </Badge>
                {!!post.isPinned && (
                  <Badge className="text-[11px] px-1.5 py-0 bg-primary/20 text-primary border-0">
                    <Pin className="w-2.5 h-2.5 mr-1" /> Festet
                  </Badge>
                )}
              </div>
            </div>

            {/* Moderator actions */}
            <div className="flex gap-1 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handlePin}
                title={post.isPinned ? "Fjern festing" : "Fest innlegg"}
              >
                <Pin className={`w-4 h-4 ${post.isPinned ? "text-primary" : "text-muted-foreground"}`} />
              </Button>
              {isAuthor && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Slett innlegg?</AlertDialogTitle>
                      <AlertDialogDescription>Innlegget og alle kommentarer vil bli slettet.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Avbryt</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeletePost}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Slett
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>

          {/* Title */}
          {post.title && (
            <h1 className="text-2xl font-bold leading-tight">{post.title}</h1>
          )}

          {/* Content */}
          <p className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">{post.content}</p>

          {/* Image */}
          {post.imageUrl && (
            <img
              src={post.imageUrl}
              alt=""
              className="w-full rounded-lg max-h-96 object-cover border border-border"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
            />
          )}

          {/* Video */}
          {post.videoUrl && (
            <a
              href={post.videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
            >
              <Video className="w-4 h-4" />
              Se video
            </a>
          )}

          {/* Like */}
          <div className="flex items-center gap-4 pt-2 border-t border-border">
            <button
              onClick={handleLike}
              className={`flex items-center gap-2 text-sm transition-colors ${
                post.liked ? "text-red-400 hover:text-red-300" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Heart className={`w-4 h-4 ${post.liked ? "fill-current" : ""}`} />
              <span>{post.likesCount} {post.likesCount === 1 ? "like" : "likes"}</span>
            </button>
            <span className="flex items-center gap-2 text-sm text-muted-foreground">
              <MessageSquare className="w-4 h-4" />
              {comments.length} {comments.length === 1 ? "kommentar" : "kommentarer"}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Comments */}
      <div className="space-y-3">
        <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide px-1">
          Kommentarer ({comments.length})
        </h2>

        {comments.map((comment) => {
          const isCommentAuthor = myName && comment.memberName.toLowerCase() === myName.toLowerCase();
          return (
            <div key={comment.id} className="flex gap-3 group">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 text-xs font-bold text-muted-foreground mt-0.5">
                {comment.memberName[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="bg-muted/40 rounded-xl px-4 py-3">
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="font-semibold text-sm">{comment.memberName}</span>
                    <span className="text-xs text-muted-foreground">{timeAgo(comment.createdAt)}</span>
                  </div>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{comment.content}</p>
                </div>
              </div>
              {isCommentAuthor && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive self-start mt-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Slett kommentar?</AlertDialogTitle>
                      <AlertDialogDescription>Kommentaren kan ikke gjenopprettes.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Avbryt</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDeleteComment(comment.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Slett
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          );
        })}
      </div>

      {/* Comment form */}
      <div className="flex gap-3">
        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0 text-xs font-bold text-primary mt-1">
          {myName[0]?.toUpperCase() ?? "?"}
        </div>
        <div className="flex-1 space-y-2">
          <Textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder={myName ? "Skriv en kommentar..." : "Angi navn på forumssiden for å kommentere..."}
            rows={3}
            disabled={!myName}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleComment();
            }}
          />
          <div className="flex justify-end gap-2">
            <p className="text-xs text-muted-foreground self-center">Ctrl+Enter for å sende</p>
            <Button
              onClick={handleComment}
              disabled={createCommentMutation.isPending || !commentText.trim() || !myName}
              size="sm"
            >
              {createCommentMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Send
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
