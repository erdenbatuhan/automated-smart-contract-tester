import Logger from '@logging/Logger';

import RabbitProducer from '@rabbitmq/helpers/RabbitProducer';

export default class RabbitQueueProducer extends RabbitProducer {
  public static setUp = async (outgoingQueue: string): Promise<RabbitQueueProducer> => {
    const instance = new RabbitQueueProducer();

    await instance.setUpChannels();
    await instance.outgoingChannel.assertQueue(outgoingQueue, { autoDelete: true, durable: true });

    return instance;
  };

  public sendToQueue = async (
    outgoingQueue: string,
    content: Buffer,
    replyCallback: (message: string) => Promise<void>
  ): Promise<string> => {
    const correlationId = RabbitProducer.generateCorrelationId(); // Generate correlation ID
    const replyQueue = `reply_${outgoingQueue}`;

    // Wait for replies
    await this.waitForReply(correlationId, replyQueue, replyCallback);

    // Send the message to the queue
    this.outgoingChannel.sendToQueue(outgoingQueue, content, { correlationId, replyTo: replyQueue });
    Logger.info(`[${correlationId}] Sent a message to the queue '${outgoingQueue}' (Message = ${content.toString()}).`);

    return correlationId;
  };
}
