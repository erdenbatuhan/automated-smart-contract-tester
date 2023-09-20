import RabbitConsumer from '@rabbitmq/helpers/RabbitConsumer';

/**
 * RabbitMQ consumer for handling messages from exchanges.
 *
 * @extends RabbitConsumer
 */
export default class RabbitExchangeConsumer extends RabbitConsumer {
  incomingExchange: string;
  queueBoundToIncomingExchange?: string;

  constructor(incomingExchange: string, prefetchCount: number) {
    super(incomingExchange, prefetchCount);
    this.incomingExchange = incomingExchange;
  }

  /**
   * Creates a new `RabbitExchangeConsumer` instance with the specified exchange, prefetch count, and exchange type.
   *
   * @param {string} incomingExchange - The name of the incoming exchange to consume messages from.
   * @param {number} prefetchCount - The number of messages to prefetch.
   * @param {string} exchangeType - The type of the exchange ('direct', 'topic', 'headers', 'fanout', 'match', or a custom type).
   * @returns {Promise<RabbitExchangeConsumer>} A promise that resolves to a new `RabbitExchangeConsumer` instance.
   */
  public static create = async (
    incomingExchange: string,
    prefetchCount: number,
    exchangeType: 'direct' | 'topic' | 'headers' | 'fanout' | 'match' | string
  ): Promise<RabbitExchangeConsumer> => {
    const instance = new RabbitExchangeConsumer(incomingExchange, prefetchCount);

    // Set up the necessary channels if they are not set up already
    await instance.setUpChannels();

    // Create an empty queue
    const { queue: queueBoundToIncomingExchange } = await instance.incomingChannel.assertQueue('', {
      exclusive: true, autoDelete: true, durable: false, arguments: { exchange: incomingExchange }
    });
    instance.queueBoundToIncomingExchange = queueBoundToIncomingExchange;

    // Bind the queue to the exchange
    await instance.incomingChannel.assertExchange(incomingExchange, exchangeType, { durable: true });
    await instance.incomingChannel.bindQueue(queueBoundToIncomingExchange, incomingExchange, '');

    return instance;
  };

  /**
   * Consumes messages from the queue bound to the specified exchange and invokes the provided message callback.
   *
   * @param {Function} messageCallback - The callback function to process incoming messages.
   * @param {Object} options - Additional options for message consumption.
   * @param {boolean} options.removeConsumerImmediately - Whether to remove the consumer immediately after processing a message.
   * @returns {Promise<string | undefined>} A promise that resolves to the consumer tag or undefined.
   */
  public consumeExchange = async (
    messageCallback: (message: string) => Promise<object>,
    { removeConsumerImmediately }: { removeConsumerImmediately?: boolean } = {}
  ): Promise<string | undefined> => this.consumeIncomingMessage(
    this.queueBoundToIncomingExchange!, messageCallback, { removeConsumerImmediately });
}
