export declare class PubSub {
    private triggers;
    publish(triggerName: string, payload: any): boolean;
    asyncIterator(triggerName: string): AsyncIterator<any>;
}
