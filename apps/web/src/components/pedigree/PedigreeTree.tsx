'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Info } from 'lucide-react';

interface PedigreeNode {
  id: string;
  name: string;
  registrationNumber?: string;
  sex: 'MALE' | 'FEMALE';
  generation: number;
  position: number;
  sire?: PedigreeNode | null;
  dam?: PedigreeNode | null;
  birthDate?: string;
  isAlive?: boolean;
}

interface PedigreeTreeProps {
  pedigree: PedigreeNode;
  maxGenerations?: number;
}

export default function PedigreeTree({ pedigree, maxGenerations = 5 }: PedigreeTreeProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set([pedigree.id]));
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  const toggleNode = (nodeId: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const renderNode = (node: PedigreeNode, depth: number = 0) => {
    const isExpanded = expandedNodes.has(node.id);
    const isSelected = selectedNode === node.id;
    const hasChildren = node.sire || node.dam;
    const sexColor = node.sex === 'MALE' ? 'bg-blue-50 border-blue-200' : 'bg-pink-50 border-pink-200';

    return (
      <div key={node.id} className="relative">
        {/* Node */}
        <div
          className={`flex items-center space-x-2 p-2 rounded-lg border ${sexColor} ${
            isSelected ? 'ring-2 ring-blue-500' : ''
          } cursor-pointer hover:shadow-sm transition-all`}
          style={{ marginLeft: `${depth * 20}px` }}
          onClick={() => setSelectedNode(node.id)}
        >
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleNode(node.id);
              }}
              className="p-1 hover:bg-white rounded transition-colors"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-gray-600" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-600" />
              )}
            </button>
          )}
          <div className="flex-1">
            <div className="font-medium text-gray-900">{node.name}</div>
            {node.registrationNumber && (
              <div className="text-xs text-gray-500">{node.registrationNumber}</div>
            )}
          </div>
          <div className="text-xs text-gray-500">
            Gen {node.generation}
          </div>
        </div>

        {/* Children */}
        {isExpanded && hasChildren && (
          <div className="mt-1 space-y-1">
            {node.sire && (
              <div className="relative">
                <div className="absolute left-[10px] top-0 bottom-0 w-px bg-blue-200" />
                {renderNode(node.sire, depth + 1)}
              </div>
            )}
            {node.dam && (
              <div className="relative">
                <div className="absolute left-[10px] top-0 bottom-0 w-px bg-pink-200" />
                {renderNode(node.dam, depth + 1)}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Pedigree</h3>
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <Info className="w-4 h-4" />
          <span>Generaciones: {maxGenerations}</span>
        </div>
      </div>
      <div className="space-y-1 max-h-[600px] overflow-y-auto">
        {renderNode(pedigree)}
      </div>
    </div>
  );
}
