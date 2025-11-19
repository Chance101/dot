'use client';

import React, { useRef, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { resumeData } from '@/data/fallback';

// Dynamically import the graph component to avoid SSR issues
const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-96 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg">
      <span className="text-gray-500">Loading graph...</span>
    </div>
  ),
});

// Define skill categories and their colors
const skillCategories: { [key: string]: { color: string; skills: string[] } } = {
  'Sales & Business': {
    color: '#3B82F6', // blue
    skills: ['Full-Cycle Sales', 'Pipeline Management', 'Sales', 'Marketing', 'Merchandising'],
  },
  'Customer Success': {
    color: '#10B981', // green
    skills: ['Customer Success', 'the Customer Journey', 'Customer Service', 'Customer Experience'],
  },
  'Leadership': {
    color: '#8B5CF6', // purple
    skills: ['Cross-Team Collaboration', 'People Management', 'High EQ', 'Positive Energy'],
  },
  'Technology & AI': {
    color: '#F59E0B', // amber
    skills: ['AI', 'Building with AI', 'Chatbots', 'Salesforce CRM', 'Data Analysis'],
  },
  'Personal Traits': {
    color: '#EC4899', // pink
    skills: ['Proactive Learner & Tinkerer', 'Creative & Outside of the Box Thinker', 'Adaptable', 'Curious'],
  },
};

interface GraphNode {
  id: string;
  name: string;
  val: number;
  color: string;
  category: string;
  x?: number;
  y?: number;
}

interface GraphLink {
  source: string;
  target: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type NodeObject = any;

function buildGraphData() {
  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];
  const skills = resumeData.skills;

  // Create nodes for each skill
  skills.forEach((skill) => {
    let category = 'Other';
    let color = '#6B7280'; // gray default

    // Find the category for this skill
    for (const [cat, data] of Object.entries(skillCategories)) {
      if (data.skills.includes(skill)) {
        category = cat;
        color = data.color;
        break;
      }
    }

    nodes.push({
      id: skill,
      name: skill,
      val: 1,
      color,
      category,
    });
  });

  // Create links between skills in the same category
  for (const [, data] of Object.entries(skillCategories)) {
    const categorySkills = skills.filter((s) => data.skills.includes(s));

    // Connect skills within the same category
    for (let i = 0; i < categorySkills.length; i++) {
      for (let j = i + 1; j < categorySkills.length; j++) {
        links.push({
          source: categorySkills[i],
          target: categorySkills[j],
        });
      }
    }
  }

  // Add some cross-category connections for interconnectedness
  const crossLinks = [
    ['AI', 'Data Analysis'],
    ['Sales', 'Customer Success'],
    ['People Management', 'Cross-Team Collaboration'],
    ['Building with AI', 'Creative & Outside of the Box Thinker'],
    ['Curious', 'Proactive Learner & Tinkerer'],
    ['High EQ', 'Customer Experience'],
    ['Salesforce CRM', 'Pipeline Management'],
  ];

  crossLinks.forEach(([source, target]) => {
    if (skills.includes(source) && skills.includes(target)) {
      links.push({ source, target });
    }
  });

  return { nodes, links };
}

const SkillsGraph = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 400 });
  const graphData = buildGraphData();

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const width = containerRef.current.offsetWidth;
        setDimensions({
          width,
          height: Math.min(500, Math.max(400, width * 0.5)),
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  return (
    <div className="w-full">
      <h2 className="text-2xl font-bold text-center mb-4 text-gray-900 dark:text-gray-100">
        Skills & Expertise
      </h2>
      <p className="text-center text-gray-600 dark:text-gray-400 mb-6">
        An interconnected view of Chase&apos;s diverse skill set
      </p>
      <div
        ref={containerRef}
        className="w-full bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden"
      >
        <ForceGraph2D
          graphData={graphData}
          width={dimensions.width}
          height={dimensions.height}
          nodeLabel="name"
          nodeColor={(node: NodeObject) => node.color}
          nodeRelSize={6}
          linkColor={() => 'rgba(156, 163, 175, 0.3)'}
          linkWidth={1}
          enableNodeDrag={true}
          enableZoomInteraction={true}
          cooldownTicks={100}
          onNodeClick={(node: NodeObject) => {
            // Could add tooltip or highlight functionality here
            console.log('Clicked:', node.name);
          }}
          nodeCanvasObject={(node: NodeObject, ctx: CanvasRenderingContext2D, globalScale: number) => {
            const label = node.name;
            const fontSize = 12 / globalScale;
            ctx.font = `${fontSize}px Sans-Serif`;

            // Draw node circle
            ctx.beginPath();
            ctx.arc(node.x, node.y, 5, 0, 2 * Math.PI);
            ctx.fillStyle = node.color;
            ctx.fill();

            // Draw label
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#374151';
            ctx.fillText(label, node.x, node.y + 10);
          }}
        />
      </div>

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-4 mt-4">
        {Object.entries(skillCategories).map(([category, data]) => (
          <div key={category} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: data.color }}
            />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {category}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SkillsGraph;
