import { UnauthorizedException } from "@nestjs/common";
import { UserStatus } from "@finos/database";
import { AuthService } from "./auth.service";

describe("AuthService hardening", () => {
  it("rejects pending verification login", async () => {
    const service = new AuthService(
      { user: { findUnique: jest.fn().mockResolvedValue({ id: "user_1", email: "a@b.com", passwordHash: "hash", status: UserStatus.PENDING_VERIFICATION }) } } as never,
      {} as never,
      {} as never
    );
    jest.spyOn(require("argon2"), "verify").mockResolvedValueOnce(true);

    await expect(service.login({ email: "a@b.com", password: "password" })).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("atomically consumes refresh tokens once", async () => {
    const service = new AuthService(
      {
        refreshToken: {
          findUnique: jest.fn().mockResolvedValue({ id: "refresh_1", revokedAt: null, expiresAt: new Date(Date.now() + 1000), user: { id: "user_1", email: "a@b.com" } }),
          updateMany: jest.fn().mockResolvedValue({ count: 0 })
        }
      } as never,
      {} as never,
      {} as never
    );

    await expect(service.refresh("token")).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
