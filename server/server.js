/*jslint node: true, nomen: true, vars: true, passfail: false */
'use strict';
var express = require('express'), app = express.createServer();
var jade = require('jade');
var io = require('socket.io').listen(app);
require('./ServerEngineProto');
app.set('views', __dirname + '/client');
app.set('view engine', 'jade');
app.set("view options", { layout: false });
app.configure(function() {
    app.use(express['static'](__dirname + '/public'));
});
app.get('/', function(req, res){
  res.render('tetrominosjs.jade');
});
app.listen(3000);
io.sockets.on('connection', function (socket) {
    socket.on('start', function (data) {
        //TODO: create tEngine = new ServerEngineProto(data), start sending grids to redraw to the client
        socket.set('context', data);
    });
    socket.on('keyDown', function (event) {
        socket.get('context', function (error, context) {
            //TODO: implement and call the action processor: context.tEngine.keyDownEvent(event)
            console.log("Context " + context + " send keyDown event : " + event);
        });
    });
    socket.on('keyUp', function (event) {
        socket.get('context', function (error, context) {
            //TODO: implement and call the action processor: context.tEngine.keyUpEvent(event)
            console.log("Context " + context + " send keyDown event : " + event);
        });
    });
    socket.on('touchstart', function (event) {
        socket.get('context', function (error, context) {
            //TODO: implement and call the action processor: context.tEngine.touchstartEvent(event)
            console.log("Context " + context + " send touchstart event : " + event);
        });
    });
    socket.on('touchend', function (event) {
        socket.get('context', function (error, context) {
            //TODO: implement and call the action processor: context.tEngine.touchendEvent(event)
            console.log("Context " + context + " send touchend event : " + event);
        });
    });
    socket.on('tap', function (event) {
        socket.get('context', function (error, context) {
            //TODO: implement and call the action processor: context.tEngine.tapEvent(event)
            console.log("Context " + context + " send tap event : " + event);
        });
    });
});