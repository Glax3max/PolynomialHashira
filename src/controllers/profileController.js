import { getOrCreateProfile, updateProfileName } from "../services/profileService.js";

export async function getProfile(req, res, next) {
  try {
    const profile = await getOrCreateProfile(req.user);
    return res.json(profile);
  } catch (err) {
    return next(err);
  }
}

export async function updateProfile(req, res, next) {
  try {
    // Ensure profile exists even if user updates first
    await getOrCreateProfile(req.user);
    const name = req.body?.name;
    await updateProfileName(req.user.user_id, name);
    return res.json({ message: "Profile updated successfully" });
  } catch (err) {
    return next(err);
  }
}

