export class WebsocketSingleton {
    static #instance: WebsocketSingleton;

    socket!: WebSocket;

    private constructor() {
        console.log("CONNECTING TO WEBSOCKET");
        this.socket = new WebSocket("ws://localhost:8070");
    }

    public static get instance(): WebsocketSingleton {
        if (!WebsocketSingleton.#instance) {
            WebsocketSingleton.#instance = new WebsocketSingleton();
        }

        return WebsocketSingleton.#instance;
    }


}