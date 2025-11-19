'use client';

import React, { useRef, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import the graph component to avoid SSR issues
const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-96 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg">
      <span className="text-gray-500">Loading graph...</span>
    </div>
  ),
});

// Node types and their colors
const nodeTypes = {
  company: { color: '#3B82F6', size: 12 },    // blue - largest
  role: { color: '#10B981', size: 8 },         // green - medium
  skill: { color: '#F59E0B', size: 5 },        // amber - small
};

// Career data with relationships
const careerData = {
  companies: [
    {
      id: 'ge',
      name: 'General Electric',
      roles: [
        {
          id: 'ge-dam',
          name: 'Direct Sales Account Manager',
          period: '2008-2009',
          skills: ['Full-Cycle Sales', 'Pipeline Management', 'Customer Service'],
        },
        {
          id: 'ge-mam',
          name: 'Merchandising Account Manager',
          period: '2009-2011',
          skills: ['Merchandising', 'Sales', 'Cross-Team Collaboration'],
        },
        {
          id: 'ge-sam',
          name: 'Sales Account Manager',
          period: '2012-2013',
          skills: ['Full-Cycle Sales', 'Customer Success', 'Data Analysis'],
        },
        {
          id: 'ge-kam',
          name: 'Key Account Manager',
          period: '2013-2015',
          skills: ['Pipeline Management', 'People Management', 'Sales'],
        },
      ],
    },
    {
      id: 'jawbone',
      name: 'Jawbone',
      roles: [
        {
          id: 'jb-nam',
          name: 'National Account Manager',
          period: '2015',
          skills: ['Sales', 'Cross-Team Collaboration', 'Adaptable'],
        },
        {
          id: 'jb-ae',
          name: 'Account Executive',
          period: '2015-2017',
          skills: ['Salesforce CRM', 'Customer Success', 'Full-Cycle Sales', 'Pipeline Management'],
        },
      ],
    },
    {
      id: 'matcha',
      name: 'Matcha Project',
      roles: [
        {
          id: 'mp-founder',
          name: 'Founder',
          period: '2018-2023',
          skills: ['Marketing', 'Customer Experience', 'Creative & Outside of the Box Thinker', 'Data Analysis'],
        },
      ],
    },
    {
      id: 'wholefoods',
      name: 'Whole Foods Market',
      roles: [
        {
          id: 'wfm-tm',
          name: 'Team Member',
          period: '2022-2023',
          skills: ['Customer Service', 'Curious', 'Adaptable'],
        },
        {
          id: 'wfm-csm',
          name: 'Customer Service & Ecommerce Manager',
          period: '2023-Present',
          skills: ['People Management', 'Customer Experience', 'Customer Success', 'High EQ'],
        },
      ],
    },
  ],
  // Additional skills not tied to specific roles (AI/Tech focus)
  additionalSkills: [
    { id: 'ai', name: 'AI', connectedTo: ['mp-founder', 'wfm-csm'] },
    { id: 'building-ai', name: 'Building with AI', connectedTo: ['mp-founder'] },
    { id: 'chatbots', name: 'Chatbots', connectedTo: ['mp-founder', 'wfm-csm'] },
    { id: 'proactive', name: 'Proactive Learner & Tinkerer', connectedTo: ['ge-kam', 'jb-ae', 'mp-founder'] },
    { id: 'positive', name: 'Positive Energy', connectedTo: ['wfm-csm', 'ge-kam'] },
  ],
};

interface GraphNode {
  id: string;
  name: string;
  type: 'company' | 'role' | 'skill';
  color: string;
  size: number;
  period?: string;
}

interface GraphLink {
  source: string;
  target: string;
  type: 'company-role' | 'role-skill' | 'skill-role';
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type NodeObject = any;

function buildGraphData() {
  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];
  const skillSet = new Set<string>();

  // Add company and role nodes
  careerData.companies.forEach((company) => {
    // Add company node
    nodes.push({
      id: company.id,
      name: company.name,
      type: 'company',
      color: nodeTypes.company.color,
      size: nodeTypes.company.size,
    });

    // Add role nodes and links to company
    company.roles.forEach((role) => {
      nodes.push({
        id: role.id,
        name: role.name,
        type: 'role',
        color: nodeTypes.role.color,
        size: nodeTypes.role.size,
        period: role.period,
      });

      // Link role to company
      links.push({
        source: company.id,
        target: role.id,
        type: 'company-role',
      });

      // Add skills and link to role
      role.skills.forEach((skillName) => {
        const skillId = skillName.toLowerCase().replace(/\s+/g, '-');

        // Only add skill node if not already added
        if (!skillSet.has(skillId)) {
          skillSet.add(skillId);
          nodes.push({
            id: skillId,
            name: skillName,
            type: 'skill',
            color: nodeTypes.skill.color,
            size: nodeTypes.skill.size,
          });
        }

        // Link skill to role
        links.push({
          source: role.id,
          target: skillId,
          type: 'role-skill',
        });
      });
    });
  });

  // Add additional skills
  careerData.additionalSkills.forEach((skill) => {
    const skillId = skill.id;

    if (!skillSet.has(skillId)) {
      skillSet.add(skillId);
      nodes.push({
        id: skillId,
        name: skill.name,
        type: 'skill',
        color: nodeTypes.skill.color,
        size: nodeTypes.skill.size,
      });
    }

    // Link to connected roles
    skill.connectedTo.forEach((roleId) => {
      links.push({
        source: roleId,
        target: skillId,
        type: 'role-skill',
      });
    });
  });

  return { nodes, links };
}

const SkillsGraph = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });
  const graphData = buildGraphData();

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const width = containerRef.current.offsetWidth;
        setDimensions({
          width,
          height: Math.min(600, Math.max(450, width * 0.6)),
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
        Career & Skills Network
      </h2>
      <p className="text-center text-gray-600 dark:text-gray-400 mb-6">
        How Chase&apos;s companies, roles, and skills interconnect
      </p>
      <div
        ref={containerRef}
        className="w-full bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden"
      >
        <ForceGraph2D
          graphData={graphData}
          width={dimensions.width}
          height={dimensions.height}
          nodeLabel={(node: NodeObject) => {
            if (node.type === 'role' && node.period) {
              return `${node.name} (${node.period})`;
            }
            return node.name;
          }}
          nodeColor={(node: NodeObject) => node.color}
          nodeRelSize={1}
          nodeVal={(node: NodeObject) => node.size}
          linkColor={(link: NodeObject) => {
            if (link.type === 'company-role') return 'rgba(59, 130, 246, 0.5)';
            return 'rgba(156, 163, 175, 0.3)';
          }}
          linkWidth={(link: NodeObject) => link.type === 'company-role' ? 2 : 1}
          enableNodeDrag={true}
          enableZoomInteraction={true}
          cooldownTicks={100}
          d3VelocityDecay={0.3}
          nodeCanvasObject={(node: NodeObject, ctx: CanvasRenderingContext2D, globalScale: number) => {
            const label = node.name;
            const fontSize = node.type === 'company' ? 14 / globalScale :
                           node.type === 'role' ? 11 / globalScale :
                           9 / globalScale;
            ctx.font = `${node.type === 'company' ? 'bold ' : ''}${fontSize}px Sans-Serif`;

            // Draw node circle
            const nodeSize = node.type === 'company' ? 8 :
                           node.type === 'role' ? 5 : 3;
            ctx.beginPath();
            ctx.arc(node.x, node.y, nodeSize, 0, 2 * Math.PI);
            ctx.fillStyle = node.color;
            ctx.fill();

            // Draw label
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = node.type === 'company' ? '#1F2937' : '#374151';

            // Position label based on node type
            const labelOffset = node.type === 'company' ? 14 :
                              node.type === 'role' ? 10 : 8;
            ctx.fillText(label, node.x, node.y + labelOffset);
          }}
        />
      </div>

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-6 mt-4">
        <div className="flex items-center gap-2">
          <div
            className="w-4 h-4 rounded-full"
            style={{ backgroundColor: nodeTypes.company.color }}
          />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Companies
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: nodeTypes.role.color }}
          />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Roles
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: nodeTypes.skill.color }}
          />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Skills
          </span>
        </div>
      </div>

      <p className="text-center text-sm text-gray-500 dark:text-gray-500 mt-3">
        Drag nodes to explore • Scroll to zoom • Hover for details
      </p>
    </div>
  );
};

export default SkillsGraph;
