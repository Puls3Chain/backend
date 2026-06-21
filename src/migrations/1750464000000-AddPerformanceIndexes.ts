import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds composite indexes on the hot-path columns identified by EXPLAIN ANALYZE.
 *
 * All statements use CONCURRENTLY so they do not take a full table lock during
 * production deploys. CONCURRENTLY requires the migration to run outside a
 * transaction, which is why `transaction = false` is set below.
 *
 * IF NOT EXISTS / IF EXISTS guards make every statement idempotent, so a
 * partial failure can be re-applied safely.
 */
export class AddPerformanceIndexes1750464000000 implements MigrationInterface {
  public readonly transaction = false;

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ─── tips ──────────────────────────────────────────────────────────────

    // /tips/my/received — default sort by createdAt DESC
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tips_creator_created
        ON tips (creator_id, "createdAt" DESC)
    `);

    // /tips/my/sent — default sort by createdAt DESC
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tips_supporter_created
        ON tips (supporter_id, "createdAt" DESC)
    `);

    // /tips/wallet/:address — sender side of wallet lookup
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tips_sender_wallet
        ON tips (sender_wallet)
    `);

    // /tips/wallet/:address — receiver side of wallet lookup
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tips_receiver_wallet
        ON tips (receiver_wallet)
    `);

    // asset filter applied on top of creator scoped queries
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tips_creator_asset
        ON tips (creator_id, asset)
    `);

    // ─── users ─────────────────────────────────────────────────────────────

    // searchProfiles uses ILIKE which can leverage a LOWER() expression index
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_username_lower
        ON users (LOWER(username))
    `);

    // validateStellarUser / updateWalletAddress lookup by wallet address
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_wallet_lower
        ON users (LOWER("walletAddress"))
    `);

    // ─── notifications ─────────────────────────────────────────────────────

    // getUnreadCount (user_id, isRead=false) + getNotifications order by createdAt
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_read
        ON notifications (user_id, "isRead", "createdAt" DESC)
    `);

    // ─── refresh_tokens ────────────────────────────────────────────────────

    // refreshToken lookup + revokeUserRefreshTokens — only active tokens matter
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_refresh_tokens_user_active
        ON refresh_tokens (user_id, "isRevoked")
        WHERE "isRevoked" = false
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX CONCURRENTLY IF EXISTS idx_refresh_tokens_user_active`,
    );
    await queryRunner.query(
      `DROP INDEX CONCURRENTLY IF EXISTS idx_notifications_user_read`,
    );
    await queryRunner.query(
      `DROP INDEX CONCURRENTLY IF EXISTS idx_users_wallet_lower`,
    );
    await queryRunner.query(
      `DROP INDEX CONCURRENTLY IF EXISTS idx_users_username_lower`,
    );
    await queryRunner.query(
      `DROP INDEX CONCURRENTLY IF EXISTS idx_tips_creator_asset`,
    );
    await queryRunner.query(
      `DROP INDEX CONCURRENTLY IF EXISTS idx_tips_receiver_wallet`,
    );
    await queryRunner.query(
      `DROP INDEX CONCURRENTLY IF EXISTS idx_tips_sender_wallet`,
    );
    await queryRunner.query(
      `DROP INDEX CONCURRENTLY IF EXISTS idx_tips_supporter_created`,
    );
    await queryRunner.query(
      `DROP INDEX CONCURRENTLY IF EXISTS idx_tips_creator_created`,
    );
  }
}
