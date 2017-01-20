import { BaseType, Selection } from 'd3-selection';

type CompteIntensityFn<T> = (point: T) => number;
type ColorForIntensityFn = (intensity: number) => [number, number, number];

export class BoundingBox {
  public width: number;
  public height: number;
  public xPos: number;
  public yPos: number;
}

export let blue = function(intensity: number): [number, number, number] {
  return [
    255 * ((100 - intensity) / 100),
    255 * ((100 - intensity) / 100),
    255,
  ];
};

export let gray = function(intensity: number): [number, number, number] {
  return [
    255 * ((100 - intensity) / 100),
    255 * ((100 - intensity) / 100),
    255 * ((100 - intensity) / 100),
  ];
};

export class IntensityBand<DataPointT> {
  private intensityFn: CompteIntensityFn<DataPointT>;
  private colorFn: ColorForIntensityFn;
  private bounds: BoundingBox;
  private rootElt: Selection<BaseType, {}, HTMLElement, any>;
  private className: string;

  private myG: Selection<SVGGElement, {}, HTMLElement, any>;
  
  constructor(intensityFn: CompteIntensityFn<DataPointT>,
              colorFn: ColorForIntensityFn,
              bounds: BoundingBox,
              rootElt: Selection<BaseType, {}, HTMLElement, any>,
              className: string) {
    this.intensityFn = intensityFn;
    this.colorFn = colorFn;
    this.bounds = bounds;
    this.rootElt = rootElt;
    this.className = className;

    this.myG = this.rootElt.append<SVGGElement>('g');
  }

  public render(data: DataPointT[]) {
    let markWidth = this.bounds.width / data.length;

    let toHex = function(val: [number, number, number]): string {
      let acc = "#";
      val.forEach(v => {
        let hex = Math.floor(v).toString(16);
        if (hex.length === 1) {
          hex = "0" + hex;
        }
        acc = acc + hex;
      });
      return acc;
    };

    this.myG.selectAll('.' + this.className)
      .data(data)
      .enter()
      .append('rect')
      .attr('class', this.className)
      .attr('width', 1.01 * markWidth)
      .attr('height', this.bounds.height)
      .attr('x', (d: DataPointT, i: number) => {
        return this.bounds.xPos + (i * markWidth);
      })
      .attr('y', this.bounds.yPos)
      .attr('fill', (d: DataPointT) => toHex(this.colorFn(this.intensityFn(d))));
  }
}
