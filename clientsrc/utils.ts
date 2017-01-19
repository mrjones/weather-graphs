let scale = function(d: number, dMin: number, dMax: number, rangeMin: number, rangeMax: number): number {
    return rangeMin + (rangeMax - rangeMin) * ((d - dMin) / (dMax - dMin));
};

export { scale };
