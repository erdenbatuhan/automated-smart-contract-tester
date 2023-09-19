import RabbitConsumer from '@rabbitmq/helpers/RabbitConsumer';

export default class RabbitQueueConsumer extends RabbitConsumer {
  public consumeQueue = async (
    incomingQueue: string,
    messageCallback: (message: string) => Promise<object>,
    { removeConsumerImmediately }: { removeConsumerImmediately?: boolean } = {}
  ): Promise<string | undefined> => {
    // Set up the necessary channels if they are not set up already
    await this.setUpChannels();

    // Create a queue and bind it to the exchange
    await this.incomingChannel.assertQueue(incomingQueue, { autoDelete: true, durable: true });

    // Consume incoming message
    return this.consumeIncomingMessage(incomingQueue, messageCallback, { removeConsumerImmediately });
  };
}
