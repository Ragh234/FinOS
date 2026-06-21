import { BadRequestException, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { UserStatus } from "@finos/database";
import * as argon2 from "argon2";
import { createHash, randomBytes } from "node:crypto";
import { PrismaService } from "../../shared/prisma/prisma.service";
import { LoginDto } from "./dto/login.dto";
import { SignupDto } from "./dto/signup.dto";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService
  ) {}

  async signup(dto: SignupDto) {
    const email = dto.email.toLowerCase().trim();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new BadRequestException("Email is already registered");
    }

    const user = await this.prisma.user.create({
      data: {
        email,
        name: dto.name.trim(),
        phone: dto.phone,
        passwordHash: await argon2.hash(dto.password),
        status: UserStatus.PENDING_VERIFICATION
      },
      select: { id: true, email: true, name: true, status: true, createdAt: true }
    });

    await this.issueEmailVerificationToken(user.id);
    return { user };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase().trim() } });
    if (!user || !(await argon2.verify(user.passwordHash, dto.password))) {
      throw new UnauthorizedException("Invalid email or password");
    }
    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException("User account is not active");
    }

    return this.issueTokenPair(user.id, user.email);
  }

  async refresh(refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true }
    });

    if (!stored || stored.revokedAt || stored.expiresAt <= new Date()) {
      throw new UnauthorizedException("Invalid refresh token");
    }

    const revoked = await this.prisma.refreshToken.updateMany({
      where: { id: stored.id, revokedAt: null, expiresAt: { gt: new Date() } },
      data: { revokedAt: new Date() }
    });
    if (revoked.count !== 1) {
      throw new UnauthorizedException("Invalid refresh token");
    }

    return this.issueTokenPair(stored.user.id, stored.user.email);
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (!user) {
      return { ok: true };
    }

    const token = randomBytes(32).toString("base64url");
    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: this.hashToken(token),
        expiresAt: new Date(Date.now() + 1000 * 60 * 30)
      }
    });

    return { ok: true };
  }

  async resetPassword(token: string, password: string) {
    const stored = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash: this.hashToken(token) }
    });
    if (!stored || stored.usedAt || stored.expiresAt <= new Date()) {
      throw new BadRequestException("Invalid or expired reset token");
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: stored.userId },
        data: { passwordHash: await argon2.hash(password) }
      }),
      this.prisma.passwordResetToken.update({
        where: { id: stored.id },
        data: { usedAt: new Date() }
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId: stored.userId, revokedAt: null },
        data: { revokedAt: new Date() }
      })
    ]);

    return { ok: true };
  }

  async verifyEmail(token: string) {
    const stored = await this.prisma.emailVerificationToken.findUnique({
      where: { tokenHash: this.hashToken(token) }
    });
    if (!stored || stored.usedAt || stored.expiresAt <= new Date()) {
      throw new BadRequestException("Invalid or expired verification token");
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: stored.userId },
        data: { status: UserStatus.ACTIVE, emailVerifiedAt: new Date() }
      }),
      this.prisma.emailVerificationToken.update({
        where: { id: stored.id },
        data: { usedAt: new Date() }
      })
    ]);

    return { ok: true };
  }

  private async issueTokenPair(userId: string, email: string) {
    const accessToken = await this.jwt.signAsync(
      { userId, email, permissions: [] },
      {
        secret: this.config.get<string>("JWT_ACCESS_SECRET"),
        expiresIn: "15m"
      }
    );
    const refreshToken = randomBytes(48).toString("base64url");
    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: this.hashToken(refreshToken),
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30)
      }
    });

    return { accessToken, refreshToken, tokenType: "Bearer", expiresIn: 900 };
  }

  private async issueEmailVerificationToken(userId: string) {
    const token = randomBytes(32).toString("base64url");
    await this.prisma.emailVerificationToken.create({
      data: {
        userId,
        tokenHash: this.hashToken(token),
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24)
      }
    });
    return token;
  }

  private hashToken(token: string) {
    return createHash("sha256").update(token).digest("hex");
  }
}
