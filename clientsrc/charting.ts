import { IntensityBand } from './intensity-band';
import * as intensity from './intensity-band';

import { DataPoint } from './model';
import * as utils from './utils';
import * as d3 from 'd3';
import { Axis } from 'd3-axis';
import { ScaleLinear, ScaleTime } from 'd3-scale';
import { BaseType, Selection } from 'd3-selection';
import { Line } from 'd3-shape';
import * as $ from 'jquery';

$(document).ready(function() {
  let logicalWidth: number = 500;
  let logicalHeight: number = 100;
  let aspect = logicalWidth / logicalHeight;

  let resize = function(chartElt: SvgSelection<SVGSVGElement>): void {
    console.log(chartElt.node().getBoundingClientRect());
    let targetWidth: number = chartElt.node().getBoundingClientRect().width;
    chartElt.attr("width", targetWidth);
    chartElt.attr("height", targetWidth / aspect);
  };

  let chartElt =
    d3.select('body').append<SVGSVGElement>('svg');
  chartElt.attr('width', '100%')
       .attr('viewBox', '0 0 ' + logicalWidth + ' ' + logicalHeight)
       .attr('preserveAspectRatio', 'xMidYMid meet');
  resize(chartElt);

  /*
  d3.select(window)
    .on("resize", function() {
      resize(chartElt);
    });
  */

  let chart = new TemperatureChart(
    chartElt,
    {
      width: logicalWidth,
      height: logicalHeight,
      axisSize: 20,
      margin: 2,
    });

  d3.json('/data', function(data: DataPoint[]) {
    console.log(JSON.stringify(data[0]));
    chart.render(data);
  });
});

type SvgSelection<T extends BaseType> = Selection<T, {}, HTMLElement, any>;
type AnySvgSelection = SvgSelection<BaseType>;
type SvgSvgSelection = SvgSelection<SVGSVGElement>;

class ChartBounds {
    public width: number;
    public height: number;
    public axisSize: number;
    public margin: number;
}

export class TemperatureChart {
  private bounds: ChartBounds;

  private xScale: ScaleTime<number, number>;
  private yScale: ScaleLinear<number, number>;
  private lineSpec: Line<DataPoint>;
  private xAxis: Axis<Date>;
  private yAxis: Axis<number>;

  private rootElt: AnySvgSelection;

  private precipBar: IntensityBand<DataPoint>;
  private cloudsBar: IntensityBand<DataPoint>;

  constructor(rootElt: AnySvgSelection, bounds: ChartBounds) {
    this.bounds = bounds;

    this.xScale = d3.scaleTime().range(
      [bounds.axisSize + bounds.margin,
       bounds.width - bounds.margin]);
    this.yScale = d3.scaleLinear().range(
      [bounds.height - bounds.axisSize - bounds.margin,
       bounds.margin]);

    this.yAxis = d3.axisLeft<number>(this.yScale)
      .ticks(3);
    this.xAxis = d3.axisBottom<Date>(this.xScale)
      .ticks(d3.timeDay.every(1))
      .tickFormat(d3.timeFormat("%b %d"));

    this.lineSpec = d3.line<DataPoint>()
      .x((d: DataPoint) => this.xScale(new Date(d.unix_seconds * 1000)))
      .y((d: DataPoint) => this.yScale(d.temperature));

    this.rootElt = rootElt;

    this.precipBar = new IntensityBand<DataPoint>(
      (d: DataPoint) => d.precipitation_chance,
      intensity.blue,
      {
        width: this.bounds.width - this.bounds.axisSize - 2 * this.bounds.margin,
        height: 3,
        xPos: this.bounds.axisSize + this.bounds.margin,
        yPos: this.bounds.height - this.bounds.axisSize - this.bounds.margin,
      },
      this.rootElt,
      "precipBar");

    this.cloudsBar = new IntensityBand<DataPoint>(
      (d: DataPoint) => d.clouds,
      intensity.gray,
      {
        width: this.bounds.width - this.bounds.axisSize - 2 * this.bounds.margin,
        height: 3,
        xPos: this.bounds.axisSize + this.bounds.margin,
        yPos: this.bounds.height - this.bounds.axisSize - this.bounds.margin + 3,
      },
      this.rootElt,
      "cloudsBar");

}

  public render(data: DataPoint[]) {
    this.drawTemperatureChart(this.rootElt, data);
  }

  private drawTemperatureChart(rootElt: AnySvgSelection, data: DataPoint[]) {
    let yExtent = d3.extent(data, d => d.temperature);
    // TODO(mrjones): The types don't seem to work for using xExtent here
    // See: extent in
    // https://github.com/tomwanzek/d3-v4-definitelytyped/blob/24f5308f8e3da8f2a996454d47e60b31157ebb66/src/d3-array/index.d.ts
//    let xExtent = d3.extent(data, d => new Date(d.unix_seconds * 1000));
    this.xScale.domain([
      d3.min(data, d => new Date(d.unix_seconds * 1000)),
      d3.max(data, d => new Date(d.unix_seconds * 1000)),
    ]);
    this.yScale.domain(yExtent);

    let tempsLineG = rootElt.append('g')
      .attr('class', 'tempsLineG');

    let startDate = d3.min(data, d => new Date(d.unix_seconds * 1000));
    let endDate = d3.max(data, d => new Date(d.unix_seconds * 1000));

    this.drawWeekendBackgrounds(tempsLineG, startDate, endDate);

    this.drawTempMidnights(
      tempsLineG,
      utils.midnightsBetween(startDate, endDate));

    // TODO(mrjones): Morally, should this share an x-scaler with the temp chart?
    this.precipBar.render(data);
    this.cloudsBar.render(data);
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
      x: this.bounds.axisSize + this.bounds.margin,
      y: 0,
    };
    tempsLineG.append('g')
      .attr('class', 'axis yaxis')
      .attr('transform', 'translate(' + yAxisTranslate.x + ',' + yAxisTranslate.y + ')')
      .call(this.yAxis);

    tempsLineG.selectAll('.axis')
      .attr('font-size', '5');

    tempsLineG.append('path')
      .datum(data)
      .attr('class', 'dataline')
      .attr('d', this.lineSpec);

    let minMaxSpecs = [
      { label: "max", values: utils.selectMaxes(data, d => d.temperature) },
      { label: "min", values: utils.selectMins(data, d => d.temperature) },
    ];

    minMaxSpecs.forEach(spec => {
      let maxMarkerG = tempsLineG.selectAll('.' + spec.label + 'Marker')
        .data(spec.values)
        .enter()
        .append('g')
        .attr('class', spec.label + 'Marker');
      maxMarkerG.append('circle')
        .attr('cx', d => this.xScale(d.time))
        .attr('cy', d => this.yScale(d.value))
        .attr('r', 1);
      maxMarkerG.append('text')
        .attr('x', d => this.xScale(d.time) - 7)
        .attr('y', d => this.yScale(d.value) + 1)
        .text(d => d.value)
        .style('font-family', 'sans-serif')
        .style('font-size', 4);
    });
  };

  private drawWeekendBackgrounds(rootElt: AnySvgSelection, startDate: Date, endDate: Date) {
    let midnights = utils.midnightsBetween(startDate, endDate);

    let dayRanges = [];
    let lastEdge = startDate;
    midnights.forEach(m => {
      dayRanges.push({start: new Date(lastEdge), end: new Date(m)});
      lastEdge = new Date(m);
    });
    dayRanges.push({start: lastEdge, end: endDate});

    rootElt.selectAll('.dayBackground')
      .data(dayRanges)
      .enter()
      .append('rect')
      .attr('class', 'dayBackground')
      .attr('x', range => this.xScale(range.start))
      .attr('y', this.bounds.margin)
      .attr('width', range => this.xScale(range.end) - this.xScale(range.start))
      .attr('height', this.bounds.height - this.bounds.axisSize - 2 * this.bounds.margin)
      .attr('fill', range => (range.start.getDay() === 0 || range.start.getDay() === 6) ? "#EFEFEF" : "#FFFFFF");
  }

  private drawTempMidnights(rootElt: AnySvgSelection, midnights: Date[]) {
    let midnightG = rootElt.selectAll('.tempMidnights')
      .data(midnights)
      .enter()
      .append('g')
      .attr('class', 'tempMidnights');

    let cht = this;
    let pathForDate = function(d: Date) {
      return ' M ' + cht.xScale(d) + ' ' + cht.bounds.margin + ' L ' + cht.xScale(d) + ' ' + (cht.bounds.height - cht.bounds.axisSize - cht.bounds.margin);
    };

    midnightG.append('path')
      .attr('d', d => pathForDate(d))
      .style('stroke', '#CCCCCC')
      .style('stroke-width', 1);

    let xS = this.xScale;
    midnightG.append('text')
      .attr('x', d => xS(d))
      .attr('y', this.bounds.height - (this.bounds.axisSize / 2))
      .attr('text-anchor', 'middle')
      .style('font-size', '4')
      .text(d => d3.timeFormat('%a %b %d')(d));
  };
};
