Tetrominosjs
============
####*html5 nodejs *etris clone from scratch*

 Copyright (C) 2013 Gael Abadin

This branch is an attempt to make a websockets version of tetrominos.

This is a non-functional first-commit WIP declaration-of-intentions kind of push. Just a starting point to sketch and structure things a little bit.

The code should be almost the same as the standalone non-distributed web app version, on top of the websockets API, passing JSON messages as server<--->client method invocations (Call it a messy RMI/RPC attempt, or whatever. Websockets are cool.)

The replay functionality on the client must be rewritten though, since there's no point on the server taking the replay load and the idea of the client being a dumb headless canvas grid (re)drawer without any concept of game entities (tetrominos) or ability to record and reproduce any actions happening in the game world other than dirty cell redrawing.
