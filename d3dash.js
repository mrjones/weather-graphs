var width = 500;
var height = 60;
var aspect = width / height;

$(document).ready(function() {
  var chart = d3.select('body').append('svg');
  chart.attr('width', '100%')
       .attr('viewBox', '0 0 ' + width + ' ' + height)
       .attr('preserveAspectRatio', 'xMidYMid meet');
  resize(chart);

  d3.select(window)
    .on("resize", function() {
      resize(chart);
    });

  var tempChart = setupTemperatureChart({
    width: width,
    height: height,
    axisSize: 20,
    margin: 1,
  });
  
  d3.json('/data', function(data) {
    console.log(JSON.stringify(data[0]));
    drawTemperatureChart(chart, tempChart, data);

    /*
    var tMin = d3.min(data, function(d) { return d.unix_seconds; });
    var tMax = d3.max(data, function(d) { return d.unix_seconds; });

    var dMin = d3.min(data, function(d) { return d.temperature; });
    var dMax = d3.max(data, function(d) { return d.temperature; });

    chart.selectAll('circle')
         .data(data)
         .enter().append('circle')
         .attr('cx', d => scale(d.unix_seconds, tMin, tMax, 20, width-21))
         .attr('cy', d => scale(d.temperature, dMin, dMax, height-10, 1))
         .attr('r', 1);
    */
  });
});

var setupTemperatureChart = function(bounds) {
  var x = d3.scaleTime().range(
    [bounds.axisSize + bounds.margin,
     bounds.width - bounds.margin]);
  var y = d3.scaleLinear().range(
    [bounds.height - bounds.axisSize - bounds.margin,
     bounds.margin]);

  var yAxis = d3.axisLeft(y)
                .ticks(3);
  var xAxis = d3.axisBottom(x)
                .ticks(d3.timeDay.every(1))
                .tickFormat(d3.timeFormat("%b %d"));
  
  var line = d3.line()
               .x(d => x(new Date(d.unix_seconds * 1000)))
               .y(d => y(d.temperature));

  return {x: x, y: y, xAxis: xAxis, yAxis: yAxis, line: line, bounds: bounds};
}

var selectMaxes = function(data, valueFn) {
  return selectExtremes(data, valueFn, (a, b) => a > b);
}

var selectMins = function(data, valueFn) {
  return selectExtremes(data, valueFn, (a, b) => a < b);
}

var selectExtremes = function(data, valueFn, greaterThanFn) {
  var maxes = [];

  var risingOrFlat = false;
  var lastIncrease = -1;
  for (var i = 1; i < data.length; i++) {
    if (greaterThanFn(valueFn(data[i]), valueFn(data[i-1]))) {
      lastIncrease = i;
    }
    if ((!greaterThanFn(valueFn(data[i]), valueFn(data[i-1])) &&
         valueFn(data[i]) != valueFn(data[i-1]))
        || (i == data.length - 1)) {
      if (risingOrFlat && lastIncrease >= 0) {
        risingOrFlat = false;
        maxes.push({
          value: valueFn(data[lastIncrease]),
          time: new Date(data[lastIncrease].unix_seconds * 1000)
        });
      }
    } else {
      risingOrFlat = true;
    }
  }

  return maxes;
}

var drawTemperatureChart = function(rootElt, chart, data) {
  chart.x.domain(d3.extent(data, d => new Date(d.unix_seconds * 1000)));
  chart.y.domain(d3.extent(data, d => d.temperature));

  var tempsLineG = rootElt.append('g')
                        .attr('class', 'tempsLineG');

  drawTempMidnights(
    tempsLineG,
    chart,
    makeMidnights(d3.min(data, d => new Date(d.unix_seconds * 1000)),
                  d3.max(data, d => new Date(d.unix_seconds * 1000))));

  drawPrecipBar(tempsLineG, chart, data);
  
  /*
  var xAxisTranslate = {
    x: 0,
    y: chart.bounds.height - chart.bounds.axisSize - chart.bounds.margin
  };
  tempsLineG.append('g')
            .attr('class', 'axis xaxis')
            .attr('transform', 'translate(' + xAxisTranslate.x + ',' + xAxisTranslate.y + ')')
            .call(chart.xAxis);
  */

  var yAxisTranslate = {
    x: chart.bounds.axisSize + chart.bounds.margin,
    y: 0,
  };
  tempsLineG.append('g')
            .attr('class', 'axis yaxis')
            .attr('transform', 'translate(' + yAxisTranslate.x + ',' + yAxisTranslate.y + ')')
            .call(chart.yAxis);
    
  tempsLineG.selectAll('.axis')
            .attr('font-size', '5');

  tempsLineG.append('path')
            .datum(data)
            .attr('class', 'dataline')
            .attr('d', chart.line);

  
  var minMaxSpecs = [
    { label: "max", values: selectMaxes(data, d => d.temperature) },
    { label: "min", values: selectMins(data, d => d.temperature) },
  ];

  minMaxSpecs.forEach(spec => {
    var maxMarkerG = tempsLineG.selectAll('.' + spec.label + 'Marker')
                               .data(spec.values)
                               .enter()
                               .append('g')
                               .attr('class', spec.label + 'Marker');
    
    maxMarkerG.append('circle')
              .attr('cx', d => chart.x(d.time))
              .attr('cy', d => chart.y(d.value))
              .attr('r', 1);

    maxMarkerG.append('text')
              .attr('x', d => chart.x(d.time) - 7)
              .attr('y', d => chart.y(d.value) + 1)
              .text(d => d.value)
              .style('font-family', 'sans-serif')
              .style('font-size', 4);
  });
}

var drawTempMidnights = function(rootElt, chart, midnights) {
  var midnightG = rootElt.selectAll('.tempMidnights')
         .data(midnights)
         .enter()
         .append('g')
         .attr('class', 'tempMidnights');

  var pathForDate = function(d) {
    return ' M ' + chart.x(d) + ' 0 L ' + chart.x(d) + ' ' + (chart.bounds.height - chart.bounds.axisSize);
  };
  
  midnightG.append('path')
           .attr('d', d => pathForDate(d))
           .style('stroke', '#CCCCCC')
           .style('stroke-width', 1);

  midnightG.append('text')
           .attr('x', d => chart.x(d))
           .attr('y', chart.bounds.height - (chart.bounds.axisSize / 2))
           .attr('text-anchor', 'middle')
           .style('font-size', '4')
           .text(d => d3.timeFormat('%b %d')(d));
}

var percentToHex = function(pct) {
  return Math.floor(((100 - pct)/100) * 255).toString(16);
}

var drawPrecipBar = function(rootElt, chart, data) {
  let precipBarG = rootElt.append('g');

  var width = 1.05 * (chart.bounds.width - chart.bounds.axisSize - 2 * chart.bounds.margin) / data.length;
  
  precipBarG.selectAll('.precipPoint')
            .data(data)
            .enter()
            .append('rect')
            .attr('class', 'precipPoint')
            .attr('width', width)
            .attr('height', 4)
            .attr('x', d => chart.x(new Date(d.unix_seconds * 1000)))
            .attr('y', chart.bounds.height - chart.bounds.axisSize)
            .attr('fill', d => "#" + percentToHex(d.precipitation_chance) + percentToHex(d.precipitation_chance) + 'ff' );
//            .attr('fill', d => "#ffff" + Math.floor(((100 - d.precipitation_chance)/100) * 255).toString(16));
}

var makeMidnights = function(startTime, endTime) {
  let results = [];
  let t = startTime;
  while (true) {
    t.setHours(24, 0, 0, 0);
    if (t > endTime) {
      break;
    }
    results.push(new Date(t));
  }

  console.log("midnights(" + startTime + "," + endTime + ") => " + results);
  return results;
}

var scale = function(d, dMin, dMax, rangeMin, rangeMax) {
  return rangeMin + (rangeMax - rangeMin) * ((d - dMin) / (dMax - dMin))
}

var resize = function(chartElt) {
  console.log(chartElt.node().getBoundingClientRect());
  var targetWidth = chartElt.node().getBoundingClientRect().width;
  chartElt.attr("width", targetWidth);
  chartElt.attr("height", targetWidth / aspect);
}
