import amqp from 'amqplib';
import type { Connection, Channel } from 'amqplib';

import RabbitConstants from '@rabbitmq/helpers/RabbitConstants';

const { RABBITMQ_HOST } = process.env;
if (!RABBITMQ_HOST) throw new Error('Missing environment variables!');

/**
 * Represents a utility class for interacting with RabbitMQ.
 */
export default class RabbitInstance {
  private static connection: Connection;

  /**
   * Establishes a connection to RabbitMQ.
   *
   * @returns {Promise<Connection>} A promise that resolves to the RabbitMQ connection.
   * @throws {Error} If an error occurs during connection establishment.
   */
  public static getConnection = async (): Promise<Connection> => {
    if (!RabbitInstance.connection) {
      RabbitInstance.connection = await amqp.connect(`amqp://${RABBITMQ_HOST}`);
    }

    return RabbitInstance.connection;
  };

  /**
   * Creates a new channel with the specified prefetch count.
   *
   * @param {number} [prefetchCount=RabbitConstants.CHANNEL_PREFETCH_COUNT] - The prefetch count for the channel.
   * @returns {Promise<Channel>} A promise that resolves to a RabbitMQ channel.
   */
  public static createChannel = async (
    prefetchCount: number = RabbitConstants.CHANNEL_PREFETCH_COUNT
  ): Promise<Channel> => {
    const amqpConnection = await RabbitInstance.getConnection();
    const channel = await amqpConnection.createChannel();

    // Set prefetch count
    await channel.prefetch(prefetchCount, true);

    return channel;
  };
}
