import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QRCodeSVG } from "qrcode.react";

type QrLevel = "L" | "M" | "Q" | "H";

const DEFAULT_LEVEL: QrLevel = "M";
const DEFAULT_RASTER_SIZE = 512;
const MAX_SVG_ENTRIES = 20;
const MAX_RASTER_ENTRIES = 20;

function trimCache<K, V>(cache: Map<K, V>, maxEntries: number): void {
  while (cache.size > maxEntries) {
    const firstKey = cache.keys().next().value;
    if (firstKey === undefined) break;
    cache.delete(firstKey);
  }
}

function parseQrForegroundPath(svgMarkup: string): { pathData: string | null; numCells: number } {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgMarkup, "image/svg+xml");
  const svg = doc.querySelector("svg");
  const paths = doc.querySelectorAll("svg > path");

  let numCells = DEFAULT_RASTER_SIZE;
  if (svg) {
    const viewBox = svg.getAttribute("viewBox");
    if (viewBox) {
      const parts = viewBox.split(" ").map((p) => parseInt(p, 10));
      if (parts.length === 4 && !Number.isNaN(parts[2])) {
        numCells = parts[2];
      }
    }
  }

  let pathData: string | null = null;
  // QRCodeSVG emits background path first and foreground path second.
  if (paths.length >= 2) pathData = (paths[1] as SVGPathElement).getAttribute("d");
  else if (paths.length === 1) pathData = (paths[0] as SVGPathElement).getAttribute("d");

  return { pathData, numCells };
}

class QRCodeCacheService {
  private readonly svgCache = new Map<string, string>();
  private readonly rasterCache = new Map<string, HTMLCanvasElement>();

  private getSvgCacheKey(url: string, size: number, level: QrLevel): string {
    return `${level}|${size}|${url}`;
  }

  private getRasterCacheKey(url: string, level: QrLevel, rasterSize: number): string {
    return `${level}|${rasterSize}|${url}`;
  }

  private touch<K, V>(cache: Map<K, V>, key: K): V | undefined {
    const value = cache.get(key);
    if (value === undefined) return undefined;
    cache.delete(key);
    cache.set(key, value);
    return value;
  }

  getSVGMarkup(url: string, size: number = 128, level: QrLevel = DEFAULT_LEVEL): string {
    const key = this.getSvgCacheKey(url, size, level);
    const cached = this.touch(this.svgCache, key);
    if (cached) return cached;

    const svgMarkup = renderToStaticMarkup(React.createElement(QRCodeSVG, { value: url, size, level, includeMargin: false }));

    this.svgCache.set(key, svgMarkup);
    trimCache(this.svgCache, MAX_SVG_ENTRIES);
    return svgMarkup;
  }

  private buildRasterCanvas(url: string, level: QrLevel, rasterSize: number): HTMLCanvasElement {
    const svgMarkup = this.getSVGMarkup(url, rasterSize, level);
    const { pathData, numCells } = parseQrForegroundPath(svgMarkup);

    const canvas = document.createElement("canvas");
    canvas.width = rasterSize;
    canvas.height = rasterSize;
    const ctx = canvas.getContext("2d");
    if (!ctx || !pathData) return canvas;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#000000";

    const scale = rasterSize / numCells;
    const rx = /M\s*([0-9]+)[, ]\s*([0-9]+)[^h]*h([0-9]+)/g;
    let m;
    while ((m = rx.exec(pathData)) !== null) {
      const startX = parseInt(m[1], 10);
      const startY = parseInt(m[2], 10);
      const runW = parseInt(m[3], 10);
      ctx.fillRect(startX * scale, startY * scale, runW * scale, scale);
    }

    return canvas;
  }

  getRasterCanvas(url: string, level: QrLevel = DEFAULT_LEVEL, rasterSize: number = DEFAULT_RASTER_SIZE): HTMLCanvasElement {
    const key = this.getRasterCacheKey(url, level, rasterSize);
    const cached = this.touch(this.rasterCache, key);
    if (cached) return cached;

    const canvas = this.buildRasterCanvas(url, level, rasterSize);
    this.rasterCache.set(key, canvas);
    trimCache(this.rasterCache, MAX_RASTER_ENTRIES);
    return canvas;
  }

  drawToContext(ctx: CanvasRenderingContext2D, url: string, x: number, y: number, size: number, level: QrLevel = DEFAULT_LEVEL): void {
    const source = this.getRasterCanvas(url, level);
    ctx.drawImage(source, x, y, size, size);
  }
}

export const qrCodeCacheService = new QRCodeCacheService();
