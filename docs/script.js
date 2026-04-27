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

// Classification function
function classifyImage(canvas, thresholds) {
  const ctx = canvas.getContext('2d');
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const radius = thresholds.radius;

  let counts = {DarkGreen:0, LightGreen:0, Brown:0, Sky:0, Other:0};
  let greenPixels = [];

  for (let i = 0; i < data.length; i += 4) {
    let x = (i/4) % canvas.width;
    let y = Math.floor((i/4) / canvas.width);

    if ((x-cx)**2 + (y-cy)**2 > radius**2) continue;

    let r = data[i], g = data[i+1], b = data[i+2];
    let [h,s,v] = rgb2hsv(r,g,b);

    let cls = "Other";
    if (h >= thresholds.greenHmin && h <= thresholds.greenHmax && s > thresholds.greenSmin) {
      cls = "Green";
      greenPixels.push({r,g,b,v});
    } else if (h >= thresholds.brownHmin && h <= thresholds.brownHmax && s > thresholds.brownSmin && v < thresholds.brownVmax) {
      cls = "Brown";
    } else if (h >= thresholds.skyHmin && h <= thresholds.skyHmax && v > thresholds.skyVmin) {
      cls = "Sky";
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

  let total = Object.values(counts).reduce((a,b)=>a+b,0);
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
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

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
  let result = classifyImage(canvas, thresholds);

  // Build table
  let tableHTML = "<tr><th>Class</th><th>% Pixels</th></tr>";
  for (let c in result.percentages) {
    tableHTML += `<tr><td>${c}</td><td>${result.percentages[c]}%</td></tr>`;
  }
  document.getElementById('percentagesTable').innerHTML = tableHTML;

  // Show dominant RGBs
  document.getElementById('dominant').textContent =
    "Dominant Dark Green RGB: " + result.domDark.join(", ") + "\n" +
    "Dominant Light Green RGB: " + result.domLight.join(", ");
}

upload.addEventListener('change', e => {
  const file = e.target.files[0];
  const img = new Image();
  img.onload = () => {
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);
    updateResults();
  };
  img.src = URL.createObjectURL(file);
});

// Re-run classification when sliders change
document.querySelectorAll('#controls input').forEach(input => {
  input.addEventListener('input', updateResults);
});
  let total = Object.values(counts).reduce((a,b)=>a+b,0);
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
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

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
  let result = classifyImage(canvas, thresholds);
  document.getElementById('percentages').textContent = JSON.stringify(result.percentages, null, 2);
  document.getElementById('dominant').textContent = 
    "Dominant Dark Green RGB: " + result.domDark.join(", ") + "\n" +
    "Dominant Light Green RGB: " + result.domLight.join(", ");
}

upload.addEventListener('change', e => {
  const file = e.target.files[0];
  const img = new Image();
  img.onload = () => {
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);
    updateResults();
  };
  img.src = URL.createObjectURL(file);
});

// Re-run classification when sliders change
document.querySelectorAll('#controls input').forEach(input => {
  input.addEventListener('input', updateResults);
});
