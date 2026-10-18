# Generalized ARQ Protocol Simulator — DLL Flow Control

An interactive discrete-event simulator for Data Link Layer (DLL) Automatic Repeat Request (ARQ) flow control protocols[cite: 1]. Built with vanilla JavaScript, HTML5 Canvas, SVG, and Tailwind CSS[cite: 1].

## ✨ Features
- **3 Core ARQ Protocols:** Stop-and-Wait (`SW`), Go-Back-N (`GBN`), and Selective Repeat (`SR`)[cite: 1].
- **Real-Time Visualizations:**
  - **Live Channel View:** HTML5 Canvas animation of in-flight data frames, ACKs, timeouts, and mid-channel packet drops[cite: 1].
  - **Live Space-Time Ladder Diagram:** Dynamic SVG ray-tracing diagram synced to the simulation clock[cite: 1].
  - **Split Live Mode:** Side-by-side simultaneous channel and ladder visualization[cite: 1].
- **Interactive Sliding Windows:** Real-time Sender ($W_s$) and Receiver ($W_r$) window tapes with constraint validation ($W_s \le 2^m - 1$ for GBN, $W_s, W_r \le 2^{m-1}$ for SR)[cite: 1].
- **Channel Fault Injection & Presets:** Toggle 1st-transmission frame/ACK losses or run 7 built-in Lab Test Cases with 1 click[cite: 1].
- **3-Protocol Benchmark Modal:** Side-by-side comparison of delivery efficiency, total attempts, retransmissions, and simulated ticks[cite: 1].
- **Dual Engineering Themes:** Switch between **Obsidian** (dark) and **Paper** (light) modes[cite: 1].

## 📂 Project Structure
```text
arq_protocol_simulator/
├── index.html          # Main application layout & workspace
├── css/
│   └── styles.css      # Theme variables (Paper/Obsidian) & keyframe animations
└── js/
    ├── config.js       # Constants, theme palettes, presets & global state
    ├── engine.js       # Discrete-event ARQ simulation & window validation
    ├── renderer.js     # Canvas animator, SVG ladder & DOM state updates
    ├── comparison.js   # 3-Protocol comparison benchmark & Markdown exporter
    └── main.js         # Playback loop, event listeners & initialization