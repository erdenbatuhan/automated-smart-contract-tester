import amqp from 'amqplib';
import type { Connection, Channel } from 'amqplib';
import axios from 'axios';

import RabbitConstants from '@rabbitmq/helpers/RabbitConstants';

const { RABBITMQ_HOST, RABBITMQ_MANAGEMENT_USERNAME, RABBITMQ_MANAGEMENT_PASSWORD } = process.env;
if (!RABBITMQ_HOST || !RABBITMQ_MANAGEMENT_USERNAME || !RABBITMQ_MANAGEMENT_PASSWORD) {
  throw new Error('Missing environment variables!');
}

const RABBIT_API_URL_QUEUES = `http://${RABBITMQ_HOST}:15672/api/queues`;

interface RabbitApiResponseQueues {
  response: {
    data: [{
      name: string;
      arguments: {
        exchange: string;
      };
    }];
  };
}

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

  /**
   * Retrieves a list of RabbitMQ queues.
   *
   * @template T
   * @returns {Promise<T>} A promise that resolves to an array of RabbitMQ queue information.
   */
  public static getQueues = <T = RabbitApiResponseQueues['response']['data']>(): Promise<T> => (
    axios.get<T>(RABBIT_API_URL_QUEUES, {
      auth: { username: RABBITMQ_MANAGEMENT_USERNAME!, password: RABBITMQ_MANAGEMENT_PASSWORD! }
    }).then(({ data }) => data)
  );
}
