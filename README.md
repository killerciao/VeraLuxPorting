# VeraLux — HyperMetric Stretch for PixInsight

![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)
![Platform](https://img.shields.io/badge/Platform-PixInsight-orange)
![Version](https://img.shields.io/badge/Version-1.2.2-green)

**A Physics-based Photometric Hyperbolic Stretch Engine.**

> [!IMPORTANT]
> **Original Authorship & Credits**
>
> This script is a port of the original **VeraLux** tool developed for Siril/Python by **Riccardo Paterniti**.
> All credit for the underlying mathematics, the "True Color" methodology, and the sensor weighting logic belongs to him.
>
> *   **Original Project:** [VeraLux.space](https://veralux.space)
> *   **Original Author:** Riccardo Paterniti
> *   **License:** GPL-3.0-or-later

---

## 📖 About This Port

This repository houses a **PixInsight JavaScript Runtime (PJSR)** implementation of the VeraLux engine. It replicates the functionality of the original Python script (v1.2.2), allowing PixInsight users to benefit from Riccardo's photometric stretching methodology.

### 🤖 Origin Story
This project began as a personal experiment to test the capabilities of modern AI coding assistants. I wanted to see if an AI could accurately translate complex Python/NumPy logic into PixInsight's specific JavaScript implementation.

While it started as a private test, the repository was discovered and shared by the community before a formal release was prepared. I have since polished the code, ensured license compliance, and updated the math to match the latest official version (1.2.2).

---

## ✨ Key Features

VeraLux operates on a fundamental axiom: standard histogram transformations often destroy the photometric relationships between color channels (hue shifts).

*   **Photometric Integrity:** Decouples Luminance geometry from Chromatic vectors to preserve true color.
*   **Sensor-Aware:** Includes a database of Quantum Efficiency (QE) weights for specific sensors (IMX571, IMX533, Canon, Nikon, etc.) for accurate luminance extraction.
*   **Auto-Solver:** Automatically calculates the optimal Stretch Factor (`Log D`) to reach your target background level.
*   **Hybrid Color Grip:** (New in v1.2.2) Allows blending between "Scientific" vector preservation and "Visual" scalar stretching to manage star core saturation.
*   **Adaptive "Star-Safe" Scaling:** Prevents star bloat during the non-linear expansion phase.

---
## ⏩ Automatic Installation

1.  Open **PixInsight**.
2.  Go to **Resources > Updates > Manage Repositories > add > "https://raw.githubusercontent.com/killerciao/VeraLuxPorting/main/"**
3.   Go to **Resources > Updates > Manage Repositories > Check For update > install the new updates >restart Pixinsight**

---
## 🛠️ Manual Installation

1.  Download the `verlux.js` file from this repository.
2.  Open **PixInsight**.
3.  Go to **Script > Execute Script File...**
4.  Navigate to where you downloaded `verlux.js` and select it.

*(Optional): You can add it to your "Featured Scripts" menu within PixInsight for faster access.*

---

## 🚀 Usage Guide

### Prerequisites
*   The image must be **Linear** (not yet stretched).
*   **Background Extraction** (GraXpert/DBE) must be applied.
*   **Color Calibration** (SPCC) must be applied. *This is critical as VeraLux locks color vectors based on this calibration.*

### Step-by-Step

1.  **Processing Mode:**
    *   **Ready-to-Use:** Applies Star-Safe expansion, linked MTF, and soft-clipping. Best for aesthetic images.
    *   **Scientific:** Pure mathematical stretch clipped at 1.0. Best for data analysis.
2.  **Sensor Calibration:** Select your camera sensor from the list. If unknown, use `Rec.709`.
3.  **Target Background:** Set your desired median background (Default `0.20`).
4.  **Auto-Calculate:** Click **⚡ Auto-Calculate Log D**. The script will analyze your data and set the stretch intensity automatically.
5.  **Fine Tuning (Optional):**
    *   **Protect b:** Controls highlight protection. Higher values = tighter stars.
    *   **Color Grip:** `1.00` is pure vector preservation (Vivid). Lower values blend in standard stretching to soften star cores.
6.  **Process:** Click the green **PROCESS** button.

---

## 📄 License

This project is licensed under the **GNU General Public License v3.0**.

You are free to use, modify, and distribute this software under the terms of the GPLv3. Any derivative works must also be open-source and preserve the original copyright notices and attribution to Riccardo Paterniti.
