import { DataPoint } from './model';

export let scale = function(d: number, dMin: number, dMax: number, rangeMin: number, rangeMax: number): number {
    return rangeMin + (rangeMax - rangeMin) * ((d - dMin) / (dMax - dMin));
};

export let midnightsBetween = function(startTime: Date, endTime: Date): Date[] {
  let results: Date[] = [];
  let t = new Date(startTime);
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

export let selectMaxes = function(data: DataPoint[], valueFn: (DataPoint) => number) {
  return selectExtremes(data, valueFn, (a, b) => a > b);
};

export let selectMins = function(data: DataPoint[], valueFn: (DataPoint) => number) {
  return selectExtremes(data, valueFn, (a, b) => a < b);
};

class SelectedPoint {
  public value: number;
  public time: Date;
};

let selectExtremes = function(data: DataPoint[], valueFn: (DataPoint) => number, greaterThanFn: (n1: number, n2: number) => boolean): SelectedPoint[] {
  let maxes: SelectedPoint[] = [];

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
