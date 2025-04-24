declare module 'asterisk-ami-client' {
  export default class AmiClient {
    connect(username: string, password: string, options: { host: string; port: number }): Promise<void>;
    disconnect(): Promise<void>;
    action(params: { Action: string; Channel?: string }): Promise<any>;
    on(event: string, callback: (event: any) => void): void;
    off(event: string, callback: (event: any) => void): void;
  }
} 