// Convert RGB to HSV
function rgb2hsv(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  let max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, v = max;
  let d = max - min;
  s = max === 0 ? 0 : d / max;
  if (max === min) {
    h = 0;
  } else {
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return [h * 360, s, v];
}

// Classification + masking with circle outline
function classifyAndMask(canvas, thresholds) {
  const ctx = canvas.getContext('2d');
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const radius = thresholds.radius || Math.min(canvas.width, canvas.height) / 2;

  let counts = {DarkGreen:0, LightGreen:0, Brown:0, Sky:0, Other:0};
  let greenPixels = [];

  for (let i = 0; i < data.length; i += 4) {
    let x = (i/4) % canvas.width;
    let y = Math.floor((i/4) / canvas.width);

    if ((x-cx)**2 + (y-cy)**2 > radius**2) {
      data[i] = 200; data[i+1] = 200; data[i+2] = 200;
      continue;
    }

    let r = data[i], g = data[i+1], b = data[i+2];
    let [h,s,v] = rgb2hsv(r,g,b);

    let cls = "Other";
    if (h >= thresholds.greenHmin && h <= thresholds.greenHmax && s > thresholds.greenSmin) {
      cls = "Green";
      greenPixels.push({r,g,b,v});
      data[i] = 0; data[i+1] = 128; data[i+2] = 0;
    } else if (h >= thresholds.brownHmin && h <= thresholds.brownHmax && s > thresholds.brownSmin && v < thresholds.brownVmax) {
      cls = "Brown";
      data[i] = 139; data[i+1] = 69; data[i+2] = 19;
    } else if (h >= thresholds.skyHmin && h <= thresholds.skyHmax && v > thresholds.skyVmin) {
      cls = "Sky";
      data[i] = 135; data[i+1] = 206; data[i+2] = 235;
    } else {
      data[i] = 220; data[i+1] = 220; data[i+2] = 220;
    }
    counts[cls] = (counts[cls] || 0) + 1;
  }

  if (greenPixels.length > 0) {
    let vSorted = greenPixels.map(p=>p.v).sort((a,b)=>a-b);
    let vMedian = vSorted[Math.floor(vSorted.length/2)];
    counts.DarkGreen = greenPixels.filter(p => p.v <= vMedian).length;
    counts.LightGreen = greenPixels.filter(p => p.v > vMedian).length;
    counts.Green = 0;
  }

  ctx.putImageData(imageData, 0, 0);

  // Draw circle outline
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, 2*Math.PI);
  ctx.strokeStyle = "red";
  ctx.lineWidth = 2;
  ctx.stroke();

  let total = Object.values(counts).reduce((a,b)=>a+b,0) || 1;
  let percentages = {};
  for (let c in counts) {
    percentages[c] = (counts[c]/total*100).toFixed(1);
  }

  function medianRGB(pixels) {
    if (pixels.length === 0) return [0,0,0];
    let rs = pixels.map(p=>p.r).sort((a,b)=>a-b);
    let gs = pixels.map(p=>p.g).sort((a,b)=>a-b);
    let bs = pixels.map(p=>p.b).sort((a,b)=>a-b);
    return [
      rs[Math.floor(rs.length/2)],
      gs[Math.floor(gs.length/2)],
      bs[Math.floor(bs.length/2)]
    ];
  }

  let vSorted = greenPixels.map(p=>p.v).sort((a,b)=>a-b);
  let vMedian = vSorted[Math.floor(vSorted.length/2)];
  let darkPixels = greenPixels.filter(p => p.v <= vMedian);
  let lightPixels = greenPixels.filter(p => p.v > vMedian);

  let domDark = medianRGB(darkPixels);
  let domLight = medianRGB(lightPixels);

  return {percentages, domDark, domLight};
}

// UI wiring
const upload = document.getElementById('upload');
const autoDetectBtn = document.getElementById('autoDetect');
const canvasOriginal = document.getElementById('canvasOriginal');
const canvasClassified = document.getElementById('canvasClassified');
const ctxOriginal = canvasOriginal.getContext('2d');
const ctxClassified = canvasClassified.getContext('2d');

function getThresholds() {
  return {
    radius: parseInt(document.getElementById('radius').value),
    greenHmin: parseFloat(document.getElementById('greenHmin').value),
    greenHmax: parseFloat(document.getElementById('greenHmax').value),
    greenSmin: parseFloat(document.getElementById('greenSmin').value),
    brownHmin: parseFloat(document.getElementById('brownHmin').value),
    brownHmax: parseFloat(document.getElementById('brownHmax').value),
    brownSmin: parseFloat(document.getElementById('brownSmin').value),
    brownVmax: parseFloat(document.getElementById('brownVmax').value),
    skyHmin: parseFloat(document.getElementById('skyHmin').value),
    skyHmax: parseFloat(document.getElementById('skyHmax').value),
    skyVmin: parseFloat(document.getElementById('skyVmin').value)
  };
}

function updateResults() {
  let thresholds = getThresholds();
  let result = classifyAndMask(canvasClassified, thresholds);

  const swatches = {
    DarkGreen: "rgb(0,100,0)",
    LightGreen: "rgb(144,238,144)",
    Brown: "rgb(139,69,19)",
    Sky: "rgb(135,206,235)",
    Other: "rgb(200,200,200)"
  };

  let tableHTML = "<tr><th>Class</th><th>Color</th><th>% Pixels</th></tr>";
  for (let c in result.percentages) {
    let color = swatches[c] || "rgb(220,220,220)";
    tableHTML += `<tr>
      <td>${c}</td>
      <td><div style="width:20px;height:20px;background:${color};border:1px solid #000;"></div></td>
      <td>${result.percentages[c]}%</td>
    </tr>`;
  }
  document.getElementById('percentagesTable').innerHTML = tableHTML;

  document.getElementById('dominant').textContent =
    "Dominant Dark Green RGB: " + result.domDark.join(", ") + "\n" +
    "Dominant Light Green RGB: " + result.domLight.join(", ");
}

// Auto-detect clustering (simple hue clustering)

// Auto-detect clustering (simple hue clustering)
function autoDetect() {
  const ctx = canvasOriginal.getContext('2d');
  const imageData = ctx.getImageData(0, 0, canvasOriginal.width, canvasOriginal.height);
  const data = imageData.data;
  let hues = [];

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i], g = data[i+1], b = data[i+2];
    let [h,s,v] = rgb2hsv(r,g,b);
    hues.push(h);
  }

  hues.sort((a,b)=>a-b);
  let n = hues.length;
  if (n < 3) return;

  // crude clustering: quartiles
  let cluster1 = hues[Math.floor(n/4)];
  let cluster2 = hues[Math.floor(n/2)];
  let cluster3 = hues[Math.floor(3*n/4)];

  // map clusters to slider ranges
  document.getElementById('greenHmin').value = Math.max(0, cluster1 - 20);
  document.getElementById('greenHmax').value = Math.min(360, cluster1 + 20);

  document.getElementById('brownHmin').value = Math.max(0, cluster2 - 20);
  document.getElementById('brownHmax').value = Math.min(360, cluster2 + 20);

  document.getElementById('skyHmin').value = Math.max(0, cluster3 - 20);
  document.getElementById('skyHmax').value = Math.min(360, cluster3 + 20);

  updateResults();
}

// Handle image upload
upload.addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const img = new Image();
  img.onload = () => {
    canvasOriginal.width = img.width;
    canvasOriginal.height = img.height;
    canvasClassified.width = img.width;
    canvasClassified.height = img.height;
    ctxOriginal.drawImage(img, 0, 0);
    ctxClassified.drawImage(img, 0, 0);

    // set slider max to half of smaller dimension
    let maxRadius = Math.min(img.width, img.height) / 2;
    document.getElementById('radius').max = maxRadius;
    document.getElementById('radius').value = maxRadius;

    updateResults();
  };
  img.src = URL.createObjectURL(file);
});

// Re-run classification when sliders change
document.querySelectorAll('#controls input').forEach(input => {
  input.addEventListener('input', updateResults);
});

// Auto-detect button
autoDetectBtn.addEventListener('click', autoDetect);
