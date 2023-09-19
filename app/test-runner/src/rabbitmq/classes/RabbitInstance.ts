import amqp from 'amqplib';
import type { Connection, Channel } from 'amqplib';

import RabbitConstants from '@rabbitmq/classes/RabbitConstants';

const { RABBITMQ_HOST, RABBITMQ_MANAGEMENT_USERNAME, RABBITMQ_MANAGEMENT_PASSWORD } = process.env;
if (!RABBITMQ_HOST || !RABBITMQ_MANAGEMENT_USERNAME || !RABBITMQ_MANAGEMENT_PASSWORD) throw new Error('Missing environment variables!');

export default class RabbitInstance {
  private static connection: Connection;

  public static getConnection = async (): Promise<Connection> => {
    if (!RabbitInstance.connection) {
      RabbitInstance.connection = await amqp.connect(`amqp://${RABBITMQ_HOST}`);
    }

    return RabbitInstance.connection;
  };

  public static createChannel = async (
    prefetchCount: number = RabbitConstants.CHANNEL_PREFETCH_COUNT
  ): Promise<Channel> => {
    const amqpConnection = await RabbitInstance.getConnection();
    const channel = await amqpConnection.createChannel();

    // Set prefetch count
    await channel.prefetch(prefetchCount, false);

    return channel;
  };
}
