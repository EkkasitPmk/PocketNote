import { AuthService } from "./auth.service";

describe("AuthService refresh session cleanup", () => {
  it("deletes revoked or expired sessions older than the retention window", async () => {
    const deleteMany = jest.fn().mockResolvedValue({ count: 2 });
    const service = Object.create(AuthService.prototype) as AuthService;
    Object.assign(service, {
      prisma: { refreshSession: { deleteMany } },
      logger: { log: jest.fn(), error: jest.fn() },
    });

    await (
      service as unknown as {
        cleanupRefreshSessions: () => Promise<void>;
      }
    ).cleanupRefreshSessions();

    expect(deleteMany).toHaveBeenCalledTimes(1);
    expect(deleteMany).toHaveBeenCalledWith({
      where: {
        OR: [
          { revokedAt: { lt: expect.any(Date) } },
          { expiresAt: { lt: expect.any(Date) } },
        ],
      },
    });
  });

  it("triggers cleanup on application bootstrap and sets daily timer", () => {
    jest.useFakeTimers();
    const service = Object.create(AuthService.prototype) as AuthService;
    const cleanupSpy = jest.fn();
    (
      service as unknown as { cleanupRefreshSessions: () => void }
    ).cleanupRefreshSessions = cleanupSpy;

    service.onApplicationBootstrap();

    expect(cleanupSpy).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(24 * 60 * 60 * 1000);
    expect(cleanupSpy).toHaveBeenCalledTimes(2);

    service.onModuleDestroy();
    jest.useRealTimers();
  });

  it("returns the current cloud revision after recording a sync", async () => {
    const update = jest.fn().mockResolvedValue({ syncRevision: 7 });
    const service = Object.create(AuthService.prototype) as AuthService;
    Object.assign(service, { prisma: { user: { update } } });

    await expect(
      (
        service as unknown as {
          syncUser: (userId: string) => Promise<unknown>;
        }
      ).syncUser("user-1"),
    ).resolves.toEqual({
      success: true,
      lastSyncedAt: expect.any(Date),
      lastSyncStatus: "SUCCESS",
      syncRevision: 7,
    });

    expect(update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: {
        lastSyncedAt: expect.any(Date),
        lastSyncStatus: "SUCCESS",
      },
    });
  });

  describe("refresh rotation and grace period", () => {
    const mockJwtPayload = {
      sub: "user-1",
      email: "user@example.com",
      jti: "jti-old",
    };
    const mockUser = {
      id: "user-1",
      email: "user@example.com",
      displayName: "Test User",
    };

    it("rotates refresh token normally when session is active", async () => {
      const activeSession = {
        id: "sess-1",
        userId: "user-1",
        jti: "jti-old",
        expiresAt: new Date(Date.now() + 60_000),
        revokedAt: null,
        createdAt: new Date(),
      };

      const verifyAsync = jest.fn().mockResolvedValue(mockJwtPayload);
      const signAsync = jest
        .fn()
        .mockImplementation((payload) =>
          Promise.resolve(`signed-${payload.jti || "access"}`),
        );
      const findFirst = jest.fn().mockResolvedValue(activeSession);
      const update = jest.fn().mockResolvedValue({});
      const create = jest.fn().mockResolvedValue({});
      const transaction = jest.fn().mockResolvedValue([{}, {}]);
      const findById = jest.fn().mockResolvedValue(mockUser);

      const service = Object.create(AuthService.prototype) as AuthService;
      Object.assign(service, {
        jwtService: { verifyAsync, signAsync },
        configService: { get: jest.fn().mockReturnValue("secret") },
        prisma: {
          refreshSession: { findFirst, update, create },
          $transaction: transaction,
        },
        userRepository: { findById },
      });

      const result = await service.refresh("valid-refresh-token");

      expect(result.user).toEqual(mockUser);
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(transaction).toHaveBeenCalledTimes(1);
    });

    it("returns active successor session when token was rotated within grace period", async () => {
      const recentlyRevokedSession = {
        id: "sess-1",
        userId: "user-1",
        jti: "jti-old",
        expiresAt: new Date(Date.now() + 60_000),
        revokedAt: new Date(Date.now() - 5_000), // revoked 5 seconds ago (< 30s)
        createdAt: new Date(Date.now() - 6_000),
      };

      const activeSuccessorSession = {
        id: "sess-2",
        userId: "user-1",
        jti: "jti-new",
        expiresAt: new Date(Date.now() + 60_000),
        revokedAt: null,
        createdAt: new Date(Date.now() - 5_000),
      };

      const verifyAsync = jest.fn().mockResolvedValue(mockJwtPayload);
      const signAsync = jest
        .fn()
        .mockImplementation((payload) =>
          Promise.resolve(`signed-${payload.jti || "access"}`),
        );
      const findFirst = jest
        .fn()
        .mockResolvedValueOnce(recentlyRevokedSession)
        .mockResolvedValueOnce(activeSuccessorSession);
      const findById = jest.fn().mockResolvedValue(mockUser);

      const service = Object.create(AuthService.prototype) as AuthService;
      Object.assign(service, {
        jwtService: { verifyAsync, signAsync },
        configService: { get: jest.fn().mockReturnValue("secret") },
        prisma: {
          refreshSession: { findFirst },
        },
        userRepository: { findById },
      });

      const result = await service.refresh("valid-old-token-in-grace-period");

      expect(result.user).toEqual(mockUser);
      expect(result.refreshToken).toBe("signed-jti-new");
      expect(findFirst).toHaveBeenCalledTimes(2);
    });

    it("throws UnauthorizedException when token was revoked outside grace period (> 120s)", async () => {
      const oldRevokedSession = {
        id: "sess-1",
        userId: "user-1",
        jti: "jti-old",
        expiresAt: new Date(Date.now() + 60_000),
        revokedAt: new Date(Date.now() - 130_000), // revoked 130s ago (> 120s)
        createdAt: new Date(Date.now() - 140_000),
      };

      const verifyAsync = jest.fn().mockResolvedValue(mockJwtPayload);
      const findFirst = jest.fn().mockResolvedValue(oldRevokedSession);

      const service = Object.create(AuthService.prototype) as AuthService;
      Object.assign(service, {
        jwtService: { verifyAsync },
        configService: { get: jest.fn().mockReturnValue("secret") },
        prisma: { refreshSession: { findFirst } },
      });

      await expect(
        service.refresh("expired-grace-period-token"),
      ).rejects.toThrow("Refresh session is invalid or revoked");
    });

    it("throws UnauthorizedException when revoked token has no active successor (e.g. user logged out)", async () => {
      const loggedOutSession = {
        id: "sess-1",
        userId: "user-1",
        jti: "jti-old",
        expiresAt: new Date(Date.now() + 60_000),
        revokedAt: new Date(Date.now() - 2_000),
        createdAt: new Date(Date.now() - 10_000),
      };

      const verifyAsync = jest.fn().mockResolvedValue(mockJwtPayload);
      const findFirst = jest
        .fn()
        .mockResolvedValueOnce(loggedOutSession)
        .mockResolvedValueOnce(null); // No active successor session

      const service = Object.create(AuthService.prototype) as AuthService;
      Object.assign(service, {
        jwtService: { verifyAsync },
        configService: { get: jest.fn().mockReturnValue("secret") },
        prisma: { refreshSession: { findFirst } },
      });

      await expect(service.refresh("logged-out-token")).rejects.toThrow(
        "Refresh session is invalid or revoked",
      );
    });
  });
});
