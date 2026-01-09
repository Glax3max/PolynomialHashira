import type { NextFunction, Request, Response } from "express";
import { getOrCreateProfile, updateProfileName } from "../services/profileService.js";

export async function getProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const profile = await getOrCreateProfile(req.user!);
    return res.json(profile);
  } catch (err) {
    return next(err);
  }
}

export async function updateProfile(req: Request, res: Response, next: NextFunction) {
  try {
    // Ensure profile exists even if user updates first
    await getOrCreateProfile(req.user!);
    const name = (req.body as Record<string, unknown>)?.name;
    await updateProfileName(req.user!.user_id, name);
    return res.json({ message: "Profile updated successfully" });
  } catch (err) {
    return next(err);
  }
}

