import { Server } from "socket.io";
import type { Server as HttpServer } from "node:http";

let io: Server | null = null;

export function initSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] },
    path: "/socket.io",
  });

  io.on("connection", (socket) => {
    socket.on("join_club", (clubId: number) => {
      socket.join(`club:${clubId}`);
    });
    socket.on("leave_club", (clubId: number) => {
      socket.leave(`club:${clubId}`);
    });
  });

  return io;
}

export function getIo(): Server {
  if (!io) throw new Error("Socket.io not initialized");
  return io;
}

export function emitToClub(clubId: number, event: string, data: unknown) {
  if (!io) return;
  io.to(`club:${clubId}`).emit(event, data);
}
