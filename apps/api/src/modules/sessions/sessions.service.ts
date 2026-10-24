import { randomBytes, createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { CreateGuestRequest, UserSummary } from '@xq/shared-contracts';
import { PrismaService } from '../../prisma/prisma.service';
import { SESSION_TTL_MS } from './session-identity';

export interface CreatedGuest {
  user: UserSummary;
  rawToken: string;
}

@Injectable()
export class SessionsService {
  constructor(private readonly prisma: PrismaService) {}

  async createGuest(input: CreateGuestRequest): Promise<CreatedGuest> {
    const rawToken = randomBytes(32).toString('base64url');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
    const user = await this.prisma.$transaction(async (transaction) => {
      const createdUser = await transaction.user.create({
        data: { nickname: input.nickname, type: 'GUEST' },
      });
      await transaction.guestSession.create({
        data: { userId: createdUser.id, tokenHash, expiresAt },
      });
      return createdUser;
    });
    return {
      user: { id: user.id, nickname: user.nickname, type: 'guest' },
      rawToken,
    };
  }

  async updateNickname(userId: string, nickname: string): Promise<UserSummary> {
    const user = await this.prisma.user.update({ where: { id: userId }, data: { nickname } });
    return { id: user.id, nickname: user.nickname, type: user.type === 'GUEST' ? 'guest' : 'registered' };
  }
}
