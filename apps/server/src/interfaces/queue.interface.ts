export interface QueueInterface {
  publish(topic: string, message: any): any;
  subscribe(name: string, handler: (message: any) => Promise<void>);
}
