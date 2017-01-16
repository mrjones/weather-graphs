var width = 500;
var height = 50;
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

  d3.json('/data', function(data) {
    console.log(JSON.stringify(data[0]));
    var tMin = d3.min(data, function(d) { return d.unix_seconds; });
    var tMax = d3.max(data, function(d) { return d.unix_seconds; });

    var dMin = d3.min(data, function(d) { return d.temperature; });
    var dMax = d3.max(data, function(d) { return d.temperature; });
    
    chart.selectAll('circle')
         .data(data)
         .enter().append('circle')
         .attr('cx', d => scale(d.unix_seconds, tMin, tMax, 1, width-2))
         .attr('cy', d => scale(d.temperature, dMin, dMax, 1, height-2))
         .attr('r', 1);
  });
});

var scale = function(d, dMin, dMax, rangeMin, rangeMax) {
  return rangeMin + (rangeMax - rangeMin) * ((d - dMin) / (dMax - dMin))
}

var resize = function(chartElt) {
  console.log(chartElt.node().getBoundingClientRect());
  var targetWidth = chartElt.node().getBoundingClientRect().width;
  chartElt.attr("width", targetWidth);
  chartElt.attr("height", targetWidth / aspect);
}
