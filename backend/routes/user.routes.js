import express from "express";
import {
  askToAssistant,
  getCurrentUser,
  updateAssistant,
  clearHistory,
} from "../controllers/user.controllers.js";
import isAuth from "../middlewares/isAuth.js";
import upload from "../middlewares/multer.js";

const userRouter = express.Router();

userRouter.get("/current", isAuth, getCurrentUser);
userRouter.post(
  "/update",
  isAuth,
  upload.single("assistantImage"),
  updateAssistant,
);
userRouter.post("/asktoassistant", isAuth, askToAssistant);
userRouter.post("/clear-history", isAuth, clearHistory);

export default userRouter;
