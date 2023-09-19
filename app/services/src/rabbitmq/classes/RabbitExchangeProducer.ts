import Logger from '@logging/Logger';

import RabbitInstance from '@rabbitmq/classes/RabbitInstance';
import RabbitProducer from '@rabbitmq/classes/RabbitProducer';

export default class RabbitExchangeProducer extends RabbitProducer {
  public static setUp = async (
    outgoingExchange: string,
    exchangeType: 'direct' | 'topic' | 'headers' | 'fanout' | 'match' | string
  ): Promise<RabbitExchangeProducer> => {
    const instance = new RabbitExchangeProducer();

    await instance.setUpChannels();
    await instance.outgoingChannel.assertExchange(outgoingExchange, exchangeType, { durable: false });

    return instance;
  };

  private static getNumQueuesBoundToExchange = (outgoingExchange: string): Promise<number> => RabbitInstance.getQueues()
    .then((queues) => queues.filter((queue) => queue.arguments.exchange === outgoingExchange).length);

  public sendExchange = async (
    outgoingExchange: string,
    content: Buffer,
    replyCallback: (message: string) => Promise<void>,
    { waitForAllCustomers }: { waitForAllCustomers?: boolean } = {}
  ): Promise<string> => {
    const correlationId = RabbitProducer.generateCorrelationId(); // Generate correlation ID
    const replyQueue = `reply_exchange_${outgoingExchange}`;

    // Get the number of queues bound to this exchange (a.k.a. the number of repliers)
    const numRepliers = waitForAllCustomers ? await RabbitExchangeProducer.getNumQueuesBoundToExchange(outgoingExchange) : null;

    // Wait for replies
    await this.waitForReply(correlationId, replyQueue, replyCallback, { waitForAllCustomers, numRepliers });

    // Send the message to the exchange
    this.outgoingChannel.publish(outgoingExchange, '', content, { correlationId, replyTo: replyQueue });
    Logger.info(`[${correlationId}] Sent a message to the exchange '${outgoingExchange}' (Message = ${content.toString()}).`);

    return correlationId;
  };
}
