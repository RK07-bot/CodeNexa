import express from "express"
import validate from "../middlewares/validate.middleware.js";
import { loginSchema,registerSchema,verifyOtpSchema,resendVerificationSchema,forgotPasswordSchema,resendOtpSchema,changePasswordSchema } from "../validators/auth.validator.js";
import { changePassword,forgotPassword,getMyProfile,loginUser,logoutUser,refreshAccessToken,registerUser,resendOtp,resendVerificationEmail,verifyOtp,verifyUser } from "../controllers/auth.controller.js";
import { isAuthenticated} from "../middlewares/auth.middleware.js"

const authRouter=express.Router();

authRouter.post("/register",validate(registerSchema),registerUser);
authRouter.get("/verify/:token",verifyUser);
authRouter.post("/resend-verification",validate(resendVerificationSchema),resendVerificationEmail);
authRouter.post("/login",validate(loginSchema),loginUser);
authRouter.post("/forgot-password",validate(forgotPasswordSchema),forgotPassword);
authRouter.post("/verify-otp",validate(verifyOtpSchema),verifyOtp);
authRouter.post("/resend-otp",validate(resendOtpSchema),resendOtp);
authRouter.post("/change-password",validate(changePasswordSchema),changePassword);
authRouter.get("/me",isAuthenticated,getMyProfile);
authRouter.post("/refresh",refreshAccessToken);
authRouter.post("/logout",isAuthenticated,logoutUser);

export default authRouter;