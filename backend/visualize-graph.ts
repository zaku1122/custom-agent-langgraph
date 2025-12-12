import * as fs from 'fs';
import { createLangGraphAgent } from './src/chat/agents/langgraph.agent.js';

async function visualizeGraph() {
  console.log('🎨 Generating LangGraph Visualization...\n');

  try {
    const graph = createLangGraphAgent();

    // Get the graph representation
    const graphData = graph.getGraph();

    // Generate Mermaid diagram
    const mermaidDiagram = graphData.drawMermaid();

    console.log('📊 Mermaid Diagram:\n');
    console.log('```mermaid');
    console.log(mermaidDiagram);
    console.log('```\n');

    // Save Mermaid to file
    const mermaidContent = `# LangGraph Multi-Agent Visualization

## Mermaid Diagram

\`\`\`mermaid
${mermaidDiagram}
\`\`\`

## How to View

1. **VS Code**: Install "Markdown Preview Mermaid Support" extension
2. **GitHub**: Paste in any .md file - GitHub renders Mermaid natively
3. **Online**: Go to https://mermaid.live and paste the diagram code
`;

    fs.writeFileSync('graph-visualization.md', mermaidContent);
    console.log('✅ Saved Mermaid diagram to: graph-visualization.md\n');

    // Try to generate PNG (requires additional setup)
    try {
      console.log('🖼️  Attempting to generate PNG...');
      const pngData = await graphData.drawMermaidPng();
      
      if (pngData) {
        // Convert Blob to Buffer and save
        const arrayBuffer = await pngData.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        fs.writeFileSync('graph-visualization.png', buffer);
        console.log('✅ Saved PNG to: graph-visualization.png\n');
      }
    } catch (pngError: any) {
      console.log('⚠️  PNG generation requires @langchain/langgraph-sdk or puppeteer');
      console.log('   Use the Mermaid diagram instead (works great!)\n');
    }

    // Print nodes and edges info
    console.log('📋 Graph Structure:');
    console.log('─────────────────────────────────────');
    
    const nodes = graphData.nodes;
    const edges = graphData.edges;

    console.log('\n🔵 Nodes:');
    for (const node of nodes) {
      console.log(`   • ${node.id}${node.name ? ` (${node.name})` : ''}`);
    }

    console.log('\n➡️  Edges:');
    for (const edge of edges) {
      const conditional = edge.conditional ? ' [conditional]' : '';
      console.log(`   • ${edge.source} → ${edge.target}${conditional}`);
    }

    console.log('\n─────────────────────────────────────');
    console.log('🎉 Visualization complete!\n');

  } catch (error: any) {
    console.error('❌ Error generating visualization:', error.message);
    console.error(error.stack);
  }
}

visualizeGraph();

