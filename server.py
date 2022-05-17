from javascript import require, On

mineflayer = require('mineflayer')
pathfinder = require('mineflayer-pathfinder')
viewer = require('prismarine-viewer').mineflayer

RANGE_GOAL = 1

bot = mineflayer.createBot({
    'host': 'loucaskreger.com',
    'port': 25566,
    'username': 'ljkseven11@gmail.com',
    'password': '',
    'auth': 'microsoft'
})

bot.loadPlugin(pathfinder.pathfinder)
print("Started mineflayer")


# @On(bot, 'spawn')
# def handle(*args):
#     print("I spawned 👋")
#     mcData = require('minecraft-data')(bot.version)
#     movements = pathfinder.Movements(bot, mcData)
#
#     @On(bot, 'chat')
#     def handleMsg(this, sender, message, *args):
#         print("Got message", sender, message)
#         if sender and (sender != BOT_USERNAME):
#             bot.chat('Hi, you said ' + message)
#             if 'come' in message:
#                 player = bot.players[sender]
#                 print("Target", player)
#                 target = player.entity
#                 if not target:
#                     bot.chat("I don't see you !")
#                     return
#
#                 pos = target.position
#                 bot.pathfinder.setMovements(movements)
#                 bot.pathfinder.setGoal(pathfinder.goals.GoalNear(pos.x, pos.y, pos.z, RANGE_GOAL))


@On(bot, "end")
def handle(*args):
    print("Bot ended!", args)


@On(bot, "spawn")
def handle(*args):
    print('spawned')
    viewer(bot, {'port': 3007})
