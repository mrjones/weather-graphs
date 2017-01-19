var utils = require('./utils.ts');
var d3 = require('d3');
var $ = require('jquery');

var charting = require('./charting.ts');

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

  var tempChart = charting.setupTemperatureChart({
    width: width,
    height: height,
    axisSize: 20,
    margin: 1,
  });
  
  d3.json('/data', function(data) {
    console.log(JSON.stringify(data[0]));
    charting.drawTemperatureChart(chart, tempChart, data);

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

var resize = function(chartElt) {
  console.log(chartElt.node().getBoundingClientRect());
  var targetWidth = chartElt.node().getBoundingClientRect().width;
  chartElt.attr("width", targetWidth);
  chartElt.attr("height", targetWidth / aspect);
}
