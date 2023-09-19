import type { Channel, ConsumeMessage } from 'amqplib';

import Logger from '@logging/Logger';

import RabbitInstance from '@rabbitmq/classes/RabbitInstance';

export default class RabbitConsumer {
  protected incomingChannel!: Channel;
  protected outgoingChannel!: Channel;
  protected consumers: Map<string, string[]> = new Map();

  protected setUpChannels = async (): Promise<void> => {
    // Establish channels if they haven't been created previously
    this.incomingChannel = this.incomingChannel || await RabbitInstance.createChannel();
    this.outgoingChannel = this.outgoingChannel || await RabbitInstance.createChannel();
  };

  protected removeConsumer = async (consumer?: string): Promise<void> => {
    if (!consumer) return;

    Logger.info(`Removing the consumer '${consumer}'.`);

    await this.incomingChannel.cancel(consumer)
      .then(() => Logger.info(`Successfully removed the consumer '${consumer}'.`))
      .catch((err) => Logger.error(`Could not remove the consumer '${consumer}': ${(err as Error).message}`));
  };

  private sendBackResponse = (consumer: string, message: ConsumeMessage, content: Buffer): boolean => {
    Logger.info(`Sending back the response to the queue '${message.properties.replyTo}' as ${consumer} (Content=${content.toString()}).`);

    return this.outgoingChannel.sendToQueue(
      message.properties.replyTo,
      content,
      { correlationId: message.properties.correlationId }
    );
  };
  protected consumeIncomingMessage = async (
    incomingQueue: string,
    messageCallback: (message: string) => Promise<object>,
    { removeConsumerImmediately }: { removeConsumerImmediately?: boolean } = {}
  ): Promise<string | undefined> => {
    const { consumerTag } = await this.incomingChannel.consume(incomingQueue, (message) => {
      Logger.info(`Consuming an incoming message on the queue '${incomingQueue}'.`);

      // Check if the message exists; if not, return
      if (!message) return;

      // Call the message callback, and then send back the response
      messageCallback(message.content.toString()).then((response) => {
        Logger.info(`Consumed an incoming message on the queue '${incomingQueue}'.`);
        this.sendBackResponse(consumerTag!, message, Buffer.from(JSON.stringify(response)));
      }).catch((err: Error | unknown) => {
        Logger.info(`Could not consume an incoming message on the queue '${incomingQueue}': ${(err as Error).message}`);
      }).finally(() => {
        // Send an "ack" message and remove the consumer if requested
        this.incomingChannel.ack(message);
        if (removeConsumerImmediately) this.removeConsumer(consumerTag!);
      });
    });

    return consumerTag;
  };
}
