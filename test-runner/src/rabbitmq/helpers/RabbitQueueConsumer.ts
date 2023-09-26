import RabbitConsumer from '@rabbitmq/helpers/RabbitConsumer';

/**
 * RabbitMQ consumer for handling messages from queues.
 *
 * @extends RabbitConsumer
 */
export default class RabbitQueueConsumer extends RabbitConsumer {
  incomingQueue: string;

  private constructor(incomingQueue: string, prefetchCount: number) {
    super(incomingQueue, prefetchCount);
    this.incomingQueue = incomingQueue;
  }

  /**
   * Creates a new `RabbitQueueConsumer` instance with the specified queue and prefetch count.
   *
   * @param {string} incomingQueue - The name of the incoming queue to consume messages from.
   * @param {number} prefetchCount - The number of messages to prefetch.
   * @returns {Promise<RabbitQueueConsumer>} A promise that resolves to a new `RabbitQueueConsumer` instance.
   */
  public static create = async (
    incomingQueue: string,
    prefetchCount: number
  ): Promise<RabbitQueueConsumer> => {
    const instance = new RabbitQueueConsumer(incomingQueue, prefetchCount);

    // Set up the necessary channels if they are not set up already
    await instance.setUpChannels();

    // Create a queue and bind it to the exchange
    await instance.incomingChannel.assertQueue(incomingQueue, { durable: true });

    return instance;
  };

  /**
   * Consumes messages from the specified queue and invokes the provided message callback.
   *
   * @param {Function} messageCallback - The callback function to process incoming messages.
   * @param {Object} options - Additional options for message consumption.
   * @param {boolean} options.removeConsumerImmediately - Whether to remove the consumer immediately after processing a message.
   * @returns {Promise<string | undefined>} A promise that resolves to the consumer tag or undefined.
   */
  public consumeQueue = async (
    messageCallback: (message: string) => Promise<object>,
    { removeConsumerImmediately }: { removeConsumerImmediately?: boolean } = {}
  ): Promise<string | undefined> => this.consumeIncomingMessage(
    this.incomingQueue, messageCallback, { removeConsumerImmediately });
}
