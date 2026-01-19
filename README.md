# Virtual Digital Electronics Lab

## Overview

The Virtual Digital Electronics Lab is a **web-based interactive application** that allows users to design, simulate, and analyze digital circuits online. Users can drag-and-drop logic gates, switches, and LEDs, connect them using wires, and test their circuits in real-time.

---

## Features

* **Drag-and-drop components**: Input switches, clocks, LEDs, and logic gates (AND, OR, NOT, NAND, NOR, XOR, XNOR).
* **Simulation mode**: Test circuit behavior interactively.
* **Truth Table Generation**: Automatically generates truth tables for your circuits.
* **PDF Export**: Save circuit diagrams as PDF files.
* **Responsive Design**: Works on desktops and tablets.
* **Modular Routing**: Multi-page navigation including Dashboard, Settings, and Help.

---

## Technologies Used

* **Frontend**: HTML5, CSS3, JavaScript (ES6+)
* **Deployment**: Netlify
* **Version Control**: Git & GitHub

---

## File Structure

```
virtual-lab/
├── assets/
│   ├── css/
│   │   └── main.css
│   └── js/
│       └── app.js
├── index.html        # Main dashboard
├── settings.html     # Settings page
├── help.html         # Help page
├── login.html        # Login page
└── README.md         # Project documentation
```

---

## Usage

1. Clone the repository:

   ```bash
   git clone https://github.com/Vickiegatheru/virtual-lab.git
   ```
2. Open `index.html` in your browser to start the lab.
3. Use the sidebar to add components and design circuits.
4. Click `Simulate` to test your circuit.
5. Export circuits as PDF using the `Save as PDF` button.

---

## Deployment

The project is deployed live on Netlify: [https://virtualdelab.netlify.app/](https://virtualdelab.netlify.app/)

---

## Contributing

* Fork the repository and create a branch for new features or bug fixes.
* Ensure code is clean and commented.
* Submit pull requests for review.

---

## License

This project is open-source under the MIT License.
