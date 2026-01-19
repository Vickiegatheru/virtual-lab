document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.querySelector('.canvas');
  const wiringLayer = document.getElementById('wiring-layer');
  const infoPanel = document.getElementById('info-panel');

  let tempWire = null;
  let wireStart = null;
  let connections = [];
  let clockIntervals = [];
  let deleteMode = false;
  let simulationMode = false;
  let history = [];
  let historyIndex = -1;


  const idCounters = {
    input: 1,
    clock: 1,
    output: 1,
    gate: 1
  };

  function createLabel(prefix) {
    return prefix + (idCounters[prefix.toLowerCase()]++);
  }

  document.getElementById('new-file-btn').addEventListener('click', () => {
    canvas.querySelectorAll('.gate-component, .input-component, .output-component').forEach(e => e.remove());
    wiringLayer.innerHTML = '';
    connections = [];
    clockIntervals.forEach(c => clearInterval(c));
    clockIntervals = [];
    for (let key in idCounters) idCounters[key] = 1;
  });

  document.getElementById('delete-mode-btn').addEventListener('click', () => {
    deleteMode = !deleteMode;
    document.getElementById('delete-mode-btn').innerText = `Delete Mode: ${deleteMode ? 'ON' : 'OFF'}`;
  });

  document.querySelectorAll('.spawn-input').forEach(btn =>
    btn.addEventListener('click', () => spawnInput(btn.dataset.type))
  );

  document.querySelectorAll('.spawn-gate').forEach(btn =>
    btn.addEventListener('click', () => spawnGate(btn.dataset.gate))
  );

  document.querySelectorAll('.spawn-output').forEach(btn =>
    btn.addEventListener('click', () => spawnOutput(btn.dataset.type))
  );
  document.getElementById('undo-btn').addEventListener('click', () => {
    if (historyIndex > 0) {
      historyIndex--;
      restoreSnapshot(history[historyIndex]);
    }
  });
  
  document.getElementById('redo-btn').addEventListener('click', () => {
    if (historyIndex < history.length - 1) {
      historyIndex++;
      restoreSnapshot(history[historyIndex]);
    }
  });
  document.getElementById('save-pdf-btn').addEventListener('click', async () => {
  const { jsPDF } = window.jspdf;
  const canvasArea = document.querySelector('.canvas');
  
  html2canvas(canvasArea).then(canvas => {
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ orientation: 'landscape' });
    const width = pdf.internal.pageSize.getWidth();
    const height = pdf.internal.pageSize.getHeight();
    pdf.addImage(imgData, 'PNG', 0, 0, width, height);
    pdf.save('circuit.pdf');
  });
});

  

  function spawnInput(type) {
    const el = document.createElement('div');
    el.className = 'input-component';
    el.dataset.value = '0001';
    el.dataset.bits = '4';

    const label = type === 'clock' ? createLabel('Clock') : createLabel('Input');

    el.innerHTML = `
  <div class="input-node-label">${label}</div>
  <div class="input-value-display">${el.dataset.value}</div>
  <div class="connector output"></div>
`;

    el.style.left = '100px';
    el.style.top = '100px';
    canvas.appendChild(el);
    makeDraggable(el);
    setupConnectorEvents(el);

    el.addEventListener('click', e => {
  if (deleteMode) {
    deleteComponent(el);
    return;
  }
  if (type === 'input') {
    el.dataset.value = toggleBinary(el.dataset.value);
    const label = el.querySelector('.input-value-display');
    if (label) label.innerText = el.dataset.value;
    calculate();
    saveHistory();
  }
});


    el.addEventListener('dblclick', () => {
      const label = prompt("Enter custom input label:", el.dataset.label || el.querySelector('.input-node-label').innerText);
      if (label) {
        el.dataset.label = label;
        el.querySelector('.input-node-label').innerText = label;
      }
    });
    
   if (type === 'clock') {
  const interval = setInterval(() => {
    el.dataset.value = toggleBinary(el.dataset.value);
    const label = el.querySelector('.input-value-display');
    if (label) label.innerText = el.dataset.value;
    calculate();
  }, 1000);
  clockIntervals.push(interval);
}

  }
  function saveHistory() {
    const snapshot = {
      components: [],
      connections: connections.map(c => ({
        fromId: c.from.dataset.label || c.from.querySelector('.component-label')?.innerText || '',
        toId: c.to.dataset.label || c.to.querySelector('.component-label')?.innerText || '',
        input: c.input
      }))
    };
  
    canvas.querySelectorAll('.input-component, .gate-component, .output-component').forEach(el => {
      snapshot.components.push({
        class: el.className,
        dataset: { ...el.dataset },
        style: { left: el.style.left, top: el.style.top },
        innerHTML: el.innerHTML
      });
    });
  
    history = history.slice(0, historyIndex + 1);
    history.push(snapshot);
    historyIndex++;
  }
  function restoreSnapshot(snapshot) {
    canvas.innerHTML = '<svg id="wiring-layer" class="wiring-layer"></svg>';
    wiringLayer = document.getElementById('wiring-layer');
    connections = [];
  
    snapshot.components.forEach(comp => {
      const el = document.createElement('div');
      el.className = comp.class;
      Object.assign(el.dataset, comp.dataset);
      el.innerHTML = comp.innerHTML;
      el.style.left = comp.style.left;
      el.style.top = comp.style.top;
      canvas.appendChild(el);
      makeDraggable(el);
      setupConnectorEvents(el);
    });
  
    const nodes = [...canvas.children];
    snapshot.connections.forEach(c => {
      const from = nodes.find(el => (el.dataset.label || el.querySelector('.component-label')?.innerText) === c.fromId);
      const to = nodes.find(el => (el.dataset.label || el.querySelector('.component-label')?.innerText) === c.toId);
      const out = from?.querySelector('.connector.output');
      const inp = to?.querySelector(`.connector.input[data-input="${c.input}"]`);
      if (out && inp) {
        const p1 = getConnectorPosition(out);
        const p2 = getConnectorPosition(inp);
        const midX = (p1.x + p2.x) / 2;
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
        line.setAttribute('points', `${p1.x},${p1.y} ${midX},${p1.y} ${midX},${p2.y} ${p2.x},${p2.y}`);
        line.classList.add('wire');
        wiringLayer.appendChild(line);
        connections.push({ from, to, input: c.input, line });
      }
    });
  
    calculate();
  }
    

  function spawnGate(type) {
    const el = document.createElement('div');
    el.className = 'gate-component';
    el.dataset.gate = type;
    el.dataset.input1 = '0000';
    el.dataset.input2 = '0000';
    el.dataset.output = '0000';
    el.dataset.bits = '4';

    const label = createLabel(type);
    const symbols = { AND: '∧', OR: '∨', NOT: '¬', NAND: '↑', NOR: '↓', XOR: '⊕', XNOR: '⊙' };

    el.innerHTML = `
      <div class="connector input" data-input="1" style="top:25%;left:-5px;"></div>
      ${type !== 'NOT' ? '<div class="connector input" data-input="2" style="top:75%;left:-5px;"></div>' : ''}
      <div class="connector output" style="top:50%;right:-5px;"></div>
      <div class="gate-symbol">${symbols[type] || type}</div>
      <div class="component-label">${label}</div>
    `;
    el.style.left = '200px';
    el.style.top = '200px';
    canvas.appendChild(el);
    makeDraggable(el);
    setupConnectorEvents(el);

    el.addEventListener('click', e => {
      if (deleteMode) {
        deleteComponent(el);
        return;
      }
    });

    el.addEventListener('dblclick', () => {
      const bits = prompt("Enter number of bits:", el.dataset.bits || '4');
      if (bits && /^\d+$/.test(bits)) el.dataset.bits = bits;
    });
  }

  function spawnOutput(type) {
    const el = document.createElement('div');
    el.className = 'output-component';
    el.dataset.value = '0000';
    el.dataset.bits = '4';

    const label = createLabel('Output');

    el.innerHTML = `
      <div class="led-indicator off"></div>
      <div class="input-node-label">${label}</div>
      <div class="connector input" data-input="1"></div>
    `;
    el.style.left = '300px';
    el.style.top = '300px';
    canvas.appendChild(el);
    makeDraggable(el);
    setupConnectorEvents(el);

    el.addEventListener('click', e => {
      if (deleteMode) {
        deleteComponent(el);
        return;
      }
    });

    el.addEventListener('dblclick', () => {
      const label = prompt("Enter custom output label:", el.dataset.label || el.querySelector('.input-node-label').innerText);
      if (label) {
        el.dataset.label = label;
        el.querySelector('.input-node-label').innerText = label;
      }
    });
    
  }

  function setupConnectorEvents(comp) {
    comp.querySelectorAll('.connector.output').forEach(output => {
      output.addEventListener('mousedown', (e) => {
        if (deleteMode) return;
        e.stopPropagation();
        const pos = getConnectorPosition(output);
        tempWire = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
        tempWire.setAttribute('points', `${pos.x},${pos.y} ${pos.x},${pos.y}`);
        tempWire.setAttribute('fill', 'none');
        tempWire.classList.add('wire');
        wiringLayer.appendChild(tempWire);
        wireStart = { element: comp, connector: output, x: pos.x, y: pos.y };
      });
    });

    comp.querySelectorAll('.connector.input').forEach(input => {
      input.addEventListener('mouseup', () => {
        if (tempWire && wireStart) {
          const p1 = { x: wireStart.x, y: wireStart.y };
          const p2 = getConnectorPosition(input);
          const midX = (p1.x + p2.x) / 2;

          const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
          polyline.setAttribute('points', `${p1.x},${p1.y} ${midX},${p1.y} ${midX},${p2.y} ${p2.x},${p2.y}`);
          polyline.setAttribute('fill', 'none');
          polyline.classList.add('wire');
          polyline.addEventListener('click', () => {
            if (deleteMode) {
              polyline.remove();
              connections = connections.filter(c => c.line !== polyline);
            }
          });

          wiringLayer.replaceChild(polyline, tempWire);
          connections.push({
            from: wireStart.element,
            to: comp,
            input: input.dataset.input,
            line: polyline
          });

          tempWire = null;
          wireStart = null;
          calculate();
        }
      });
    });
  }

  document.addEventListener('mousemove', (e) => {
    if (tempWire) {
      const canvasRect = canvas.getBoundingClientRect();
      const x = e.clientX - canvasRect.left;
      const y = e.clientY - canvasRect.top;
      const points = `${wireStart.x},${wireStart.y} ${(wireStart.x + x) / 2},${wireStart.y} ${(wireStart.x + x) / 2},${y} ${x},${y}`;
      tempWire.setAttribute('points', points);
    }
  });

  document.addEventListener('mouseup', () => {
    if (tempWire) {
      tempWire.remove();
      tempWire = null;
      wireStart = null;
    }
  });

  function makeDraggable(el) {
    let offsetX, offsetY, isDragging = false;
    el.addEventListener('mousedown', e => {
      if (e.target.classList.contains('connector')) return;
      isDragging = true;
      const rect = el.getBoundingClientRect();
      offsetX = e.clientX - rect.left;
      offsetY = e.clientY - rect.top;
    });

    document.addEventListener('mousemove', e => {
      if (!isDragging) return;
      const canvasRect = canvas.getBoundingClientRect();
      el.style.left = `${e.clientX - canvasRect.left - offsetX}px`;
      el.style.top = `${e.clientY - canvasRect.top - offsetY}px`;
      updateWires(el);
    });

    document.addEventListener('mouseup', () => isDragging = false);
  }

  function getConnectorPosition(connector) {
    const rect = connector.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();
    return {
      x: rect.left + 5 - canvasRect.left,
      y: rect.top + 5 - canvasRect.top
    };
  }

  function updateWires(el) {
    connections.forEach(conn => {
      if (conn.from === el || conn.to === el) {
        const out = conn.from.querySelector('.connector.output');
        const inp = conn.to.querySelector(`.connector.input[data-input="${conn.input}"]`);
        const p1 = getConnectorPosition(out);
        const p2 = getConnectorPosition(inp);
        const midX = (p1.x + p2.x) / 2;
        conn.line.setAttribute('points', `${p1.x},${p1.y} ${midX},${p1.y} ${midX},${p2.y} ${p2.x},${p2.y}`);
      }
    });
  }

  function calculate() {
    connections.forEach(conn => {
      let value = conn.from.dataset.output || conn.from.dataset.value || '0000';
      if (conn.to.classList.contains('gate-component')) {
        if (conn.input === '1') conn.to.dataset.input1 = value;
        if (conn.input === '2') conn.to.dataset.input2 = value;
        processGate(conn.to);
      } else if (conn.to.classList.contains('output-component')) {
        conn.to.dataset.value = value;
        updateLED(conn.to, value);
      }
    });
  }

  
  function updateLED(el, value) {
    const led = el.querySelector('.led-indicator');
    if (value.includes('1')) {
      led.classList.remove('off');
      led.classList.add('on');
    } else {
      led.classList.remove('on');
      led.classList.add('off');
    }
  }

  function toggleBinary(bin) {
    return bin.split('').map(c => c === '1' ? '0' : '1').join('');
  }

  function deleteComponent(comp) {
    connections = connections.filter(c => {
      if (c.from === comp || c.to === comp) {
        c.line.remove();
        return false;
      }
      return true;
    });
    comp.remove();
  }

  // ✅ Add truth table button inside DOMContentLoaded
  document.getElementById('truth-table-btn').addEventListener('click', generateTruthTable);

  document.getElementById('simulate-btn').addEventListener('click', () => {
    simulationMode = !simulationMode;
    document.body.classList.toggle('simulation-active', simulationMode);
    document.getElementById('simulate-btn').innerText = `Simulation Mode: ${simulationMode ? 'ON' : 'OFF'}`;
  });
});



function generateCombinations(n) {
  const result = [];
  const total = Math.pow(2, n);
  for (let i = 0; i < total; i++) {
    result.push(i.toString(2).padStart(n, '0').split(''));
  }
  return result;
}

function displayTruthTable(inputCount, outputCount, rows) {
  const modal = document.getElementById('truth-table-modal');
  const container = document.getElementById('truth-table-container');
  const closeBtn = document.getElementById('close-modal-btn');

  let html = `<table style="width:100%; font-size:14px; border-collapse:collapse;">`;
  html += '<tr>';
  const canvas = document.querySelector('.canvas');
const inputLabels = [...canvas.querySelectorAll('.input-component')].map(el => el.dataset.label || el.querySelector('.input-node-label').innerText);
const outputLabels = [...canvas.querySelectorAll('.output-component')].map(el => el.dataset.label || el.querySelector('.input-node-label').innerText);

inputLabels.forEach(label => html += `<th style="border:1px solid #ccc; padding:4px;">${label}</th>`);
outputLabels.forEach(label => html += `<th style="border:1px solid #ccc; padding:4px;">${label}</th>`);

  html += '</tr>';

  rows.forEach(row => {
    html += '<tr>';
    row.forEach(cell => html += `<td style="text-align:center; border:1px solid #ccc; padding:4px;">${cell}</td>`);
    html += '</tr>';
  });

  html += '</table>';
  container.innerHTML = html;
  modal.style.display = 'block';

  closeBtn.onclick = () => {
    modal.style.display = 'none';
  };

  window.onclick = (event) => {
    if (event.target === modal) {
      modal.style.display = 'none';
    }
  };
}
saveHistory(); // ← Add this

function generateCombinations(n) {
  const result = [];
  const total = Math.pow(2, n);
  for (let i = 0; i < total; i++) {
    result.push(i.toString(2).padStart(n, '0').split(''));
  }
  return result;
}

function generateTruthTable() {
  const canvas = document.querySelector('.canvas');
  const inputs = [...canvas.querySelectorAll('.input-component:not(.clock)')];
  const outputs = [...canvas.querySelectorAll('.output-component')];
  const clocks = [...canvas.querySelectorAll('.input-component.clock')];

  if (inputs.length === 0 || outputs.length === 0) {
    alert("Please add at least one non-clock input and one output component.");
    return;
  }

  // Calculate total input bits
  const inputBits = inputs.reduce((sum, input) => sum + parseInt(input.dataset.bits || 4), 0);
  const combinations = generateCombinations(inputBits);
  const rows = [];

  // Store original values
  const originalValues = new Map();
  inputs.forEach(input => originalValues.set(input, input.dataset.value));
  clocks.forEach(clock => originalValues.set(clock, clock.dataset.value));

  combinations.forEach((combination, index) => {
    // Set input values
    let bitPtr = 0;
    inputs.forEach(input => {
      const bits = parseInt(input.dataset.bits || 4);
      const value = combination.slice(bitPtr, bitPtr + bits).join('');
      input.dataset.value = value.padEnd(bits, '0').slice(0, bits);
      bitPtr += bits;
      
      const display = input.querySelector('.input-value-display');
      if (display) display.textContent = input.dataset.value;
    });

    // Reset all outputs and gates
    outputs.forEach(output => output.dataset.value = '0'.repeat(output.dataset.bits || 4));
    document.querySelectorAll('.gate-component').forEach(gate => {
      gate.dataset.input1 = '0'.repeat(gate.dataset.bits || 4);
      gate.dataset.input2 = '0'.repeat(gate.dataset.bits || 4);
      gate.dataset.output = '0'.repeat(gate.dataset.bits || 4);
    });

    // Stabilize circuit (3 propagation cycles)
    for (let i = 0; i < 3; i++) calculate();

    // Capture output states
    const row = combination.slice();
    outputs.forEach(output => {
      const value = output.dataset.value || '0000';
      row.push(value.includes('1') ? '1' : '0');
    });

    rows.push(row);
  });

  // Restore original values
  originalValues.forEach((value, element) => {
    element.dataset.value = value;
    const display = element.querySelector('.input-value-display');
    if (display) display.textContent = value;
  });

  calculate(); // Restore original state
  displayTruthTable(inputBits, outputs.length, rows);
}

function displayTruthTable(inputBits, outputCount, rows) {
  const modal = document.getElementById('truth-table-modal');
  const container = document.getElementById('truth-table-container');
  const closeBtn = document.getElementById('close-modal-btn');
  
  // Clear previous content
  container.innerHTML = '';

  // Create table
  const table = document.createElement('table');
  table.style.width = '100%';
  table.style.borderCollapse = 'collapse';
  table.style.margin = '10px 0';

  // Create header
  const headerRow = document.createElement('tr');
  const canvas = document.querySelector('.canvas');
  
  // Input headers
  const inputs = [...canvas.querySelectorAll('.input-component:not(.clock)')];
  inputs.forEach((input, index) => {
    const th = document.createElement('th');
    th.textContent = input.dataset.label || `Input ${index + 1}`;
    th.style.border = '1px solid #ccc';
    th.style.padding = '8px';
    headerRow.appendChild(th);
  });

  // Output headers
  const outputs = [...canvas.querySelectorAll('.output-component')];
  outputs.forEach((output, index) => {
    const th = document.createElement('th');
    th.textContent = output.dataset.label || `Output ${index + 1}`;
    th.style.border = '1px solid #ccc';
    th.style.padding = '8px';
    headerRow.appendChild(th);
  });

  table.appendChild(headerRow);

  // Create data rows
  rows.forEach(row => {
    const tr = document.createElement('tr');
    row.forEach((cell, cellIndex) => {
      const td = document.createElement('td');
      td.textContent = cell;
      td.style.border = '1px solid #ccc';
      td.style.padding = '8px';
      td.style.textAlign = 'center';
      if (cellIndex >= inputs.length) {
        td.style.backgroundColor = cell === '1' ? '#e6ffe6' : '#ffe6e6';
      }
      tr.appendChild(td);
    });
    table.appendChild(tr);
  });

  container.appendChild(table);
  modal.style.display = 'block';

  // Close modal handlers
  closeBtn.onclick = () => modal.style.display = 'none';
  window.onclick = (event) => {
    if (event.target === modal) modal.style.display = 'none';
  };
}


function simulateCircuit() {
  for (let i = 0; i < 5; i++) {
    connections.forEach(conn => {
      let value = conn.from.dataset.output || conn.from.dataset.value || '0000';

      if (conn.to.classList.contains('gate-component')) {
        if (conn.input === '1') conn.to.dataset.input1 = value;
        if (conn.input === '2') conn.to.dataset.input2 = value;
        processGate(conn.to);
      } else if (conn.to.classList.contains('output-component')) {
        conn.to.dataset.value = value;
        updateLED(conn.to, value);
      }
    });
  }
}

function processGate(gate) {
  const type = gate.dataset.gate;
  const a = gate.dataset.input1 || '0000';
  const b = gate.dataset.input2 || '0000';
  const bits = parseInt(gate.dataset.bits || '4');
  let out = '';

  for (let i = 0; i < bits; i++) {
    const ai = parseInt(a[i] || '0');
    const bi = parseInt(b[i] || '0');
    let bit = 0;

    switch (type) {
      case 'AND':
        bit = (ai === 1 && bi === 1) ? 1 : 0;
        break;
      case 'OR':
        bit = (ai === 1 || bi === 1) ? 1 : 0;
        break;
      case 'NOT':
        bit = ai === 0 ? 1 : 0;
        break;
      case 'NAND':
        bit = (ai === 1 && bi === 1) ? 0 : 1;
        break;
      case 'NOR':
        bit = (ai === 0 && bi === 0) ? 1 : 0;
        break;
      case 'XOR':
        bit = (ai !== bi) ? 1 : 0;
        break;
      case 'XNOR':
        bit = (ai === bi) ? 1 : 0;
        break;
    }

    out += bit.toString();
  }

  gate.dataset.output = out;
}

function generateTruthTable() {
  console.log('Generating truth table...');
  
  // After calculating combinations
  console.log('Total combinations:', combinations.length);
  
  // After creating rows
  console.log('Generated rows:', rows);
  
  // Right before displaying
  console.log('Calling displayTruthTable');
  displayTruthTable(inputBits, outputs.length, rows);
}