import amqp from 'amqplib';
import type { Connection, Channel } from 'amqplib';
import axios from 'axios';

import RabbitConstants from '@rabbitmq/classes/RabbitConstants';

const { RABBITMQ_HOST, RABBITMQ_MANAGEMENT_USERNAME, RABBITMQ_MANAGEMENT_PASSWORD } = process.env;
if (!RABBITMQ_HOST || !RABBITMQ_MANAGEMENT_USERNAME || !RABBITMQ_MANAGEMENT_PASSWORD) throw new Error('Missing environment variables!');

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

  public static getQueues = <T = RabbitApiResponseQueues['response']['data']>(): Promise<T> => (
    axios.get<T>(RABBIT_API_URL_QUEUES, {
      auth: { username: RABBITMQ_MANAGEMENT_USERNAME!, password: RABBITMQ_MANAGEMENT_PASSWORD! }
    }).then(({ data }) => data)
  );
}
