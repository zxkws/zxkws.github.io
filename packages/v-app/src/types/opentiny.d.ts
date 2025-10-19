declare module '@opentiny/next-remoter';

declare module '@opentiny/next' {
  export class MessageChannelTransport {
    constructor(_endpoint: string, _globalObject?: object);
    start(): Promise<void>;
    send(_message: unknown): Promise<void>;
    close(): Promise<void>;
  }

  export class MessageChannelClientTransport extends MessageChannelTransport {}
  export class MessageChannelServerTransport extends MessageChannelTransport {}

  export const createTransportPair: () => [MessageChannelTransport, MessageChannelTransport];
}
