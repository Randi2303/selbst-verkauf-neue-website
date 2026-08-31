/** Typdeklaration für heic-convert (liefert selbst keine Typen mit) */
declare module "heic-convert" {
  function heicConvert(options: {
    buffer: Buffer | Uint8Array;
    format: "JPEG" | "PNG";
    quality?: number;
  }): Promise<ArrayBuffer>;
  export default heicConvert;
}
