import type { Channel } from 'amqplib';

import Logger from '@Logger';

import RabbitConstants from '@rabbitmq/helpers/RabbitConstants';
import RabbitInstance from '@rabbitmq/helpers/RabbitInstance';

/**
 * Represents a base class for RabbitMQ producers.
 */
export default class RabbitProducer {
  protected readonly replyQueue: string;
  private readonly prefetchCount: number;
  protected outgoingChannel!: Channel;
  protected replyChannel!: Channel;
  protected consumers: Map<string, string> = new Map();

  constructor(outgoingQueueOrExchange: string, prefetchCount: number) {
    this.replyQueue = `reply_${outgoingQueueOrExchange}`;
    this.prefetchCount = prefetchCount;
  }

  /**
   * Generates a random correlation ID for messages.
   *
   * @returns {string} A random correlation ID.
   */
  protected static generateCorrelationId = (): string => Math.random().toString(36).split('.')[1];

  /**
   * Sets up the outgoing and reply channels.
   *
   * @returns {Promise<void>} A promise that resolves when the channels are set up.
   */
  protected setUpChannels = async (): Promise<void> => {
    // Establish channels if they haven't been created previously
    this.outgoingChannel = this.outgoingChannel || await RabbitInstance.createChannel(this.prefetchCount);
    this.replyChannel = this.replyChannel || await RabbitInstance.createChannel(this.prefetchCount);
  };

  /**
   * Sets up the reply queue.
   *
   * @returns {Promise<void>} A promise that resolves when the reply queue is set up.
   */
  protected setUpReplyQueue = async (): Promise<void> => {
    await this.replyChannel.assertQueue(this.replyQueue, { durable: true });
  };

  /**
   * Removes a consumer from the reply channel.
   *
   * @param {string} correlationId - The correlation ID associated with the consumer to remove.
   * @returns {Promise<void>} A promise that resolves once the consumer is removed.
   */
  private removeConsumer = async (correlationId: string): Promise<void> => {
    const consumer = this.consumers.get(correlationId);
    if (!consumer) return;

    Logger.info(`[${correlationId}] Removing the consumer.`);

    await this.replyChannel.cancel(consumer)
      .then(() => Logger.info(`[${correlationId}] Successfully removed the consumer.`))
      .catch((err) => Logger.error(`[${correlationId}] Could not remove the consumer: ${(err as Error).message}`));

    this.consumers.delete(correlationId);
  };

  /**
   * Waits for reply messages on the specified reply queue after sending a message and invokes the "replyCallback" upon receiving a reply.
   *
   * @param {string} correlationId - The correlation ID associated with the reply.
   * @param {string} replyQueue - The name of the reply queue to listen for messages.
   * @param {(message: string) => Promise<void>} replyCallback - The callback function to handle reply messages.
   * @param {object} [options] - Additional options for waiting.
   * @param {boolean} [options.waitForAllCustomers] - Whether to wait for all expected replies.
   * @param {number|null} [options.numRepliers] - The number of expected repliers, or null to ignore.
   * @returns {Promise<void>} A promise that resolves once all reply messages are processed.
   */
  protected waitForReply = async (
    correlationId: string,
    replyQueue: string,
    replyCallback: (message: string) => Promise<void>,
    { waitForAllCustomers, numRepliers = 1 }: { waitForAllCustomers?: boolean; numRepliers?: number | null; } = {}
  ): Promise<void> => {
    try {
      Logger.info(`[${correlationId}] Waiting for the reply message(s) on the queue '${replyQueue}'.`);

      // Consume messages on the reply queue
      let numMessagesReceived = 0;
      const { consumerTag } = await this.replyChannel.consume(replyQueue, (message): void => {
        // Check if the message exists; if not, return
        if (!message) return;

        // Verify if the message doesn't come from a different sender (with a different correlation ID); if not, send "nack" message and return
        if (message.properties.correlationId !== correlationId) {
          this.replyChannel.nack(message, false, true);
          return;
        }

        // If all customers are being awaited, check if all the responses have been received
        numMessagesReceived += 1;
        if (waitForAllCustomers && numMessagesReceived !== numRepliers) return;

        replyCallback(message.content.toString()).then(() => {
          Logger.info(`[${correlationId}] Consumed ${numMessagesReceived} reply message(s) on the queue '${replyQueue}'.`);
        }).catch((err: Error | unknown) => {
          Logger.error(`[${correlationId}] Could not consume reply message(s) on the queue '${replyQueue}': ${(err as Error).message}`);
        }).finally(() => {
          // Send "ack" message and remove consumer
          this.replyChannel.ack(message);
          this.removeConsumer(correlationId);
        });
      });

      // Save consumer to the map
      this.consumers.set(correlationId, consumerTag);

      // Set time-to-live for the consumer
      setTimeout(() => {
        this.removeConsumer(correlationId);
      }, RabbitConstants.CONSUMER_TTL);
    } catch (err: Error | unknown) {
      Logger.error(err);
      await this.removeConsumer(correlationId);
    }
  };
}
