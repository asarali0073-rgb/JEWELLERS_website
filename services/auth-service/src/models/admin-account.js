import mongoose from "mongoose";

const adminAccountSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      unique: true,
    },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, required: true, enum: ["owner"], default: "owner" },
  },
  { timestamps: true, versionKey: false },
);

export const AdminAccount =
  mongoose.models.AdminAccount ||
  mongoose.model("AdminAccount", adminAccountSchema, "admins");
