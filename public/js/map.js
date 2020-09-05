/*  global $ alert sizeX sizeY xOffset yOffset updateEvery */
/*  eslint no-unused-vars: "off" */
/*  eslint no-global-assign: "off" */
/*  eslint no-native-reassign: "off" */

window.onload = startApp;

var pathLayerContext;

var pathLayer;

var lastPhase = '';
var mapping = true;

var currentPoints = [];
var zoom;

function startApp () {
  pathLayer = document.getElementById('path_layer');

  pathLayer.width = sizeX;
  pathLayer.height = sizeY;

  $('#sizew').val(sizeX);
  $('#sizeh').val(sizeY);

  $('#offsetx').val(xOffset);
  $('#offsety').val(yOffset);

  $('#updateevery').val(updateEvery);
  startMissionLoop();
  update();

}

function startMissionLoop () {
  $.get('/api/latestMission', function (data) {
    if (data.length !== 0) {
      messageHandler(JSON.parse(data));
    }
    fetchExistingPointsAndLoadMap();
    setTimeout(startMissionLoop, updateEvery);
  });
}

function messageHandler (msg) {
  if (msg.length === 0) return;
  // msg is the object returned by dorita980.getMission() promise.
  /*
  if (msg.cleanMissionStatus) {
    // firmware version 2
    msg = msg.cleanMissionStatus;
    msg.pos = msg.pose;
    msg.batPct = msg.batPct;
    if (msg.bin) { $('#bin').html(msg.bin.present); $('#binRow').show(); } else { $('#binRow').hide(); }
    if (msg.detectedPad) { $('#detectedPad').html(msg.detectedPad); $('#detectedPadRow').show(); } else { $('#detectedPadRow').hide(); }
    if (msg.mopReady) { $('#tankPresent').html(msg.mopReady.tankPresent); $('#tankPresentRow').show(); } else { $('#tankPresentRow').hide(); }
    if (msg.mopReady) { $('#lidClosed').html(msg.mopReady.lidClosed); $('#lidClosedRow').show(); } else { $('#lidClosedRow').hide(); }
    $('#nMssn').html(msg.nMssn);
  }*/
  msg.time = new Date().toISOString();
  $('#mapStatus').html('drawing...');
  $('#last').html(msg.time);
  $('#mission').html(msg.mssnM);
  $('#cycle').html(msg.cycle);
  $('#phase').html(msg.phase);
  $('#flags').html(msg.flags);
  $('#batPct').html(msg.batPct);
  $('#error').html(msg.error);
  $('#sqft').html(msg.sqft);
  $('#expireM').html(msg.expireM);
  $('#rechrgM').html(msg.rechrgM);
  $('#notReady').html(msg.notReady);
  $('#theta').html(msg.pose.theta);
  $('#x').html(msg.pose.point.x);
  $('#y').html(msg.pose.point.y);

  drawStep(
    msg.pose.point.x,
    msg.pose.point.y,
    msg.pose.theta,
    msg.cycle,
    msg.phase
  );
}

function fetchExistingPointsAndLoadMap() {
  $.get('/api/currentPath', function (data) {
    if (data.length === 0) return;
    currentPoints = data;
    zoom = d3.zoom()
      .extent([[0, 0], [sizeX, sizeY]])
      .scaleExtent([-8, 8])
      .on("zoom", function () {
        d3.select('g').attr('transform', d3.event.transform);
      });
  d3.select('svg').call(zoom);
  update();
    });
}

function packagePoint(x, y) {
  return [x, y];
}

function storePoints() {
  window.localStorage.setItem('points', JSON.stringify(currentPoints));
}

function update() {
  var lineGenerator = d3.line();
  var pathString = lineGenerator(currentPoints);
  d3.select('path').attr('d', pathString);
}

function resetMap() {
  //TODO
}

function drawStep (x, y, theta, cycle, phase) {
  if (phase === 'charge') {
    // hack (getMission() dont send x,y if phase is diferent as run)
    x = 0;
    y = 0;
  } else {
    currentPoints.push(packagePoint(x, y));
    storePoints();
  }
  update();
  //drawRobotBody(x, y, theta);

  // draw changes in status with text.
  if (phase !== lastPhase) {
    lastPhase = phase;
  } else {
  }
}

function rawPointsToMap(x, y) {
  x = parseInt(x, 10) + xOffset;
  y = parseInt(y, 10) + yOffset;
  var oldX = x;

  // rotate
  x = y;
  y = pathLayer.height - oldX;
  x = pathLayer.width - x;
  return packagePoint(x, y);
}

function deduceCanvas() {
  // TODO(kkr):
}

function drawRobotBody (x, y, theta) {
  theta = parseInt(theta, 10);
  var radio = 15;
  robotBodyLayerContext.clearRect(0, 0, robotBodyLayer.width, robotBodyLayer.height);
  robotBodyLayerContext.beginPath();
  robotBodyLayerContext.arc(x, y, radio, 0, 2 * Math.PI, false);
  robotBodyLayerContext.fillStyle = 'green';
  robotBodyLayerContext.fill();
  robotBodyLayerContext.lineWidth = 3;
  robotBodyLayerContext.strokeStyle = '#003300';
  robotBodyLayerContext.stroke();

  var outerX = x + radio * Math.cos((theta - 90) * (Math.PI / 180));
  var outerY = y + radio * Math.sin((theta - 90) * (Math.PI / 180));

  robotBodyLayerContext.beginPath();
  robotBodyLayerContext.moveTo(x, y);
  robotBodyLayerContext.lineTo(outerX, outerY);
  robotBodyLayerContext.strokeStyle = '#003300';
  robotBodyLayerContext.lineWidth = 3;
  robotBodyLayerContext.stroke();
}

function clearMap () {
  lastPhase = '';
  currentPoints.splice(0, currentPoints.length);
  window.localStorage.clear();
}

function toggleMapping () {
  mapping = !mapping;
  if (mapping) startMissionLoop();
}

function getValue (name, actual) {
  var newValue = parseInt($(name).val(), 10);
  if (isNaN(newValue)) {
    alert('Invalid ' + name);
    $(name).val(actual);
    return actual;
  }
  return newValue;
}

function downloadCanvas () {
  var bodyCanvas = document.getElementById('robot_body_layer');
  var pathCanvas = document.getElementById('path_layer');

  var bodyContext = bodyCanvas.getContext('2d');
  bodyContext.drawImage(pathCanvas, 0, 0);

  document.getElementById('download').href = bodyCanvas.toDataURL();
  document.getElementById('download').download = 'current_map.png';
}

function shiftCanvas (ctx, w, h, dx, dy) {
  var imageData = ctx.getImageData(0, 0, w, h);
  ctx.clearRect(0, 0, w, h);
  ctx.putImageData(imageData, dx, dy);
}

function saveValues () {
  var values = {
    'offsetX': getValue('#offsetx', xOffset),
    'offsetY': getValue('#offsety', yOffset),
    'sizeW': getValue('#sizew', pathLayer.width),
    'sizeH': getValue('#sizeh', pathLayer.height),
    'pointIntervalMs': updateEvery
  };
  $.post('/map/values', values, function (data) {
  });
}

$('.metrics').on('change', function () {
  var w = getValue('#sizew', pathLayer.width);
  var h = getValue('#sizeh', pathLayer.height);
  if (pathLayer.width !== w) {
    pathLayerContext.beginPath();
    shiftCanvas(pathLayerContext, w, h, (w - pathLayer.width), 0);
    pathLayer.width = w;
    robotBodyLayer.width = w;
  }

  if (pathLayer.height !== h) {
    shiftCanvas(pathLayerContext, w, h, 0, (h - pathLayer.height));
    pathLayer.height = h;
  }

  var newYOffset = getValue('#offsety', yOffset);
  if (newYOffset !== yOffset) {
    yOffset = newYOffset;
  }
  var newXOffset = getValue('#offsetx', xOffset);
  if (newXOffset !== xOffset) {
    xOffset = newXOffset;
  }
});

$('.action').on('click', function () {
  var me = $(this);
  var path = me.data('action');
  me.button('loading');
  $.get(path, function (data) {
    me.button('reset');
    $('#apiresponse').html(JSON.stringify(data));
  });
});

$('#updateevery').on('change', function () {
  updateEvery = getValue('#updateevery', updateEvery);
});

