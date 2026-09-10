import { Prisma } from "@prisma/client";
import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
  UnauthorizedException,
} from "@nestjs/common";
import { UserRepository } from "../../user/repositories/user.repository";
import { ConfigService } from "@nestjs/config";
import { RegisterDto } from "../dto/register.dto";
import { LoginDto } from "../dto/login.dto";
import { JwtService } from "@nestjs/jwt";
import { JwtPayload } from "../interfaces/jwt-payload.interface";
import * as bcrypt from "bcrypt";
import * as crypto from "node:crypto";
import { DEFAULT_CATEGORIES } from "../../../common/constants/default-categories";
import { PrismaService } from "../../../prisma/prisma.service";
import { SyncGuestDto } from "../dto/sync-guest.dto";
import { StorageService } from "../../../common/storage/storage.service";

const REFRESH_SESSION_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
const REFRESH_SESSION_CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000;
const REFRESH_SESSION_ROTATION_GRACE_PERIOD_MS = 30 * 1000;

@Injectable()
export class AuthService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(AuthService.name);
  private refreshSessionCleanupTimer?: NodeJS.Timeout;

  constructor(
    private readonly userRepository: UserRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
  ) {}

  onApplicationBootstrap() {
    // Run immediately on startup once all modules/db are ready, then repeat daily
    void this.cleanupRefreshSessions();
    this.refreshSessionCleanupTimer = setInterval(
      () => void this.cleanupRefreshSessions(),
      REFRESH_SESSION_CLEANUP_INTERVAL_MS,
    );
  }

  onModuleDestroy() {
    if (this.refreshSessionCleanupTimer) {
      clearInterval(this.refreshSessionCleanupTimer);
    }
  }

  private async cleanupRefreshSessions() {
    const cutoff = new Date(Date.now() - REFRESH_SESSION_RETENTION_MS);

    try {
      const result = await this.prisma.refreshSession.deleteMany({
        where: {
          OR: [{ revokedAt: { lt: cutoff } }, { expiresAt: { lt: cutoff } }],
        },
      });

      if (result.count > 0) {
        this.logger.log(`Removed ${result.count} expired refresh sessions`);
      }
    } catch (error) {
      this.logger.error(
        "Failed to clean up refresh sessions",
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    // 1. Find user by email
    const user = await this.userRepository.findByEmail(email);
    if (!user?.password) {
      throw new UnauthorizedException("Invalid email or password");
    }

    // 2. Compare password hash
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException("Invalid email or password");
    }

    // 3. Generate JWT
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email || "",
    };
    const accessToken = await this.jwtService.signAsync(payload);

    const refreshSecret = this.configService.get<string>("jwt.refreshSecret");
    const refreshExpiresIn =
      this.configService.get<string>("jwt.refreshExpiresIn") || "7d";

    const refreshJti = crypto.randomUUID();
    const refreshToken = await this.jwtService.signAsync(
      { ...payload, jti: refreshJti },
      {
        secret: refreshSecret,
        expiresIn: refreshExpiresIn as unknown as number,
      },
    );

    await this.prisma.refreshSession.create({
      data: {
        userId: user.id,
        jti: refreshJti,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName ?? "User",
      },
    };
  }

  async register(registerDto: RegisterDto) {
    const { email, password, confirmPassword, displayName } = registerDto;

    // 1. Validate password === confirmPassword
    if (password !== confirmPassword) {
      throw new BadRequestException("Passwords do not match");
    }

    // 2. UserRepository.findByEmail()
    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser) {
      throw new ConflictException("Email already exists");
    }

    // 3. bcrypt.hash(password)
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // 4. UserRepository.create()
    const user = await this.userRepository.create({
      email,
      password: hashedPassword,
      displayName,
      categories: {
        create: DEFAULT_CATEGORIES.map((cat) => ({
          name: cat.name,
          type: cat.type,
          color: cat.color,
          icon: cat.icon,
          isSystem: false,
          displayOrder: cat.displayOrder,
        })),
      },
    });

    return user;
  }

  // ponytail: extracted sync logic into private methods to reduce cognitive complexity from 17 to below 15
  private async _syncCategories(
    tx: Prisma.TransactionClient,
    userId: string,
    categories: SyncGuestDto["categories"],
  ) {
    const categoryMap = new Map<string, string>();
    for (const cat of categories) {
      const existingSystemCategory = cat.isSystem
        ? await tx.category.findFirst({
            where: { userId, name: cat.name, type: cat.type },
          })
        : null;
      const createdCat =
        existingSystemCategory ??
        (await tx.category.create({
          data: {
            name: cat.name,
            type: cat.type,
            color: cat.color,
            icon: cat.icon,
            displayOrder: cat.displayOrder ?? 0,
            isSystem: cat.isSystem ?? false,
            deletedAt: cat.deletedAt ? new Date(cat.deletedAt) : null,
            userId,
          },
        }));
      categoryMap.set(cat.localId, createdCat.id);
    }
    return categoryMap;
  }

  private async _syncAssets(
    tx: Prisma.TransactionClient,
    userId: string,
    assets: SyncGuestDto["assets"],
  ) {
    const assetMap = new Map<string, string>();
    for (const asset of assets) {
      const createdAsset = await tx.asset.create({
        data: {
          name: asset.name,
          type: asset.type,
          balance: new Prisma.Decimal(asset.balance || 0),
          color: asset.color,
          displayOrder: asset.displayOrder ?? 0,
          isArchived: asset.isArchived ?? false,
          deletedAt: asset.deletedAt ? new Date(asset.deletedAt) : null,
          userId,
        },
      });
      assetMap.set(asset.localId, createdAsset.id);
    }
    return assetMap;
  }

  private async _syncTransactions(
    tx: Prisma.TransactionClient,
    userId: string,
    transactions: SyncGuestDto["transactions"],
    assetMap: Map<string, string>,
    categoryMap: Map<string, string>,
  ): Promise<number> {
    let syncedCount = 0;
    for (const txData of transactions) {
      const assetId = assetMap.get(txData.localAssetId);
      if (!assetId) continue;

      const toAssetId = txData.localToAssetId
        ? assetMap.get(txData.localToAssetId)
        : undefined;
      const categoryId = txData.localCategoryId
        ? categoryMap.get(txData.localCategoryId)
        : undefined;

      let finalAttachmentUrl = txData.attachmentUrl;
      if (finalAttachmentUrl?.startsWith("data:")) {
        const uploadedPath =
          await this.storageService.uploadBase64(finalAttachmentUrl);
        if (uploadedPath) {
          finalAttachmentUrl = uploadedPath;
        } else {
          finalAttachmentUrl = undefined; // Don't save raw base64 if upload fails
        }
      }

      await tx.transaction.create({
        data: {
          type: txData.type,
          amount: new Prisma.Decimal(txData.amount),
          note: txData.note,
          date: new Date(txData.date),
          userId,
          assetId,
          toAssetId,
          categoryId,
          attachmentUrl: finalAttachmentUrl,
          deletedAt: txData.deletedAt ? new Date(txData.deletedAt) : null,
        },
      });
      syncedCount++;
    }
    return syncedCount;
  }

  async syncGuest(
    userId: string,
    syncDto: SyncGuestDto,
  ): Promise<{
    success: boolean;
    syncedAssetsCount: number;
    syncedCategoriesCount: number;
    syncedTransactionsCount: number;
  }> {
    const { assets, categories, transactions } = syncDto;

    return await this.prisma.$transaction(async (tx) => {
      // 1. Sync Categories
      const categoryMap = await this._syncCategories(tx, userId, categories);

      // 2. Sync Assets
      const assetMap = await this._syncAssets(tx, userId, assets);

      // 3. Sync Transactions
      const syncedTransactionsCount = await this._syncTransactions(
        tx,
        userId,
        transactions,
        assetMap,
        categoryMap,
      );

      // 4. Update Sync Status on User model directly
      await tx.user.update({
        where: { id: userId },
        data: {
          lastSyncedAt: new Date(),
          lastSyncStatus: "SUCCESS",
        },
      });

      return {
        success: true,
        syncedAssetsCount: assetMap.size,
        syncedCategoriesCount: categoryMap.size,
        syncedTransactionsCount,
      };
    });
  }

  private async _resolveGracePeriodSession(
    session: {
      id: string;
      userId: string;
      revokedAt: Date | null;
      createdAt: Date;
    },
    payload: JwtPayload,
    refreshSecret: string,
    refreshExpiresIn: string,
  ) {
    const isWithinGracePeriod =
      session.revokedAt !== null &&
      Date.now() - session.revokedAt.getTime() <=
        REFRESH_SESSION_ROTATION_GRACE_PERIOD_MS;

    if (!isWithinGracePeriod) {
      throw new UnauthorizedException("Refresh session is invalid or revoked");
    }

    const activeSession = await this.prisma.refreshSession.findFirst({
      where: {
        userId: session.userId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
        createdAt: { gte: session.createdAt },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!activeSession) {
      throw new UnauthorizedException("Refresh session is invalid or revoked");
    }

    const user = await this.userRepository.findById(session.userId);
    if (!user) {
      throw new UnauthorizedException("User not found");
    }

    const newPayload: JwtPayload = {
      sub: session.userId,
      email: payload.email,
    };
    const accessToken = await this.jwtService.signAsync(newPayload);
    const refreshToken = await this.jwtService.signAsync(
      { ...newPayload, jti: activeSession.jti },
      {
        secret: refreshSecret,
        expiresIn: refreshExpiresIn as unknown as number,
      },
    );

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName ?? "User",
      },
    };
  }

  async refresh(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
    user: {
      id: string;
      email: string | null;
      displayName: string;
    };
  }> {
    // 1. Verify token signature and expiry
    const refreshSecret = this.configService.get<string>("jwt.refreshSecret");
    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(refreshToken, {
        secret: refreshSecret,
      });
    } catch {
      throw new UnauthorizedException("Invalid refresh token");
    }

    const userId = payload.sub;

    if (!payload.jti) {
      throw new UnauthorizedException("Invalid refresh token");
    }

    const session = await this.prisma.refreshSession.findFirst({
      where: {
        userId,
        jti: payload.jti,
      },
    });
    if (!session || session.expiresAt <= new Date()) {
      throw new UnauthorizedException("Refresh session is invalid or revoked");
    }

    const refreshExpiresIn =
      this.configService.get<string>("jwt.refreshExpiresIn") || "7d";

    if (session.revokedAt) {
      return this._resolveGracePeriodSession(
        session,
        payload,
        refreshSecret || "",
        refreshExpiresIn,
      );
    }

    // 2. Generate new Access Token and Refresh Token (rotation)
    const newPayload: JwtPayload = {
      sub: userId,
      email: payload.email,
    };

    const newAccessToken = await this.jwtService.signAsync(newPayload);
    const newRefreshJti = crypto.randomUUID();
    const newRefreshToken = await this.jwtService.signAsync(
      { ...newPayload, jti: newRefreshJti },
      {
        secret: refreshSecret,
        expiresIn: refreshExpiresIn as unknown as number,
      },
    );

    // 3. Get user object
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedException("User not found");
    }

    await this.prisma.$transaction([
      this.prisma.refreshSession.update({
        where: { id: session.id },
        data: { revokedAt: new Date() },
      }),
      this.prisma.refreshSession.create({
        data: {
          userId,
          jti: newRefreshJti,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      }),
    ]);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName ?? "User",
      },
    };
  }

  async logout(refreshToken?: string): Promise<void> {
    if (!refreshToken) return;

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(
        refreshToken,
        {
          secret: this.configService.get<string>("jwt.refreshSecret"),
        },
      );
      if (payload.jti) {
        await this.prisma.refreshSession.updateMany({
          where: { jti: payload.jti, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }
    } catch {
      // Clearing cookies is still safe when the refresh token is expired.
    }
  }

  async syncUser(userId: string): Promise<{
    success: boolean;
    lastSyncedAt: Date;
    lastSyncStatus: string;
    syncRevision: number;
  }> {
    const lastSyncedAt = new Date();
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        lastSyncedAt,
        lastSyncStatus: "SUCCESS",
      },
    });
    return {
      success: true,
      lastSyncedAt,
      lastSyncStatus: "SUCCESS",
      syncRevision: user.syncRevision,
    };
  }
}
