import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  Post,
  Req,
  Response,
  UseGuards,
} from "@nestjs/common";
import * as express from "express";
import { ConfigService } from "@nestjs/config";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from "@nestjs/swagger";
import { AuthService } from "../services/auth.service";
import { RegisterDto } from "../dto/register.dto";
import { LoginDto } from "../dto/login.dto";
import { SyncGuestDto } from "../dto/sync-guest.dto";
import {
  RegisterResponseDto,
  AuthUserResponseDto,
  SyncUserResponseDto,
  MeResponseDto,
  AuthMessageResponseDto,
  AuthActionResponseDto,
} from "../dto/auth-response.dto";
import { JwtAuthGuard } from "../guards/jwt-auth.guard";
import { JwtRefreshGuard } from "../guards/jwt-refresh.guard";
import { CurrentUser } from "../decorators/current-user.decorator";
import { Throttle } from "@nestjs/throttler";
import type { User } from "@prisma/client";

type CookieSameSite = "lax" | "strict" | "none";

const ACCESS_TOKEN_MAX_AGE_MS = 2 * 60 * 60 * 1000; // 2 hours
const REFRESH_TOKEN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

@ApiTags("Auth")
@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post("register")
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({
    summary: "Register a new user account",
    description:
      "Registers a new account with email, password, and display name.",
  })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({
    status: 201,
    description: "User registered successfully.",
    type: RegisterResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: "Bad request (email already exists or validation error).",
  })
  async register(
    @Body() registerDto: RegisterDto,
  ): Promise<RegisterResponseDto> {
    const user = await this.authService.register(registerDto);
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName ?? registerDto.displayName,
      createdAt: user.createdAt,
    };
  }

  @Post("login")
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({
    summary: "Login to user account",
    description:
      "Authenticates user credentials and sets access_token and refresh_token in HTTP-only cookies.",
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: "User authenticated successfully.",
    type: AuthUserResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: "Invalid email or password.",
  })
  async login(
    @Body() loginDto: LoginDto,
    @Response({ passthrough: true }) res: express.Response,
  ): Promise<AuthUserResponseDto> {
    const { accessToken, refreshToken, user } =
      await this.authService.login(loginDto);

    const domain = this.configService.get<string | undefined>("cookie.domain");
    const secure = this.configService.get<boolean>("cookie.secure") ?? false;
    const sameSite =
      this.configService.get<CookieSameSite>("cookie.sameSite") || "lax";

    res.cookie("access_token", accessToken, {
      httpOnly: true,
      secure,
      sameSite,
      domain,
      maxAge: ACCESS_TOKEN_MAX_AGE_MS,
    });

    res.cookie("refresh_token", refreshToken, {
      httpOnly: true,
      secure,
      sameSite,
      domain,
      maxAge: REFRESH_TOKEN_MAX_AGE_MS,
    });

    return { user };
  }

  @Post("sync")
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Trigger user data sync",
    description:
      "Triggers a cloud synchronization operation for the authenticated user.",
  })
  @ApiResponse({
    status: 200,
    description: "Sync executed successfully.",
    type: SyncUserResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized access.",
  })
  async syncUser(@CurrentUser() user: User): Promise<SyncUserResponseDto> {
    return await this.authService.syncUser(user.id);
  }

  @Post("sync-guest")
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Synchronize offline guest data",
    description:
      "Merges offline guest assets, categories, and transactions into the authenticated user account.",
  })
  @ApiBody({ type: SyncGuestDto })
  @ApiResponse({
    status: 200,
    description: "Guest data synchronized successfully.",
    type: AuthActionResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized access.",
  })
  async syncGuest(
    @CurrentUser() user: User,
    @Body() syncDto: SyncGuestDto,
  ): Promise<AuthActionResponseDto> {
    return this.authService.syncGuest(user.id, syncDto);
  }

  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtRefreshGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Refresh access token",
    description:
      "Uses the valid refresh_token cookie to issue new access_token and refresh_token cookies.",
  })
  @ApiResponse({
    status: 200,
    description: "Token refreshed successfully.",
    type: AuthUserResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: "Invalid or expired refresh token.",
  })
  async refresh(
    @Req() req: express.Request,
    @Response({ passthrough: true }) res: express.Response,
  ): Promise<AuthUserResponseDto> {
    const userPayload = req.user;
    const refreshToken =
      userPayload && "refreshToken" in userPayload
        ? userPayload.refreshToken
        : undefined;
    if (typeof refreshToken !== "string") {
      throw new UnauthorizedException("Invalid refresh token");
    }

    const {
      accessToken,
      refreshToken: newRefreshToken,
      user,
    } = await this.authService.refresh(refreshToken);

    const domain = this.configService.get<string | undefined>("cookie.domain");
    const secure = this.configService.get<boolean>("cookie.secure") ?? false;
    const sameSite =
      this.configService.get<CookieSameSite>("cookie.sameSite") || "lax";

    res.cookie("access_token", accessToken, {
      httpOnly: true,
      secure,
      sameSite,
      domain,
      maxAge: ACCESS_TOKEN_MAX_AGE_MS,
    });

    res.cookie("refresh_token", newRefreshToken, {
      httpOnly: true,
      secure,
      sameSite,
      domain,
      maxAge: REFRESH_TOKEN_MAX_AGE_MS,
    });

    return { user };
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Get current authenticated user profile",
    description:
      "Retrieves current logged-in user profile, language preferences, and sync status.",
  })
  @ApiResponse({
    status: 200,
    description: "User profile retrieved successfully.",
    type: MeResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized access.",
  })
  getMe(@CurrentUser() user: User): MeResponseDto {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName ?? "User",
      avatarUrl: user.avatarUrl,
      language: user.language,
      lastSyncedAt: user.lastSyncedAt,
      lastSyncStatus: user.lastSyncStatus,
      syncRevision: user.syncRevision,
    };
  }

  @Post("logout")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Logout user",
    description: "Clears access_token and refresh_token HTTP-only cookies.",
  })
  @ApiResponse({
    status: 200,
    description: "User logged out successfully.",
    type: AuthMessageResponseDto,
  })
  async logout(
    @Req() req: express.Request,
    @Response({ passthrough: true }) res: express.Response,
  ): Promise<AuthMessageResponseDto> {
    const cookies = req.cookies as Record<string, unknown> | undefined;
    await this.authService.logout(
      typeof cookies?.refresh_token === "string"
        ? cookies.refresh_token
        : undefined,
    );

    const domain = this.configService.get<string | undefined>("cookie.domain");
    const secure = this.configService.get<boolean>("cookie.secure") ?? false;
    const sameSite =
      this.configService.get<CookieSameSite>("cookie.sameSite") || "lax";

    res.clearCookie("access_token", {
      httpOnly: true,
      secure,
      sameSite,
      domain,
    });

    res.clearCookie("refresh_token", {
      httpOnly: true,
      secure,
      sameSite,
      domain,
    });

    return { message: "Logged out successfully" };
  }
}
