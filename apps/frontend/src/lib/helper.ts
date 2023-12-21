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
    clone.removeAttribute("transform");
    Blockly.utils.dom.removeClass(clone, "blocklySelected");

    // Create wrapper for the cloned SVG
    let wrapper = document.createElementNS("http://www.w3.org/2000/svg", "g");
    wrapper.setAttribute("class", "geras-renderer classic-theme");
    wrapper.appendChild(clone);

    let svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    svg.appendChild(wrapper);
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.setAttribute("width", width.toString());
    svg.setAttribute("height", height.toString());

    // Include styles from specific style tag and Blockly's styles
    let gerasClassicStyle = document.getElementById(
      "blockly-renderer-style-geras-classic"
    ) as HTMLStyleElement;
    let blocklySvgStyle = Array.from(
      document.head.querySelectorAll("style")
    ).find((el) =>
      /\.blocklySvg/.test(el.textContent || "")
    ) as HTMLStyleElement;

    let style = document.createElement("style");
    style.textContent = `${gerasClassicStyle.textContent || ""}\n${
      blocklySvgStyle.textContent || ""
    }`;
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
          const dataUri = canvas.toDataURL("image/png");
          const base64Data = dataUri.split(",")[1];
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

export const readStreamData = async <T>(
  url: string,
  body: T,
  method: "POST" | "PATCH",
  updateOutput: (chunk: string) => void
) => {
  const response = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(response.statusText);
  }

  const data = response.body;
  if (!data) {
    return;
  }

  const reader = data.getReader();
  const decoder = new TextDecoder();
  let done = false;

  while (!done) {
    const { value, done: doneReading } = await reader.read();
    done = doneReading;
    if (value) {
      updateOutput(decoder.decode(value));
    }
  }
};
