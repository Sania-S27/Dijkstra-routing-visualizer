import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { Play, RotateCcw, PlusCircle, Network, Trash2, MousePointer2, Save } from 'lucide-react';

// --- Types ---
type Node = {
  id: number;
  x: number;
  y: number;
  label: string;
};

type Edge = {
  id: string;
  source: number;
  target: number;
  weight: number;
};

type AlgorithmStep = {
  visited: number[];
  distances: Record<number, number>;
  current: number | null;
  path: number[]; // The final path reconstructed
};

const APP_WIDTH = 800;
const APP_HEIGHT = 500;

export default function DijkstraRouter() {
  // --- State ---
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [mode, setMode] = useState<'node' | 'edge' | 'select' | 'delete'>('node');
  const [selectedNode, setSelectedNode] = useState<number | null>(null);
  const [startNode, setStartNode] = useState<number | null>(null);
  const [endNode, setEndNode] = useState<number | null>(null);
  
  // Algorithm State
  const [isRunning, setIsRunning] = useState(false);
  const [visitedNodes, setVisitedNodes] = useState<Set<number>>(new Set());
  const [distances, setDistances] = useState<Record<number, number>>({});
  const [shortestPath, setShortestPath] = useState<number[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [currentNode, setCurrentNode] = useState<number | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);

  // --- Actions ---

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (isRunning) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (mode === 'node') {
      const newNode: Node = {
        id: Date.now(),
        x,
        y,
        label: `R${nodes.length + 1}`,
      };
      setNodes([...nodes, newNode]);
      addLog(`Added Router ${newNode.label}`);
    }
  };

  const handleNodeClick = (e: React.MouseEvent, nodeId: number) => {
    e.stopPropagation(); // Prevent canvas click
    if (isRunning) return;

    if (mode === 'delete') {
      setNodes(nodes.filter((n) => n.id !== nodeId));
      setEdges(edges.filter((e) => e.source !== nodeId && e.target !== nodeId));
      if (startNode === nodeId) setStartNode(null);
      if (endNode === nodeId) setEndNode(null);
      return;
    }

    if (mode === 'select') {
      if (!startNode) {
        setStartNode(nodeId);
        addLog(`Start Node set to R${nodes.find(n => n.id === nodeId)?.label.substring(1)}`);
      } else if (!endNode && nodeId !== startNode) {
        setEndNode(nodeId);
        addLog(`Destination Node set to R${nodes.find(n => n.id === nodeId)?.label.substring(1)}`);
      } else {
        // Reset selection if both are set or clicking start again
        setStartNode(nodeId);
        setEndNode(null);
        addLog(`Start Node updated.`);
      }
    }

    if (mode === 'edge') {
      if (selectedNode === null) {
        setSelectedNode(nodeId);
      } else {
        if (selectedNode === nodeId) {
          setSelectedNode(null); // Deselect
          return;
        }
        // Check if edge exists
        const exists = edges.some(
          (edge) =>
            (edge.source === selectedNode && edge.target === nodeId) ||
            (edge.source === nodeId && edge.target === selectedNode)
        );

        if (!exists) {
            // Calculate Euclidean distance for default weight, rounded to int
            const n1 = nodes.find(n => n.id === selectedNode)!;
            const n2 = nodes.find(n => n.id === nodeId)!;
            const dist = Math.floor(Math.sqrt(Math.pow(n2.x - n1.x, 2) + Math.pow(n2.y - n1.y, 2)) / 10);

          const newEdge: Edge = {
            id: `${selectedNode}-${nodeId}`,
            source: selectedNode,
            target: nodeId,
            weight: dist, 
          };
          setEdges([...edges, newEdge]);
          addLog(`Link created between R${n1.label.substring(1)} and R${n2.label.substring(1)} (Cost: ${dist})`);
        }
        setSelectedNode(null);
      }
    }
  };

  const updateWeight = (edgeId: string, newWeight: number) => {
      setEdges(edges.map(e => e.id === edgeId ? {...e, weight: newWeight} : e));
  }

  const addLog = (msg: string) => {
    setLogs((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);
  };

  const resetAlgorithm = () => {
    setVisitedNodes(new Set());
    setDistances({});
    setShortestPath([]);
    setCurrentNode(null);
    setIsRunning(false);
    addLog("Algorithm state reset.");
  };

  const clearBoard = () => {
    setNodes([]);
    setEdges([]);
    setStartNode(null);
    setEndNode(null);
    resetAlgorithm();
    addLog("Topology cleared.");
  };

  // --- Dijkstra's Algorithm Implementation ---
  const runDijkstra = async () => {
    if (!startNode || !endNode) {
      alert("Please select a Start and Destination node.");
      return;
    }
    setIsRunning(true);
    resetAlgorithm();
    addLog("Starting Dijkstra's Algorithm...");

    const localDistances: Record<number, number> = {};
    const previous: Record<number, number | null> = {};
    const unvisited = new Set<number>();

    // Initialization
    nodes.forEach((node) => {
      localDistances[node.id] = Infinity;
      previous[node.id] = null;
      unvisited.add(node.id);
    });
    localDistances[startNode] = 0;
    setDistances({ ...localDistances });

    while (unvisited.size > 0) {
      // Find node with smallest distance in unvisited set
      let closestNode: number | null = null;
      let minDistance = Infinity;

      unvisited.forEach((nodeId) => {
        if (localDistances[nodeId] < minDistance) {
          minDistance = localDistances[nodeId];
          closestNode = nodeId;
        }
      });

      // Visualization Delay
      await new Promise((r) => setTimeout(r, 800));

      if (closestNode === null || localDistances[closestNode] === Infinity) {
        break; // No reachable nodes left
      }

      setCurrentNode(closestNode);
      setVisitedNodes((prev) => new Set(prev).add(closestNode!));
      unvisited.delete(closestNode);

      if (closestNode === endNode) {
        addLog("Destination reached!");
        break;
      }

      // Explore neighbors
      const neighbors = edges.filter(
        (e) => e.source === closestNode || e.target === closestNode
      );

      for (const edge of neighbors) {
        const neighborId = edge.source === closestNode ? edge.target : edge.source;
        if (unvisited.has(neighborId)) {
          const alt = localDistances[closestNode] + edge.weight;
          if (alt < localDistances[neighborId]) {
            localDistances[neighborId] = alt;
            previous[neighborId] = closestNode;
            setDistances({ ...localDistances }); // Update UI
          }
        }
      }
    }

    // Reconstruct Path
    const path: number[] = [];
    let u: number | null = endNode;
    while (u !== null) {
      path.unshift(u);
      u = previous[u];
    }
    
    // Check if path is valid (starts with startNode)
    if (path[0] === startNode) {
        setShortestPath(path);
        addLog(`Shortest path found! Cost: ${localDistances[endNode]}`);
    } else {
        addLog("No path exists between these nodes.");
    }
    
    setIsRunning(false);
    setCurrentNode(null);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 text-slate-800 font-sans">
      {/* Header */}
      <header className="bg-blue-700 text-white p-4 shadow-md flex justify-between items-center">
        <div className="flex items-center gap-2">
            <Network size={24} />
            <h1 className="text-xl font-bold">Shortest Path Routing Simulator</h1>
        </div>
        <div className="text-sm opacity-90">Computer Networks Mini-Project</div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Controls */}
        <div className="w-64 bg-white border-r border-gray-200 p-4 flex flex-col gap-4 shadow-sm z-10">
          <div className="space-y-2">
            <h2 className="font-semibold text-gray-700">Tools</h2>
            <button
              onClick={() => setMode('node')}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded transition-colors ${
                mode === 'node' ? 'bg-blue-100 text-blue-700 ring-1 ring-blue-500' : 'hover:bg-gray-100'
              }`}
            >
              <PlusCircle size={18} /> Add Router (Node)
            </button>
            <button
              onClick={() => setMode('edge')}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded transition-colors ${
                mode === 'edge' ? 'bg-blue-100 text-blue-700 ring-1 ring-blue-500' : 'hover:bg-gray-100'
              }`}
            >
              <Network size={18} /> Add Link (Edge)
            </button>
            <button
              onClick={() => setMode('select')}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded transition-colors ${
                mode === 'select' ? 'bg-blue-100 text-blue-700 ring-1 ring-blue-500' : 'hover:bg-gray-100'
              }`}
            >
              <MousePointer2 size={18} /> Set Start/End
            </button>
            <button
              onClick={() => setMode('delete')}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded transition-colors ${
                mode === 'delete' ? 'bg-red-100 text-red-700 ring-1 ring-red-500' : 'hover:bg-gray-100'
              }`}
            >
              <Trash2 size={18} /> Delete Item
            </button>
          </div>

          <div className="border-t pt-4 space-y-2">
            <h2 className="font-semibold text-gray-700">Algorithm</h2>
            <button
              onClick={runDijkstra}
              disabled={isRunning || !startNode || !endNode}
              className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded text-white font-medium transition-colors ${
                isRunning || !startNode || !endNode ? 'bg-green-300 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 shadow-sm'
              }`}
            >
              <Play size={18} /> Run Dijkstra
            </button>
            <button
              onClick={resetAlgorithm}
              disabled={isRunning}
              className="w-full flex items-center gap-2 px-3 py-2 rounded hover:bg-gray-100 text-gray-600"
            >
              <RotateCcw size={18} /> Reset Path
            </button>
            <button
              onClick={clearBoard}
              className="w-full flex items-center gap-2 px-3 py-2 rounded hover:bg-red-50 text-red-600 text-sm"
            >
              Clear Topology
            </button>
          </div>

          <div className="flex-1 overflow-auto border rounded bg-gray-50 p-2 text-xs font-mono">
            <div className="font-bold text-gray-500 mb-1">System Log:</div>
            {logs.map((log, i) => (
              <div key={i} className="mb-1 text-gray-700 border-b border-gray-100 pb-1">{log}</div>
            ))}
          </div>
        </div>

        {/* Main Canvas Area */}
        <div className="flex-1 relative bg-slate-50 overflow-hidden flex flex-col">
            {/* Instructions Overlay */}
            {nodes.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
                    <div className="text-center">
                        <PlusCircle size={48} className="mx-auto mb-2 text-slate-400"/>
                        <p className="text-xl text-slate-500 font-medium">Click on the canvas to add Routers</p>
                    </div>
                </div>
            )}
            
            {/* Legend */}
            <div className="absolute top-4 left-4 bg-white/90 p-2 rounded shadow text-xs flex gap-3 pointer-events-none z-10 border border-gray-200">
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-blue-500"></div> Start</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-red-500"></div> End</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-yellow-400 border border-yellow-600"></div> Visiting</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-green-500"></div> Visited</div>
                <div className="flex items-center gap-1"><div className="w-6 h-1 bg-purple-500"></div> Shortest Path</div>
            </div>

            {/* Routing Table Display */}
            <div className="absolute top-4 right-4 bg-white/90 p-3 rounded shadow text-xs pointer-events-none z-10 border border-gray-200 w-48">
                <h3 className="font-bold mb-2 border-b pb-1">Routing Table (Distances)</h3>
                <div className="grid grid-cols-2 gap-x-2 font-mono">
                    <span className="text-gray-500">Node</span>
                    <span className="text-gray-500 text-right">Cost</span>
                    {nodes.map(n => (
                        <React.Fragment key={n.id}>
                            <span>{n.label}</span>
                            <span className={`text-right ${distances[n.id] !== undefined && distances[n.id] !== Infinity ? 'font-bold text-blue-700' : 'text-gray-400'}`}>
                                {distances[n.id] === undefined ? '-' : distances[n.id] === Infinity ? '∞' : distances[n.id]}
                            </span>
                        </React.Fragment>
                    ))}
                </div>
            </div>

          <div 
            ref={canvasRef}
            className="w-full h-full cursor-crosshair"
            onClick={handleCanvasClick}
          >
            <svg width="100%" height="100%">
                <defs>
                    <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="19" refY="3.5" orient="auto">
                        <polygon points="0 0, 10 3.5, 0 7" fill="#94a3b8" />
                    </marker>
                </defs>

              {/* Draw Edges */}
              {edges.map((edge) => {
                const sourceNode = nodes.find((n) => n.id === edge.source);
                const targetNode = nodes.find((n) => n.id === edge.target);
                if (!sourceNode || !targetNode) return null;

                // Check if this edge is part of the shortest path
                const isShortestPath = shortestPath.length > 1 && (() => {
                    for(let i=0; i<shortestPath.length-1; i++) {
                        if( (shortestPath[i] === edge.source && shortestPath[i+1] === edge.target) || 
                            (shortestPath[i] === edge.target && shortestPath[i+1] === edge.source) ) {
                            return true;
                        }
                    }
                    return false;
                })();

                const midX = (sourceNode.x + targetNode.x) / 2;
                const midY = (sourceNode.y + targetNode.y) / 2;

                return (
                  <g key={edge.id}>
                    <line
                      x1={sourceNode.x}
                      y1={sourceNode.y}
                      x2={targetNode.x}
                      y2={targetNode.y}
                      stroke={isShortestPath ? "#a855f7" : "#cbd5e1"}
                      strokeWidth={isShortestPath ? 4 : 2}
                      className="transition-all duration-500"
                    />
                    {/* Weight Label */}
                    <foreignObject x={midX - 15} y={midY - 12} width="30" height="24">
                        <input 
                            type="number" 
                            className="w-full h-full text-center text-xs bg-white border border-gray-300 rounded shadow-sm focus:border-blue-500 focus:outline-none"
                            value={edge.weight}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => updateWeight(edge.id, parseInt(e.target.value) || 1)}
                        />
                    </foreignObject>
                  </g>
                );
              })}

              {/* Draw Nodes */}
              {nodes.map((node) => {
                const isStart = startNode === node.id;
                const isEnd = endNode === node.id;
                const isSelected = selectedNode === node.id;
                const isVisited = visitedNodes.has(node.id);
                const isCurrent = currentNode === node.id;

                let fill = "fill-white";
                let stroke = "stroke-slate-400";
                
                if (isStart) { fill = "fill-blue-500"; stroke = "stroke-blue-600"; }
                else if (isEnd) { fill = "fill-red-500"; stroke = "stroke-red-600"; }
                else if (isCurrent) { fill = "fill-yellow-400"; stroke = "stroke-yellow-600"; }
                else if (isVisited) { fill = "fill-green-100"; stroke = "stroke-green-500"; }
                
                if (isSelected) stroke = "stroke-blue-400 stroke-[3px]";

                return (
                  <g
                    key={node.id}
                    onClick={(e) => handleNodeClick(e, node.id)}
                    className="cursor-pointer transition-all duration-300"
                  >
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={20}
                      className={`${fill} ${stroke} stroke-2 transition-all duration-300`}
                    />
                    <text
                      x={node.x}
                      y={node.y}
                      dy=".3em"
                      textAnchor="middle"
                      className={`text-xs font-bold pointer-events-none ${isStart || isEnd ? 'fill-white' : 'fill-slate-700'}`}
                    >
                      {node.label}
                    </text>
                    
                    {/* Distance label above node during algo */}
                    {distances[node.id] !== undefined && distances[node.id] !== Infinity && (
                        <text
                            x={node.x}
                            y={node.y - 28}
                            textAnchor="middle"
                            className="text-xs font-mono font-bold fill-blue-600 bg-white"
                        >
                            Cost: {distances[node.id]}
                        </text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}