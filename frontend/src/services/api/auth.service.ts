import { authService as featureAuthService } from "@/modules/auth/services/auth.service";

// Backward-compatible re-export for legacy imports during refactors/HMR.
export const authService = featureAuthService;
export default authService;