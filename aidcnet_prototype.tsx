import React, { useState, useEffect, useRef } from 'react';
import { clampMetric } from './src/lib/demoMetrics';
import { Network, Shield, Brain, MessageCircle, Users, Activity, Zap, Lock, Globe, Server, AlertTriangle, CheckCircle } from 'lucide-react';

const AIDCNetPrototype = () => {
  const [activeTab, setActiveTab] = useState('network');
  const [networkNodes, setNetworkNodes] = useState([]);
  const [messages, setMessages] = useState([]);
  const [aiMetrics, setAIMetrics] = useState({
    routingEfficiency: 87,
    threatDetection: 94,
    networkHealth: 91
  });
  const [networkStats, setNetworkStats] = useState({
    activeNodes: 0,
    messagesRouted: 0,
    encryptionStrength: 'Not implemented (demo)',
    uptime: 99.9
  });

  // Simulate network nodes
  useEffect(() => {
    const generateNodes = () => {
      const nodes = [];
      for (let i = 0; i < 15; i++) {
        nodes.push({
          id: `node-${i}`,
          x: Math.random() * 800 + 50,
          y: Math.random() * 400 + 50,
          type: Math.random() > 0.7 ? 'validator' : 'peer',
          status: Math.random() > 0.1 ? 'active' : 'inactive',
          connections: Math.floor(Math.random() * 5) + 2,
          stake: Math.floor(Math.random() * 10000) + 1000
        });
      }
      setNetworkNodes(nodes);
      setNetworkStats(prev => ({ ...prev, activeNodes: nodes.filter(n => n.status === 'active').length }));
    };

    generateNodes();
    const interval = setInterval(() => {
      setNetworkNodes(prev => prev.map(node => ({
        ...node,
        status: Math.random() > 0.05 ? 'active' : 'inactive'
      })));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Simulate AI metrics updates
  useEffect(() => {
    const interval = setInterval(() => {
      setAIMetrics(prev => ({
        routingEfficiency: clampMetric(prev.routingEfficiency + (Math.random() - 0.5) * 4, 75, 99),
        threatDetection: clampMetric(prev.threatDetection + (Math.random() - 0.5) * 2, 85, 99),
        networkHealth: clampMetric(prev.networkHealth + (Math.random() - 0.5) * 3, 80, 99)
      }));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // Quantum crypto simulation
  const generateQuantumKey = () => {
    const algorithms = ['CRYSTALS-Kyber-1024', 'CRYSTALS-Dilithium', 'SPHINCS+'];
    return algorithms[Math.floor(Math.random() * algorithms.length)];
  };

  // Message routing simulation
  const sendMessage = () => {
    const newMessage = {
      id: Date.now(),
      sender: `User-${Math.floor(Math.random() * 100)}`,
      recipient: `User-${Math.floor(Math.random() * 100)}`,
      timestamp: new Date().toLocaleTimeString(),
      route: networkNodes.filter(n => n.status === 'active').slice(0, 3).map(n => n.id),
      encryption: generateQuantumKey(),
      status: 'routing'
    };

    setMessages(prev => [newMessage, ...prev.slice(0, 9)]);
    setNetworkStats(prev => ({ ...prev, messagesRouted: prev.messagesRouted + 1 }));

    // Simulate message delivery
    setTimeout(() => {
      setMessages(prev => prev.map(msg => 
        msg.id === newMessage.id ? { ...msg, status: 'delivered' } : msg
      ));
    }, 2000);
  };

  const NetworkVisualization = () => (
    <div className="relative w-full h-96 bg-gray-900 rounded-lg overflow-hidden">
      <svg width="100%" height="100%" className="absolute inset-0">
        {/* Draw connections */}
        {networkNodes.map((node, i) => 
          networkNodes.slice(i + 1).map((otherNode, j) => {
            if (Math.random() > 0.7 && node.status === 'active' && otherNode.status === 'active') {
              return (
                <line
                  key={`${i}-${j}`}
                  x1={node.x}
                  y1={node.y}
                  x2={otherNode.x}
                  y2={otherNode.y}
                  stroke="#4ade80"
                  strokeWidth="1"
                  opacity="0.3"
                />
              );
            }
            return null;
          })
        )}
        
        {/* Draw nodes */}
        {networkNodes.map((node) => (
          <g key={node.id}>
            <circle
              cx={node.x}
              cy={node.y}
              r={node.type === 'validator' ? 8 : 6}
              fill={node.status === 'active' ? (node.type === 'validator' ? '#3b82f6' : '#10b981') : '#6b7280'}
              stroke={node.type === 'validator' ? '#1d4ed8' : '#059669'}
              strokeWidth="2"
            />
            {node.type === 'validator' && (
              <text
                x={node.x}
                y={node.y - 12}
                textAnchor="middle"
                className="text-xs fill-white"
              >
                V
              </text>
            )}
          </g>
        ))}
      </svg>
      
      <div className="absolute top-4 left-4 bg-black bg-opacity-50 rounded p-2">
        <div className="flex items-center gap-4 text-sm text-white">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span>Validators</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span>Peers</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
            <span>Offline</span>
          </div>
        </div>
      </div>
    </div>
  );

  const AIMetricsPanel = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Routing Efficiency</h3>
          <Zap className="w-6 h-6" />
        </div>
        <div className="text-3xl font-bold mb-2">{aiMetrics.routingEfficiency.toFixed(1)}%</div>
        <div className="w-full bg-blue-400 rounded-full h-2">
          <div 
            className="bg-white rounded-full h-2 transition-all duration-500"
            style={{ width: `${aiMetrics.routingEfficiency}%` }}
          ></div>
        </div>
        <p className="text-sm mt-2 opacity-90">Simulated metric; no routing optimizer implemented</p>
      </div>

      <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Threat Detection</h3>
          <Shield className="w-6 h-6" />
        </div>
        <div className="text-3xl font-bold mb-2">{aiMetrics.threatDetection.toFixed(1)}%</div>
        <div className="w-full bg-red-400 rounded-full h-2">
          <div 
            className="bg-white rounded-full h-2 transition-all duration-500"
            style={{ width: `${aiMetrics.threatDetection}%` }}
          ></div>
        </div>
        <p className="text-sm mt-2 opacity-90">Simulated metric; no threat detector implemented</p>
      </div>

      <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Network Health</h3>
          <Activity className="w-6 h-6" />
        </div>
        <div className="text-3xl font-bold mb-2">{aiMetrics.networkHealth.toFixed(1)}%</div>
        <div className="w-full bg-green-400 rounded-full h-2">
          <div 
            className="bg-white rounded-full h-2 transition-all duration-500"
            style={{ width: `${aiMetrics.networkHealth}%` }}
          ></div>
        </div>
        <p className="text-sm mt-2 opacity-90">Simulated metric; no telemetry or predictor implemented</p>
      </div>
    </div>
  );

  const MessagePanel = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold">Message Routing</h3>
        <button
          onClick={sendMessage}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <MessageCircle className="w-4 h-4" />
          Send Test Message
        </button>
      </div>

      <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
        {messages.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No messages yet. Send a test message to see routing in action.</p>
        ) : (
          messages.map((message) => (
            <div key={message.id} className="bg-white rounded-lg p-4 mb-3 border">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <span className="font-semibold text-sm">{message.sender}</span>
                  <span className="text-gray-500 text-sm"> → {message.recipient}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">{message.timestamp}</span>
                  {message.status === 'delivered' ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  )}
                </div>
              </div>
              
              <div className="text-xs text-gray-600 mb-2">
                <Lock className="w-3 h-3 inline mr-1" />
                Encrypted with: {message.encryption}
              </div>
              
              <div className="text-xs text-gray-500">
                Route: {message.route.join(' → ')}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  const CryptoPanel = () => (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-lg p-6 text-white">
        <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Lock className="w-6 h-6" />
          Cryptography Concepts (Not Implemented)
        </h3>
        <p className="text-sm opacity-90 mt-4">Conceptual UI only: no cryptographic operations, key management, or protocol negotiation occur in this prototype.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-semibold mb-2">Key Encapsulation</h4>
            <p className="text-sm opacity-90">CRYSTALS-Kyber-1024</p>
            <p className="text-xs opacity-75">256-bit quantum security</p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Digital Signatures</h4>
            <p className="text-sm opacity-90">CRYSTALS-Dilithium</p>
            <p className="text-xs opacity-75">Post-quantum signatures</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg p-4 border">
          <h4 className="font-semibold mb-3">Current Security Status</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm">Encryption Level:</span>
              <span className="text-sm font-semibold text-green-600">Not implemented</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Key Rotation (not implemented):</span>
              <span className="text-sm font-semibold text-green-600">Not implemented</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Forward Secrecy (not implemented):</span>
              <span className="text-sm font-semibold text-green-600">Enabled</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Zero-Knowledge (not implemented):</span>
              <span className="text-sm font-semibold text-green-600">Active</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 border">
          <h4 className="font-semibold mb-3">Threats to address (not mitigated by this prototype)</h4>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-sm">Quantum Computer Attacks</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-sm">Harvest-Now-Decrypt-Later</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-sm">Man-in-the-Middle</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-sm">Sybil Attacks</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Network className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">AIDCNet</h1>
                <p className="text-sm text-gray-600">AI-Assisted Decentralized Network — UI Simulation</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-semibold text-green-600">Demo simulation (not connected to a live network)</p>
                <p className="text-xs text-gray-500">Uptime: not measured</p>
              </div>
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{networkStats.activeNodes}</div>
              <div className="text-xs text-gray-600">Active Nodes</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{networkStats.messagesRouted}</div>
              <div className="text-xs text-gray-600">Messages Routed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">256-bit</div>
              <div className="text-xs text-gray-600">Security protocol: not implemented</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-indigo-600">{aiMetrics.routingEfficiency.toFixed(0)}%</div>
              <div className="text-xs text-gray-600">AI Efficiency</div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex space-x-1 bg-gray-200 rounded-lg p-1 mb-6">
          {[
            { id: 'network', label: 'Network', icon: Globe },
            { id: 'ai', label: 'AI Intelligence', icon: Brain },
            { id: 'messages', label: 'Messages', icon: MessageCircle },
            { id: 'crypto', label: 'Cryptography', icon: Shield }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === id
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          {activeTab === 'network' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Globe className="w-6 h-6" />
                Decentralized Network Visualization
              </h2>
              <NetworkVisualization />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 mb-2">Validator Nodes</h4>
                  <p className="text-2xl font-bold text-blue-600">
                    {networkNodes.filter(n => n.type === 'validator' && n.status === 'active').length}
                  </p>
                  <p className="text-sm text-blue-700">Securing the network</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <h4 className="font-semibold text-green-900 mb-2">Peer Nodes</h4>
                  <p className="text-2xl font-bold text-green-600">
                    {networkNodes.filter(n => n.type === 'peer' && n.status === 'active').length}
                  </p>
                  <p className="text-sm text-green-700">Routing messages</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <h4 className="font-semibold text-purple-900 mb-2">Network Reach</h4>
                  <p className="text-2xl font-bold text-purple-600">No live network</p>
                  <p className="text-sm text-purple-700">Worldwide coverage</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ai' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Brain className="w-6 h-6" />
                AI Intelligence Layer
              </h2>
              <AIMetricsPanel />
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Illustrative AI concepts (not implemented)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white rounded-lg p-4 flex items-center gap-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <div>
                      <h4 className="font-semibold">Routing Optimizer</h4>
                      <p className="text-sm text-gray-600">Reinforcement learning for path selection</p>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-4 flex items-center gap-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <div>
                      <h4 className="font-semibold">Anomaly Detector</h4>
                      <p className="text-sm text-gray-600">ML-based threat identification</p>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-4 flex items-center gap-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <div>
                      <h4 className="font-semibold">Load Balancer</h4>
                      <p className="text-sm text-gray-600">Dynamic traffic distribution</p>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-4 flex items-center gap-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <div>
                      <h4 className="font-semibold">Predictive Analytics</h4>
                      <p className="text-sm text-gray-600">Network health forecasting</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'messages' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <MessageCircle className="w-6 h-6" />
                Secure Message Routing
              </h2>
              <MessagePanel />
            </div>
          )}

          {activeTab === 'crypto' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Shield className="w-6 h-6" />
                Cryptography Concepts (Not Implemented)
              </h2>
              <CryptoPanel />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AIDCNetPrototype;