import { z } from "zod";

export const registerSchema = z.object({
  username: z.string().trim().min(3, "Name must be at least 3 characters long"),
  email: z.string().trim().toLowerCase().email("Invalid Email"),
  password: z.string().min(8, "Password must be at least 8 characters long"),
});

export const resendVerificationSchema = z.object({
  email: z.string().email("Invalid Email"),
});
export const loginSchema = z.object({
  email: z.string().email("Invalid Email"),
  password: z.string().min(8, "Password must be atleast 8 character long"),
  force: z.boolean().optional(),
});

export const verifyOtpSchema = z.object({
  email: z.string().email("Invalid email"),
  otp: z
    .string()
    .length(6, "OTP must be 6 digits")
    .regex(/^\d+$/, "OTP must contain only numbers"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid Email"),
});

export const resendOtpSchema = z.object({
  email: z.string().email("Invalid Email"),
});

export const changePasswordSchema = z
  .object({
    resetToken: z.string().min(1, "Reset token is required"),

    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters long"),

    confirmNewPassword: z
      .string()
      .min(1, "Please confirm your password"),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "Passwords do not match",
    path: ["confirmNewPassword"],
  });