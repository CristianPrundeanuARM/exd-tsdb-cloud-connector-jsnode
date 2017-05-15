// Load .env config (silently fail if no .env present)
require('dotenv').config({ silent: true });

// Require necessary libraries
var async = require('async');
var ioLib = require('socket.io');
var http = require('http');
var path = require('path');
var express = require('express');
var MbedConnectorApi = require('mbed-connector-api');

// CONFIG (change these)
var accessKey = process.env.ACCESS_KEY || "ChangeMe";
var port = process.env.PORT || 8080;
var bindhost = process.env.HOST || localhost;

// Paths to resources on the endpoints
var blinkResourceURI = '/3201/0/5850';
var blinkPatternResourceURI = '/3201/0/5853';
var buttonResourceURI = '/3200/0/5501';
var accelXResourceURI = '/3313/0/5702';
var accelYResourceURI = '/3313/0/5703';
var accelZResourceURI = '/3313/0/5704';
var soundLevelResourceURI = '/3324/0/5600';
var temperatureResourceURI = '/3303/0/5600';
var lightLevelResourceURI = '/3301/0/5600';
var distanceResourceURI = '/3330/0/5600';
var jsonDataResourceURI = '/alldata/0/json';

// Instantiate an mbed Device Connector object
var mbedConnectorApi = new MbedConnectorApi({
  accessKey: accessKey
});

// Create the express app
var app = express();
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', function (req, res) {
  // Get all of the endpoints and necessary info to render the page
  mbedConnectorApi.getEndpoints(function(error, endpoints) {
    if (error) {
      throw error;
    } else {
      // Setup the function array
      var functionArray = endpoints.map(function(endpoint) {
        return function(mapCallback) {
          mbedConnectorApi.getResourceValue(endpoint.name, blinkPatternResourceURI, function(error, value) {
            endpoint.blinkPattern = value;
            mapCallback(error);
          });
        };
      });

      // Fetch all blink patterns in parallel, finish when all HTTP
      // requests are complete (uses Async.js library)
      async.parallel(functionArray, function(error) {
        if (error) {
          res.send(String(error));
        } else {
          res.render('index', {
            endpoints: endpoints
          });
        }
      });
    }
  });
});

// Handle unexpected server errors
app.use(function(err, req, res, next) {
  console.log(err.stack);
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: err
  });
});

var sockets = [];
var server = http.Server(app);
var io = ioLib(server);

// Setup sockets for updating web UI
io.on('connection', function (socket) {
  // Add new client to array of client upon connection
  sockets.push(socket);

  socket.on('subscribe-to-presses', function (data) {
    // Subscribe to all changes of resource /3200/0/5501 (button presses)
    console.log('Subscribing to button press updates');
    mbedConnectorApi.putResourceSubscription(data.endpointName, buttonResourceURI, function(error) {
      if (error) throw error;
      socket.emit('subscribed-to-presses', {
        endpointName: data.endpointName
      });
    });
  });

  socket.on('subscribe-to-accel', function (data) {
    // Subscribe to accel data
    console.log('Subscribing to accelerator updates');
    mbedConnectorApi.putResourceSubscription(data.endpointName, accelXResourceURI, function(error) {
      if (error) throw error;
      socket.emit('subscribed-to-accel-x', {
        endpointName: data.endpointName
      });
    });
    mbedConnectorApi.putResourceSubscription(data.endpointName, accelYResourceURI, function(error) {
      if (error) throw error;
      socket.emit('subscribed-to-accel-y', {
        endpointName: data.endpointName
      });
    });
    mbedConnectorApi.putResourceSubscription(data.endpointName, accelZResourceURI, function(error) {
      if (error) throw error;
      socket.emit('subscribed-to-accel-z', {
        endpointName: data.endpointName
      });
    });
  });

  socket.on('subscribe-to-analog', function (data) {
    // Subscribe to all changes of analog input resources
    console.log('Subscribing to analog input updates');
    mbedConnectorApi.putResourceSubscription(data.endpointName, soundLevelResourceURI, function(error) {
      if (error) throw error;
      socket.emit('subscribed-to-sound-level', {
        endpointName: data.endpointName
      });
    });
    mbedConnectorApi.putResourceSubscription(data.endpointName, temperatureResourceURI, function(error) {
      if (error) throw error;
      socket.emit('subscribed-to-temperature', {
        endpointName: data.endpointName
      });
    });
    mbedConnectorApi.putResourceSubscription(data.endpointName, lightLevelResourceURI, function(error) {
      if (error) throw error;
      socket.emit('subscribed-to-light-level', {
        endpointName: data.endpointName
      });
    });
    mbedConnectorApi.putResourceSubscription(data.endpointName, distanceResourceURI, function(error) {
      if (error) throw error;
      socket.emit('subscribed-to-distance', {
        endpointName: data.endpointName
      });
    });
  });

  socket.on('subscribe-to-json', function (data) {
    // Subscribe to changes in any of the json data
    console.log('Subscribing to json data updates');
    mbedConnectorApi.putResourceSubscription(data.endpointName, jsonDataResourceURI, function(error) {
      if (error) throw error;
      socket.emit('subscribed-to-json', {
        endpointName: data.endpointName
      });
    });
  });

  socket.on('unsubscribe-to-presses', function(data) {
    // Unsubscribe from the resource /3200/0/5501 (button presses)
    console.log('Unsubscribing from button press updates');
    mbedConnectorApi.deleteResourceSubscription(data.endpointName, buttonResourceURI, function(error) {
      if (error) throw error;
      socket.emit('unsubscribed-to-presses', {
        endpointName: data.endpointName
      });
    });
  });

  socket.on('unsubscribe-to-accel', function(data) {
    // Unsubscribe from accel data
    console.log('Unsubscribing from accelerator updates');
    mbedConnectorApi.deleteResourceSubscription(data.endpointName, accelXResourceURI, function(error) {
      if (error) throw error;
      socket.emit('unsubscribed-to-accel-x', {
        endpointName: data.endpointName
      });
    });
    mbedConnectorApi.deleteResourceSubscription(data.endpointName, accelYResourceURI, function(error) {
      if (error) throw error;
      socket.emit('unsubscribed-to-accel-y', {
        endpointName: data.endpointName
      });
    });
    mbedConnectorApi.deleteResourceSubscription(data.endpointName, accelZResourceURI, function(error) {
      if (error) throw error;
      socket.emit('unsubscribed-to-accel-z', {
        endpointName: data.endpointName
      });
    });
  });

  socket.on('unsubscribe-to-analog', function(data) {
    // Unsubscribe from the analog input resources
    console.log('Unsubscribing from analog input updates');
    mbedConnectorApi.deleteResourceSubscription(data.endpointName, soundLevelResourceURI, function(error) {
      if (error) throw error;
      socket.emit('unsubscribed-to-sound-level', {
        endpointName: data.endpointName
      });
    });
    mbedConnectorApi.deleteResourceSubscription(data.endpointName, temperatureResourceURI, function(error) {
      if (error) throw error;
      socket.emit('unsubscribed-to-temperature', {
        endpointName: data.endpointName
      });
    });
    mbedConnectorApi.deleteResourceSubscription(data.endpointName, lightLevelResourceURI, function(error) {
      if (error) throw error;
      socket.emit('unsubscribed-to-light-level', {
        endpointName: data.endpointName
      });
    });
    mbedConnectorApi.deleteResourceSubscription(data.endpointName, distanceResourceURI, function(error) {
      if (error) throw error;
      socket.emit('unsubscribed-to-distance', {
        endpointName: data.endpointName
      });
    });
  });

  socket.on('unsubscribe-to-json', function(data) {
    // Unsubscribe from json data updates
    console.log('Unsubscribing from json data updates');
    mbedConnectorApi.deleteResourceSubscription(data.endpointName, jsonDataResourceURI, function(error) {
      if (error) throw error;
      socket.emit('unsubscribed-to-json', {
        endpointName: data.endpointName
      });
    });
  });

  socket.on('get-presses', function(data) {
    // Read data from GET resource /3200/0/5501 (num button presses)
    mbedConnectorApi.getResourceValue(data.endpointName, buttonResourceURI, function(error, value) {
      if (error) throw error;
      socket.emit('presses', {
        endpointName: data.endpointName,
        value: value
      });
    });
  });

  socket.on('get-accel', function(data) {
    // Read data from GET resource /3313/0/5702 (accel)
    mbedConnectorApi.getResourceValue(data.endpointName, accelXResourceURI, function(error, value) {
      if (error) throw error;
      socket.emit('accel-x', {
        endpointName: data.endpointName,
        value: value
      });
    });
    mbedConnectorApi.getResourceValue(data.endpointName, accelYResourceURI, function(error, value) {
      if (error) throw error;
      socket.emit('accel-y', {
        endpointName: data.endpointName,
        value: value
      });
    });
    mbedConnectorApi.getResourceValue(data.endpointName, accelZResourceURI, function(error, value) {
      if (error) throw error;
      socket.emit('accel-z', {
        endpointName: data.endpointName,
        value: value
      });
    });
  });

  socket.on('get-analog', function(data) {
    // Read data from analog in GET resources
    mbedConnectorApi.getResourceValue(data.endpointName, soundLevelResourceURI, function(error, value) {
      if (error) throw error;
      socket.emit('sound-level', {
        endpointName: data.endpointName,
        value: value
      });
    });
    mbedConnectorApi.getResourceValue(data.endpointName, temperatureResourceURI, function(error, value) {
      if (error) throw error;
      socket.emit('temperature', {
        endpointName: data.endpointName,
        value: value
      });
    });
    mbedConnectorApi.getResourceValue(data.endpointName, lightLevelResourceURI, function(error, value) {
      if (error) throw error;
      socket.emit('light-level', {
        endpointName: data.endpointName,
        value: value
      });
    });
    mbedConnectorApi.getResourceValue(data.endpointName, distanceResourceURI, function(error, value) {
      if (error) throw error;
      socket.emit('distance', {
        endpointName: data.endpointName,
        value: value
      });
    });
  });

  socket.on('get-json', function(data) {
    // Read data from json GET resource
    mbedConnectorApi.getResourceValue(data.endpointName, jsonDataResourceURI, function(error, value) {
      if (error) throw error;
      socket.emit('json-data', {
        endpointName: data.endpointName,
        value: value
      });
    });
  });

  socket.on('update-blink-pattern', function(data) {
    // Set data on PUT resource /3201/0/5853 (pattern of LED blink)
    mbedConnectorApi.putResourceValue(data.endpointName, blinkPatternResourceURI, data.blinkPattern, function(error) {
      if (error) throw error;
    });
  });

  socket.on('blink', function(data) {
    // POST to resource /3201/0/5850 (start blinking LED)
    mbedConnectorApi.postResource(data.endpointName, blinkResourceURI, null, function(error) {
      if (error) throw error;
    });
  });

  socket.on('disconnect', function() {
    // Remove this socket from the array when a user closes their browser
    var index = sockets.indexOf(socket);
    if (index >= 0) {
      sockets.splice(index, 1);
    }
  })
});

// When notifications are received through the notification channel, pass the
// button presses data to all connected browser windows
mbedConnectorApi.on('notification', function(notification) {
  //console.log('Notification for %s : %s', notification.path, notification.payload);
  if (notification.path === buttonResourceURI) {
    sockets.forEach(function(socket) {
      socket.emit('presses', {
        endpointName: notification.ep,
        value: notification.payload
      });
    });
  } else
  if (notification.path === accelXResourceURI) {
    sockets.forEach(function(socket) {
      socket.emit('accel-x', {
        endpointName: notification.ep,
        value: notification.payload
      });
    });
  } else
  if (notification.path === accelYResourceURI) {
    sockets.forEach(function(socket) {
      socket.emit('accel-y', {
        endpointName: notification.ep,
        value: notification.payload
      });
    });
  } else
  if (notification.path === accelZResourceURI) {
    sockets.forEach(function(socket) {
      socket.emit('accel-z', {
        endpointName: notification.ep,
        value: notification.payload
      });
    });
  } else
  if (notification.path === soundLevelResourceURI) {
    sockets.forEach(function(socket) {
      socket.emit('sound-level', {
        endpointName: notification.ep,
        value: notification.payload
      });
    });
  } else
  if (notification.path === temperatureResourceURI) {
    sockets.forEach(function(socket) {
      socket.emit('temperature', {
        endpointName: notification.ep,
        value: notification.payload
      });
    });
  } else
  if (notification.path === lightLevelResourceURI) {
    sockets.forEach(function(socket) {
      socket.emit('light-level', {
        endpointName: notification.ep,
        value: notification.payload
      });
    });
  } else
  if (notification.path === distanceResourceURI) {
    sockets.forEach(function(socket) {
      socket.emit('distance', {
        endpointName: notification.ep,
        value: notification.payload
      });
    });
  } else
  if (notification.path === jsonDataResourceURI) {
    sockets.forEach(function(socket) {
      socket.emit('json-data', {
        endpointName: notification.ep,
        value: notification.payload
      });
    });
  }
});

// Start the app
server.listen({host: bindhost, port: port}, function() {
  // Set up the notification channel (pull notifications)
  mbedConnectorApi.startLongPolling(function(error) {
    if (error) throw error;
    console.log('ExD TSDB Connector Test Webapp listening at %s:%s', bindhost, port);
  })
});
