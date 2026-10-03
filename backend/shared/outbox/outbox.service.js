const { pool } = require('../../config/database');
const notificationService = require('../../modules/notifications/notification.service');
const emailService = require('../email/email.service');

class OutboxService {
  /**
   * Enqueues an event within an existing database transaction client.
   */
  async enqueueEvent({ eventType, aggregateType, aggregateId, payload }, client = pool) {
    const queryText = `
      INSERT INTO outbox_events (
        event_type, aggregate_type, aggregate_id, payload, status, attempts, created_at
      )
      VALUES ($1, $2, $3, $4, 'pending', 0, NOW())
      RETURNING *;
    `;
    const res = await client.query(queryText, [
      eventType,
      aggregateType,
      aggregateId,
      JSON.stringify(payload || {}),
    ]);
    return res.rows[0];
  }

  /**
   * Processes pending outbox events. Safe to call periodically or triggered after commits.
   */
  async processPendingEvents(batchSize = 20) {
    const client = await pool.connect();
    let processedCount = 0;

    try {
      await client.query('BEGIN');
      const fetchQuery = `
        SELECT * FROM outbox_events
        WHERE status = 'pending' AND attempts < 5
        ORDER BY created_at ASC
        LIMIT $1
        FOR UPDATE SKIP LOCKED;
      `;
      const res = await client.query(fetchQuery, [batchSize]);

      for (const event of res.rows) {
        try {
          const payload = typeof event.payload === 'string' ? JSON.parse(event.payload) : event.payload;

          // Dispatch in-app notification if targeted at a user
          if (payload.userId) {
            await notificationService.createNotification({
              userId: payload.userId,
              type: event.event_type,
              title: payload.title || `Update: ${event.event_type}`,
              message: payload.message || 'You have a new organization update.',
              data: payload,
            }, client);
          }

          // Mark event as completed
          await client.query(`
            UPDATE outbox_events
            SET status = 'completed', processed_at = NOW(), attempts = attempts + 1
            WHERE id = $1;
          `, [event.id]);

          processedCount++;
        } catch (eventErr) {
          await client.query(`
            UPDATE outbox_events
            SET status = CASE WHEN attempts >= 4 THEN 'failed' ELSE 'pending' END,
                attempts = attempts + 1,
                last_error = $2
            WHERE id = $1;
          `, [event.id, eventErr.message]);
        }
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      console.warn('Outbox processing batch error:', err.message);
    } finally {
      client.release();
    }

    return { processedCount };
  }
}

module.exports = new OutboxService();
