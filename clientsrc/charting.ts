import * as d3 from 'd3';
import { ScaleLinear, ScaleTime } from 'd3-scale';
import { Line } from 'd3-shape';
import { Axis } from 'd3-axis';
import * as $ from 'jquery';

class DataPoint {
  public unix_seconds: number;
  public temperature: number;
  public precipitation_chance: number;
}

class ChartBounds {
    public width: number;
    public height: number;
    public axisSize: number;
    public margin: number;
}

class TemperatureChartSpec {
  public bounds: ChartBounds;
  public line: Line<DataPoint>;
  public x: ScaleTime<number, number>;
  public y: ScaleLinear<number, number>;
  public xAxis: Axis<Date>;
  public yAxis: Axis<number>;
};

let width: number = 500;
let height: number = 60;
let aspect: number = width / height;

$(document).ready(function() {
  let chart = d3.select('body').append('svg');
  chart.attr('width', '100%')
       .attr('viewBox', '0 0 ' + width + ' ' + height)
       .attr('preserveAspectRatio', 'xMidYMid meet');
  resize(chart);

  d3.select(window)
    .on("resize", function() {
      resize(chart);
    });

  let tempChart = setupTemperatureChart({
    width: width,
    height: height,
    axisSize: 20,
    margin: 1,
  });

  d3.json('/data', function(data: DataPoint[]) {
    console.log(JSON.stringify(data[0]));
    drawTemperatureChart(chart, tempChart, data);
  });
});

let resize = function(chartElt): void {
  console.log(chartElt.node().getBoundingClientRect());
  let targetWidth: number = chartElt.node().getBoundingClientRect().width;
  chartElt.attr("width", targetWidth);
  chartElt.attr("height", targetWidth / aspect);
};

let setupTemperatureChart = function(bounds: ChartBounds): TemperatureChartSpec {
  let x: ScaleTime<number, number> = d3.scaleTime().range(
    [bounds.axisSize + bounds.margin,
     bounds.width - bounds.margin]);
  let y: ScaleLinear<number, number> = d3.scaleLinear().range(
    [bounds.height - bounds.axisSize - bounds.margin,
     bounds.margin]);

  let yAxis = d3.axisLeft<number>(y)
    .ticks(3);
  let xAxis = d3.axisBottom<Date>(x)
    .ticks(d3.timeDay.every(1))
    .tickFormat(d3.timeFormat("%b %d"));
  let line = d3.line<DataPoint>()
    .x((d: DataPoint) => x(new Date(d.unix_seconds * 1000)))
    .y((d: DataPoint) => y(d.temperature));

  return {
    bounds: bounds,
    line: line,
    x: x,
    xAxis: xAxis,
    y: y,
    yAxis: yAxis,
  };
};

let selectMaxes = function(data: DataPoint[], valueFn: (DataPoint) => number) {
  return selectExtremes(data, valueFn, (a, b) => a > b);
};

let selectMins = function(data: DataPoint[], valueFn: (DataPoint) => number) {
  return selectExtremes(data, valueFn, (a, b) => a < b);
};

class Selection {
  public value: number;
  public time: Date;
};

let selectExtremes = function(data: DataPoint[], valueFn: (DataPoint) => number, greaterThanFn: (n1: number, n2: number) => boolean): Selection[] {
  let maxes: Selection[] = [];

  let risingOrFlat: boolean = false;
  let lastIncrease: number = -1;
  for (let i = 1; i < data.length; i++) {
    if (greaterThanFn(valueFn(data[i]), valueFn(data[i - 1]))) {
      lastIncrease = i;
    }
    if ((!greaterThanFn(valueFn(data[i]), valueFn(data[i - 1])) &&
         valueFn(data[i]) !== valueFn(data[i - 1]))
        || (i === data.length - 1)) {
      if (risingOrFlat && lastIncrease >= 0) {
        risingOrFlat = false;
        maxes.push({
          value: valueFn(data[lastIncrease]),
          time: new Date(data[lastIncrease].unix_seconds * 1000),
        });
      }
    } else {
      risingOrFlat = true;
    }
  }

  return maxes;
};

let makeMidnights = function(startTime: Date, endTime: Date) {
  let results: Date[] = [];
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
};

let percentToHex = function(pct: number) {
  return Math.floor(((100 - pct) / 100) * 255).toString(16);
};

let drawPrecipBar = function(rootElt, chart: TemperatureChartSpec, data: DataPoint[]) {
  let precipBarG = rootElt.append('g');

  let width: number = 1.05 * (chart.bounds.width - chart.bounds.axisSize - 2 * chart.bounds.margin) / data.length;

  precipBarG.selectAll('.precipPoint')
    .data(data)
    .enter()
    .append('rect')
    .attr('class', 'precipPoint')
    .attr('width', width)
    .attr('height', 4)
    .attr('x', d => chart.x(new Date(d.unix_seconds * 1000)))
    .attr('y', chart.bounds.height - chart.bounds.axisSize)
    .attr('fill', (d: DataPoint) => "#" + percentToHex(d.precipitation_chance) + percentToHex(d.precipitation_chance) + 'ff' );
};

let drawTempMidnights = function(rootElt, chart: TemperatureChartSpec, midnights: Date[]) {
  let midnightG = rootElt.selectAll('.tempMidnights')
         .data(midnights)
         .enter()
         .append('g')
         .attr('class', 'tempMidnights');

  let pathForDate = function(d: Date) {
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
};

let drawTemperatureChart = function(rootElt, chart: TemperatureChartSpec, data: DataPoint[]) {
  let xExtent = d3.extent(data, d => new Date(d.unix_seconds * 1000));
  let yExtent = d3.extent(data, d => d.temperature);
  // TODO(mrjones): The types don't seem to work for using xExtent here
  // See: extent in
  // https://github.com/tomwanzek/d3-v4-definitelytyped/blob/24f5308f8e3da8f2a996454d47e60b31157ebb66/src/d3-array/index.d.ts
  chart.x.domain([
    d3.min(data, d => new Date(d.unix_seconds * 1000)),
    d3.max(data, d => new Date(d.unix_seconds * 1000)),
  ]);
  chart.y.domain(yExtent);

  let tempsLineG = rootElt.append('g')
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

  
  let yAxisTranslate = {
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

  let minMaxSpecs = [
    { label: "max", values: selectMaxes(data, d => d.temperature) },
    { label: "min", values: selectMins(data, d => d.temperature) },
  ];

  minMaxSpecs.forEach(spec => {
    let maxMarkerG = tempsLineG.selectAll('.' + spec.label + 'Marker')
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
};
