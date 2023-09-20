import Logger from '@Logger';

import RabbitProducer from '@rabbitmq/helpers/RabbitProducer';

/**
 * RabbitMQ queue producer for sending and receiving messages.
 *
 * @extends RabbitProducer
 */
export default class RabbitQueueProducer extends RabbitProducer {
  outgoingQueue: string;

  constructor(outgoingQueue: string, prefetchCount: number) {
    super(outgoingQueue, prefetchCount);
    this.outgoingQueue = outgoingQueue;
  }

  /**
   * Creates a new instance of RabbitQueueProducer and sets up necessary channels and queues.
   *
   * @param {string} outgoingQueue - The name of the outgoing queue.
   * @param {number} prefetchCount - The prefetch count for the channel.
   * @returns {Promise<RabbitQueueProducer>} A promise that resolves to a new instance of RabbitQueueProducer.
   */
  public static create = async (outgoingQueue: string, prefetchCount: number): Promise<RabbitQueueProducer> => {
    const instance = new RabbitQueueProducer(outgoingQueue, prefetchCount);

    await instance.setUpChannels();
    await instance.setUpReplyQueue();
    await instance.outgoingChannel.assertQueue(outgoingQueue, { durable: true });

    return instance;
  };

  /**
   * Sends a message to the outgoing queue and waits for replies.
   *
   * @param {Buffer} content - The content of the message to send.
   * @param {function} replyCallback - The callback function to handle received replies.
   * @returns {Promise<number>} A promise that resolves to the number of messages in the outgoing queue after sending the message.
   */
  public sendToQueue = async (
    content: Buffer,
    replyCallback: (message: string) => Promise<void>
  ): Promise<number> => {
    const correlationId = RabbitProducer.generateCorrelationId(); // Generate correlation ID

    // Wait for replies
    await this.waitForReply(correlationId, this.replyQueue, replyCallback);

    // Send the message to the queue
    this.outgoingChannel.sendToQueue(this.outgoingQueue, content, { correlationId, replyTo: this.replyQueue });
    Logger.info(`[${correlationId}] Sent a message to the queue '${this.outgoingQueue}'.`);

    return this.outgoingChannel.checkQueue(this.outgoingQueue).then(({ messageCount }) => messageCount);
  };
}
