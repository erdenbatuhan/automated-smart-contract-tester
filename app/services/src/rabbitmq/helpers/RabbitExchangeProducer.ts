import Logger from '@Logger';

import RabbitInstance from '@rabbitmq/helpers/RabbitInstance';
import RabbitProducer from '@rabbitmq/helpers/RabbitProducer';

/**
 * RabbitMQ exchange producer for sending and receiving messages.
 *
 * @extends RabbitProducer
 */
export default class RabbitExchangeProducer extends RabbitProducer {
  outgoingExchange: string;

  constructor(outgoingExchange: string, prefetchCount: number) {
    super(outgoingExchange, prefetchCount);
    this.outgoingExchange = outgoingExchange;
  }

  /**
   * Creates a new instance of RabbitExchangeProducer and sets up necessary channels and exchange.
   *
   * @param {string} outgoingExchange - The name of the outgoing exchange.
   * @param {string} exchangeType - The type of the exchange ('direct', 'topic', 'headers', 'fanout', 'match', or custom).
   * @param {number} prefetchCount - The prefetch count for the channel.
   * @returns {Promise<RabbitExchangeProducer>} A promise that resolves to a new instance of RabbitExchangeProducer.
   */
  public static create = async (
    outgoingExchange: string,
    exchangeType: 'direct' | 'topic' | 'headers' | 'fanout' | 'match' | string,
    prefetchCount: number
  ): Promise<RabbitExchangeProducer> => {
    const instance = new RabbitExchangeProducer(outgoingExchange, prefetchCount);

    await instance.setUpChannels();
    await instance.setUpReplyQueue();
    await instance.outgoingChannel.assertExchange(outgoingExchange, exchangeType, { durable: true });

    return instance;
  };

  /**
   * Gets the number of queues bound to a specific exchange.
   *
   * @static
   * @param {string} outgoingExchange - The name of the outgoing exchange.
   * @returns {Promise<number>} A promise that resolves to the number of queues bound to the exchange.
   */
  private static getNumQueuesBoundToExchange = (outgoingExchange: string): Promise<number> => RabbitInstance.getQueues()
    .then((queues) => queues.filter((queue) => queue.arguments.exchange === outgoingExchange).length);

  /**
   * Sends a message to the outgoing exchange and waits for replies.
   *
   * @param {Buffer} content - The content of the message to send.
   * @param {function} replyCallback - The callback function to handle received replies.
   * @param {object} options - Additional options for message sending.
   * @param {boolean} options.waitForAllCustomers - Whether to wait for replies from all customers (repliers).
   * @returns {Promise<string>} A promise that resolves to the correlation ID of the sent message.
   */
  public sendExchange = async (
    content: Buffer,
    replyCallback: (message: string) => Promise<void>,
    { waitForAllCustomers }: { waitForAllCustomers?: boolean } = {}
  ): Promise<string> => {
    const correlationId = RabbitProducer.generateCorrelationId(); // Generate correlation ID

    // Get the number of queues bound to this exchange (a.k.a. the number of repliers)
    const numRepliers = waitForAllCustomers
      ? await RabbitExchangeProducer.getNumQueuesBoundToExchange(this.outgoingExchange)
      : null;

    // Wait for replies
    await this.waitForReply(correlationId, this.replyQueue, replyCallback, { waitForAllCustomers, numRepliers });

    // Send the message to the exchange
    this.outgoingChannel.publish(this.outgoingExchange, '', content, { correlationId, replyTo: this.replyQueue });
    Logger.info(`[${correlationId}] Sent a message to the exchange '${this.outgoingExchange}'.`);

    return correlationId;
  };
}
