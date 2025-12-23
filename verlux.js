/*
 * VeraLux Suite v2.0.7 (Safe Star Levels)
 * Unified Photometric Engine for PixInsight
 *
 * Contains:
 * 1. HyperMetric Stretch (Physics-based IHS)
 * 2. StarComposer (Star Reconstruction & Composition)
 *
 * Based on the original Python implementation by Riccardo Paterniti
 * Ported to PixInsight JavaScript Runtime (PJSR)
 *
 * Copyright (c) 2025 Riccardo Paterniti
 * Contact: info@veralux.space
 */

#feature-id    VeraLux > VeraLux Suite
#feature-info  <b>VeraLux Suite v2.0.7</b><br/>\
               A unified photometric engine for deep-sky processing.<br/>\
               <br/>\
               <b>Module 1: HyperMetric Stretch</b><br/>\
               Physics-based linear-to-nonlinear stretch engine.<br/>\
               • <b>Input:</b> Any LINEAR image (Stars or Starless).<br/>\
               • <b>Smart Fixer:</b> Prevents black clipping via iterative analysis.<br/>\
               • <b>Unified Strategy:</b> Single slider for Noise vs Highlight balance.<br/>\
               <br/>\
               <b>Module 2: StarComposer</b><br/>\
               High-fidelity star reconstruction and composition.<br/>\
               • <b>Input:</b> Linear Starmask + Stretched Starless Base.<br/>\
               • <b>Auto-Star:</b> Smart solver targeting non-destructive visibility.<br/>\
               • <b>Vector Preservation:</b> Zero hue shift star stretching.<br/>\
               <br/>\
               Input Requirement: <b>Linear, Color Calibrated (SPCC), Denoised data.</b>

#feature-icon  verlux-icon.svg

#include <pjsr/Sizer.jsh>
#include <pjsr/FrameStyle.jsh>
#include <pjsr/TextAlign.jsh>
#include <pjsr/StdButton.jsh>
#include <pjsr/StdIcon.jsh>
#include <pjsr/NumericControl.jsh>
#include <pjsr/SampleType.jsh>
#include <pjsr/ColorSpace.jsh>
#include <pjsr/DataType.jsh>
#include <pjsr/ImageOp.jsh>
#include <pjsr/MorphOp.jsh>

var VERSION = "2.0.7";

// =============================================================================
//  SENSOR DATABASE
// =============================================================================
var SENSOR_PROFILES = {
   "Rec.709 (Recommended)": {
      weights: [0.2126, 0.7152, 0.0722],
      description: "ITU-R BT.709 standard for sRGB/HDTV",
      info: "Default choice. Best for general use, DSLR and unknown sensors."
   },
   "Sony IMX571 (ASI2600/QHY268)": {
      weights: [0.2944, 0.5021, 0.2035],
      description: "Sony IMX571 26MP APS-C BSI (STARVIS)",
      info: "Gold standard APS-C. Excellent balance for broadband."
   },
   "Sony IMX533 (ASI533)": {
      weights: [0.2910, 0.5072, 0.2018],
      description: "Sony IMX533 9MP 1\" Square BSI (STARVIS)",
      info: "Popular square format. Very low noise."
   },
   "Sony IMX455 (ASI6200/QHY600)": {
      weights: [0.2987, 0.5001, 0.2013],
      description: "Sony IMX455 61MP Full Frame BSI (STARVIS)",
      info: "Full frame reference sensor."
   },
   "Sony IMX294 (ASI294)": {
      weights: [0.3068, 0.5008, 0.1925],
      description: "Sony IMX294 11.7MP 4/3\" BSI",
      info: "High sensitivity 4/3 format."
   },
   "Sony IMX183 (ASI183)": {
      weights: [0.2967, 0.4983, 0.2050],
      description: "Sony IMX183 20MP 1\" BSI",
      info: "High resolution 1-inch sensor."
   },
   "Sony IMX178 (ASI178)": {
      weights: [0.2346, 0.5206, 0.2448],
      description: "Sony IMX178 6.4MP 1/1.8\" BSI",
      info: "High resolution entry-level sensor."
   },
   "Sony IMX224 (ASI224)": {
      weights: [0.3402, 0.4765, 0.1833],
      description: "Sony IMX224 1.27MP 1/3\" BSI",
      info: "Classic planetary sensor. High Red response."
   },
   "Sony IMX585 (ASI585) - STARVIS 2": {
      weights: [0.3431, 0.4822, 0.1747],
      description: "Sony IMX585 8.3MP 1/1.2\" BSI (STARVIS 2)",
      info: "NIR optimized. Excellent for H-Alpha/Narrowband."
   },
   "Sony IMX662 (ASI662) - STARVIS 2": {
      weights: [0.3430, 0.4821, 0.1749],
      description: "Sony IMX662 2.1MP 1/2.8\" BSI (STARVIS 2)",
      info: "Planetary/Guiding. High Red/NIR sensitivity."
   },
   "Sony IMX678/715 - STARVIS 2": {
      weights: [0.3426, 0.4825, 0.1750],
      description: "Sony IMX678/715 BSI (STARVIS 2)",
      info: "High resolution planetary/security sensors."
   },
   "Panasonic MN34230 (ASI1600/QHY163)": {
      weights: [0.2650, 0.5250, 0.2100],
      description: "Panasonic MN34230 4/3\" CMOS",
      info: "Classic Mono/OSC sensor. Optimized weights."
   },
   "Canon EOS (Modern - 60D/6D/R)": {
      weights: [0.2550, 0.5250, 0.2200],
      description: "Canon CMOS Profile (Modern)",
      info: "Balanced profile for most Canon EOS cameras."
   },
   "Nikon DSLR (Modern - D5300/D850)": {
      weights: [0.2600, 0.5100, 0.2300],
      description: "Nikon CMOS Profile (Modern)",
      info: "Balanced profile for Nikon Expeed 4+ cameras."
   },
   "ZWO Seestar S50": {
      weights: [0.3333, 0.4866, 0.1801],
      description: "ZWO Seestar S50 (IMX462)",
      info: "Specific profile for Seestar S50 smart telescope."
   },
   "ZWO Seestar S30": {
      weights: [0.2928, 0.5053, 0.2019],
      description: "ZWO Seestar S30",
      info: "Specific profile for Seestar S30 smart telescope."
   },
   "Dual Band (OSC)": {
      weights: [0.3333, 0.3333, 0.3333],
      description: "Dual Band Filters (L-Extreme/Ultimate)",
      info: "Uniform weighting. Prevents OIII background noise from tinting the image Teal."
   },
   "Narrowband HOO": {
      weights: [0.3333, 0.3333, 0.3333],
      description: "Bicolor palette: Hα=Red, OIII=Green+Blue",
      info: "Uniform weighting. Stabilizes background vectors for synthetic palettes."
   },
   "Narrowband SHO": {
      weights: [0.3333, 0.3333, 0.3333],
      description: "Hubble palette: SII=Red, Hα=Green, OIII=Blue",
      info: "Uniform weighting. Ensures equal contribution from S/H/O."
   }
};

var DEFAULT_PROFILE = "Rec.709 (Recommended)";

// =============================================================================
//  CORE ENGINE (Math & Statistics)
// =============================================================================

function VeraLuxCore() {}

VeraLuxCore.percentile = function(arr, p) {
   if (arr.length === 0) return 0;
   arr.sort(function(a, b) { return a - b; });
   var idx = (p / 100.0) * (arr.length - 1);
   var lower = Math.floor(idx);
   var upper = Math.ceil(idx);
   var weight = idx - lower;
   if (upper >= arr.length) return arr[arr.length - 1];
   return arr[lower] * (1 - weight) + arr[upper] * weight;
};

// Statistical Anchor (Fallback)
VeraLuxCore.calculateAnchorStats = function(img, isRGB) {
   var w = img.width; var h = img.height;
   var totalPixels = w * h;
   var step = Math.max(1, Math.floor(totalPixels / 500000));
   if (isRGB) {
      var floors = [];
      for (var c = 0; c < 3; c++) {
         var channelSamples = [];
         for (var i = 0; i < totalPixels; i += step) {
            var y = Math.floor(i / w); var x = i % w;
            channelSamples.push(img.sample(x, y, c));
         }
         floors.push(this.percentile(channelSamples, 0.5));
      }
      return Math.max(0.0, Math.min.apply(null, floors) - 0.00025);
   } else {
      var samples = [];
      for (var i = 0; i < totalPixels; i += step) {
         var y = Math.floor(i / w); var x = i % w;
         samples.push(img.sample(x, y, 0));
      }
      return Math.max(0.0, this.percentile(samples, 0.5) - 0.00025);
   }
};

// Adaptive Anchor (Histogram Analysis)
VeraLuxCore.calculateAnchorAdaptive = function(img, weights) {
   var w = img.width; var h = img.height;
   var totalPixels = w * h;
   var isRGB = (img.numberOfChannels === 3);
   var step = Math.max(1, Math.floor(totalPixels / 2000000)); // Sample heavily
   var samples = [];
   
   for (var i = 0; i < totalPixels; i += step) {
      var y = Math.floor(i / w); var x = i % w;
      if (isRGB) {
         samples.push(weights[0]*img.sample(x,y,0) + weights[1]*img.sample(x,y,1) + weights[2]*img.sample(x,y,2));
      } else {
         samples.push(img.sample(x,y,0));
      }
   }
   
   var numBins = 65536; 
   var hist = new Array(numBins); for(var z=0;z<numBins;++z) hist[z]=0;
   var maxVal = 0;
   
   for (var j = 0; j < samples.length; j++) {
      var bin = Math.floor(samples[j] * (numBins - 1));
      if(bin >= 0 && bin < numBins) { 
          hist[bin]++; 
          if(hist[bin] > maxVal) maxVal = hist[bin]; 
      }
   }
   
   // Smoothing
   var smoothed = new Array(numBins); for(var z=0;z<numBins;++z) smoothed[z]=0;
   var windowSize = 50;
   for (var k = 0; k < numBins; k++) {
      var sum = 0; var count = 0;
      for (var win = -windowSize; win <= windowSize; win++) {
         if (k+win >= 0 && k+win < numBins) { sum += hist[k+win]; count++; }
      }
      smoothed[k] = sum / count;
   }
   
   // Find Peak
   var peakIdx = 0; var peakVal = 0;
   for (var k = 100; k < numBins; k++) { 
       if (smoothed[k] > peakVal) { peakVal = smoothed[k]; peakIdx = k; } 
   }
   
   // Walk back to 6% of peak
   var targetVal = peakVal * 0.06; var anchorIdx = 0;
   for (var k = peakIdx; k >= 0; k--) { 
       if (smoothed[k] < targetVal) { anchorIdx = k; break; } 
   }
   
   var anchor = anchorIdx / (numBins - 1);
   if (anchor <= 0.0 || isNaN(anchor)) anchor = this.percentile(samples, 0.5);
   return Math.max(0.0, anchor);
};

VeraLuxCore.hyperbolicStretch = function(value, D, b, SP) {
   D = Math.max(D, 0.1); b = Math.max(b, 0.1); SP = SP || 0.0;
   var term1 = Math.asinh(D * (value - SP) + b);
   var term2 = Math.asinh(b);
   var norm = Math.asinh(D * (1.0 - SP) + b) - term2;
   if (norm === 0) norm = 1e-6;
   return (term1 - term2) / norm;
};

VeraLuxCore.applyMTF = function(value, m) {
   if (value <= 0) return 0; if (value >= 1) return 1;
   var term1 = (m - 1.0) * value;
   var term2 = (2.0 * m - 1.0) * value - m;
   if (Math.abs(term2) < 1e-9) return value;
   return Math.max(0.0, Math.min(1.0, term1 / term2));
};

// Binary search for LogD
VeraLuxCore.solveLogD = function(medianIn, targetMedian, bVal) {
   if (medianIn < 1e-9) return 2.0;
   var lowLog = 0.0; var highLog = 7.0; var bestLogD = 2.0;
   for (var iter = 0; iter < 40; iter++) {
      var midLog = (lowLog + highLog) / 2.0;
      var midD = Math.pow(10.0, midLog);
      var testVal = this.hyperbolicStretch(medianIn, midD, bVal, 0.0);
      if (Math.abs(testVal - targetMedian) < 0.0001) { bestLogD = midLog; break; }
      if (testVal < targetMedian) lowLog = midLog;
      else highLog = midLog;
   }
   return bestLogD;
};

// =============================================================================
//  HELPER FUNCTIONS (Surgery & Math)
// =============================================================================

function createGaussianKernel(size, sigma) {
   var kernel = new Matrix(size, size);
   var center = (size - 1) / 2;
   var sum = 0;
   for (var y = 0; y < size; y++) {
      for (var x = 0; x < size; x++) {
         var dist = Math.sqrt((x - center) * (x - center) + (y - center) * (y - center));
         var val = Math.exp(-(dist * dist) / (2 * sigma * sigma));
         kernel.at(y, x, val);
         sum += val;
      }
   }
   // Normalize
   for (var i = 0; i < size * size; i++) kernel.at(i, kernel.at(i) / sum);
   return kernel;
}

function applyOpticalHealing(img, strength) {
   if (strength <= 0) return img;
   var workImg = new Image(img);
   // Convert to Lab to isolate chroma
   workImg.convert(ColorSpace_Lab);
   
   var kSize = Math.floor(strength * 2) + 1;
   if (kSize % 2 == 0) kSize++;
   var sigma = (kSize / 2.0) * 0.3 + 0.8; 
   var kernel = createGaussianKernel(kSize, sigma);
   
   // Blur a and b channels
   workImg.convolve(kernel, 1); 
   workImg.convolve(kernel, 2); 
   
   workImg.convert(ColorSpace_RGB);
   return workImg;
}

function applyStarReduction(img, intensity) {
   if (intensity <= 0) return img;
   var kSize = (intensity < 0.5) ? 3 : 5;
   var strElem = new Matrix(kSize, kSize);
   var center = Math.floor(kSize/2);
   for(var y=0; y<kSize; y++) {
      for(var x=0; x<kSize; x++) {
         if( Math.sqrt(Math.pow(x-center,2) + Math.pow(y-center,2)) <= center ) strElem.at(y,x, 1);
         else strElem.at(y,x, 0);
      }
   }
   var eroded = new Image(img);
   eroded.morphology(MorphOp_Erosion, strElem);
   
   // Blend: result = img * (1-intensity) + eroded * intensity
   var result = new Image(img);
   var w = img.width; var h = img.height; var nc = img.numberOfChannels;
   
   for(var c=0; c<nc; c++) {
      for(var y=0; y<h; y++) {
         for(var x=0; x<w; x++) {
             var orig = img.sample(x, y, c);
             var ero = eroded.sample(x, y, c);
             result.setSample(orig * (1.0 - intensity) + ero * intensity, x, y, c);
         }
      }
   }
   return result;
}

function applyLSR(img, intensity) {
   if (intensity <= 0) return img;
   var kSizeVal = Math.floor(Math.min(img.height, img.width) / 15.0);
   if (kSizeVal % 2 == 0) kSizeVal++;
   if (kSizeVal < 3) kSizeVal = 3; if (kSizeVal > 127) kSizeVal = 127; 
   var sigma = (kSizeVal / 2.0) * 0.3 + 0.8;
   var kernel = createGaussianKernel(kSizeVal, sigma);
   
   var lowPass = new Image(img);
   lowPass.convolve(kernel);
   
   var highPass = new Image(img);
   highPass.apply(lowPass, ImageOp_Sub); // Img - LowPass
   highPass.truncate(0, 1);
   
   var result = new Image(img);
   // result = img*(1-int) + highPass*int
   // Using rescale/add for speed
   result.rescale(1.0 - intensity);
   highPass.rescale(intensity);
   result.apply(highPass, ImageOp_Add);
   
   return result;
}

function applyAdaptiveScaling(img, weights, targetBg) {
   var w = img.width; var h = img.height; var totalPixels = w * h;
   var nc = img.numberOfChannels; var isRGB = (nc === 3);
   var step = Math.max(1, Math.floor(totalPixels / 500000));
   
   var lumaSamples = [];
   for (var i = 0; i < totalPixels; i += step) {
      var y = Math.floor(i / w); var x = i % w;
      if (isRGB) lumaSamples.push(weights[0]*img.sample(x,y,0) + weights[1]*img.sample(x,y,1) + weights[2]*img.sample(x,y,2));
      else lumaSamples.push(img.sample(x,y,0));
   }
   
   var median = VeraLuxCore.percentile(lumaSamples, 50);
   var mean = 0; for(var k=0; k<lumaSamples.length; k++) mean += lumaSamples[k]; mean /= lumaSamples.length;
   var stdDev = 0; for(var k=0; k<lumaSamples.length; k++) stdDev += Math.pow(lumaSamples[k] - mean, 2); 
   stdDev = Math.sqrt(stdDev / lumaSamples.length);
   var minVal = 1.0; for(var i=0; i<lumaSamples.length; i++) { if(lumaSamples[i] < minVal) minVal = lumaSamples[i]; }
   
   // Floor Logic: 2.7 stdDev to properly align with black point
   var globalFloor = Math.max(minVal, median - 2.7 * stdDev);
   
   var softCeil = VeraLuxCore.percentile(lumaSamples, 99);
   var hardCeil = VeraLuxCore.percentile(lumaSamples, 99.99);
   if (softCeil <= globalFloor) softCeil = globalFloor + 1e-6;
   if (hardCeil <= softCeil) hardCeil = softCeil + 1e-6;
   
   var PEDESTAL = 0.001;
   var finalScale = Math.min((0.98 - PEDESTAL) / (softCeil - globalFloor + 1e-9), (1.0 - PEDESTAL) / (hardCeil - globalFloor + 1e-9));
   
   var result = new Image(w, h, nc, isRGB ? ColorSpace_RGB : ColorSpace_Gray, 32, SampleType_Real);
   for (var c = 0; c < nc; c++) {
      for (var y = 0; y < h; y++) {
         for (var x = 0; x < w; x++) {
            var val = img.sample(x, y, c);
            var expanded = (val - globalFloor) * finalScale + PEDESTAL;
            result.setSample(Math.max(0, Math.min(1, expanded)), x, y, c);
         }
      }
   }
   
   // Recalculate background after expansion to apply MTF shift
   lumaSamples = [];
   for (var i = 0; i < totalPixels; i += step) {
      var y = Math.floor(i / w); var x = i % w;
      if (isRGB) lumaSamples.push(weights[0]*result.sample(x,y,0) + weights[1]*result.sample(x,y,1) + weights[2]*result.sample(x,y,2));
      else lumaSamples.push(result.sample(x,y,0));
   }
   
   var currentBg = VeraLuxCore.percentile(lumaSamples, 50);
   if (currentBg > 0 && currentBg < 1 && Math.abs(currentBg - targetBg) > 0.001) {
      var m = (currentBg * (targetBg - 1.0)) / (currentBg * (2.0 * targetBg - 1.0) - targetBg);
      for (var c = 0; c < nc; c++) {
         for (var y = 0; y < h; y++) {
            for (var x = 0; x < w; x++) {
               result.setSample(VeraLuxCore.applyMTF(result.sample(x, y, c), m), x, y, c);
            }
         }
      }
   }
   return result;
}

function applySoftClip(img, threshold, rolloff) {
   var w = img.width; var h = img.height; var nc = img.numberOfChannels;
   var result = new Image(w, h, nc, nc === 3 ? ColorSpace_RGB : ColorSpace_Gray, 32, SampleType_Real);
   for (var c = 0; c < nc; c++) {
      for (var y = 0; y < h; y++) {
         for (var x = 0; x < w; x++) {
            var val = img.sample(x, y, c);
            if (val > threshold) {
               var t = (val - threshold) / (1.0 - threshold);
               val = threshold + (1.0 - threshold) * (1.0 - Math.pow(1.0 - Math.max(0,Math.min(1,t)), rolloff));
            }
            result.setSample(Math.max(0, Math.min(1, val)), x, y, c);
         }
      }
   }
   return result;
}

function composeStarImages(starmaskResult, starlessBase, useScreen) {
    if (starmaskResult.width != starlessBase.width || starmaskResult.height != starlessBase.height) {
        throw new Error("Dimension mismatch: Starmask and Starless image must be the same size.");
    }
    
    var w = starlessBase.width; 
    var h = starlessBase.height;
    var result = new Image(starlessBase);
    
    for(var c=0; c < result.numberOfChannels; c++) {
        for(var y=0; y < h; y++) {
            for(var x=0; x < w; x++) {
                var s = starmaskResult.sample(x, y, c);
                var b = starlessBase.sample(x, y, c);
                var val;
                
                if (useScreen) {
                    val = 1.0 - (1.0 - b) * (1.0 - s);
                } else {
                    val = b + s;
                }
                result.setSample(Math.max(0, Math.min(1, val)), x, y, c);
            }
        }
    }
    return result;
}

// =============================================================================
//  MAIN PROCESSING LOGIC
// =============================================================================

function processVeraLux(img, params, progressCallback) {
   if (progressCallback) progressCallback("Analyzing...");
   var w = img.width; var h = img.height; var nc = img.numberOfChannels; var isRGB = (nc === 3);
   var weights = params.weights;
   var logD = params.logD; var protectB = params.protectB;
   var convergence = params.convergence;
   var colorGrip = params.colorGrip !== undefined ? params.colorGrip : 1.0;
   var shadowConvergence = params.shadowConvergence !== undefined ? params.shadowConvergence : 0.0;
   var addPedestal = params.addPedestal !== false; // Default true
   
   var anchor = 0.0;
   if (params.adaptive) {
       if (progressCallback) progressCallback("Calculating Adaptive Anchor...");
       anchor = VeraLuxCore.calculateAnchorAdaptive(img, weights);
   } else {
       if (progressCallback) progressCallback("Calculating Statistical Anchor...");
       anchor = VeraLuxCore.calculateAnchorStats(img, isRGB);
   }
   
   var result = new Image(w, h, nc, isRGB ? ColorSpace_RGB : ColorSpace_Gray, 32, SampleType_Real);
   
   if (progressCallback) progressCallback("Stretching...");
   var epsilon = 1e-9; var lastPct = 0;
   var D_val = Math.pow(10, logD);
   var pedestal = 0.005;

   for (var y = 0; y < h; y++) {
      var pct = Math.round((y / h) * 100);
      if (progressCallback && pct !== lastPct) {
         if(pct % 5 === 0) progressCallback("Stretching: " + pct + "%");
         lastPct = pct;
         processEvents();
      }
      for (var x = 0; x < w; x++) {
         if (isRGB) {
            var r = Math.max(0, img.sample(x, y, 0) - anchor);
            var g = Math.max(0, img.sample(x, y, 1) - anchor);
            var b = Math.max(0, img.sample(x, y, 2) - anchor);
            var L = weights[0] * r + weights[1] * g + weights[2] * b;
            var Lsafe = L + epsilon;
            var Lstr = VeraLuxCore.hyperbolicStretch(L, D_val, protectB, 0);
            Lstr = Math.max(0, Math.min(1, Lstr));
            var k = Math.pow(Lstr, convergence);
            
            // Vector Logic
            var rFinal = Lstr * ((r / Lsafe) * (1.0 - k) + k);
            var gFinal = Lstr * ((g / Lsafe) * (1.0 - k) + k);
            var bFinal = Lstr * ((b / Lsafe) * (1.0 - k) + k);

            // Hybrid Logic
            if ((colorGrip < 1.0) || (shadowConvergence > 0.01)) {
               var rScal = Math.max(0, Math.min(1, VeraLuxCore.hyperbolicStretch(r, D_val, protectB, 0)));
               var gScal = Math.max(0, Math.min(1, VeraLuxCore.hyperbolicStretch(g, D_val, protectB, 0)));
               var bScal = Math.max(0, Math.min(1, VeraLuxCore.hyperbolicStretch(b, D_val, protectB, 0)));
               
               var currentGrip = colorGrip;
               if (shadowConvergence > 0.01) currentGrip = currentGrip * Math.pow(Lstr, shadowConvergence);
               var oneMinusGrip = 1.0 - currentGrip;
               
               rFinal = rFinal * currentGrip + rScal * oneMinusGrip;
               gFinal = gFinal * currentGrip + gScal * oneMinusGrip;
               bFinal = bFinal * currentGrip + bScal * oneMinusGrip;
            }
            
            if (addPedestal) {
               result.setSample(Math.max(0, Math.min(1, rFinal * (1.0 - pedestal) + pedestal)), x, y, 0);
               result.setSample(Math.max(0, Math.min(1, gFinal * (1.0 - pedestal) + pedestal)), x, y, 1);
               result.setSample(Math.max(0, Math.min(1, bFinal * (1.0 - pedestal) + pedestal)), x, y, 2);
            } else {
               result.setSample(Math.max(0, Math.min(1, rFinal)), x, y, 0);
               result.setSample(Math.max(0, Math.min(1, gFinal)), x, y, 1);
               result.setSample(Math.max(0, Math.min(1, bFinal)), x, y, 2);
            }
         } else {
            // Mono
            var val = Math.max(0, img.sample(x, y, 0) - anchor);
            var str = VeraLuxCore.hyperbolicStretch(val, D_val, protectB, 0);
            
            if (addPedestal) str = str * (1.0 - pedestal) + pedestal;
            
            result.setSample(Math.max(0, Math.min(1, str)), x, y, 0);
         }
      }
   }
   
   if (params.processingMode === "ready_to_use") {
      if (progressCallback) progressCallback("Adaptive Scaling...");
      result = applyAdaptiveScaling(result, weights, params.targetBg);
      if (progressCallback) progressCallback("Soft-clip Polish...");
      result = applySoftClip(result, 0.98, 2.0);
   }
   if (progressCallback) progressCallback("Complete!");
   return result;
}

function processStarPipeline(img, params, progressCallback) {
    if (progressCallback) progressCallback("Star Pipeline: Init...");
    var weights = params.weights;
    // 1. Anchor (Must check anchor before stretch for stars)
    var anchor = 0.0;
    if (params.adaptive) {
        anchor = VeraLuxCore.calculateAnchorAdaptive(img, weights);
    }
    
    // Create a temporary params object that bypasses modes we don't want
    var stretchParams = {
        weights: weights, 
        logD: params.logD, 
        protectB: params.protectB,
        convergence: params.convergence, 
        processingMode: "scientific", // Force manual, no scaling
        targetBg: 0, 
        colorGrip: params.colorGrip, 
        shadowConvergence: params.shadowConvergence, 
        adaptive: false, // Handled manually
        addPedestal: false // CRITICAL: Do not add background pedestal for star mask
    };
    
    // Pre-subtract anchor
    var workingImg = new Image(img);
    workingImg.apply(anchor, ImageOp_Sub);
    workingImg.truncate(0, 1);
    
    // Use the core stretcher
    var result = processVeraLux(workingImg, stretchParams, progressCallback);
    
    // Surgery
    if (params.lsr > 0) {
        if (progressCallback) progressCallback("Surgery: LSR...");
        result = applyLSR(result, params.lsr);
    }
    if (params.healing > 0) {
        if (progressCallback) progressCallback("Surgery: Optical Healing...");
        result = applyOpticalHealing(result, params.healing);
    }
    if (params.reduction > 0) {
        if (progressCallback) progressCallback("Surgery: Reduction...");
        result = applyStarReduction(result, params.reduction);
    }
    
    // Soft Clip
    if (progressCallback) progressCallback("Polishing...");
    result = applySoftClip(result, 0.98, 2.0);
    
    return result;
}

// =============================================================================
//  GUI
// =============================================================================

function VeraLuxDialog() {
   this.__base__ = Dialog;
   this.__base__();
   
   // --- Header ---
   this.titleLabel = new Label(this); this.titleLabel.text = "VeraLux Suite v" + VERSION;
   this.titleLabel.styleSheet = "font-size: 14pt; font-weight: bold; color: #4aa3df;"; this.titleLabel.textAlignment = TextAlign_Center;
   
   // --- Global Help Button ---
   this.btnHelp = new PushButton(this); 
   this.btnHelp.text = "?"; 
   this.btnHelp.toolTip = "Print Full Operational Guide to Console";
   this.btnHelp.onClick = function() {
       Console.show();
       Console.noteln("<b>VERALUX OPERATIONAL GUIDE</b>");
       Console.noteln("--------------------------------------------------");
       Console.noteln("<b>[1] PRE-REQUISITES</b>");
       Console.noteln("• Input MUST be Linear (not yet stretched).");
       Console.noteln("• Input MUST be Color Calibrated (SPCC) for correct vector weights.");
       Console.noteln("• Denoise your data (NoiseXTerminator/DeepSNR) BEFORE stretching.");
       Console.noteln("");
       Console.noteln("<b>[2] STRETCH MODES</b>");
       Console.noteln("• <b>Ready-to-Use:</b> Features the 'Unified Strategy' slider.");
       Console.noteln("  - Center (0): Balanced Vector Stretch.");
       Console.noteln("  - Left (<0): Clean Noise (Increases Shadow Convergence).");
       Console.noteln("  - Right (>0): Soften Highlights (Decreases Color Grip).");
       Console.noteln("• <b>Scientific:</b> Manual control over specific physics parameters.");
       Console.noteln("");
       Console.noteln("<b>[3] STAR COMPOSER</b>");
       Console.noteln("• Decouples stars from the background stretch.");
       Console.noteln("• Use 'Linear Add' for physical blending or 'Screen' for safe blending.");
       Console.noteln("• 'LSR' removes galaxy cores from the star mask.");
       Console.noteln("• <b>TIP:</b> If stars are invisible, increase 'Star Intensity (LogD)'.");
       Console.noteln("");
       Console.noteln("<b>[4] PARAMETERS</b>");
       Console.noteln("• <b>Log D:</b> Stretch Intensity. Higher = Brighter.");
       Console.noteln("• <b>Protect b:</b> Highlight Protection. Higher = Sharper stars.");
       Console.noteln("• <b>Color Grip:</b> 1.0 = Pure Vector Color. Lower to desaturate highlights.");
       Console.noteln("--------------------------------------------------");
       Console.noteln("Info: info@veralux.space");
   };
   
   this.tabBox = new TabBox(this);
   
   // --------------------------------------------------------------------------
   // TAB 1: HYPERMETRIC STRETCH
   // --------------------------------------------------------------------------
   this.pageStretch = new Control(this);
   this.pageStretch.sizer = new VerticalSizer; 
   this.pageStretch.sizer.margin = 10; this.pageStretch.sizer.spacing = 6;
   
   this.reqLabel = new Label(this);
   this.reqLabel.text = "Input: Any LINEAR Image (Stars or Starless)";
   this.reqLabel.styleSheet = "font-size: 9pt; color: #ffaa00; font-weight: bold;";
   this.reqLabel.textAlignment = TextAlign_Center;

   this.modeGroup = new GroupBox(this); this.modeGroup.title = "Processing Mode"; this.modeGroup.sizer = new VerticalSizer;
   this.radReady = new RadioButton(this); 
   this.radReady.text = "Ready-to-Use (Unified)"; 
   this.radReady.checked = true;
   this.radReady.toolTip = "<p><b>Ready-to-Use Mode</b><br>Produces an aesthetic, export-ready image.<br>Applies adaptive 'Star-Safe' expansion and Linked MTF.</p>";

   this.radSci = new RadioButton(this); 
   this.radSci.text = "Scientific (Manual)";
   this.radSci.toolTip = "<p><b>Scientific Mode</b><br>Full manual control over Color Grip and Shadow Convergence.<br>Clips only at physical saturation (1.0).</p>";
   
   this.lblModeInfo = new Label(this);
   this.lblModeInfo.text = "Unified Strategy Enabled.";
   this.lblModeInfo.styleSheet = "color: #888; font-style: italic;";
   
   this.modeGroup.sizer.add(this.radReady); 
   this.modeGroup.sizer.add(this.radSci);
   this.modeGroup.sizer.add(this.lblModeInfo);

   this.sensorCombo = new ComboBox(this);
   this.sensorCombo.toolTip = "<p><b>Sensor Profile</b><br>Defines the Luminance coefficients (Weights) used for the stretch.<br>Choose Rec.709 for general use.</p>";
   for (var key in SENSOR_PROFILES) { this.sensorCombo.addItem(key); }
   
   this.sensorInfoLbl = new Label(this); this.sensorInfoLbl.wordWrapping = true;
   this.sensorGroup = new GroupBox(this); this.sensorGroup.title = "Sensor Profile"; this.sensorGroup.sizer = new VerticalSizer;
   this.sensorGroup.sizer.add(this.sensorCombo); this.sensorGroup.sizer.add(this.sensorInfoLbl);

   this.rowTop = new HorizontalSizer; this.rowTop.add(this.modeGroup); this.rowTop.add(this.sensorGroup);

   this.engineGroup = new GroupBox(this); this.engineGroup.title = "Stretch Engine"; this.engineGroup.sizer = new VerticalSizer;
   this.row1 = new HorizontalSizer;
   
   this.chkAdaptive = new CheckBox(this); 
   this.chkAdaptive.text = "Adaptive Anchor"; 
   this.chkAdaptive.checked = true;
   this.chkAdaptive.toolTip = "<p><b>Adaptive Anchor</b><br>Analyzes histogram shape to find the true signal start.<br>Recommended for max contrast.</p>";
   
   this.ncTarget = new NumericControl(this); 
   this.ncTarget.label.text = "Target Bg:"; 
   this.ncTarget.setRange(0,1); this.ncTarget.setValue(0.20); this.ncTarget.setPrecision(2);
   this.ncTarget.toolTip = "<p><b>Target Background</b><br>Desired median value for background sky.<br>0.20 is standard.</p>";
   
   this.btnAuto = new PushButton(this); 
   this.btnAuto.text = "⚡ Auto-Calc Log D"; this.btnAuto.backgroundColor = 0xFFAA00; 
   this.btnAuto.toolTip = "<p><b>Auto-Solver</b><br>Finds the optimal Stretch Factor (Log D) to place the background at Target Level without clipping blacks.</p>";
   
   this.row1.add(this.ncTarget); this.row1.add(this.chkAdaptive); this.row1.add(this.btnAuto);
   
   this.row2 = new HorizontalSizer;
   this.ncLogD = new NumericControl(this); 
   this.ncLogD.label.text = "Log D:"; this.ncLogD.setRange(0,7); this.ncLogD.setValue(2.0);
   this.ncLogD.toolTip = "<p><b>Intensity (Log D)</b><br>Controls the strength of the stretch.<br>Higher = Brighter.</p>";
   
   this.ncProtect = new NumericControl(this); 
   this.ncProtect.label.text = "Protect b:"; this.ncProtect.setRange(0.1,15); this.ncProtect.setValue(6.0);
   this.ncProtect.toolTip = "<p><b>Highlight Protection (b)</b><br>Controls the 'knee' of the curve.<br>• <b>High (>6):</b> Sharper stars.<br>• <b>Low (<2):</b> Brighter nebula/bloat.</p>";
   
   this.row2.add(this.ncLogD); this.row2.add(this.ncProtect);
   this.engineGroup.sizer.add(this.row1); this.engineGroup.sizer.add(this.row2);

   this.physGroup = new GroupBox(this); this.physGroup.title = "Physics & Color"; this.physGroup.sizer = new VerticalSizer;
   
   this.ncConv = new NumericControl(this); 
   this.ncConv.label.text = "Star Core:"; this.ncConv.setRange(1,10); this.ncConv.setValue(3.5);
   this.ncConv.toolTip = "<p><b>Star Core Recovery</b><br>Controls how quickly saturated colors transition to white.</p>";
   
   this.physGroup.sizer.add(this.ncConv);

   this.ncUnified = new NumericControl(this); 
   this.ncUnified.label.text = "Strategy:"; this.ncUnified.setRange(-100,100); this.ncUnified.setValue(0); this.ncUnified.setPrecision(0);
   this.ncUnified.toolTip = "<p><b>Unified Color Strategy</b><br>• <b>Center (0):</b> Balanced.<br>• <b>Left (<0):</b> Clean Noise.<br>• <b>Right (>0):</b> Soften Highlights.</p>";
   
   this.lblUnified = new Label(this); this.lblUnified.text = "Balanced (Pure Vector)";
   
   this.sciSizer = new VerticalSizer;
   this.ncGrip = new NumericControl(this); 
   this.ncGrip.label.text = "Grip:"; this.ncGrip.setRange(0,1); this.ncGrip.setValue(1);
   this.ncGrip.toolTip = "<p><b>Color Grip</b><br>Controls Vector Color preservation.<br>• <b>1.0:</b> 100% Vector lock (Vivid).<br>• <b><1.0:</b> Blends with scalar stretch (Softer).</p>";
   
   this.ncShadow = new NumericControl(this); 
   this.ncShadow.label.text = "Shadow Conv:"; this.ncShadow.setRange(0,3); this.ncShadow.setValue(0);
   this.ncShadow.toolTip = "<p><b>Shadow Convergence</b><br>Damps chromatic noise in the background.<br>Increase if background looks speckled.</p>";
   
   this.sciSizer.add(this.ncGrip); this.sciSizer.add(this.ncShadow);
   this.physGroup.sizer.add(this.ncUnified); this.physGroup.sizer.add(this.lblUnified); this.physGroup.sizer.add(this.sciSizer);

   this.btnAudit = new PushButton(this); 
   this.btnAudit.text = "Analyze Clipping";
   this.btnAudit.toolTip = "Checks for black clipping and proposes a safe Log D.";
   
   this.btnProcStretch = new PushButton(this); this.btnProcStretch.text = "PROCESS STRETCH"; this.btnProcStretch.backgroundColor = 0xFF009900; this.btnProcStretch.textColor = 0xFFFFFF;

   this.pageStretch.sizer.add(this.reqLabel);
   this.pageStretch.sizer.add(this.rowTop);
   this.pageStretch.sizer.add(this.engineGroup);
   this.pageStretch.sizer.add(this.physGroup);
   this.pageStretch.sizer.add(this.btnAudit);
   this.pageStretch.sizer.addStretch();
   this.pageStretch.sizer.add(this.btnProcStretch);

   // --------------------------------------------------------------------------
   // TAB 2: STAR COMPOSER
   // --------------------------------------------------------------------------
   this.pageStar = new Control(this);
   this.pageStar.sizer = new VerticalSizer;
   this.pageStar.sizer.margin = 10; this.pageStar.sizer.spacing = 6;
   
   this.reqLabelStar = new Label(this);
   this.reqLabelStar.text = "Input: Linear Starmask + Stretched Starless";
   this.reqLabelStar.styleSheet = "font-size: 9pt; color: #ffaa00; font-weight: bold;";
   this.reqLabelStar.textAlignment = TextAlign_Center;
   this.pageStar.sizer.add(this.reqLabelStar);

   this.grpViews = new GroupBox(this); this.grpViews.title = "Input Data"; this.grpViews.sizer = new VerticalSizer;
   this.lblMask = new Label(this); this.lblMask.text = "Starmask (Linear):";
   this.cmbStarMask = new ComboBox(this);
   this.lblBase = new Label(this); this.lblBase.text = "Starless Base (Stretched):";
   this.cmbStarBase = new ComboBox(this);
   
   var windows = ImageWindow.windows;
   for (var i = 0; i < windows.length; ++i) {
       this.cmbStarMask.addItem(windows[i].mainView.id);
       this.cmbStarBase.addItem(windows[i].mainView.id);
   }
   
   if (windows.length > 0) {
       this.cmbStarMask.currentItem = 0;
       this.cmbStarBase.currentItem = (windows.length > 1) ? 1 : 0; 
   } else {
       this.cmbStarMask.addItem("[No Images Open]");
       this.cmbStarBase.addItem("[No Images Open]");
       this.cmbStarMask.enabled = false;
       this.cmbStarBase.enabled = false;
   }

   this.grpViews.sizer.add(this.lblMask); this.grpViews.sizer.add(this.cmbStarMask);
   this.grpViews.sizer.add(this.lblBase); this.grpViews.sizer.add(this.cmbStarBase);
   
   this.grpModeStar = new GroupBox(this); this.grpModeStar.title = "Blend Mode"; this.grpModeStar.sizer = new HorizontalSizer;
   this.radAdd = new RadioButton(this); 
   this.radAdd.text = "Linear Add (Physical)"; this.radAdd.checked = true;
   this.radAdd.toolTip = "<p><b>Linear Add</b><br>Physical light addition.<br>High contrast, but risk of core clipping.</p>";
   
   this.radScreen = new RadioButton(this); 
   this.radScreen.text = "Screen (Safe)";
   this.radScreen.toolTip = "<p><b>Screen Blend</b><br>Soft blend.<br>Preserves galaxy cores and prevents explosion.</p>";
   
   this.grpModeStar.sizer.add(this.radAdd); this.grpModeStar.sizer.add(this.radScreen);

   this.grpStarEngine = new GroupBox(this); this.grpStarEngine.title = "Star Engine"; this.grpStarEngine.sizer = new VerticalSizer;
   this.ncStarD = new NumericControl(this); 
   this.ncStarD.label.text = "Star Intensity (LogD):"; this.ncStarD.setRange(0, 6); 
   this.ncStarD.setValue(1.5); // Default high intensity for stars
   this.ncStarD.toolTip = "<p><b>Star Intensity</b><br>Master gain control.<br>Increases brightness of star field.</p>";
   
   this.ncStarB = new NumericControl(this); 
   this.ncStarB.label.text = "Hardness (b):"; this.ncStarB.setRange(0.1, 20); this.ncStarB.setValue(6.0);
   this.ncStarB.toolTip = "<p><b>Profile Hardness</b><br>High = Sharp/Pinpoint.<br>Low = Soft/Halos.</p>";
   
   this.chkStarAdapt = new CheckBox(this); this.chkStarAdapt.text = "Adaptive Anchor"; this.chkStarAdapt.checked = false; // Default OFF for masks
   this.chkStarAdapt.toolTip = "Keep OFF for StarNet/StarXTerminator masks (which are already zero-based).";
   
   this.btnStarAuto = new PushButton(this);
   this.btnStarAuto.text = "⚡ Auto-Stretch Stars"; this.btnStarAuto.backgroundColor = 0xFFAA00;
   this.btnStarAuto.toolTip = "<p><b>Auto-Star</b><br>Calculates correct intensity to make stars visible.</p>";
   
   this.grpStarEngine.sizer.add(this.ncStarD); 
   this.grpStarEngine.sizer.add(this.btnStarAuto); // Added button
   this.grpStarEngine.sizer.add(this.ncStarB); 
   this.grpStarEngine.sizer.add(this.chkStarAdapt);

   this.grpStarPhys = new GroupBox(this); this.grpStarPhys.title = "Physics & Surgery"; this.grpStarPhys.sizer = new VerticalSizer;
   this.ncStarGrip = new NumericControl(this); this.ncStarGrip.label.text = "Color Grip:"; this.ncStarGrip.setRange(0, 1); this.ncStarGrip.setValue(1.0);
   this.ncStarGrip.toolTip = "Controls color vibrance retention in star cores.";
   
   this.ncLSR = new NumericControl(this); this.ncLSR.label.text = "LSR (Rejection):"; this.ncLSR.setRange(0, 1); this.ncLSR.setValue(0.0);
   this.ncLSR.toolTip = "<p><b>Large Structure Rejection</b><br>Removes blobs (galaxy cores/nebulosity) from the star mask.</p>";
   
   this.ncHeal = new NumericControl(this); this.ncHeal.label.text = "Healing (Halos):"; this.ncHeal.setRange(0, 20); this.ncHeal.setValue(0.0);
   this.ncHeal.toolTip = "<p><b>Optical Healing</b><br>Repairs chromatic aberration (magenta/green halos).</p>";
   
   this.grpStarPhys.sizer.add(this.ncStarGrip); this.grpStarPhys.sizer.add(this.ncLSR); this.grpStarPhys.sizer.add(this.ncHeal);

   this.btnProcStar = new PushButton(this); this.btnProcStar.text = "PROCESS STAR COMPOSITION"; this.btnProcStar.backgroundColor = 0xFF0055AA; this.btnProcStar.textColor = 0xFFFFFF;

   this.pageStar.sizer.add(this.grpViews);
   this.pageStar.sizer.add(this.grpModeStar);
   this.pageStar.sizer.add(this.grpStarEngine);
   this.pageStar.sizer.add(this.grpStarPhys);
   this.pageStar.sizer.addStretch();
   this.pageStar.sizer.add(this.btnProcStar);

   // --- MAIN SIZER ---
   this.tabBox.addPage(this.pageStretch, "HyperMetric Stretch");
   this.tabBox.addPage(this.pageStar, "StarComposer");
   
   this.mainSizer = new VerticalSizer; this.mainSizer.margin = 8;
   
   // Title Row + Help Button
   this.headerSizer = new HorizontalSizer;
   this.headerSizer.addStretch();
   this.headerSizer.add(this.titleLabel);
   this.headerSizer.addStretch();
   this.headerSizer.add(this.btnHelp); // "?" Button at top right
   
   this.mainSizer.add(this.headerSizer);
   this.mainSizer.add(this.tabBox);
   
   this.sizer = this.mainSizer;
   
   // --- LOGIC BINDINGS ---
   var dlg = this;

   // Mode Update
   this.updateMode = function() {
       var ready = dlg.radReady.checked;
       dlg.ncUnified.visible = ready; dlg.lblUnified.visible = ready; 
       dlg.sciSizer.visible = !ready;
       
       if (ready) dlg.lblModeInfo.text = "Unified Strategy Enabled. (Aesthetic Focus)";
       else dlg.lblModeInfo.text = "Scientific Mode. (Manual Parameter Control)";
       
       dlg.pageStretch.adjustToContents(); 
   };
   this.radReady.onClick = this.updateMode; this.radSci.onClick = this.updateMode;
   
   // Sensor Info Update
   this.updateSensor = function() {
       var key = dlg.sensorCombo.itemText(dlg.sensorCombo.currentItem);
       var profile = SENSOR_PROFILES[key];
       dlg.sensorInfoLbl.text = profile.info + "\n(Weights: " + profile.weights[0].toFixed(2) + ", " + profile.weights[1].toFixed(2) + ", " + profile.weights[2].toFixed(2) + ")";
   };
   this.sensorCombo.onItemSelected = this.updateSensor;
   
   // Unified Slider Feedback
   this.ncUnified.onValueUpdated = function(val) {
       if(val < 0) dlg.lblUnified.text = "Action: Noise Cleaning (ShadowConv: " + (Math.abs(val)/100 * 3).toFixed(1) + ")";
       else if(val > 0) dlg.lblUnified.text = "Action: Soften Highlights (Grip: " + (1.0 - (val/100)*0.6).toFixed(2) + ")";
       else dlg.lblUnified.text = "Balanced (Pure Vector)";
   };

   // Button Actions
   this.btnAuto.onClick = function() { dlg.runSmartSolver(); };
   this.btnAudit.onClick = function() { dlg.runAuditAndFix(); };
   this.btnProcStretch.onClick = function() { dlg.runStretchProcess(); };
   this.btnProcStar.onClick = function() { dlg.runStarProcess(); };
   this.btnStarAuto.onClick = function() { dlg.runStarSolver(); };

   // --- METHODS ---
   
   this.runSmartSolver = function() {
      if (!ImageWindow.activeWindow) return;
      Console.show();
      Console.noteln("VeraLux: Smart Solver started...");
      
      var img = ImageWindow.activeWindow.mainView.image;
      var weights = SENSOR_PROFILES[dlg.sensorCombo.itemText(dlg.sensorCombo.currentItem)].weights;
      var anchor = dlg.chkAdaptive.checked ? VeraLuxCore.calculateAnchorAdaptive(img, weights) : VeraLuxCore.calculateAnchorStats(img, img.numberOfChannels===3);
      
      var samples = [];
      var step = Math.max(1, Math.floor((img.width*img.height)/100000));
      for(var i=0; i<img.width*img.height; i+=step) {
         var x = i%img.width; var y = Math.floor(i/img.width);
         var val = (img.numberOfChannels===3) ? (weights[0]*img.sample(x,y,0) + weights[1]*img.sample(x,y,1) + weights[2]*img.sample(x,y,2)) : img.sample(x,y,0);
         val = Math.max(0, val - anchor);
         if(val > 1e-7) samples.push(val);
      }
      if(samples.length===0){dlg.ncLogD.setValue(2.0); return;}
      
      var targetTemp = dlg.ncTarget.value;
      var bestLogD = 2.0;
      var bVal = dlg.ncProtect.value;
      var medianIn = VeraLuxCore.percentile(samples, 50);

      // Iterative Solver ("Floating Sky Check")
      for(var iter=0; iter<15; iter++) {
          bestLogD = VeraLuxCore.solveLogD(medianIn, targetTemp, bVal);
          if(!dlg.radReady.checked) break; // Scientific mode no auto-fix
          
          var D = Math.pow(10, bestLogD);
          var strSamples = [];
          for(var k=0; k<samples.length; k++) strSamples.push(VeraLuxCore.hyperbolicStretch(samples[k], D, bVal));
          var med = VeraLuxCore.percentile(strSamples, 50);
          var mean = 0; for(var z=0; z<strSamples.length; z++) mean+=strSamples[z]; mean/=strSamples.length;
          var std = 0; for(var z=0; z<strSamples.length; z++) std+=Math.pow(strSamples[z]-mean, 2); std=Math.sqrt(std/strSamples.length);
          var minV = 1.0; for(var z=0; z<strSamples.length; z++) if(strSamples[z]<minV) minV=strSamples[z];
          
          var globalFloor = Math.max(minV, med - (2.7 * std)); // 2.7 sigma rule
          if (globalFloor <= 0.001) break; // Safe
          
          targetTemp -= 0.015; if(targetTemp < 0.05) break;
      }
      dlg.ncLogD.setValue(bestLogD);
      Console.noteln("VeraLux: Solver Result LogD = " + bestLogD.toFixed(2));
   };

   this.runStarSolver = function() {
       // Logic: Find non-zero pixels, target brightness ~0.10 (Conservative)
       var maskId = dlg.cmbStarMask.itemText(dlg.cmbStarMask.currentItem);
       if (!maskId || maskId.indexOf("[") >= 0) return;
       var maskView = View.viewById(maskId);
       var img = maskView.image;
       
       // Sampling
       var samples = [];
       var step = Math.max(1, Math.floor((img.width*img.height)/100000));
       for(var i=0; i<img.width*img.height; i+=step) {
           var v = img.sample(i % img.width, Math.floor(i / img.width), 0); // Check 1st channel
           if (v > 0.0001) samples.push(v); // Grab star data
       }
       
       if (samples.length === 0) {
           (new MessageBox("Starmask appears empty or pure black.", "Solver Error")).execute();
           return;
       }
       
       var medianStar = VeraLuxCore.percentile(samples, 50);
       var bVal = dlg.ncStarB.value;
       var bestLogD = VeraLuxCore.solveLogD(medianStar, 0.10, bVal); // Target 0.10 brightness
       
       dlg.ncStarD.setValue(bestLogD);
       (new MessageBox("Calculated Star Intensity: " + bestLogD.toFixed(2), "Star Solver")).execute();
   };

   this.runAuditAndFix = function() {
       if (!ImageWindow.activeWindow) return;
       Console.show();
       Console.noteln("VeraLux: Auditing...");
       var img = ImageWindow.activeWindow.mainView.image;
       var weights = SENSOR_PROFILES[dlg.sensorCombo.itemText(dlg.sensorCombo.currentItem)].weights;
       var anchor = dlg.chkAdaptive.checked ? VeraLuxCore.calculateAnchorAdaptive(img, weights) : VeraLuxCore.calculateAnchorStats(img, img.numberOfChannels===3);
       
       var samples = []; var step = Math.max(1, Math.floor((img.width*img.height)/100000));
       var rawClipCount = 0;
       for(var i=0; i<img.width*img.height; i+=step) {
          var x = i%img.width; var y = Math.floor(i/img.width);
          var val = (img.numberOfChannels===3) ? (weights[0]*img.sample(x,y,0) + weights[1]*img.sample(x,y,1) + weights[2]*img.sample(x,y,2)) : img.sample(x,y,0);
          if (val < anchor) rawClipCount++;
          samples.push(Math.max(0, val - anchor));
       }
       
       var rawClipPct = (rawClipCount / samples.length) * 100;
       var currentD = Math.pow(10, dlg.ncLogD.value);
       var b = dlg.ncProtect.value;
       var postClipCount = 0;
       for(var k=0; k<samples.length; k++) {
           if(VeraLuxCore.hyperbolicStretch(samples[k], currentD, b) <= 1e-7) postClipCount++;
       }
       var postClipPct = (postClipCount / samples.length) * 100;

       if (rawClipPct > 0.5) { (new MessageBox("WARNING: Source Clipping (" + rawClipPct.toFixed(2) + "%).\nAnchor is cutting data.\nUncheck 'Adaptive Anchor' or Crop artifacts.", "VeraLux Audit", StdIcon_Warning, StdButton_Ok)).execute(); return; }
       if (postClipPct < 0.1) { (new MessageBox("Analysis Result: SAFE (" + postClipPct.toFixed(2) + "% clip).\nNo action needed.", "VeraLux Audit", StdIcon_Information, StdButton_Ok)).execute(); return; }

       var safeLogD = dlg.ncLogD.value;
       for(var k=0; k<20; k++) {
           safeLogD -= 0.05; var tD = Math.pow(10, safeLogD); var c = 0;
           for(var z=0; z<samples.length; z++) if(VeraLuxCore.hyperbolicStretch(samples[z], tD, b) <= 1e-7) c++;
           if( (c/samples.length)*100 < 0.1 ) break;
       }

       var msg = new MessageBox("Clipping Detected (" + postClipPct.toFixed(2) + "%).\nSuggest reducing Log D to " + safeLogD.toFixed(2) + ".\nApply?", "VeraLux Fixer", StdIcon_Warning, StdButton_Yes, StdButton_No);
       if (msg.execute() === StdButton_Yes) { dlg.ncLogD.setValue(safeLogD); }
   };

   this.runStretchProcess = function() {
       if (!ImageWindow.activeWindow) { (new MessageBox("Load an image.", "Error")).execute(); return; }
       
       // Show Console for Progress
       Console.show();
       Console.noteln("<b>VeraLux: Starting HyperMetric Stretch...</b>");
       Console.flush();
       
       var grip = dlg.ncGrip.value; var shadow = dlg.ncShadow.value;
       if(dlg.radReady.checked) {
           var val = dlg.ncUnified.value;
           if(val < 0) { shadow = (Math.abs(val)/100)*3.0; grip = 1.0; } 
           else { grip = 1.0 - ((val/100)*0.6); shadow = 0.0; }
       }
       var params = {
           weights: SENSOR_PROFILES[dlg.sensorCombo.itemText(dlg.sensorCombo.currentItem)].weights,
           logD: dlg.ncLogD.value, protectB: dlg.ncProtect.value, convergence: dlg.ncConv.value,
           processingMode: dlg.radReady.checked ? "ready_to_use" : "scientific",
           targetBg: dlg.ncTarget.value, colorGrip: grip, shadowConvergence: shadow, 
           adaptive: dlg.chkAdaptive.checked
       };
       
       try {
           var resImg = processVeraLux(ImageWindow.activeWindow.mainView.image, params, function(msg){ Console.noteln(msg); });
           var w = new ImageWindow(resImg.width, resImg.height, resImg.numberOfChannels, 32, true, true, "VeraLux_Stretch");
           w.mainView.beginProcess(); w.mainView.image.assign(resImg); w.mainView.endProcess(); w.show();
           Console.noteln("<b>VeraLux: Done.</b>");
           dlg.ok();
       } catch(e) {
           (new MessageBox("Error: " + e)).execute();
       }
   };

   this.runStarProcess = function() {
       // Check inputs
       if (dlg.cmbStarMask.currentItem < 0 || dlg.cmbStarBase.currentItem < 0) {
           (new MessageBox("Please select both a Starmask and a Starless Base image.", "Selection Error", StdIcon_Error, StdButton_Ok)).execute(); 
           return;
       }

       var maskId = dlg.cmbStarMask.itemText(dlg.cmbStarMask.currentItem);
       var baseId = dlg.cmbStarBase.itemText(dlg.cmbStarBase.currentItem);
       
       if (maskId == "[No Images Open]") {
           (new MessageBox("No images are currently open in PixInsight.", "Error", StdIcon_Error, StdButton_Ok)).execute();
           return;
       }
       
       var maskView = View.viewById(maskId);
       var baseView = View.viewById(baseId);
       
       if (maskView.isNull || baseView.isNull) { 
           (new MessageBox("Could not retrieve Views. Check if images were closed.", "Error", StdIcon_Error, StdButton_Ok)).execute(); 
           return; 
       }
       
       var params = {
           weights: SENSOR_PROFILES[dlg.sensorCombo.itemText(dlg.sensorCombo.currentItem)].weights,
           logD: dlg.ncStarD.value, 
           protectB: dlg.ncStarB.value, 
           convergence: 3.5, 
           colorGrip: dlg.ncStarGrip.value,
           shadowConvergence: 0, 
           lsr: dlg.ncLSR.value,
           healing: dlg.ncHeal.value,
           reduction: 0,
           adaptive: dlg.chkStarAdapt.checked
       };
       
       Console.show();
       Console.noteln("<b>VeraLux: Starting StarComposer...</b>");
       Console.noteln("Mask: " + maskId);
       Console.noteln("Base: " + baseId);
       Console.flush();
       
       try {
           // 1. Process Starmask
           var stars = processStarPipeline(new Image(maskView.image), params, function(msg){ Console.noteln(msg); });
           
           // 2. Compose
           Console.noteln("Compositing...");
           var base = new Image(baseView.image);
           var final = composeStarImages(stars, base, dlg.radScreen.checked);
           
           var w = new ImageWindow(final.width, final.height, final.numberOfChannels, 32, true, true, "VeraLux_StarComposer");
           w.mainView.beginProcess(); w.mainView.image.assign(final); w.mainView.endProcess(); w.show();
           Console.noteln("<b>VeraLux: Done.</b>");
           dlg.ok();
       } catch(e) {
           (new MessageBox("Error during processing: " + e, "Processing Error", StdIcon_Error, StdButton_Ok)).execute();
       }
   };

   // Init
   this.updateMode();
   this.updateSensor();
   this.adjustToContents();
}
VeraLuxDialog.prototype = new Dialog;

function main() {
   var dialog = new VeraLuxDialog();
   dialog.execute();
}

main();