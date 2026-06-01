import { Router } from "express";
import { listRooms, getMessages } from "../services/chat.service.js";

export const chatRouter = Router();

// 관리자 인박스: 방 목록 (마지막 메시지 + 미읽음 수)
chatRouter.get("/rooms", async (_req, res, next) => {
  try {
    res.json(await listRooms());
  } catch (err) {
    next(err);
  }
});

// 방 메시지 히스토리 (소켓 연결 전 초기 로드용)
chatRouter.get("/rooms/:id/messages", async (req, res, next) => {
  try {
    res.json(await getMessages(req.params.id));
  } catch (err) {
    next(err);
  }
});
