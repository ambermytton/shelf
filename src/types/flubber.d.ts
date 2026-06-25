declare module 'flubber' {
  interface Options {
    maxSegmentLength?: number;
    string?: boolean;
  }
  export function interpolate(
    fromShape: string,
    toShape: string,
    options?: Options
  ): (t: number) => string;
  export function interpolateAll(
    fromShapes: string[],
    toShapes: string[],
    options?: Options
  ): (t: number) => string[];
  export function fromCircle(cx: number, cy: number, r: number, toShape: string, options?: Options): (t: number) => string;
  export function toCircle(fromShape: string, cx: number, cy: number, r: number, options?: Options): (t: number) => string;
}
