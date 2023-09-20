import type { Channel, ConsumeMessage } from 'amqplib';

import Logger from '@Logger';

import RabbitInstance from '@rabbitmq/helpers/RabbitInstance';
import { Error } from 'mongoose';

/**
 * A class for consuming messages from RabbitMQ queues and processing them.
 */
export default class RabbitConsumer {
  protected readonly incomingExchangeOrQueue: string;
  private readonly prefetchCount: number;
  protected incomingChannel!: Channel;
  protected outgoingChannel!: Channel;

  constructor(incomingExchangeOrQueue: string, prefetchCount: number) {
    this.incomingExchangeOrQueue = incomingExchangeOrQueue;
    this.prefetchCount = prefetchCount;
  }

  /**
   * Sets up RabbitMQ channels for incoming and outgoing messages.
   *
   * @returns {Promise<void>} A promise that resolves when the channels are set up.
   */
  protected setUpChannels = async (): Promise<void> => {
    // Establish channels if they haven't been created previously
    this.incomingChannel = this.incomingChannel || await RabbitInstance.createChannel(this.prefetchCount);
    this.outgoingChannel = this.outgoingChannel || await RabbitInstance.createChannel(this.prefetchCount);
  };

  /**
   * Removes a RabbitMQ consumer.
   *
   * Ensure you call the child class's `create` function after removing a consumer, as it may result in queue deletion.
   *
   * @param {string | undefined} consumer - The consumer tag to remove.
   * @returns {Promise<void>} A promise that resolves when the consumer is removed.
   */
  protected removeConsumer = async (consumer?: string): Promise<void> => {
    if (!consumer) return;

    Logger.info(`Removing the consumer '${consumer}'.`);

    await this.incomingChannel.cancel(consumer)
      .then(() => Logger.info(`Successfully removed the consumer '${consumer}'.`))
      .catch((err) => Logger.error(`Could not remove the consumer '${consumer}': ${(err as Error).message}`));
  };

  /**
   * Sends back a response to a RabbitMQ queue (message.properties.replyTo).
   *
   * @param {string} consumer - The consumer tag.
   * @param {ConsumeMessage} message - The incoming message to respond to.
   * @param {object} content - The content to send as a response.
   * @returns {boolean} True if the response was sent successfully; otherwise, false.
   */
  private sendBackResponse = (consumer: string, message: ConsumeMessage, content: object): boolean => {
    const { correlationId } = message.properties;
    Logger.info(`[${correlationId}] Sending back the response to the queue '${message.properties.replyTo}' as ${consumer}.`);

    return this.outgoingChannel.sendToQueue(
      message.properties.replyTo,
      Buffer.from(content.toString()),
      { correlationId }
    );
  };

  /**
   * Consumes incoming messages from a RabbitMQ queue and processes them using a callback function.
   *
   * @param {string} incomingQueue - The name of the incoming queue to consume messages from.
   * @param {Function} messageCallback - The callback function to process incoming messages.
   * @param {object} options - Additional options for message consumption.
   * @param {boolean} [options.removeConsumerImmediately=false] - Whether to remove the consumer immediately after processing.
   * @returns {Promise<string | undefined>} A promise that resolves to the consumer tag or undefined.
   */
  protected consumeIncomingMessage = async (
    incomingQueue: string,
    messageCallback: (message: string) => Promise<object>,
    { removeConsumerImmediately }: { removeConsumerImmediately?: boolean } = {}
  ): Promise<string | undefined> => {
    const { consumerTag } = await this.incomingChannel.consume(incomingQueue, (message) => {
      const correlationId = message?.properties.correlationId;
      Logger.info(`[${correlationId}] Consuming an incoming message on the queue '${incomingQueue}'.`);

      // Check if the message exists; if not, return
      if (!message) return;

      // Call the message callback, and then send back the response
      messageCallback(message.content.toString()).then((response) => {
        Logger.info(`[${correlationId}] Consumed an incoming message on the queue '${incomingQueue}'.`);
        this.sendBackResponse(consumerTag!, message, Buffer.from(JSON.stringify(response)));
      }).catch((err: Error | unknown) => {
        Logger.info(`[${correlationId}] Could not consume an incoming message on the queue '${incomingQueue}': ${(err as Error).message}`);
      }).finally(() => {
        // Send an "ack" message and remove the consumer if requested
        this.incomingChannel.ack(message);
        if (removeConsumerImmediately) this.removeConsumer(consumerTag!);
      });
    });

    return consumerTag;
  };
}
