import Blockly from "blockly/core";

// see https://github.com/jollytoad/blockly/blob/jollytoad/download-block/tests/playgrounds/screenshot.js

/**
 * Convert an SVG of a block to a PNG data URI.
 * @param {Blockly.BlockSvg} block The block.
 * @returns {Promise<string>} A promise that resolves with the data URI.
 */
export async function blockToPngBase64(
  block: Blockly.BlockSvg
): Promise<string> {
  try {
    // Calculate block dimensions and create an SVG element.
    const bBox = block.getBoundingRectangle();
    const width = bBox.right - bBox.left;
    const height = bBox.bottom - bBox.top;

    const blockCanvas = block.getSvgRoot();
    let clone = blockCanvas.cloneNode(true) as SVGSVGElement;

    console.debug(clone);

    clone.removeAttribute("transform");
    Blockly.utils.dom.removeClass(clone, "blocklySelected");

    let svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    svg.appendChild(clone);
    console.debug(clone);
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.setAttribute("width", width.toString());
    svg.setAttribute("height", height.toString());

    // Include styles.
    const css = Array.from(document.head.querySelectorAll("style")).find((el) =>
      /\.blocklySvg/.test(el.textContent || "")
    ) as HTMLStyleElement;
    let style = document.createElement("style");
    style.textContent = css.textContent || "";
    svg.insertBefore(style, svg.firstChild);

    // Serialize SVG and convert to PNG.
    let svgAsXML = new XMLSerializer().serializeToString(svg);
    svgAsXML = svgAsXML.replace(/&nbsp/g, "&#160");
    const data = `data:image/svg+xml,${encodeURIComponent(svgAsXML)}`;

    return new Promise<string>((resolve, reject) => {
      let img = new Image();
      img.onload = () => {
        let canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        let context = canvas.getContext("2d");
        if (context) {
          context.drawImage(img, 0, 0, width, height);
          // PNGデータURIではなく、base64エンコードされたPNGを返す
          const dataUri = canvas.toDataURL("image/png");
          const base64Data = dataUri.split(",")[1]; // データURIからbase64部分を抽出
          resolve(base64Data);
        } else {
          reject(new Error("Failed to get canvas context"));
        }
      };
      img.onerror = reject;
      img.src = data;
    });
  } catch (error) {
    console.error("Error in blockToPng:", error);
    throw error;
  }
}
