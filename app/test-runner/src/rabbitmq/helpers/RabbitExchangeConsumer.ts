import RabbitConsumer from '@rabbitmq/helpers/RabbitConsumer';

export default class RabbitExchangeConsumer extends RabbitConsumer {
  public consumeExchange = async (
    incomingExchange: string,
    exchangeType: 'direct' | 'topic' | 'headers' | 'fanout' | 'match' | string,
    messageCallback: (message: string) => Promise<object>,
    { removeConsumerImmediately }: { removeConsumerImmediately?: boolean } = {}
  ): Promise<string | undefined> => {
    // Set up the necessary channels if they are not set up already
    await this.setUpChannels();

    // Create an empty queue
    const { queue: incomingExchangeQueue } = await this.incomingChannel.assertQueue('', {
      exclusive: true, autoDelete: true, durable: false, arguments: { exchange: incomingExchange }
    });

    // Bind the queue to the exchange
    await this.incomingChannel.assertExchange(incomingExchange, exchangeType, { durable: true });
    await this.incomingChannel.bindQueue(incomingExchangeQueue, incomingExchange, '');

    // Consume incoming message
    return this.consumeIncomingMessage(incomingExchangeQueue, messageCallback, { removeConsumerImmediately });
  };
}
