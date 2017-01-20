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

export class IntensityBand<DataPointT> {
  private intensityFn: CompteIntensityFn<DataPointT>;
  private colorFn: ColorForIntensityFn;
  private bounds: BoundingBox;

  constructor(intensityFn: CompteIntensityFn<DataPointT>,
              colorFn: ColorForIntensityFn,
              bounds: BoundingBox) {
    this.intensityFn = intensityFn;
    this.colorFn = colorFn;
    this.bounds = bounds;
  }

  public render(rootElt: Selection<BaseType, {}, HTMLElement, any>,
                data: DataPointT[]) {
    let precipBarG = rootElt.append('g');

    let markWidth = 1.05 * (this.bounds.width / data.length);

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

    precipBarG.selectAll('.precipPoint')
      .data(data)
      .enter()
      .append('rect')
      .attr('width', markWidth)
      .attr('height', this.bounds.height)
      .attr('x', (d: DataPointT, i: number) => {
        return this.bounds.xPos + (i * markWidth);
      })
      .attr('y', this.bounds.yPos)
      .attr('fill', (d: DataPointT) => toHex(this.colorFn(this.intensityFn(d))));
  }
}
