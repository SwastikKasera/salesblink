import React, { useCallback, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  useEdgesState,
  useNodesState,
  Handle,
  Position,
} from "reactflow";
import "reactflow/dist/style.css";

const EmailListNode = ({ data }) => (
  <div
    style={{
      padding: "15px",
      border: "2px solid #ddd",
      borderRadius: "8px",
      background: "#fafafa",
      width: "220px",
      boxShadow: "0 2px 5px rgba(0, 0, 0, 0.1)",
    }}
  >
    <Handle type="source" position={Position.Bottom} />
    <strong>Email List</strong>
    <textarea
      rows="4"
      placeholder="Enter emails (one per line)"
      value={data.emails}
      onChange={(e) => data.updateEmails(data.id, e.target.value)}
      style={{ width: "200px", marginTop: "10px", padding: "5px", borderRadius: "4px", border: "1px solid #ccc" }}
    />
  </div>
);

const SendEmailNode = ({ data }) => (
  <div
    style={{
      padding: "15px",
      border: "2px solid #ddd",
      borderRadius: "8px",
      background: "#e6f7ff",
      width: "220px",
      boxShadow: "0 2px 5px rgba(0, 0, 0, 0.1)",
    }}
  >
    <Handle type="target" position={Position.Top} />
    <Handle type="source" position={Position.Bottom} />
    <strong>Send Email</strong>
    <input
      type="text"
      placeholder="Subject"
      value={data.subject}
      onChange={(e) => data.updateField(data.id, "subject", e.target.value)}
      style={{ width: "200px", marginTop: "10px", padding: "5px", borderRadius: "4px", border: "1px solid #ccc" }}
    />
    <textarea
      placeholder="Email body"
      value={data.body}
      onChange={(e) => data.updateField(data.id, "body", e.target.value)}
      style={{ width: "200px", marginTop: "10px", padding: "5px", borderRadius: "4px", border: "1px solid #ccc" }}
    />
  </div>
);

const WaitNode = ({ data }) => (
  <div
    style={{
      padding: "15px",
      border: "2px solid #ddd",
      borderRadius: "8px",
      background: "#fff0b3",
      width: "220px",
      boxShadow: "0 2px 5px rgba(0, 0, 0, 0.1)",
    }}
  >
    <Handle type="target" position={Position.Top} />
    <Handle type="source" position={Position.Bottom} />
    <strong>Wait</strong>
    <input
      type="number"
      placeholder="Duration"
      value={data.duration}
      onChange={(e) => data.updateField(data.id, "duration", e.target.value)}
      style={{ width: "200px", marginTop: "10px", padding: "5px", borderRadius: "4px", border: "1px solid #ccc" }}
    />
    <select
      value={data.unit}
      onChange={(e) => data.updateField(data.id, "unit", e.target.value)}
      style={{ width: "200px", marginTop: "10px", padding: "5px", borderRadius: "4px", border: "1px solid #ccc" }}
    >
      <option value="seconds">Seconds</option>
      <option value="minutes">Minutes</option>
    </select>
  </div>
);

const nodeTypes = {
  emailList: EmailListNode,
  sendEmail: SendEmailNode,
  wait: WaitNode,
};

const ScheduleEmail = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const onConnect = useCallback(
    (params) => {
      const sourceNode = nodes.find((n) => n.id === params.source);
      const targetNode = nodes.find((n) => n.id === params.target);

      if (sourceNode && targetNode) {
        if (
          sourceNode.type === "emailList" &&
          targetNode.type !== "sendEmail"
        ) {
          alert("Email List can only connect to Send Email");
          return;
        }
        if (
          sourceNode.type === "sendEmail" &&
          targetNode.type === "emailList"
        ) {
          alert("Invalid connection: Send Email cannot connect to Email List");
          return;
        }
        if (sourceNode.type === "wait" && targetNode.type === "emailList") {
          alert("Invalid connection: Wait cannot connect to Email List");
          return;
        }
        if (sourceNode.type === "wait" && targetNode.type === "wait") {
          alert("Invalid connection: Cannot connect two Wait nodes directly");
          return;
        }
      }

      setEdges((eds) => addEdge(params, eds));
    },
    [nodes, setEdges]
  );

  const updateNodeField = useCallback(
    (nodeId, field, value) => {
      setNodes((nds) =>
        nds.map((node) =>
          node.id === nodeId
            ? { ...node, data: { ...node.data, [field]: value } }
            : node
        )
      );
    },
    [setNodes]
  );

  const updateEmailField = useCallback(
    (nodeId, value) => {
      setNodes((nds) =>
        nds.map((node) =>
          node.id === nodeId
            ? { ...node, data: { ...node.data, emails: value } }
            : node
        )
      );
    },
    [setNodes]
  );

  const addNode = useCallback(
    (type) => {
      const newNode = {
        id: `${Date.now()}`,
        type,
        position: { x: Math.random() * 300, y: Math.random() * 300 },
        data: {
          id: `${Date.now()}`,
          updateField: updateNodeField,
          updateEmails: updateEmailField,
        },
      };

      if (type === "emailList") {
        newNode.data.emails = "";
      } else if (type === "sendEmail") {
        newNode.data.subject = "";
        newNode.data.body = "";
      } else if (type === "wait") {
        newNode.data.duration = "";
        newNode.data.unit = "seconds";
      }

      setNodes((nds) => [...nds, newNode]);
    },
    [setNodes, updateNodeField, updateEmailField]
  );

  const handleSubmit = async () => {
    setIsLoading(true);
    setError(null);

    const sequence = [];
    let currentNode = nodes.find((n) => n.type === "emailList");

    while (currentNode) {
      if (currentNode.type === "emailList") {
        sequence.push({
          type: currentNode.type,
          emails: currentNode.data.emails
            .split("\n")
            .map((email) => email.trim())
            .filter((email) => email !== ""),
        });
      } else {
        sequence.push({
          type: currentNode.type,
          ...currentNode.data,
        });
      }

      const nextEdge = edges.find((e) => e.source === currentNode.id);
      if (!nextEdge) break;

      currentNode = nodes.find((n) => n.id === nextEdge.target);
    }

    console.log("Email sequence:", sequence);

    try {
      const response = await fetch("http://localhost:4000/schedule-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sequence }),
      });

      if (!response.ok) {
        throw new Error("Failed to schedule email sequence");
      }

      const result = await response.json();
      console.log("API Response:", result);
      alert("Email sequence scheduled successfully!");
    } catch (err) {
      console.error("Error scheduling email sequence:", err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ width: "100vw", height: "100vh", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "20px", display: "flex", gap: "10px", marginBottom: "10px" }}>
        <button
          onClick={() => addNode("emailList")}
          style={{
            padding: "10px 20px",
            border: "none",
            borderRadius: "5px",
            background: "#007bff",
            color: "#fff",
            cursor: "pointer",
            transition: "background 0.3s",
          }}
        >
          Add Email List
        </button>
        <button
          onClick={() => addNode("sendEmail")}
          style={{
            padding: "10px 20px",
            border: "none",
            borderRadius: "5px",
            background: "#28a745",
            color: "#fff",
            cursor: "pointer",
            transition: "background 0.3s",
          }}
        >
          Add Send Email
        </button>
        <button
          onClick={() => addNode("wait")}
          style={{
            padding: "10px 20px",
            border: "none",
            borderRadius: "5px",
            background: "#ffc107",
            color: "#fff",
            cursor: "pointer",
            transition: "background 0.3s",
          }}
        >
          Add Wait
        </button>
        <button
          onClick={handleSubmit}
          disabled={isLoading}
          style={{
            padding: "10px 20px",
            border: "none",
            borderRadius: "5px",
            background: isLoading ? "#6c757d" : "#17a2b8",
            color: "#fff",
            cursor: isLoading ? "not-allowed" : "pointer",
            transition: "background 0.3s",
          }}
        >
          {isLoading ? "Scheduling..." : "Schedule Email Sequence"}
        </button>
      </div>
      {error && <p style={{ color: "red", marginLeft: "20px" }}>{error}</p>}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        style={{ flex: 1, background: "#f4f4f9" }}
      >
        <Controls />
        <MiniMap />
        <Background variant="dots" gap={12} size={1} />
      </ReactFlow>
    </div>
  );
};

export default ScheduleEmail;
