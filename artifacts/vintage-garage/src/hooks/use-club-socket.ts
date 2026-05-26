import { useEffect, useRef, useCallback } from "react";
import { io, type Socket } from "socket.io-client";

const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

type SocketEvents = {
  new_post: (post: unknown) => void;
  post_updated: (post: unknown) => void;
  post_deleted: (data: { postId: number }) => void;
  post_liked: (data: { postId: number; likesCount: number; liked: boolean; memberName: string }) => void;
  new_comment: (data: { postId: number; comment: unknown }) => void;
};

let sharedSocket: Socket | null = null;
let refCount = 0;

function getSocket(): Socket {
  if (!sharedSocket) {
    sharedSocket = io(window.location.origin, {
      path: `${BASE_URL}/socket.io`,
      transports: ["websocket", "polling"],
    });
  }
  return sharedSocket;
}

export function useClubSocket(
  clubId: number | null,
  handlers: Partial<SocketEvents>
) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!clubId) return;

    const socket = getSocket();
    refCount++;
    socket.emit("join_club", clubId);

    const onNewPost = (data: unknown) => handlersRef.current.new_post?.(data);
    const onPostUpdated = (data: unknown) => handlersRef.current.post_updated?.(data);
    const onPostDeleted = (data: { postId: number }) => handlersRef.current.post_deleted?.(data);
    const onPostLiked = (data: { postId: number; likesCount: number; liked: boolean; memberName: string }) =>
      handlersRef.current.post_liked?.(data);
    const onNewComment = (data: { postId: number; comment: unknown }) => handlersRef.current.new_comment?.(data);

    socket.on("new_post", onNewPost);
    socket.on("post_updated", onPostUpdated);
    socket.on("post_deleted", onPostDeleted);
    socket.on("post_liked", onPostLiked);
    socket.on("new_comment", onNewComment);

    return () => {
      socket.off("new_post", onNewPost);
      socket.off("post_updated", onPostUpdated);
      socket.off("post_deleted", onPostDeleted);
      socket.off("post_liked", onPostLiked);
      socket.off("new_comment", onNewComment);
      socket.emit("leave_club", clubId);
      refCount--;
      if (refCount <= 0 && sharedSocket) {
        sharedSocket.disconnect();
        sharedSocket = null;
        refCount = 0;
      }
    };
  }, [clubId]);
}
