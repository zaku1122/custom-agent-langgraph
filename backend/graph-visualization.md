# LangGraph Multi-Agent Visualization

## Mermaid Diagram

```mermaid
%%{init: {'flowchart': {'curve': 'linear'}}}%%
graph TD;
	__start__([<p>__start__</p>]):::first
	router(router)
	search(search)
	answer(answer)
	image(image)
	__end__([<p>__end__</p>]):::last
	__start__ --> router;
	answer --> __end__;
	image --> __end__;
	router -.-> search;
	router -.-> answer;
	router -.-> image;
	search -.-> answer;
	classDef default fill:#f2f0ff,line-height:1.2;
	classDef first fill-opacity:0;
	classDef last fill:#bfb6fc;

```

## How to View

1. **VS Code**: Install "Markdown Preview Mermaid Support" extension
2. **GitHub**: Paste in any .md file - GitHub renders Mermaid natively
3. **Online**: Go to https://mermaid.live and paste the diagram code
