import type { Channel } from 'amqplib';

import Logger from '@logging/Logger';

import RabbitConstants from '@rabbitmq/classes/RabbitConstants';
import RabbitInstance from '@rabbitmq/classes/RabbitInstance';

export default class RabbitProducer {
  protected outgoingChannel!: Channel;
  protected replyChannel!: Channel;
  public consumers: Map<string, string> = new Map();

  protected static generateCorrelationId = (): string => Math.random().toString(36).split('.')[1];

  protected setUpChannels = async (): Promise<void> => {
    // Establish channels if they haven't been created previously
    this.outgoingChannel = this.outgoingChannel || await RabbitInstance.createChannel();
    this.replyChannel = this.replyChannel || await RabbitInstance.createChannel();
  };

  private removeConsumer = async (correlationId: string): Promise<void> => {
    const consumer = this.consumers.get(correlationId);
    if (!consumer) return;

    Logger.info(`[${correlationId}] Removing the consumer.`);

    await this.replyChannel.cancel(consumer)
      .then(() => Logger.info(`[${correlationId}] Successfully removed the consumer.`))
      .catch((err) => Logger.error(`[${correlationId}] Could not remove the consumer: ${(err as Error).message}`));

    this.consumers.delete(correlationId);
  };

  protected waitForReply = async (
    correlationId: string,
    replyQueue: string,
    replyCallback: (message: string) => Promise<void>,
    { waitForAllCustomers, numRepliers = 1 }: { waitForAllCustomers?: boolean; numRepliers?: number | null; } = {}
  ): Promise<void> => {
    try {
      Logger.info(`[${correlationId}] Waiting for the reply message(s) on the queue '${replyQueue}'.`);
      await this.replyChannel.assertQueue(replyQueue, { autoDelete: true, durable: false });

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
          Logger.info(`[${correlationId}] Consumed ${numMessagesReceived} reply message(s) on the queue '${replyQueue}' (Last reply = ${message.content.toString()}).`);
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
