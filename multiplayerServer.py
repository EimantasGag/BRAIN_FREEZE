import asyncio
import json
import random

import websockets
from websockets import serve

waiting_clients = set()
cardflip_lobbies = []
simon_lobbies = []
nrg_lobbies = []


class SimonLobby:
    def __init__(self, clients):
        self.clients = clients
        self.finishedNumber = 0


class NRGLobby:
    def __init__(self, clients):
        self.clients = clients
        self.finishedNumber = 0


async def start_countdown():
    """Sends a countdown from 10 to 1 to all clients in the game lobby."""
    for i in range(10, 0, -1):
        countdown_message = json.dumps({"type": "countdown", "seconds": i})
        for client in waiting_clients:
            await client.send(countdown_message)
        await asyncio.sleep(1)

    game_lobby = set()
    for client in waiting_clients:  # Take first two clients
        game_lobby.add(client)

    # TODO: Randomize game selection
    randomGame = random.choice(["cardflip", "simon", "nrg"])

    if randomGame == "cardflip":
        cardflip_lobbies.append(game_lobby)
    elif randomGame == "simon":
        simon_lobbies.append(SimonLobby(game_lobby))
    elif randomGame == "nrg":
        nrg_lobbies.append(NRGLobby(game_lobby))

    print("New live game lobby created: " + str(game_lobby))

    # Send game start message after countdown
    for client in waiting_clients:
        await client.send(json.dumps({"type": "game_start", "game": randomGame}))


async def handler(websocket):
    print("New client connected: " + str(websocket))
    global waiting_clients, cardflip_lobbies

    try:
        async for message in websocket:
            print("Received message: " + message)
            data = json.loads(message)

            if data["type"] == "join_lobby":
                waiting_clients.add(websocket)
                print("Player count: " + str(len(waiting_clients)))
                update_message = json.dumps(
                    {"type": "update_users", "playerCount": len(waiting_clients)})

                for client in waiting_clients:
                    await client.send(update_message)

                if len(waiting_clients) == 2:
                    # Start countdown before game starts
                    asyncio.create_task(start_countdown())

            elif data["type"] == "leave_lobby":
                waiting_clients.discard(websocket)
                update_message = json.dumps(
                    {"type": "update_users", "playerCount": len(waiting_clients)})
                for client in waiting_clients:
                    await client.send(update_message)

            elif data["type"] == "game_won":
                update_message = json.dumps({"type": "game_lost"})
                for game in cardflip_lobbies:
                    if websocket in game:
                        for client in game:
                            if client != websocket:
                                await client.send(update_message)
                        cardflip_lobbies.remove(game)
                        break
            elif data["type"] == "simon_score":
                update_score_msg = json.dumps(
                    {"type": "simon_score", "score": data["score"]})
                gameend_msg = json.dumps({"type": "game_end"})
                for game in simon_lobbies:
                    if websocket in game.clients:
                        game.finishedNumber += 1
                        for client in game.clients:
                            if client != websocket:
                                await client.send(update_score_msg)
                        if game.finishedNumber == len(game.clients):
                            print("Simon game ended")
                            for client in game.clients:
                                await client.send(gameend_msg)
                            simon_lobbies.remove(game)
                        break
            elif data["type"] == "nrg_score":
                update_score_msg = json.dumps(
                    {"type": "nrg_score", "score": data["score"]})
                gameend_msg = json.dumps({"type": "game_end"})
                for game in nrg_lobbies:
                    if websocket in game.clients:
                        game.finishedNumber += 1
                        for client in game.clients:
                            if client != websocket:
                                await client.send(update_score_msg)
                        if game.finishedNumber == len(game.clients):
                            print("NRG game ended")
                            for client in game.clients:
                                await client.send(gameend_msg)
                            nrg_lobbies.remove(game)
                        break

    except websockets.exceptions.ConnectionClosed:
        pass

    finally:
        waiting_clients.discard(websocket)
        update_message = json.dumps(
            {"type": "update_users", "playerCount": len(waiting_clients)})
        for client in waiting_clients:
            await client.send(update_message)


async def main():
    async with serve(handler, "localhost", 8070) as server:
        await server.serve_forever()

if __name__ == "__main__":
    asyncio.run(main())
