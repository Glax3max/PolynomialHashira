import { getOrCreateProfile, updateProfileName } from "../services/profileService.js";
import type { NextFunction, Request, Response } from "express";

export async function getProfile(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.user_id) return res.status(401).json({ error: "Unauthorized" });
    const profile = await getOrCreateProfile(req.user);
    return res.json(profile);
  } catch (err) {
    return next(err);
  }
}

export async function updateProfile(req: Request, res: Response, next: NextFunction) {
  try {
    // Ensure profile exists even if user updates first
    if (!req.user?.user_id) return res.status(401).json({ error: "Unauthorized" });
    await getOrCreateProfile(req.user);
    const name = req.body?.name;
    await updateProfileName(req.user.user_id, name);
    return res.json({ message: "Profile updated successfully" });
  } catch (err) {
    return next(err);
  }
}

