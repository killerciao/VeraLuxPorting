#feature-id    Killerciao's Scripts > VeraLux HyperMetric Stretch
#feature-info  Physics-based photometric hyperbolic stretch engine.<br/>\
               <br/>\
               Preserves color ratios while maximizing dynamic range.<br/>\
               Sensor-aware luminance extraction with QE weighting.<br/>\
               <br/>\
               <b>Requirements:</b><br/>\
               • Linear image (not stretched)<br/>\
               • Background extracted<br/>\
               • Color calibrated (for RGB)<br/>\
               <br/>\
               Version 1.0.5

#feature-icon  verlux-icon.svg
#include <pjsr/Sizer.jsh>
#include <pjsr/FrameStyle.jsh>
#include <pjsr/TextAlign.jsh>
#include <pjsr/StdButton.jsh>
#include <pjsr/StdIcon.jsh>
#include <pjsr/NumericControl.jsh>
#include <pjsr/SampleType.jsh>
#include <pjsr/ColorSpace.jsh>

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
   "Canon EOS (Legacy - 300D/40D)": {
      weights: [0.2400, 0.5400, 0.2200],
      description: "Canon CMOS Profile (Legacy)",
      info: "For older Canon models (Digic 2/3 era)."
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
   "Narrowband HOO": {
      weights: [0.5000, 0.2500, 0.2500],
      description: "Bicolor palette: Hα=Red, OIII=Green+Blue",
      info: "Balanced weighting for HOO synthetic palette processing."
   },
   "Narrowband SHO": {
      weights: [0.3333, 0.3400, 0.3267],
      description: "Hubble palette: SII=Red, Hα=Green, OIII=Blue",
      info: "Nearly uniform weighting for SHO tricolor narrowband."
   }
};

var DEFAULT_PROFILE = "Rec.709 (Recommended)";

function VeraLuxCore() {}

VeraLuxCore.percentile = function(arr, p) {
   var sorted = arr.slice().sort(function(a, b) { return a - b; });
   var idx = (p / 100.0) * (sorted.length - 1);
   var lower = Math.floor(idx);
   var upper = Math.ceil(idx);
   var weight = idx - lower;
   
   if (upper >= sorted.length) return sorted[sorted.length - 1];
   return sorted[lower] * (1 - weight) + sorted[upper] * weight;
};

VeraLuxCore.calculateAnchor = function(img, isRGB) {
   var w = img.width;
   var h = img.height;
   var totalPixels = w * h;
   var step = Math.max(1, Math.floor(totalPixels / 500000));
   
   if (isRGB) {
      var floors = [];
      for (var c = 0; c < 3; c++) {
         var channelSamples = [];
         for (var i = 0; i < totalPixels; i += step) {
            var y = Math.floor(i / w);
            var x = i % w;
            channelSamples.push(img.sample(x, y, c));
         }
         floors.push(this.percentile(channelSamples, 0.5));
      }
      var minFloor = Math.min.apply(null, floors);
      return Math.max(0.0, minFloor - 0.00025);
   } else {
      var samples = [];
      for (var i = 0; i < totalPixels; i += step) {
         var y = Math.floor(i / w);
         var x = i % w;
         samples.push(img.sample(x, y, 0));
      }
      var floor = this.percentile(samples, 0.5);
      return Math.max(0.0, floor - 0.00025);
   }
};

VeraLuxCore.ghsStretch = function(value, D, b, SP) {
   D = Math.max(D, 0.1);
   b = Math.max(b, 0.1);
   SP = SP || 0.0;
   var term1 = Math.asinh(D * (value - SP) + b);
   var term2 = Math.asinh(b);
   var norm = Math.asinh(D * (1.0 - SP) + b) - term2;
   if (norm === 0) norm = 1e-6;
   return (term1 - term2) / norm;
};

VeraLuxCore.applyMTF = function(value, m) {
   if (value <= 0) return 0;
   if (value >= 1) return 1;
   var term1 = (m - 1.0) * value;
   var term2 = (2.0 * m - 1.0) * value - m;
   if (Math.abs(term2) < 1e-9) return value;
   var result = term1 / term2;
   return Math.max(0.0, Math.min(1.0, result));
};

VeraLuxCore.solveLogD = function(medianIn, targetMedian, bVal) {
   if (medianIn < 1e-9) return 2.0;
   var lowLog = 0.0;
   var highLog = 7.0;
   var bestLogD = 2.0;
   var epsilon = 0.0001;
   for (var iter = 0; iter < 40; iter++) {
      var midLog = (lowLog + highLog) / 2.0;
      var midD = Math.pow(10.0, midLog);
      var testVal = this.ghsStretch(medianIn, midD, bVal, 0.0);
      if (Math.abs(testVal - targetMedian) < epsilon) {
         bestLogD = midLog;
         break;
      }
      if (testVal < targetMedian) {
         lowLog = midLog;
      } else {
         highLog = midLog;
      }
   }
   return bestLogD;
};

function processVeraLux(img, params, progressCallback) {
   if (progressCallback) progressCallback("Analyzing image data...", 0);
   
   var w = img.width;
   var h = img.height;
   var nc = img.numberOfChannels;
   var isRGB = (nc === 3);
   
   var weights = params.weights;
   var logD = params.logD;
   var protectB = params.protectB;
   var convergence = params.convergence;
   var processingMode = params.processingMode;
   var targetBg = params.targetBg;
   var saturation = params.saturation;
   
   if (progressCallback) progressCallback("Calculating black point...", 5);
   var anchor = VeraLuxCore.calculateAnchor(img, isRGB);
   
   var result = new Image(w, h, nc, isRGB ? ColorSpace_RGB : ColorSpace_Gray, 32, SampleType_Real);
   result.assign(img);
   
   if (progressCallback) progressCallback("Starting Stretch...", 10);
   
   var epsilon = 1e-9;
   var lastPct = 0;
   
   for (var y = 0; y < h; y++) {
      var pct = 10 + Math.round((y / h) * 80);
      if (pct !== lastPct) {
         if (progressCallback) progressCallback("Stretching: " + Math.round((y/h)*100) + "%", pct);
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
            
            var rRatio = r / Lsafe;
            var gRatio = g / Lsafe;
            var bRatio = b / Lsafe;
            
            var Lstr = VeraLuxCore.ghsStretch(L, Math.pow(10, logD), protectB, 0);
            Lstr = Math.max(0, Math.min(1, Lstr));
            
            var k = Math.pow(Lstr, convergence);
            
            var rColor = Lstr * (rRatio * (1.0 - k) + k);
            var gColor = Lstr * (gRatio * (1.0 - k) + k);
            var bColor = Lstr * (bRatio * (1.0 - k) + k);
            
            var rFinal = rColor * saturation + Lstr * (1.0 - saturation);
            var gFinal = gColor * saturation + Lstr * (1.0 - saturation);
            var bFinal = bColor * saturation + Lstr * (1.0 - saturation);
            
            result.setSample(Math.max(0, Math.min(1, rFinal * 0.995 + 0.005)), x, y, 0);
            result.setSample(Math.max(0, Math.min(1, gFinal * 0.995 + 0.005)), x, y, 1);
            result.setSample(Math.max(0, Math.min(1, bFinal * 0.995 + 0.005)), x, y, 2);
         } else {
            var val = Math.max(0, img.sample(x, y, 0) - anchor);
            var str = VeraLuxCore.ghsStretch(val, Math.pow(10, logD), protectB, 0);
            result.setSample(Math.max(0, Math.min(1, str * 0.995 + 0.005)), x, y, 0);
         }
      }
   }
   
   if (processingMode === "ready_to_use") {
      if (progressCallback) progressCallback("Adaptive Scaling...", 92);
      result = applyAdaptiveScaling(result, weights, targetBg, null);
      
      if (progressCallback) progressCallback("Soft-clip Polish...", 96);
      result = applySoftClip(result, 0.98, 2.0);
   }
   
   if (progressCallback) progressCallback("Complete!", 100);
   
   return result;
}

function applyAdaptiveScaling(img, weights, targetBg, progressCallback) {
   var w = img.width;
   var h = img.height;
   var totalPixels = w * h;
   var nc = img.numberOfChannels;
   var isRGB = (nc === 3);
   var step = Math.max(1, Math.floor(totalPixels / 500000));
   
   var lumaSamples = [];
   for (var i = 0; i < totalPixels; i += step) {
      var y = Math.floor(i / w);
      var x = i % w;
      if (isRGB) {
         var L = weights[0] * img.sample(x, y, 0) +
                 weights[1] * img.sample(x, y, 1) +
                 weights[2] * img.sample(x, y, 2);
         lumaSamples.push(L);
      } else {
         lumaSamples.push(img.sample(x, y, 0));
      }
   }
   
   var median = VeraLuxCore.percentile(lumaSamples, 50);
   var stdDev = 0;
   for (var i = 0; i < lumaSamples.length; i++) {
      stdDev += Math.pow(lumaSamples[i] - median, 2);
   }
   stdDev = Math.sqrt(stdDev / lumaSamples.length);
   
   var minVal = 1.0;
   for(var i = 0; i < lumaSamples.length; i++) {
      if(lumaSamples[i] < minVal) minVal = lumaSamples[i];
   }
   
   var globalFloor = Math.max(minVal, median - 2.7 * stdDev);
   var softCeil, hardCeil;
   
   if (isRGB) {
      var r99 = [], g99 = [], b99 = [];
      var r9999 = [], g9999 = [], b9999 = [];
      for (var i = 0; i < totalPixels; i += step) {
         var y = Math.floor(i / w);
         var x = i % w;
         var r = img.sample(x, y, 0);
         var g = img.sample(x, y, 1);
         var b = img.sample(x, y, 2);
         r99.push(r); g99.push(g); b99.push(b);
         r9999.push(r); g9999.push(g); b9999.push(b);
      }
      softCeil = Math.max(VeraLuxCore.percentile(r99, 99), VeraLuxCore.percentile(g99, 99), VeraLuxCore.percentile(b99, 99));
      hardCeil = Math.max(VeraLuxCore.percentile(r9999, 99.99), VeraLuxCore.percentile(g9999, 99.99), VeraLuxCore.percentile(b9999, 99.99));
   } else {
      softCeil = VeraLuxCore.percentile(lumaSamples, 99);
      hardCeil = VeraLuxCore.percentile(lumaSamples, 99.99);
   }
   
   if (softCeil <= globalFloor) softCeil = globalFloor + 1e-6;
   if (hardCeil <= softCeil) hardCeil = softCeil + 1e-6;
   
   var scaleContrast = (0.979) / (softCeil - globalFloor);
   var scaleSafety = (0.999) / (hardCeil - globalFloor);
   var finalScale = Math.min(scaleContrast, scaleSafety);
   
   var result = new Image(w, h, nc, isRGB ? ColorSpace_RGB : ColorSpace_Gray, 32, SampleType_Real);
   for (var c = 0; c < nc; c++) {
      for (var y = 0; y < h; y++) {
         for (var x = 0; x < w; x++) {
            var val = img.sample(x, y, c);
            var expanded = (val - globalFloor) * finalScale + 0.001;
            expanded = Math.max(0, Math.min(1, expanded));
            result.setSample(expanded, x, y, c);
         }
      }
   }
   
   lumaSamples = [];
   for (var i = 0; i < totalPixels; i += step) {
      var y = Math.floor(i / w);
      var x = i % w;
      if (isRGB) {
         var L = weights[0] * result.sample(x, y, 0) +
                 weights[1] * result.sample(x, y, 1) +
                 weights[2] * result.sample(x, y, 2);
         lumaSamples.push(L);
      } else {
         lumaSamples.push(result.sample(x, y, 0));
      }
   }
   
   var currentBg = VeraLuxCore.percentile(lumaSamples, 50);
   if (currentBg > 0 && currentBg < 1 && Math.abs(currentBg - targetBg) > 0.001) {
      var m = (currentBg * (targetBg - 1.0)) / (currentBg * (2.0 * targetBg - 1.0) - targetBg);
      for (var c = 0; c < nc; c++) {
         for (var y = 0; y < h; y++) {
            for (var x = 0; x < w; x++) {
               var val = result.sample(x, y, c);
               result.setSample(VeraLuxCore.applyMTF(val, m), x, y, c);
            }
         }
      }
   }
   return result;
}

function applySoftClip(img, threshold, rolloff) {
   var w = img.width;
   var h = img.height;
   var nc = img.numberOfChannels;
   var result = new Image(w, h, nc, nc === 3 ? ColorSpace_RGB : ColorSpace_Gray, 32, SampleType_Real);
   for (var c = 0; c < nc; c++) {
      for (var y = 0; y < h; y++) {
         for (var x = 0; x < w; x++) {
            var val = img.sample(x, y, c);
            if (val > threshold) {
               var t = (val - threshold) / (1.0 - threshold);
               t = Math.max(0, Math.min(1, t));
               var f = 1.0 - Math.pow(1.0 - t, rolloff);
               val = threshold + (1.0 - threshold) * f;
            }
            result.setSample(Math.max(0, Math.min(1, val)), x, y, c);
         }
      }
   }
   return result;
}

var p_sensorProfile = DEFAULT_PROFILE;
var p_processingMode = "scientific"; 
var p_targetBg = 0.20;
var p_logD = 4.88;
var p_protectB = 6.0;
var p_convergence = 3.50;
var p_saturation = 0.90;

function VeraLuxDialog() {
   this.__base__ = Dialog;
   this.__base__();
   
   var VERSION = "1.2.1";
   
   var headerStyle = "font-size: 14pt; font-weight: bold; color: #4aa3df;";
   var subHeaderStyle = "font-size: 10pt; color: #4aa3df;";
   var infoStyle = "font-size: 9pt; color: #888; font-style: italic;";
   var checkStyle = "color: #aaa;"; 
   
   this.titleLabel = new Label(this);
   this.titleLabel.text = "VeraLux HyperMetric Stretch v" + VERSION;
   this.titleLabel.styleSheet = headerStyle;
   this.titleLabel.textAlignment = TextAlign_Center;
   
   this.subtitleLabel = new Label(this);
   this.subtitleLabel.text = "Photometric Hyperbolic Stretch Engine";
   this.subtitleLabel.styleSheet = subHeaderStyle;
   this.subtitleLabel.textAlignment = TextAlign_Center;
   
   this.reqLabel = new Label(this);
   this.reqLabel.text = "Requirement: Linear Data • Color Calibration (SPCC) Applied";
   this.reqLabel.styleSheet = infoStyle;
   this.reqLabel.textAlignment = TextAlign_Center;

   this.topSizer = new HorizontalSizer;
   this.topSizer.spacing = 8;

   this.modeGroup = new GroupBox(this);
   this.modeGroup.title = "0. Processing Mode";
   this.modeGroup.sizer = new VerticalSizer;
   this.modeGroup.sizer.margin = 8;
   this.modeGroup.sizer.spacing = 4;

   this.radReady = new RadioButton(this);
   this.radReady.text = "Ready-to-Use (Aesthetic)";
   this.radReady.toolTip = "<p><b>Ready-to-Use Mode:</b><br>Produces an export-ready image with Star-Safe expansion and soft-clipping.</p>";

   this.radSci = new RadioButton(this);
   this.radSci.text = "Scientific (Preserve)";
   this.radSci.toolTip = "<p><b>Scientific Mode:</b><br>Mathematically consistent output clipped only at physical saturation.</p>";
   
   this.modeInfoLbl = new Label(this);
   this.modeInfoLbl.styleSheet = checkStyle;
   this.modeInfoLbl.useRichText = true;
   
   this.modeGroup.sizer.add(this.radReady);
   this.modeGroup.sizer.add(this.radSci);
   this.modeGroup.sizer.addSpacing(6);
   this.modeGroup.sizer.add(this.modeInfoLbl);
   this.modeGroup.sizer.addStretch();

   var dlg = this;
   this.updateModeText = function() {
      if (dlg.radReady.checked) {
         p_processingMode = "ready_to_use";
         dlg.modeInfoLbl.text = "✓ Star-Safe Expansion<br>✓ Linked MTF Stretch<br>✓ Soft-clip highlights<br>✓ Ready for export";
      } else {
         p_processingMode = "scientific";
         dlg.modeInfoLbl.text = "✓ Pure GHS stretch (1.0)<br>✓ Manual tone mapping<br>✓ Lossless data<br>✓ Accurate for scientific";
      }
   };
   this.radReady.onClick = this.updateModeText;
   this.radSci.onClick = this.updateModeText;

   this.sensorGroup = new GroupBox(this);
   this.sensorGroup.title = "1. Sensor Calibration";
   this.sensorGroup.sizer = new VerticalSizer;
   this.sensorGroup.sizer.margin = 8;
   this.sensorGroup.sizer.spacing = 4;

   this.sensorCombo = new ComboBox(this);
   for (var key in SENSOR_PROFILES) { this.sensorCombo.addItem(key); }
   this.sensorCombo.toolTip = "<p>Select your sensor profile to ensure correct luminance extraction weights based on Quantum Efficiency.</p>";
   
   this.sensorInfoLbl = new Label(this);
   this.sensorInfoLbl.styleSheet = checkStyle;
   this.sensorInfoLbl.wordWrapping = true;
   this.sensorInfoLbl.useRichText = true;

   this.sensorGroup.sizer.add(new Label(this));
   this.sensorGroup.sizer.add(this.sensorCombo);
   this.sensorGroup.sizer.addSpacing(6);
   this.sensorGroup.sizer.add(this.sensorInfoLbl);
   this.sensorGroup.sizer.addStretch();

   this.updateSensorText = function() {
      var key = dlg.sensorCombo.itemText(dlg.sensorCombo.currentItem);
      p_sensorProfile = key;
      var p = SENSOR_PROFILES[key];
      dlg.sensorInfoLbl.text = p.description + "<br>Weights: R=" + p.weights[0].toFixed(4) + ", G=" + p.weights[1].toFixed(4) + ", B=" + p.weights[2].toFixed(4) + "<br>💡 " + p.info;
   };
   this.sensorCombo.onItemSelected = this.updateSensorText;

   this.topSizer.add(this.modeGroup, 50);
   this.topSizer.add(this.sensorGroup, 50);

   this.engineGroup = new GroupBox(this);
   this.engineGroup.title = "2. Stretch Engine & Calibration";
   this.engineGroup.sizer = new VerticalSizer;
   this.engineGroup.sizer.margin = 8;
   this.engineGroup.sizer.spacing = 6;

   this.rowBg = new HorizontalSizer;
   this.rowBg.spacing = 4;

   this.ncTarget = new NumericControl(this);
   this.ncTarget.label.text = "Target Background:";
   this.ncTarget.label.minWidth = 120;
   this.ncTarget.setRange(0.00, 1.00);
   this.ncTarget.setPrecision(2);
   this.ncTarget.slider.setRange(0, 100);
   this.ncTarget.toolTip = "<p>The desired median background level. 0.20 is standard.</p>";
   this.ncTarget.onValueUpdated = function(val) { p_targetBg = val; };

   this.btnAuto = new PushButton(this);
   this.btnAuto.text = "⚡ Auto-Calculate Log D";
   this.btnAuto.backgroundColor = 0xFFAA00;
   this.btnAuto.toolTip = "<p>Automatically calculates the optimal Stretch Factor (Log D) to reach the Target Background.</p>";
   this.btnAuto.onClick = function() { dlg.runAutoSolver(); };
   
   this.rowBg.add(this.ncTarget);
   this.rowBg.add(this.btnAuto);

   this.ncLogD = new NumericControl(this);
   this.ncLogD.label.text = "Log D:";
   this.ncLogD.label.minWidth = 120;
   this.ncLogD.setRange(0.0, 7.0);
   this.ncLogD.setPrecision(2);
   this.ncLogD.slider.setRange(0, 700);
   this.ncLogD.toolTip = "<p>Stretch Intensity. Higher values = brighter midtones.</p>";
   this.ncLogD.onValueUpdated = function(val) { p_logD = val; };

   this.ncProtect = new NumericControl(this);
   this.ncProtect.label.text = "Protect b:";
   this.ncProtect.label.minWidth = 120;
   this.ncProtect.setRange(0.1, 15.0);
   this.ncProtect.setPrecision(2);
   this.ncProtect.slider.setRange(1, 150);
   this.ncProtect.toolTip = "<p>Highlight Protection. Higher values prevent star bloat but darken highlights.</p>";
   this.ncProtect.onValueUpdated = function(val) { p_protectB = val; };

   this.rowD_B = new HorizontalSizer;
   this.rowD_B.spacing = 10;
   this.rowD_B.add(this.ncLogD, 60);
   this.rowD_B.add(this.ncProtect, 40);

   this.engineGroup.sizer.add(this.rowBg);
   this.engineGroup.sizer.add(this.rowD_B);

   this.physGroup = new GroupBox(this);
   this.physGroup.title = "3. Physics & Color Control";
   this.physGroup.sizer = new VerticalSizer;
   this.physGroup.sizer.margin = 8;
   
   this.ncConv = new NumericControl(this);
   this.ncConv.label.text = "Star Core Recovery (White Point):";
   this.ncConv.label.minWidth = 200;
   this.ncConv.setRange(1.0, 10.0);
   this.ncConv.setPrecision(2);
   this.ncConv.slider.setRange(10, 100);
   this.ncConv.toolTip = "<p>Controls how fast saturated colors transition to white. Fixes donut holes in stars.</p>";
   this.ncConv.onValueUpdated = function(val) { p_convergence = val; };

   this.ncSat = new NumericControl(this);
   this.ncSat.label.text = "Saturation Amount:";
   this.ncSat.label.minWidth = 200;
   this.ncSat.setRange(0.0, 1.0);
   this.ncSat.setPrecision(2);
   this.ncSat.slider.setRange(0, 100);
   this.ncSat.toolTip = "<p>Adjust final color intensity. 1.00 = Preserves physical vectors. Lower values desaturate.</p>";
   this.ncSat.onValueUpdated = function(val) { p_saturation = val; };

   this.physGroup.sizer.add(this.ncConv);
   this.physGroup.sizer.add(this.ncSat);

   this.progressLabel = new Label(this);
   this.progressLabel.text = "Ready.";
   this.progressLabel.textAlignment = TextAlign_Center;

   this.progressBar = new Slider(this);
   this.progressBar.setRange(0, 100);
   this.progressBar.value = 0;
   this.progressBar.enabled = false;
   this.progressBar.minWidth = 300;

   this.btnSizer = new HorizontalSizer;
   this.btnSizer.spacing = 6;

   this.btnInstance = new ToolButton(this);
   this.btnInstance.icon = this.scaledResource( ":/process-interface/new-instance.png" );
   this.btnInstance.setScaledFixedSize( 24, 24 );
   this.btnInstance.toolTip = "New Instance (Drag to Workspace)";
   this.btnInstance.onMousePress = function() {
      this.hasFocus = true;
      dlg.saveParams();
      this.pushed = false;
      this.dialog.newInstance();
   };

   this.btnReset = new PushButton(this);
   this.btnReset.text = "Default Settings";
   this.btnReset.toolTip = "Reset all parameters to default.";
   this.btnReset.onClick = function() { dlg.resetDefaults(); };

   this.btnProcess = new PushButton(this);
   this.btnProcess.text = "PROCESS";
   this.btnProcess.defaultButton = true;
   // CHANGED COLOR TO GREEN (ARGB Format: Alpha=FF, R=00, G=99, B=00)
   this.btnProcess.backgroundColor = 0xFF009900; 
   this.btnProcess.textColor = 0xFFFFFF;
   this.btnProcess.toolTip = "Execute the Stretch";
   
   this.btnProcess.onClick = function() {
      // CHECK FOR IMAGE IMMEDIATELY
      if (!ImageWindow.activeWindow) {
         (new MessageBox("Please load an image first before clicking Process.", "No Active Image", StdIcon_Error, StdButton_Ok)).execute();
         return;
      }

      dlg.btnProcess.enabled = false;
      dlg.btnReset.enabled = false;
      dlg.btnAuto.enabled = false;
      dlg.saveParams();
      
      var params = {
         weights: SENSOR_PROFILES[p_sensorProfile].weights,
         logD: p_logD,
         protectB: p_protectB,
         convergence: p_convergence,
         processingMode: p_processingMode,
         targetBg: p_targetBg,
         saturation: p_saturation
      };

      var callback = function(msg, percent) {
         dlg.progressLabel.text = msg;
         dlg.progressBar.value = percent;
      };

      try {
         var resImg = processVeraLux(ImageWindow.activeWindow.mainView.image, params, callback);
         if (resImg) {
            var w = new ImageWindow(resImg.width, resImg.height, resImg.numberOfChannels, 
                                    resImg.bitsPerSample, resImg.isReal, resImg.isColor, "VeraLux_Output");
            w.mainView.beginProcess();
            w.mainView.image.assign(resImg);
            w.mainView.endProcess();
            w.show();
            dlg.ok();
         }
      } catch (e) {
         (new MessageBox("Error: " + e, "VeraLux Error", StdIcon_Error, StdButton_Ok)).execute();
         dlg.btnProcess.enabled = true;
         dlg.btnReset.enabled = true;
         dlg.btnAuto.enabled = true;
      }
   };

   this.btnClose = new PushButton(this);
   this.btnClose.text = "Close";
   this.btnClose.onClick = function() { dlg.cancel(); };

   this.btnSizer.add(this.btnInstance);
   this.btnSizer.addStretch();
   this.btnSizer.add(this.btnReset);
   this.btnSizer.add(this.btnProcess);
   this.btnSizer.add(this.btnClose);

   this.sizer = new VerticalSizer;
   this.sizer.margin = 12;
   this.sizer.spacing = 8;
   this.sizer.add(this.titleLabel);
   this.sizer.add(this.subtitleLabel);
   this.sizer.add(this.reqLabel);
   this.sizer.addSpacing(8);
   this.sizer.add(this.topSizer);
   this.sizer.add(this.engineGroup);
   this.sizer.add(this.physGroup);
   this.sizer.addSpacing(6);
   this.sizer.add(this.progressBar);
   this.sizer.add(this.progressLabel);
   this.sizer.addSpacing(6);
   this.sizer.add(this.btnSizer);

   this.windowTitle = "VeraLux v" + VERSION;
   this.adjustToContents();
   this.setFixedSize();

   this.loadParams = function() {
      if (p_processingMode === "ready_to_use") this.radReady.checked = true;
      else this.radSci.checked = true;
      this.updateModeText();

      for(var i=0; i<this.sensorCombo.numberOfItems; i++) {
         if(this.sensorCombo.itemText(i) == p_sensorProfile) {
            this.sensorCombo.currentItem = i;
            break;
         }
      }
      this.updateSensorText();

      this.ncTarget.setValue(p_targetBg);
      this.ncLogD.setValue(p_logD);
      this.ncProtect.setValue(p_protectB);
      this.ncConv.setValue(p_convergence);
      this.ncSat.setValue(p_saturation);
   };

   this.saveParams = function() {
      p_targetBg = this.ncTarget.value;
      p_logD = this.ncLogD.value;
      p_protectB = this.ncProtect.value;
      p_convergence = this.ncConv.value;
      p_saturation = this.ncSat.value;
      p_sensorProfile = this.sensorCombo.itemText(this.sensorCombo.currentItem);
      p_processingMode = this.radReady.checked ? "ready_to_use" : "scientific";
   };

   this.resetDefaults = function() {
      p_processingMode = "scientific";
      p_sensorProfile = DEFAULT_PROFILE;
      p_targetBg = 0.20;
      p_logD = 4.88;
      p_protectB = 6.0;
      p_convergence = 3.5;
      p_saturation = 0.90;
      this.loadParams();
   };

   this.runAutoSolver = function() {
      if (!ImageWindow.activeWindow) {
          (new MessageBox("Please load an image first for the Auto Solver.", "No Active Image", StdIcon_Error, StdButton_Ok)).execute();
          return;
      }
      var img = ImageWindow.activeWindow.mainView.image;
      var weights = SENSOR_PROFILES[p_sensorProfile].weights;
      var isRGB = img.numberOfChannels === 3;
      
      this.progressLabel.text = "Auto-Solver Running...";
      processEvents();

      var anchor = VeraLuxCore.calculateAnchor(img, isRGB);
      var samples = [];
      var step = Math.max(1, Math.floor((img.width*img.height)/100000));
      for(var i=0; i<img.width*img.height; i+=step) {
         var x = i % img.width; var y = Math.floor(i/img.width);
         var val = isRGB ? 
            (weights[0]*img.sample(x,y,0) + weights[1]*img.sample(x,y,1) + weights[2]*img.sample(x,y,2)) : 
            img.sample(x,y,0);
         val = Math.max(0, val - anchor);
         if(val > 1e-7) samples.push(val);
      }
      
      var medianIn = VeraLuxCore.percentile(samples, 50);
      var res = VeraLuxCore.solveLogD(medianIn, this.ncTarget.value, this.ncProtect.value);
      this.ncLogD.setValue(res);
      this.progressLabel.text = "Solved LogD: " + res.toFixed(2);
   };

   this.loadParams();
}
VeraLuxDialog.prototype = new Dialog;

function main() {
   if (Parameters.has("mode")) {
      p_processingMode = Parameters.getString("mode");
      p_sensorProfile = Parameters.getString("sensor");
      p_targetBg = Parameters.getReal("bg");
      p_logD = Parameters.getReal("logD");
      p_protectB = Parameters.getReal("protectB");
      p_convergence = Parameters.getReal("conv");
      if(Parameters.has("sat")) p_saturation = Parameters.getReal("sat");
   }

   if (Parameters.isViewTarget) {
      var view = Parameters.targetView;
      console.show();
      console.writeln("VeraLux: Executing Instance on " + view.id);
      
      var params = {
         weights: SENSOR_PROFILES[p_sensorProfile].weights,
         logD: p_logD,
         protectB: p_protectB,
         convergence: p_convergence,
         processingMode: p_processingMode,
         targetBg: p_targetBg,
         saturation: p_saturation
      };
      
      var resImg = processVeraLux(view.image, params, function(msg){ console.writeln(msg); });
      
      var w = new ImageWindow(resImg.width, resImg.height, resImg.numberOfChannels, 
                              resImg.bitsPerSample, resImg.isReal, resImg.isColor, "VeraLux_Instance");
      w.mainView.beginProcess();
      w.mainView.image.assign(resImg);
      w.mainView.endProcess();
      w.show();
      
   } else {
      var dialog = new VeraLuxDialog();
      dialog.execute();
   }

   Parameters.set("mode", p_processingMode);
   Parameters.set("sensor", p_sensorProfile);
   Parameters.set("bg", p_targetBg);
   Parameters.set("logD", p_logD);
   Parameters.set("protectB", p_protectB);
   Parameters.set("conv", p_convergence);
   Parameters.set("sat", p_saturation);
}

main();