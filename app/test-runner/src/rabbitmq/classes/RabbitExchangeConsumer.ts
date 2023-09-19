import RabbitConsumer from '@rabbitmq/classes/RabbitConsumer';

export default class RabbitExchangeConsumer extends RabbitConsumer {
  public consumeExchange = async (
    incomingExchange: string,
    messageCallback: (message: string) => Promise<object>,
    { removeConsumerImmediately }: { removeConsumerImmediately?: boolean } = {}
  ): Promise<string | undefined> => {
    // Set up the necessary channels if they are not set up already
    await this.setUpChannels();

    // Create a queue and bind it to the exchange
    const { queue: incomingExchangeQueue } = await this.incomingChannel.assertQueue('', {
      autoDelete: true, durable: false, arguments: { exchange: incomingExchange }
    });
    await this.incomingChannel.bindQueue(incomingExchangeQueue, incomingExchange, '');

    // Consume incoming message
    return this.consumeIncomingMessage(incomingExchangeQueue, messageCallback, { removeConsumerImmediately });
  };
}
