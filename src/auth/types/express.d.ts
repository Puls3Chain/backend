import { User } from '../../entities/user.entity';

declare module 'express-serve-static-core' {
  interface Request {
    user?: User & { walletAddress?: string };
    rawBody?: Buffer;
  }
}
