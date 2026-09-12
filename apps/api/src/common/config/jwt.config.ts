import { registerAs } from "@nestjs/config";

export default registerAs("jwt", () => ({
  secret: process.env.JWT_ACCESS_SECRET || "your-super-secret",
  expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "2h",
  refreshSecret: process.env.JWT_REFRESH_SECRET || "your-refresh-secret",
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
}));
